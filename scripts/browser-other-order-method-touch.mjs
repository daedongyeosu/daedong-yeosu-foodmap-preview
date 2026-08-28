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
const baseOrigin = new URL(baseURL).origin;
const report = {success: false, viewport: {width: 390, height: 844}, checks: [], errors: [], stores: []};
const stores = [
  {
    store_id: 'a100000000000001',
    name: '본스치킨 미평점',
    district: '미평동',
    category: '치킨',
    categories: ['치킨'],
    lat: 34.7523658,
    lng: 127.7031405,
    channelKeys: ['yogiyo', 'coupang', 'baemin'],
    routes: [
      {name: '요기요', url: 'https://orders.example.test/yogiyo/vons', enabled: true},
      {name: '쿠팡이츠', url: 'https://orders.example.test/coupang/vons', enabled: true},
      {name: '배달의민족', url: 'https://orders.example.test/baemin/vons', enabled: true}
    ]
  },
  {
    store_id: 'a100000000000002',
    name: '손수김밥 양지점',
    district: '미평동',
    category: '한식',
    categories: ['한식'],
    lat: 34.7601,
    lng: 127.7101,
    channelKeys: ['yogiyo', 'coupang', 'baemin'],
    routes: [
      {name: '요기요', url: 'https://orders.example.test/yogiyo/handsu', enabled: true},
      {name: '쿠팡이츠', url: 'https://orders.example.test/coupang/handsu', enabled: true},
      {name: '배달의민족', url: 'https://orders.example.test/baemin/handsu', enabled: true}
    ]
  },
  {
    store_id: 'a100000000000003',
    name: '요기요 단독 검증가게',
    district: '신기동',
    category: '고기/구이',
    categories: ['고기/구이'],
    lat: 34.761,
    lng: 127.711,
    phone: '061-123-4567',
    channelKeys: ['phone', 'yogiyo'],
    routes: [
      {name: '전화주문', url: 'tel:0611234567', enabled: true},
      {name: '요기요', url: 'https://ws.yogiyo.co.kr/48zrgs', enabled: true}
    ]
  },
  {
    store_id: 'a100000000000004',
    name: '지역앱 추가 검증가게',
    district: '신기동',
    category: '고기/구이',
    categories: ['고기/구이'],
    channelKeys: ['mukkebi', 'yogiyo'],
    routes: [
      {name: '먹깨비', url: 'https://orders.example.test/mukkebi/added', enabled: true},
      {name: '요기요', url: 'https://orders.example.test/yogiyo/with-local', enabled: true}
    ]
  }
];
const detailsById = new Map(stores.map(store => [store.store_id, store]));
const browser = await chromium.launch({
  ...launchOptions,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})
});
const context = await browser.newContext({
  viewport: report.viewport,
  isMobile: true,
  hasTouch: true,
  locale: 'ko-KR',
  userAgent: 'Mozilla/5.0 (Linux; Android 15; SM-S938N Build/AP3A.240905.015.A2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 KAKAOTALK 25.7.2'
});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV2', '1');
  window.__returnedOrderMethodTouchState = [];
  const recordReturnedOrderMethodTouch = event => {
    if (!event.target?.closest?.('[data-rc3-other-methods]')) return;
    window.__returnedOrderMethodTouchState.push({
      type: event.type,
      returnStatePresent: Boolean(
        sessionStorage.getItem('daedongExternalReturnRc2')
        || localStorage.getItem('daedongExternalReturnRc2')
      )
    });
    setTimeout(() => {
      const trigger = document.querySelector('#modal:not([hidden]) [data-rc3-other-methods]');
      const panel = trigger?.closest('.store-other-wrap')?.querySelector('[data-rc3-inline-order-methods]');
      window.__returnedOrderMethodTouchState.push({
        type: `${event.type}-after`,
        expanded: trigger?.getAttribute('aria-expanded') || '',
        panelHidden: panel?.hidden
      });
    }, 0);
  };
  document.addEventListener('pointerdown', recordReturnedOrderMethodTouch, true);
  document.addEventListener('pointerup', recordReturnedOrderMethodTouch, true);
});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
await context.route('https://orders.example.test/**', route => route.fulfill({
  status: 200,
  contentType: 'text/html; charset=utf-8',
  body: '<!doctype html><html><title>외부 주문앱</title><body>외부 주문앱 화면</body></html>'
}));
await context.route('**/api/catalog', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(stores)
}));
await context.route('**/api/services', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({programs: [], stores: {}})
}));
await context.route('**/api/store/**', route => {
  const requestUrl = new URL(route.request().url());
  const parts = requestUrl.pathname.split('/').filter(Boolean);
  const isYogiyoWeb = parts.at(-1) === 'yogiyo-web';
  const id = isYogiyoWeb ? parts.at(-2) : parts.at(-1);
  const detail = detailsById.get(id);
  const body = isYogiyoWeb && detail
    ? {storeId: id, shopId: '332930', url: `https://www.yogiyo.co.kr/mobile/?lat=${detail.lat}&lng=${detail.lng}#/332930`}
    : detail || {error: 'not found'};
  return route.fulfill({
    status: detail ? 200 : 404,
    contentType: 'application/json',
    headers: {'Access-Control-Allow-Origin': baseOrigin},
    body: JSON.stringify(body)
  });
});
await context.route('https://www.yogiyo.co.kr/mobile/**', route => route.fulfill({
  status: 200,
  contentType: 'text/html; charset=utf-8',
  body: '<!doctype html><meta name="viewport" content="width=device-width"><title>요기요 가게</title><h1>요기요 주문화면</h1>'
}));
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));

