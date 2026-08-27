import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const loadBrowserRuntime = async () => {
  try {
    const playwright = await import('playwright');
    return {chromium: playwright.chromium, launchOptions: {headless: true}};
  } catch {}
  const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (!runtimeModules) throw new Error('playwright 패키지를 찾을 수 없습니다.');
  const playwright = await import(pathToFileURL(path.join(runtimeModules, 'playwright', 'index.mjs')).href);
  return {chromium: playwright.chromium, launchOptions: {headless: true}};
};

const {chromium, launchOptions} = await loadBrowserRuntime();

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
const browser = await chromium.launch({...launchOptions, ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})});
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
const openOrderMethodsRoute = async (page, key) => {
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
  const orderMethodsSheet = page.locator('#modal:not([hidden]) .order-methods-sheet');
  if (!await orderMethodsSheet.isVisible()) await otherMethods.click();
  const route = page.locator(`.order-methods-sheet [data-rc3-external-route="${key}"]`);
  await route.waitFor({state: 'visible', timeout: 5000});
  return route;
};

try {
  for (const key of ['yogiyo', 'coupang', 'baemin']) {
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    const route = await openOrderMethodsRoute(page, key);
    const expectedURL = await route.evaluate(element => {
      const selectedStore = window.fxStoreById?.(element.dataset.storeId);
      return selectedStore?.routes?.find(item => item.key === element.dataset.rc3ExternalRoute)?.url || '';
    });
    const externalPagePromise = context.waitForEvent('page', {timeout: 5000});
    await route.click();
    const externalPage = await externalPagePromise;
    await externalPage.waitForLoadState('domcontentloaded');
    await check(Promise.resolve(externalPage.url() === expectedURL), `${key}: 원본 Preview와 분리된 주문앱 경로 선택`);
    await check(Promise.resolve(new URL(await page.url()).origin === baseOrigin), `${key}: 원본 Preview 현재 탭 보존`);
    await check(Promise.resolve(context.pages().length === 2), `${key}: 주문앱만 별도 실행하고 Preview 상세 유지`);
    const preparedTrigger = page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${store.store_id}"] [data-rc3-other-methods]`);
    await preparedTrigger.waitFor({state: 'visible', timeout: 5000});
    await preparedTrigger.evaluate((element, routeKey) => { element.dataset.testStableReturn = routeKey; }, key);
    await externalPage.close();
    await page.bringToFront();
    await page.evaluate(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
      window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}));
    });
    await page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${store.store_id}"]`).waitFor({state: 'visible', timeout: 10000});
    await check(Promise.resolve(true), `${key}: 앱 복귀 수명주기 뒤 보던 가게 상세 유지`);
    await check(preparedTrigger.evaluate((element, expectedKey) => element.dataset.testStableReturn === expectedKey, key), `${key}: 앱 복귀 뒤 준비된 동일 상세 DOM 유지`);
    await check(page.locator('#modal:not([hidden]) .order-methods-sheet').isVisible(), `${key}: 앱 복귀 뒤 주문앱 목록 열린 상태 유지`);
    if (key === 'yogiyo') await page.screenshot({path: 'browser-yogiyo-back-return.png', fullPage: false});
    await page.close();
  }

  const detachedPreviewPage = await context.newPage();
  detachedPreviewPage.on('pageerror', error => report.errors.push(error.message));
  const detachedYogiyoRoute = await openOrderMethodsRoute(detachedPreviewPage, 'yogiyo');
  const detachedExternalPromise = context.waitForEvent('page', {timeout: 5000});
  await detachedYogiyoRoute.click();
  const detachedExternalPage = await detachedExternalPromise;
  await detachedExternalPage.waitForLoadState('domcontentloaded');
  await detachedPreviewPage.close();
  await detachedExternalPage.close();

  const reopenedKakaoLink = await context.newPage();
  reopenedKakaoLink.on('pageerror', error => report.errors.push(error.message));
  await reopenedKakaoLink.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await check(
    reopenedKakaoLink.evaluate(() => globalThis.daedongEntryIsDetachedKakaoReturn === true),
    '요기요가 Preview 문서를 끊은 뒤 카카오톡 원래 링크 재진입을 복귀로 판별'
  );
  const reopenedStore = reopenedKakaoLink.locator(`#modal:not([hidden]) .store-detail[data-store-id="${store.store_id}"]`);
  await reopenedStore.waitFor({state: 'visible', timeout: 20000});
  await check(Promise.resolve(true), '카카오톡 링크 재진입 뒤 방금 보던 가게 상세 복원');
  await check(
    reopenedKakaoLink.locator('#modal:not([hidden]) .order-methods-sheet').isVisible(),
    '카카오톡 링크 재진입 뒤 요기요·쿠팡이츠·배달의민족 목록 열린 상태 복원'
  );
  await reopenedKakaoLink.screenshot({path: 'browser-yogiyo-detached-link-return.png', fullPage: false});
  await reopenedKakaoLink.close();
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

