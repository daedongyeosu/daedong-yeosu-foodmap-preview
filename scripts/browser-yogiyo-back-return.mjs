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
  lat: 34.7523658,
  lng: 127.7031405,
  channelKeys: ['yogiyo', 'coupang', 'baemin'],
  routes: [
    {name: '요기요', url: 'https://orders.example.test/yogiyo/return-test', enabled: true},
    {name: '쿠팡이츠', url: 'https://orders.example.test/coupang/return-test', enabled: true},
    {name: '배달의민족', url: 'https://orders.example.test/baemin/return-test', enabled: true}
  ]
};
const yogiyoWebURL = 'https://www.yogiyo.co.kr/mobile/?lat=34.7523658&lng=127.7031405#/332930';
const report = {success: false, checks: [], errors: []};
const yogiyoNavigations = [];
const browser = await chromium.launch({...launchOptions, ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  isMobile: true,
  hasTouch: true,
  locale: 'ko-KR',
  userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/30.0 Chrome/143.0.0.0 Mobile Safari/537.36'
});
await context.addInitScript(() => sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV1', '1'));
await context.addInitScript(({previewOrigin}) => {
  window.addEventListener('pageshow', () => {
    if (location.origin !== previewOrigin || !sessionStorage.getItem('daedongExternalReturnRc2')) return;
    const trigger = document.querySelector('[data-rc3-other-methods]');
    const panel = document.querySelector('[data-rc3-inline-order-methods]');
    if (!trigger || !panel || panel.hidden) return;
    // Samsung Internet can revive the same detail DOM with the inline panel's
    // native visibility reset. Reproduce that real-device resume before the
    // application's pageshow restore handler runs.
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    trigger.querySelector('span').textContent = '다른 주문방법 보기';
    trigger.querySelector('b').textContent = '›';
    const restoreInline = window.daedongRestoreInlineOrderMethodsOpen;
    if (typeof restoreInline === 'function') {
      delete window.daedongRestoreInlineOrderMethodsOpen;
      setTimeout(() => { window.daedongRestoreInlineOrderMethodsOpen = restoreInline; }, 150);
    }
  }, true);
}, {previewOrigin: baseOrigin});
if (process.env.PATCH_RC2_FROM_LOCAL === '1') {
  const patchedRc2 = fs.readFileSync(new URL('../rc2-fixes.js', import.meta.url), 'utf8');
  const patchedRc3 = fs.readFileSync(new URL('../rc3-fixes.js', import.meta.url), 'utf8');
  const patchedDataApi = fs.readFileSync(new URL('../data-api.js', import.meta.url), 'utf8');
  await context.route('**/rc2-fixes.js*', route => route.fulfill({status: 200, contentType: 'text/javascript; charset=utf-8', body: patchedRc2}));
  await context.route('**/rc3-fixes.js*', route => route.fulfill({status: 200, contentType: 'text/javascript; charset=utf-8', body: patchedRc3}));
  await context.route('**/data-api.js*', route => route.fulfill({status: 200, contentType: 'text/javascript; charset=utf-8', body: patchedDataApi}));
}
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
await context.route('**/api/catalog', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify([store])}));
await context.route('**/api/services', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({programs: [], stores: {}})}));
await context.route('**/api/store/**', route => {
  const pathname = new URL(route.request().url()).pathname;
  const body = pathname.endsWith('/yogiyo-web')
    ? {storeId: store.store_id, shopId: '332930', url: yogiyoWebURL}
    : store;
  return route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: {'Access-Control-Allow-Origin': baseOrigin},
    body: JSON.stringify(body)
  });
});
await context.route('https://www.yogiyo.co.kr/mobile/**', route => {
  const request = route.request();
  yogiyoNavigations.push({
    method: request.method(),
    isNavigation: request.isNavigationRequest(),
    referer: request.headers().referer || ''
  });
  return route.fulfill({
    status: 200,
    contentType: 'text/html; charset=utf-8',
    body: '<!doctype html><meta name="viewport" content="width=device-width"><title>요기요 가게</title><main><h1>요기요 복귀 검증가게</h1><button>바로 주문하기</button></main>'
  });
});

const check = async (condition, message) => {
  const ok = await condition;
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};

