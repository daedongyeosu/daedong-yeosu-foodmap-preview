import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'https://preview.daedongmap.com/';
const baseOrigin = new URL(baseURL).origin;
const store = {
  store_id: 'a200000000000001',
  name: '요기요 복귀 검증가게',
  district: '미평동',
  category: '치킨',
  categories: ['치킨'],
  channelKeys: ['yogiyo', 'coupang', 'baemin'],
  routes: [
    {name: '요기요', url: 'https://orders.example.test/yogiyo/return-test', enabled: true},
    {name: '쿠팡이츠', url: 'https://orders.example.test/coupang/return-test', enabled: true},
    {name: '배달의민족', url: 'https://orders.example.test/baemin/return-test', enabled: true}
  ]
};
const report = {success: false, checks: [], errors: []};
const browser = await chromium.launch({headless: true, ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  isMobile: true,
  hasTouch: true,
  locale: 'ko-KR',
  userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.6.0'
});
await context.addInitScript(() => sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV1', '1'));
if (process.env.PATCH_RC2_FROM_LOCAL === '1') {
  const patchedRc2 = fs.readFileSync(new URL('../rc2-fixes.js', import.meta.url), 'utf8');
  await context.route('**/rc2-fixes.js*', route => route.fulfill({status: 200, contentType: 'text/javascript; charset=utf-8', body: patchedRc2}));
}
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
await context.route('**/api/catalog', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify([store])}));
await context.route('**/api/services', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({programs: [], stores: {}})}));
await context.route('**/api/store/*', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(store)}));
await context.route('https://orders.example.test/**', route => route.fulfill({status: 200, contentType: 'text/html; charset=utf-8', body: '<!doctype html><title>주문앱</title><p>외부 주문앱 화면</p>'}));

const check = async (condition, message) => {
  const ok = await condition;
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};
const openGuide = async (page, key) => {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(
    () => window.daedongCatalogReady && typeof window.daedongCatalogReady.then === 'function',
    null,
    {timeout: 10000}
  );
  await page.evaluate(() => window.daedongCatalogReady);
  await page.waitForFunction(
    storeId => typeof window.openStore === 'function' &&
      typeof window.fxStoreById === 'function' &&
      Boolean(window.fxStoreById(storeId)),
    store.store_id,
    {timeout: 20000}
  );
  const restoredDetail = page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${store.store_id}"]`);
  if (!await restoredDetail.isVisible()) {
    await page.locator('#mainSearch').fill(store.name);
    const card = page.locator('#storeGrid .store-card').filter({hasText: store.name}).first();
    await card.waitFor({state: 'visible', timeout: 10000});
    await card.tap();
    await restoredDetail.waitFor({state: 'visible', timeout: 10000}).catch(async () => {
      await page.evaluate(storeId => window.openStore(window.fxStoreById(storeId)), store.store_id);
      await restoredDetail.waitFor({state: 'visible', timeout: 10000});
    });
  }
  const otherMethods = page.locator('#modal:not([hidden]) [data-rc3-other-methods]');
  await otherMethods.waitFor({state: 'visible', timeout: 10000});
  await otherMethods.click();
  await page.locator(`.order-methods-sheet [data-rc3-external-route="${key}"]`).click({timeout: 5000});
  const guide = page.locator(`#modal:not([hidden]) .community-guide[data-selected-app="${key}"]`);
  await guide.waitFor({state: 'visible', timeout: 5000});
  return guide.locator(`a[data-community-original="${key}"]`);
};

try {
  const yogiyoPage = await context.newPage();
  yogiyoPage.on('pageerror', error => report.errors.push(error.message));
  const yogiyoLink = await openGuide(yogiyoPage, 'yogiyo');
  await yogiyoLink.click();
  await yogiyoPage.waitForURL(url => url.hostname === 'orders.example.test' && url.pathname.includes('/yogiyo/'), {timeout: 5000});
  await check(Promise.resolve(context.pages().length === 1), '요기요는 현재 탭에서 열어 Preview 뒤로가기 기록 유지');
  await yogiyoPage.goBack({waitUntil: 'domcontentloaded'});
  await yogiyoPage.waitForURL(url => url.origin === baseOrigin, {timeout: 5000});
  await yogiyoPage.locator(`#modal:not([hidden]) .store-detail[data-store-id="${store.store_id}"]`).waitFor({state: 'visible', timeout: 10000});
  await check(Promise.resolve(true), '요기요에서 뒤로가기 시 보던 가게 상세로 복귀');
  await yogiyoPage.screenshot({path: 'browser-yogiyo-back-return.png', fullPage: false});
  await yogiyoPage.close();

  for (const key of ['coupang', 'baemin']) {
    const page = await context.newPage();
    const link = await openGuide(page, key);
    const popupPromise = context.waitForEvent('page', {timeout: 5000});
    await link.click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    await check(Promise.resolve(new URL(await page.url()).origin === baseOrigin), `${key}: 원본 Preview 화면을 별도 창으로 보존`);
    await popup.close();
    await page.close();
  }
  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  report.debug = await context.pages().at(-1)?.evaluate(() => ({
    modalHidden: document.querySelector('#modal')?.hidden,
    modalText: document.querySelector('#modal')?.innerText?.slice(0, 1200) || '',
    modalHtml: document.querySelector('#modal')?.innerHTML?.slice(0, 4000) || ''
  })).catch(() => null);
  await context.pages().at(-1)?.screenshot({path: 'browser-yogiyo-back-return-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-yogiyo-back-return-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);

