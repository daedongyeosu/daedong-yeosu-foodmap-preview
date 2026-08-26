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
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4174/';
const store = {
  store_id: 'a200000000000009',
  name: '카카오 실제복귀 검증가게',
  district: '여서동',
  category: '한식',
  categories: ['한식'],
  channelKeys: ['mukkebi'],
  routes: [{name: '먹깨비', url: 'https://orders.example.test/mukkebi/return-test', enabled: true}]
};
const report = {success: false, checks: [], events: [], errors: []};
const browser = await chromium.launch({
  ...launchOptions,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})
});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  isMobile: true,
  hasTouch: true,
  locale: 'ko-KR',
  // Real Kakao Android builds do not consistently expose a KAKAOTALK token.
  // The return guard must therefore work from the Android platform signal.
  userAgent: 'Mozilla/5.0 (Linux; Android 15; SM-S938N) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36'
});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV1', '1');
  window.__kakaoReturnEvents = [];
  // Chromium cannot launch an Android intent in CI. Intercept the same detail
  // route before the production handler, save the production return state, and
  // navigate to the HTTP fallback page that Kakao leaves in its own history.
  document.addEventListener('click', event => {
    const link = event.target instanceof Element
      ? event.target.closest('a[data-route-key="mukkebi"]')
      : null;
    if (!link || typeof window.rc2RememberExternalReturn !== 'function') return;
    event.preventDefault();
    event.stopImmediatePropagation();
    window.markExternalAppDeparture?.();
    window.rc2RememberExternalReturn();
    sessionStorage.setItem('__kakaoGuardHref', location.href);
    window.location.replace(link.href);
  }, true);
  for (const type of ['pagehide', 'pageshow', 'popstate', 'focus', 'blur']) {
    window.addEventListener(type, event => window.__kakaoReturnEvents.push({
      type,
      at: Date.now(),
      persisted: Boolean(event.persisted),
      href: location.href,
      modalHidden: document.querySelector('#modal')?.hidden
    }), true);
  }
});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
await context.route('**/api/catalog', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify([store])}));
await context.route('**/api/services', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({programs: [], stores: {}})}));
await context.route('**/api/store/*', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(store)}));
await context.route('https://orders.example.test/**', route => route.fulfill({
  status: 200,
  contentType: 'text/html; charset=utf-8',
  body: '<!doctype html><meta name="viewport" content="width=device-width"><title>먹깨비 중간 웹페이지</title><p>먹깨비 중간 웹페이지</p>'
}));

const check = async (condition, message) => {
  const ok = await condition;
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};

try {
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.daedongCatalogReady, null, {timeout: 10000});
  await page.evaluate(() => window.daedongCatalogReady);
  await page.waitForFunction(storeId => window.fxStoreById?.(storeId), store.store_id, {timeout: 20000});
  await page.evaluate(storeId => window.openStore(window.fxStoreById(storeId)), store.store_id);
  const detail = page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${store.store_id}"]`);
  await detail.waitFor({state: 'visible', timeout: 10000});
  const route = page.locator('#modal:not([hidden]) a[data-route-key="mukkebi"]');
  await route.waitFor({state: 'visible', timeout: 10000});
  await route.tap();
  await page.waitForURL('https://orders.example.test/**', {timeout: 10000});
  await check(Promise.resolve(await page.locator('text=먹깨비 중간 웹페이지').isVisible()), '카카오가 같은 탭에 먹깨비 중간 웹페이지를 쌓음');
  await page.goBack({waitUntil: 'domcontentloaded'});
  await page.waitForTimeout(800);
  report.events = await page.evaluate(() => window.__kakaoReturnEvents || []);
  const guardedHref = await page.evaluate(() => sessionStorage.getItem('__kakaoGuardHref') || '');
  await check(Promise.resolve(new URL(guardedHref).searchParams.has('__ddguard')), 'Android 보호 기록의 주소가 실제 복귀 주소와 구분됨');
  await check(detail.isVisible(), '먹깨비 중간 웹페이지에서 뒤로 왔을 때 원래 가게 상세 유지');
  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
} finally {
  fs.writeFileSync('browser-kakao-cross-document-return-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

if (!report.success) {
  console.error(JSON.stringify(report, null, 2));
  process.exit(1);
}
console.log('browser-kakao-cross-document-return: pass');