const openOrderMethodsRoute = async (page, {allowOpen = true} = {}) => {
  if (new URL(page.url()).origin !== baseOrigin) await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(
    () => window.daedongCatalogReady && typeof window.daedongCatalogReady.then === 'function',
    null,
    {timeout: 10000}
  );
  await page.evaluate(() => window.daedongCatalogReady);
  await page.waitForFunction(
    storeId => typeof window.openStore === 'function' && typeof window.fxStoreById === 'function' && Boolean(window.fxStoreById(storeId)),
    store.store_id,
    {timeout: 20000}
  );
  await page.waitForFunction(() => typeof window.daedongActivateOrderMethodsFallback === 'function', null, {timeout: 10000});
  const restoredDetail = page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${store.store_id}"]`);
  if (!await restoredDetail.isVisible()) {
    await page.evaluate(storeId => window.openStore(window.fxStoreById(storeId)), store.store_id);
    await restoredDetail.waitFor({state: 'visible', timeout: 10000}).catch(async () => {
      await page.evaluate(storeId => window.openStore(window.fxStoreById(storeId)), store.store_id);
      await restoredDetail.waitFor({state: 'visible', timeout: 10000});
    });
  }
  if (!await restoredDetail.locator('[data-rc3-other-methods]').count()) {
    await page.evaluate(storeId => window.openStore(window.fxStoreById(storeId)), store.store_id);
  }
  const otherMethods = page.locator('#modal:not([hidden]) [data-rc3-other-methods]');
  await otherMethods.waitFor({state: 'visible', timeout: 10000});
  const orderMethodsSheet = page.locator('#modal:not([hidden]) .order-methods-sheet');
  if (!await orderMethodsSheet.isVisible()) {
    if (allowOpen) await otherMethods.tap();
    else await orderMethodsSheet.waitFor({state: 'visible', timeout: 2000}).catch(() => {});
  }
  const route = page.locator('.order-methods-sheet [data-rc3-external-route="yogiyo"]');
  if (allowOpen || await orderMethodsSheet.isVisible()) await route.waitFor({state: 'visible', timeout: 5000});
  if (!await otherMethods.evaluate(element => Boolean(element.dataset.testStableReturn))) {
    await otherMethods.evaluate(element => { element.dataset.testStableReturn = 'yogiyo'; });
  }
  return {route, restoredDetail, otherMethods, orderMethodsSheet};
};

try {
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('dialog', async dialog => {
    report.errors.push(`dialog: ${dialog.message()}`);
    await dialog.dismiss();
  });
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  let surface = await openOrderMethodsRoute(page);

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    if (attempt === 1) {
      await check(
        surface.route.evaluate(element => /^https:\/\//.test(String(element.dataset.rc3ExternalHref || ''))),
        '주문앱 버튼이 전체 카탈로그 교체 후에도 쓸 자체 주문 URL을 보존'
      );
      await page.evaluate(storeId => {
        const originalLookup = window.fxStoreById;
        const current = originalLookup(storeId);
        const catalogOnlyStore = {...current, routes: [], __secureDetailReady: false};
        window.fxStoreById = id => String(id) === String(storeId)
          ? catalogOnlyStore
          : originalLookup(id);
      }, store.store_id);
    }
    const priorNavigationCount = yogiyoNavigations.length;
    await surface.route.tap();
    await page.waitForURL(url => url.href === yogiyoWebURL, {timeout: 10000});
    const navigation = yogiyoNavigations.at(-1);
    await check(Promise.resolve(
      yogiyoNavigations.length === priorNavigationCount + 1
      && navigation?.method === 'GET'
      && navigation?.isNavigation === true
      && navigation?.referer === ''
    ), `${attempt}회차: 네이티브 앱 호출을 피하는 무참조 브라우저 GET 폼 이동`);
    await check(Promise.resolve(context.pages().length === 1), `${attempt}회차: 요기요를 새 앱·새 창으로 분리하지 않음`);
    await check(page.locator('h1').filter({hasText: store.name}).isVisible(), `${attempt}회차: 요기요 웹 가게 상세 직접 표시`);

    await page.goBack({waitUntil: 'domcontentloaded'});
    await page.waitForURL(url => url.origin === baseOrigin, {timeout: 10000});
    surface = await openOrderMethodsRoute(page, {allowOpen: false});
    await check(surface.restoredDetail.isVisible(), `${attempt}회차: 뒤로가기 한 번으로 원래 가게 상세 복귀`);
    await check(surface.orderMethodsSheet.isVisible(), `${attempt}회차: 요기요·쿠팡이츠·배달의민족 목록 열린 상태 유지`);
    await check(surface.otherMethods.evaluate(element => element.dataset.testStableReturn === 'yogiyo'), `${attempt}회차: 새 화면이 아닌 동일 상세 DOM 유지`);
    await check(surface.route.isEnabled(), `${attempt}회차: 복귀한 요기요 버튼 재터치 가능`);
  }

  await page.screenshot({path: 'browser-yogiyo-back-return.png', fullPage: false});
  report.success = report.errors.length === 0;
  await page.close();
} catch (error) {
  report.failure = error.stack || String(error);
  const page = context.pages().at(-1);
  report.debug = await page?.evaluate(() => ({
    url: location.href,
    modalHidden: document.querySelector('#modal')?.hidden,
    modalText: document.querySelector('#modal')?.innerText?.slice(0, 1200) || '',
    dataApiMethods: Object.keys(window.daedongDataApi || {}),
    store: window.fxStoreById?.('a200000000000001')
  })).catch(() => null);
  await page?.screenshot({path: 'browser-yogiyo-back-return-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-yogiyo-back-return-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