const check = async (condition, message) => {
  const ok = await condition;
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};

const resetScenarioState = async () => {
  await page.evaluate(() => {
    sessionStorage.clear();
    localStorage.clear();
  });
  await context.clearCookies();
};

async function checkStore(storeName, screenshotName, {nativeResume = false} = {}) {
  report.currentStore = storeName;
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(
    () => window.daedongCatalogReady && typeof window.daedongCatalogReady.then === 'function',
    null,
    {polling: 25, timeout: 10000}
  );
  await page.evaluate(() => window.daedongCatalogReady);
  await page.waitForFunction(() => typeof window.openStore === 'function', null, {timeout: 25000});
  await page.locator('#mainSearch').fill(storeName);
  const card = page.locator('#storeGrid .store-card').filter({hasText: storeName}).first();
  await card.waitFor({state: 'visible', timeout: 10000});
  await card.tap();

  const trigger = page.locator('#modal:not([hidden]) [data-rc3-other-methods]');
  await trigger.waitFor({state: 'visible', timeout: 10000});
  const layout = await trigger.evaluate(element => {
    const span = element.querySelector('span');
    const style = getComputedStyle(element);
    const spanRect = span?.getBoundingClientRect();
    const buttonRect = element.getBoundingClientRect();
    return {
      columns: style.gridTemplateColumns.trim().split(/\s+/).length,
      width: buttonRect.width,
      spanWidth: spanRect?.width || 0,
      spanHeight: spanRect?.height || 0,
      pointerEvents: style.pointerEvents,
      touchAction: style.touchAction
    };
  });
  report.stores.push({storeName, layout});
  await check(Promise.resolve(layout.columns === 2), `${storeName} 다른 주문방법 버튼 두 칸 가로 배치`);
  await check(Promise.resolve(layout.width >= 300), `${storeName} 다른 주문방법 버튼 전체 폭 터치 영역`);
  await check(Promise.resolve(layout.spanWidth >= 140 && layout.spanHeight <= 32), `${storeName} 다른 주문방법 보기 한 줄 표시`);
  await check(Promise.resolve(layout.pointerEvents === 'auto' && layout.touchAction === 'manipulation'), `${storeName} 휴대폰 터치 허용`);
  await check(trigger.isEnabled(), `${storeName} 다른 주문방법 보기 버튼 활성화`);

  await trigger.tap();
  await page.waitForFunction(
    () => document.querySelector('#modal:not([hidden]) .order-methods-sheet')?.getBoundingClientRect().height > 0,
    null,
    {polling: 25, timeout: 3000}
  );
  await check(
    page.locator('#modal:not([hidden]) .order-methods-sheet').isVisible(),
    `${storeName} 첫 번째 터치로 다른 주문방법 선택창 열림`
  );
  await check(
    page.locator('.order-methods-sheet [data-rc3-external-route]').count().then(count => count > 0),
    `${storeName} 실제 등록된 외부 주문앱 선택지 표시`
  );
  const inlineDocumentStartedAt = await page.evaluate(() => performance.timeOrigin);
  const inlineDocumentUrl = page.url();
  await page.locator('#modal:not([hidden]) [data-rc3-order-methods-close]').tap();
  await page.waitForFunction(
    () => document.querySelector('#modal:not([hidden]) [data-rc3-inline-order-methods]')?.hidden === true,
    null,
    {polling: 25, timeout: 3000}
  );
  const inlineCloseState = await page.evaluate(() => ({
    timeOrigin: performance.timeOrigin,
    url: location.href,
    markerInUrl: new URL(location.href).searchParams.has('__ddom'),
    markerInStorage: Boolean(sessionStorage.getItem('daedongOrderMethodReentryV1')),
    detailVisible: Boolean(document.querySelector('#modal:not([hidden]) .store-detail [data-rc3-other-methods]'))
  }));
  await check(
    Promise.resolve(inlineCloseState.timeOrigin === inlineDocumentStartedAt && inlineCloseState.url === inlineDocumentUrl),
    `${storeName} 주문방법 닫기에서 문서·URL·히스토리 표면을 교체하지 않음`
  );
  await check(
    Promise.resolve(!inlineCloseState.markerInUrl && !inlineCloseState.markerInStorage && inlineCloseState.detailVisible),
    `${storeName} 인라인 닫기 뒤 같은 가게 상세 유지`
  );
  const reenteredTrigger = page.locator('#modal:not([hidden]) [data-rc3-other-methods]');
  await reenteredTrigger.tap();
  await page.waitForFunction(
    () => document.querySelector('#modal:not([hidden]) .order-methods-sheet')?.getBoundingClientRect().height > 0,
    null,
    {polling: 25, timeout: 3000}
  );
  await check(
    page.locator('#modal:not([hidden]) .order-methods-sheet').isVisible(),
    `${storeName} 인라인 닫기 뒤 두 번째 터치로 다른 주문방법 선택창 다시 열림`
  );
  await page.screenshot({path: screenshotName, fullPage: false});

  const externalRoute = page.locator('.order-methods-sheet [data-rc3-external-route="baemin"]');
  const expectedExternalURL = await externalRoute.evaluate(element => {
    const store = window.fxStoreById?.(element.dataset.storeId);
    return window.routeFor?.(store, element.dataset.rc3ExternalRoute)?.url || '';
  });
  const externalPagePromise = context.waitForEvent('page', {timeout: 5000});
  await externalRoute.tap();
  const externalPage = await externalPagePromise;
  await externalPage.waitForLoadState('domcontentloaded');
  await check(
    Promise.resolve(externalPage.url() === expectedExternalURL),
    `${storeName} 주문앱을 원본 Preview와 분리된 화면으로 열기`
  );
  await page.evaluate(() => window.dispatchEvent(new Event('blur')));
  const preparedTrigger = page.locator('#modal:not([hidden]) [data-rc3-other-methods]');
  await preparedTrigger.waitFor({state: 'visible', timeout: 3000});
  await preparedTrigger.evaluate(element => { element.dataset.testPreparedBeforeReturn = '1'; });
  await check(
    preparedTrigger.isVisible(),
    `${storeName} 외부 주문앱이 열린 동안 원본 Preview를 가게 상세로 미리 안정화`
  );
  await check(
    page.locator('#modal:not([hidden]) .order-methods-sheet').isVisible(),
    `${storeName} 외부 주문앱이 열린 동안 주문앱 목록을 닫지 않음`
  );
  await externalPage.close();
  await page.bringToFront();
  if (nativeResume) {
    await page.evaluate(async () => {
      let hidden = true;
      Object.defineProperty(document, 'hidden', {configurable: true, get: () => hidden});
      Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => hidden ? 'hidden' : 'visible'});
      document.dispatchEvent(new Event('visibilitychange'));
      await new Promise(resolve => setTimeout(resolve, 30));
      hidden = false;
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('focus'));
    });
  } else {
    // A focus-only Kakao return is accepted after the short hand-off bounce
    // window. Model actual time spent in the order app instead of an immediate
    // synthetic focus that the production code correctly ignores.
    await page.waitForTimeout(700);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
  }
  await page.waitForFunction(
    id => {
      const modal = document.querySelector('#modal:not([hidden])');
      const detail = modal?.querySelector(`.store-detail[data-store-id="${CSS.escape(id)}"]`);
      const button = detail?.querySelector('[data-rc3-other-methods]');
      return Boolean(button && getComputedStyle(button).pointerEvents === 'auto');
    },
    storeName === '본스치킨 미평점' ? 'a100000000000001' : 'a100000000000002',
    {polling: 25, timeout: 5000}
  );

  const returnedTrigger = page.locator('#modal:not([hidden]) [data-rc3-other-methods]');
  await check(
    returnedTrigger.evaluate(element => element.dataset.testPreparedBeforeReturn === '1'),
    `${storeName} 복귀 뒤 준비된 상세 DOM을 그대로 유지`
  );
  const returnedHitTarget = await returnedTrigger.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return Boolean(hit && (hit === element || element.contains(hit)));
  });
  await check(Promise.resolve(returnedHitTarget), `${storeName} 복귀 뒤 버튼 위에 투명 가림막 없음`);
  await check(
    page.locator('#modal:not([hidden]) .order-methods-sheet').isVisible(),
    `${storeName} 외부 주문앱 복귀 뒤 주문앱 목록 열린 상태 유지`
  );

  // Samsung Kakao WebView can deliver the first route selection after native
  // app return as click without the pointerdown timestamp used before pause.
  // Choose a different app directly from the list preserved across return.
  const returnedExternalRoute = page.locator('#modal:not([hidden]) [data-rc3-external-route="coupang"]');
  const returnedExpectedURL = await returnedExternalRoute.evaluate(element => {
    const store = window.fxStoreById?.(element.dataset.storeId);
    return store?.routes?.find(route => route.key === element.dataset.rc3ExternalRoute)?.url || '';
  });
  const returnedExternalPagePromise = context.waitForEvent('page', {timeout: 5000});
  await returnedExternalRoute.evaluate(element => {
    element.dispatchEvent(new MouseEvent('click', {
      bubbles: true,
      cancelable: true,
      detail: 1,
      view: window
    }));
  });
  const returnedExternalPage = await returnedExternalPagePromise;
  await returnedExternalPage.waitForLoadState('domcontentloaded');
  await check(
    Promise.resolve(returnedExternalPage.url() === returnedExpectedURL),
    `${storeName} 복귀 뒤 목록을 다시 열지 않고 다른 주문앱 곧바로 실행`
  );
  await returnedExternalPage.close();
  await page.bringToFront();
  await resetScenarioState();
}

