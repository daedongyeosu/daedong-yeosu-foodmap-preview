import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const targetIds = [
  '116a9f7b45941e78','b91093385f1baa6a','e81c1980fff43a29',
  '5c881a3751b1c6cf','a638ac9c079a28c0','a1e8130ec540e37f'
];
const report = {success: false, checks: [], stores: [], errors: []};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})
});
const context = await browser.newContext({viewport: {width: 390, height: 844}, locale: 'ko-KR'});
if (process.env.PATCH_APP_FROM_LOCAL === '1') {
  const patchedApp = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  await context.route('**/app.js?*', route => route.fulfill({status: 200, contentType: 'text/javascript; charset=utf-8', body: patchedApp}));
}
await context.addInitScript(() => sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV1', '1'));
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));

const check = (ok, message) => {
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(ids => Array.isArray(allStores) && ids.every(id => allStores.some(store => String(store.id) === id)), targetIds, {timeout: 20000});
  const stores = await page.evaluate(async ids => {
    const imageLoads = src => new Promise(resolve => {
      const image = new Image();
      const timer = setTimeout(() => resolve(false), 8000);
      image.onload = () => { clearTimeout(timer); resolve(image.naturalWidth > 0); };
      image.onerror = () => { clearTimeout(timer); resolve(false); };
      image.src = src;
    });
    const output = [];
    for (const id of ids) {
      const store = allStores.find(item => String(item.id) === id);
      const failedMobile = mobilePhotoPath(store.legacyImage);
      store.__failedPhotoPaths = new Set([photoUrlKey(failedMobile)]);
      const resolved = photoResolver.resolve(store);
      output.push({id, name: store.name, legacyImage: store.legacyImage, failedMobile, resolvedSrc: resolved?.src || '', loads: resolved?.src ? await imageLoads(resolved.src) : false});
    }
    return output;
  }, targetIds);
  report.stores = stores;
  check(stores.length === targetIds.length, '원본 사진 복구 대상 6곳 확인');
  check(stores.every(store => store.failedMobile.endsWith('.mobile.webp')), '누락된 모바일 변형 경로 재현');
  check(stores.every(store => store.resolvedSrc === store.legacyImage), '모바일 변형 실패 후 저장된 원본 PNG 선택');
  check(stores.every(store => store.loads), '6곳 원본 사진 실제 로딩');
  await page.screenshot({path: 'browser-original-photo-fallback.png', fullPage: false});
  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  await page.screenshot({path: 'browser-original-photo-fallback-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-original-photo-fallback-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);

