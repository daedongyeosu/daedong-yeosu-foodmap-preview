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
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const report = {success: false, checks: [], errors: []};
const store = {
  store_id: 'mukkebi-popup-safe-001',
  name: '먹깨비 팝업 안전검증 가게',
  district: '여서동',
  category: '한식',
  categories: ['한식'],
  lat: 34.75,
  lng: 127.7,
  channelKeys: ['mukkebi'],
  routes: [{name: '먹깨비', url: 'https://www.mukkebi.com/store/safe-test', enabled: true}]
};

const browser = await chromium.launch({
  ...launchOptions,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})
});

const newContext = async ({introPlayed = true} = {}) => {
  const context = await browser.newContext({
    viewport: {width: 390, height: 844},
    isMobile: true,
    hasTouch: true,
    locale: 'ko-KR',
    userAgent: 'Mozilla/5.0 (Linux; Android 15; SM-S938N) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.7.2'
  });
  if (introPlayed) {
    await context.addInitScript(() => {
      sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
    });
  }
  await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
  await context.route('**/*.woff2', route => route.abort());
  await context.route('**/api/catalog', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify([store])
  }));
  await context.route('**/api/services', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({programs: [], stores: {}})
  }));
  await context.route('**/api/store/**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    headers: {'Access-Control-Allow-Origin': new URL(baseURL).origin},
    body: JSON.stringify(store)
  }));
  return context;
};

const check = async (condition, message) => {
  const ok = await condition;
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};