async function checkConditionalOrderLabel(storeName, expectedLabel, {singleYogiyo = false} = {}) {
  report.currentStore = storeName;
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(
    () => window.daedongCatalogReady && typeof window.daedongCatalogReady.then === 'function',
    null,
    {polling: 25, timeout: 10000}
  );
  await page.evaluate(() => window.daedongCatalogReady);
  await page.waitForFunction(() => typeof window.openStore === 'function', null, {timeout: 25000});
  await page.locator('#mainSearch').fill(storeName);
  const card = page.locator('#storeGrid .store-card').filter({hasText: storeName}).first();
  await card.waitFor({state: 'visible', timeout: 10000});
  await card.tap();

  const trigger = page.locator('#modal:not([hidden]) [data-rc3-other-methods]');
  await trigger.waitFor({state: 'visible', timeout: 10000});
  await check(trigger.locator('span').innerText().then(text => text.trim() === expectedLabel), `${storeName} 버튼 문구가 ${expectedLabel}`);
  await check(
    trigger.getAttribute('data-rc3-single-external').then(value => singleYogiyo ? value === 'yogiyo' : value === null),
    `${storeName} 주문앱 구성에 맞는 버튼 동작 지정`
  );
  if (singleYogiyo) {
    await page.evaluate(() => {
      window.__singleYogiyoNativeLaunches = [];
      window.daedongLaunchMobileRoute = async (key, href) => {
        window.__singleYogiyoNativeLaunches.push({key, href});
      };
    });
    await trigger.tap();
    await page.waitForFunction(() => window.__singleYogiyoNativeLaunches?.length === 1, null, {timeout: 5000});
    await check(
      page.evaluate(() => {
        const launch = window.__singleYogiyoNativeLaunches?.[0];
        return launch?.key === 'yogiyo' && launch?.href === 'https://ws.yogiyo.co.kr/48zrgs';
      }),
      `${storeName} 추가 확인 없이 정상 요기요 앱 가게 화면으로 바로 실행`
    );
    await check(
      Promise.resolve(new URL(page.url()).origin === baseOrigin),
      `${storeName} 요기요 실행 뒤 원본 Preview 문서 유지`
    );
  } else {
    await trigger.tap();
    await check(
      page.locator('#modal:not([hidden]) .order-methods-sheet').isVisible(),
      `${storeName} 지역 주문앱 추가 뒤 다른 주문방법 선택창 유지`
    );
  }
  await resetScenarioState();
}

try {
  await checkStore('본스치킨 미평점', 'browser-other-order-method-touch-vons.png');
  await checkStore('손수김밥 양지점', 'browser-other-order-method-touch-handsu.png', {nativeResume: true});
  await checkConditionalOrderLabel('요기요 단독 검증가게', '요기요로 주문하기', {singleYogiyo: true});
  await checkConditionalOrderLabel('지역앱 추가 검증가게', '다른 주문방법 보기');
  await check(Promise.resolve(report.errors.length === 0), '네 가게 모바일 터치 중 브라우저 오류 없음');
  report.success = true;
} catch (error) {
  report.failure = error.stack || String(error);
  report.debug = await page.evaluate(() => ({
    modalHidden: document.querySelector('#modal')?.hidden,
    modalText: document.querySelector('#modal')?.innerText?.slice(0, 1000) || '',
    modalHtml: document.querySelector('#modal')?.innerHTML?.slice(0, 2000) || '',
    returnedTouchState: window.__returnedOrderMethodTouchState || []
  })).catch(() => null);
  await page.screenshot({path: 'browser-other-order-method-touch-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-other-order-method-touch-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
