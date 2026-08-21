import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const proxyApiOrigin = process.env.PERF_PROXY_API_ORIGIN || '';
const storeName = '맥시칸치킨 미평점';
const report = {success: false, checks: [], errors: []};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH
    ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH}
    : {})
});
const context = await browser.newContext({viewport: {width: 390, height: 844}, locale: 'ko-KR'});
if (process.env.PATCH_APP_FROM_LOCAL === '1') {
  const patchedApp = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
  await context.route('**/app.js?*', route => route.fulfill({status: 200, contentType: 'text/javascript; charset=utf-8', body: patchedApp}));
}
if (proxyApiOrigin) {
  const localOrigin = new URL(baseURL).origin;
  await context.route(`${proxyApiOrigin}/api/**`, async route => {
    const response = await route.fetch({headers: {...route.request().headers(), origin: 'https://preview.daedongmap.com'}});
    await route.fulfill({response, headers: {...response.headers(), 'access-control-allow-origin': localOrigin}});
  });
}
await context.addInitScript(() => sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV1', '1'));
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));

const check = async (condition, message) => {
  const ok = await condition;
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(name => Array.isArray(allStores) && allStores.some(store => store.name === name), storeName, {timeout: 15000});
  const target = await page.evaluate(name => {
    const store = allStores.find(item => item.name === name);
    return store ? {id: String(store.id), hasMenu: store.hasMenu === true} : null;
  }, storeName);
  if (!target) throw new Error(`${storeName} 가게를 찾지 못했습니다.`);
  report.store = target;
  await check(target.hasMenu, '맥시칸치킨 미평점 메뉴 데이터 연결');
  await page.evaluate(name => openStore(allStores.find(store => store.name === name)), storeName);
  await page.waitForSelector(`#modal:not([hidden]) .store-detail[data-store-id="${target.id}"]:not(.store-detail-loading)`, {timeout: 10000});
  await page.waitForSelector(`#modal:not([hidden]) .store-detail[data-store-id="${target.id}"] .detail-photo`, {timeout: 10000});
  await check(page.locator(`#modal .store-detail[data-store-id="${target.id}"] .detail-photo-placeholder`).count().then(count => count === 0), '상세 상단의 사진 준비 중 화면 제거');
  const photo = page.locator(`#modal .store-detail[data-store-id="${target.id}"] .detail-photo`).first();
  const src = await photo.getAttribute('src');
  report.detailPhotoSrc = src;
  await check(Boolean(src && !src.startsWith('data:')), '메뉴 데이터에서 실제 상세 대표사진 복구');
  await page.waitForFunction(id => {
    const image = document.querySelector(`#modal .store-detail[data-store-id="${id}"] .detail-photo`);
    return Boolean(image?.complete && image.naturalWidth > 0);
  }, target.id, {timeout: 10000});
  await check(photo.evaluate(node => node.complete && node.naturalWidth > 0), '복구된 상세 대표사진 실제 표시');
  await page.screenshot({path: 'browser-mexican-chicken-detail-photo.png', fullPage: false});
  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  await page.screenshot({path: 'browser-mexican-chicken-detail-photo-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-mexican-chicken-detail-photo-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);