try {
  const startupOrderContext = await newContext({introPlayed: false});
  await startupOrderContext.addInitScript(() => {
    const now = new Date();
    const legacyDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    try { localStorage.setItem('daedongMukkebiSummerEventHiddenDate', legacyDate); } catch {}
  });
  const startupOrderPage = await startupOrderContext.newPage();
  startupOrderPage.on('pageerror', error => report.errors.push(`startup-order: ${error.message}`));
  await startupOrderPage.goto(`${baseURL}?mukkebi-startup-order-test=1`, {waitUntil: 'domcontentloaded'});
  await startupOrderPage.locator('#mukkebiSummerEvent').waitFor({state: 'visible', timeout: 5000});
  await check(startupOrderPage.evaluate(() => (
    document.querySelector('#mukkebiSummerEvent')?.hidden === false
      && document.querySelector('#communityIntro')?.hidden === true
  )), '과거 오늘 숨김 기록과 첫 안내창이 있는 신규 고객도 먹깨비 팝업을 먼저 표시');
  await startupOrderPage.locator('#mukkebiSummerClose').tap();
  await startupOrderPage.locator('#communityIntro').waitFor({state: 'visible', timeout: 3000});
  await check(startupOrderPage.evaluate(() => (
    document.querySelector('#mukkebiSummerEvent')?.hidden === true
      && document.querySelector('#communityIntro')?.hidden === false
  )), '먹깨비 팝업을 닫은 뒤 기존 첫 안내창을 순서대로 표시');
  await startupOrderContext.close();

  const freshContext = await newContext();
  const freshPage = await freshContext.newPage();
  freshPage.on('pageerror', error => report.errors.push(`fresh: ${error.message}`));
  await freshPage.goto(`${baseURL}?mukkebi-fresh-entry-test=1`, {waitUntil: 'domcontentloaded'});
  const popup = freshPage.locator('#mukkebiSummerEvent');
  await popup.waitFor({state: 'visible', timeout: 5000});
  await check(freshPage.evaluate(() => (
    document.querySelector('#mukkebiSummerEvent')?.hidden === false
      && document.querySelector('#modal')?.hidden === true
      && !window.daedongEntryHadExternalReturn
  )), '완전히 새로 들어온 홈에서만 먹깨비 팝업 한 번 표시');
  await freshPage.screenshot({path: 'browser-mukkebi-safe-fresh-entry-popup.png', fullPage: false});

  await freshPage.locator('#mukkebiSummerClose').tap();
  await popup.waitFor({state: 'hidden', timeout: 1000});
  await freshPage.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pageshow', {persisted: true}));
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  await freshPage.waitForTimeout(900);
  await check(freshPage.evaluate(() => (
    document.querySelector('#mukkebiSummerEvent')?.hidden === true
      && sessionStorage.getItem('daedongMukkebiSummerEventSeenSessionV2') === '1'
  )), '팝업을 닫은 뒤 앱 복귀 신호가 와도 같은 세션에서 다시 표시하지 않음');

  await freshPage.locator('[data-order-key="mukkebi"]').tap();
  await freshPage.locator('#modal:not([hidden])').waitFor({state: 'visible', timeout: 5000});
  await check(freshPage.evaluate(() => (
    document.querySelector('#modal')?.hidden === false
      && document.querySelector('#mukkebiSummerEvent')?.hidden === true
  )), '먹깨비 메뉴를 연 뒤 행사 팝업이 메뉴를 덮지 않음');
  await freshPage.screenshot({path: 'browser-mukkebi-safe-fresh-entry-menu.png', fullPage: false});
  await freshContext.close();

  const returnContext = await newContext();
  await returnContext.addInitScript(({origin, token, storeId}) => {
    if (location.origin !== origin) return;
    const saved = JSON.stringify({storeId, returnToken: token, savedAt: Date.now()});
    const marker = JSON.stringify({returnToken: token, savedAt: Date.now()});
    for (const storage of [sessionStorage, localStorage]) {
      storage.setItem('daedongExternalReturnRc2', saved);
      storage.setItem('daedongExternalAppDepartureV1', marker);
    }
  }, {
    origin: new URL(baseURL).origin,
    token: 'mukkebi-return-test',
    storeId: store.store_id
  });
  const returnPage = await returnContext.newPage();
  returnPage.on('pageerror', error => report.errors.push(`return: ${error.message}`));
  await returnPage.goto(`${baseURL}?__ddret=mukkebi-return-test`, {waitUntil: 'domcontentloaded'});
  await returnPage.waitForTimeout(1200);
  await check(returnPage.locator('#mukkebiSummerEvent').isHidden(),
    '주문앱 복귀 주소에서는 먹깨비 팝업 예약 자체를 차단');
  await returnContext.close();

  const openingTouchContext = await newContext();
  const openingTouchPage = await openingTouchContext.newPage();
  openingTouchPage.on('pageerror', error => report.errors.push(`opening-touch: ${error.message}`));
  await openingTouchPage.goto(`${baseURL}?mukkebi-opening-touch-test=1`, {waitUntil: 'domcontentloaded'});
  await openingTouchPage.evaluate(() => {
    document.body.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 180,
      clientY: 420
    }));
  });
  await openingTouchPage.locator('#mukkebiSummerEvent').waitFor({state: 'visible', timeout: 5000});
  await check(openingTouchPage.locator('#mukkebiSummerEvent').isVisible(),
    '카카오톡에서 이어진 최초 접촉만으로 팝업을 취소하지 않음');
  await openingTouchContext.close();

  const interactionContext = await newContext();
  const interactionPage = await interactionContext.newPage();
  interactionPage.on('pageerror', error => report.errors.push(`interaction: ${error.message}`));
  await interactionPage.goto(`${baseURL}?mukkebi-interaction-test=1`, {waitUntil: 'domcontentloaded'});
  await interactionPage.evaluate(() => {
    for (const [type, clientX, clientY] of [
      ['pointerdown', 180, 420],
      ['pointermove', 180, 450]
    ]) {
      document.body.dispatchEvent(new PointerEvent(type, {
        bubbles: true,
        pointerType: 'touch',
        isPrimary: true,
        clientX,
        clientY
      }));
    }
  });
  await interactionPage.waitForTimeout(1200);
  await check(interactionPage.locator('#mukkebiSummerEvent').isHidden(),
    '고객의 실제 화면 이동이 확인되면 지연 팝업을 취소');
  await interactionContext.close();

  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
} finally {
  fs.writeFileSync('browser-mukkebi-safe-fresh-entry-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
