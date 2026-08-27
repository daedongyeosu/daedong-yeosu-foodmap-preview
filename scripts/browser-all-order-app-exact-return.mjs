import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const loadBrowserRuntime = async () => {
  try {
    return {playwright: await import('playwright'), launchOptions: {headless: true}};
  } catch {}
  const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (!runtimeModules) throw new Error('playwright 패키지를 찾을 수 없습니다.');
  const playwright = await import(pathToFileURL(path.join(runtimeModules, 'playwright-core', 'index.mjs')).href);
  const sparticuz = await import(pathToFileURL(path.join(runtimeModules, '@sparticuz', 'chromium', 'build', 'esm', 'index.js')).href);
  const chromiumBinary = sparticuz.default;
  chromiumBinary.setGraphicsMode = false;
  return {
    playwright,
    launchOptions: {
      headless: true,
      executablePath: await chromiumBinary.executablePath(),
      args: chromiumBinary.args
    }
  };
};

const {playwright, launchOptions} = await loadBrowserRuntime();
const {chromium} = playwright;
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const baseOrigin = new URL(baseURL).origin;
const report = {
  success: false,
  viewport: {width: 390, height: 844},
  apps: [],
  checks: [],
  errors: []
};

const appDefinitions = [
  {key: 'mukkebi', label: '먹깨비', routeName: '먹깨비'},
  {key: 'ddangyo', label: '땡겨요', routeName: '땡겨요'},
  {key: 'yogiyo', label: '요기요', routeName: '요기요'},
  {key: 'coupang', label: '쿠팡이츠', routeName: '쿠팡이츠'},
  {key: 'baemin', label: '배달의민족', routeName: '배달의민족'}
];
const routeUrl = (key, id) => {
  if (key === 'ddangyo') return `https://fdofd.ddangyo.com/gateway1.html?RETURN${id}`;
  if (key === 'yogiyo') return `https://www.yogiyo.co.kr/mobile/#/${id}`;
  if (key === 'coupang') return `https://www.coupangeats.com/store/${id}`;
  if (key === 'baemin') return `https://www.baemin.com/store/${id}`;
  return `https://orders.example.test/${key}/${id}`;
};
const stores = Array.from({length: 14}, (_, index) => {
  const id = `a${String(index + 1).padStart(15, '0')}`;
  return {
    store_id: id,
    name: `복귀검증가게 ${String(index + 1).padStart(2, '0')}`,
    district: index % 2 ? '미평동' : '둔덕동',
    category: index % 2 ? '한식' : '치킨',
    categories: [index % 2 ? '한식' : '치킨'],
    channelKeys: appDefinitions.map(app => app.key),
    hasMenu: true,
    routes: appDefinitions.map(app => ({name: app.routeName, url: routeUrl(app.key, id), enabled: true}))
  };
});
const detailsById = new Map(stores.map(store => [store.store_id, store]));
const menuFixture = {
  displayName: '복귀 검증 메뉴',
  mainImage: 'assets/logo.png',
  categories: ['전체', '한식'],
  items: Array.from({length: 16}, (_, index) => ({
    id: `menu-${index + 1}`,
    category: '한식',
    name: `복귀 검증 메뉴 ${index + 1}`,
    description: `주문앱 복귀 위치 검증용 메뉴 ${index + 1}`,
    image: ''
  }))
};

const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({
  viewport: report.viewport,
  locale: 'ko-KR',
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 KAKAOTALK 25.6.0'
});

await context.addInitScript(({origin}) => {
  if (location.origin !== origin) return;
  try {
    sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV1', '1');
    const keys = ['daedongExternalReturnRc2', 'daedongAppBrowserReturnV1'];
    const saved = keys.map(key => JSON.parse(localStorage.getItem(key) || 'null')).find(value => value?.returnToken);
    if (saved?.returnToken) {
      history.replaceState({...history.state, daedongExternalReturnToken: saved.returnToken}, '');
    }
  } catch {}
}, {origin: baseOrigin});

await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
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
await context.route('**/api/store/*/menu', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(menuFixture)
}));
await context.route('**/api/store/*', route => {
  const id = new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-1);
  const detail = detailsById.get(id);
  return route.fulfill({
    status: detail ? 200 : 404,
    contentType: 'application/json',
    body: JSON.stringify(detail || {error: 'not found'})
  });
});
for (const pattern of ['https://orders.example.test/**', 'https://fdofd.ddangyo.com/**', 'https://www.yogiyo.co.kr/**', 'https://www.coupangeats.com/**', 'https://www.baemin.com/**']) {
  await context.route(pattern, route => route.fulfill({
    status: 200,
    contentType: 'text/html; charset=utf-8',
    body: '<!doctype html><meta name="viewport" content="width=device-width"><title>주문앱</title><p>외부 주문앱 화면</p>'
  }));
}

const check = async (condition, message) => {
  const ok = await condition;
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};

const readyPage = async () => {
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.evaluate(() => window.daedongCatalogReady);
  await page.waitForFunction(() => typeof window.openAppBrowser === 'function' && document.querySelectorAll('#storeGrid .store-card').length > 0, null, {timeout: 20000});
  return page;
};

const coldReturnPage = async (returnURL = baseURL) => {
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(returnURL, {waitUntil: 'domcontentloaded'});
  return page;
};

try {
  const lifecyclePage = await readyPage();
  await lifecyclePage.evaluate(() => {
    window.__departureLifecycleLaunches = [];
    window.daedongLaunchMobileRoute = (key, href) => {
      window.__departureLifecycleLaunches.push({key, href});
    };
    openAppBrowser('baemin');
  });
  const lifecycleTarget = lifecyclePage.locator('#modal:not([hidden]) [data-app-store-order]').nth(8);
  await lifecycleTarget.waitFor({state: 'visible', timeout: 5000});
  await lifecycleTarget.scrollIntoViewIfNeeded();
  const lifecycleStoreId = await lifecycleTarget.getAttribute('data-app-store-order');
  await lifecycleTarget.click();
  await lifecyclePage.waitForFunction(() => window.__departureLifecycleLaunches?.length === 1, null, {timeout: 5000});
  const storedBeforeBounce = await lifecyclePage.evaluate(() => Boolean(
    JSON.parse(sessionStorage.getItem('daedongAppBrowserReturnV1') || 'null')?.returnToken
  ));
  await check(Promise.resolve(storedBeforeBounce), '주문앱 실행 직후 일회용 복귀표 저장');

  await lifecyclePage.evaluate(() => {
    window.dispatchEvent(new Event('blur'));
    window.dispatchEvent(new Event('focus'));
  });
  await lifecyclePage.waitForTimeout(120);
  const afterDepartureBounce = await lifecyclePage.evaluate(() => ({
    returnStateKept: Boolean(JSON.parse(sessionStorage.getItem('daedongAppBrowserReturnV1') || 'null')?.returnToken),
    correctApp: document.querySelector('#modal:not([hidden])')?.dataset.appBrowserKey === 'baemin'
  }));
  await check(Promise.resolve(afterDepartureBounce.returnStateKept), '출발 중 blur→focus 튐에서 복귀표를 소비하지 않음');
  await check(Promise.resolve(afterDepartureBounce.correctApp), '출발 중 가짜 focus에서 배달의민족 목록 유지');

  await lifecyclePage.evaluate(async () => {
    let hidden = true;
    Object.defineProperty(document, 'hidden', {configurable: true, get: () => hidden});
    Object.defineProperty(document, 'visibilityState', {configurable: true, get: () => hidden ? 'hidden' : 'visible'});
    document.dispatchEvent(new Event('visibilitychange'));
    await new Promise(resolve => setTimeout(resolve, 30));
    hidden = false;
    document.dispatchEvent(new Event('visibilitychange'));
  });
  const afterConfirmedReturn = await lifecyclePage.evaluate(storeId => ({
    correctApp: document.querySelector('#modal:not([hidden])')?.dataset.appBrowserKey === 'baemin',
    sameStorePresent: Boolean(document.querySelector(`[data-app-store-order="${CSS.escape(storeId)}"]`)),
    returnStateKept: Boolean(sessionStorage.getItem('daedongAppBrowserReturnV1')),
    localReturnStateKept: Boolean(localStorage.getItem('daedongAppBrowserReturnV1')),
    href: location.href
  }), lifecycleStoreId);
  report.departureLifecycleDebug = afterConfirmedReturn;
  await check(Promise.resolve(afterConfirmedReturn.correctApp), '실제 hidden→visible 복귀 뒤 배달의민족 목록 유지');
  await check(Promise.resolve(afterConfirmedReturn.sameStorePresent), '실제 복귀 뒤 눌렀던 가게가 있는 동일 목록 유지');
  await check(Promise.resolve(afterConfirmedReturn.returnStateKept), '늦은 시스템 뒤로가기를 막도록 복귀 직후 일회용 복귀표 유지');
  await lifecyclePage.waitForTimeout(1800);
  await lifecyclePage.evaluate(() => window.dispatchEvent(new PopStateEvent('popstate', {state: {}})));
  await lifecyclePage.waitForTimeout(120);
  const afterDelayedSystemPop = await lifecyclePage.evaluate(() => ({
    correctApp: document.querySelector('#modal:not([hidden])')?.dataset.appBrowserKey === 'baemin',
    returnStateKept: Boolean(sessionStorage.getItem('daedongAppBrowserReturnV1'))
  }));
  await check(Promise.resolve(afterDelayedSystemPop.correctApp), '1.5초 뒤 늦게 도착한 시스템 뒤로가기에도 목록 유지');
  await check(Promise.resolve(afterDelayedSystemPop.returnStateKept), '늦은 시스템 뒤로가기 처리 뒤에도 고객 조작 전 복귀표 유지');
  await lifecyclePage.locator('#modal:not([hidden]) .modal-card').dispatchEvent('pointerup', {pointerId: 1, button: 0, clientX: 180, clientY: 420});
  await lifecyclePage.waitForFunction(() => !sessionStorage.getItem('daedongAppBrowserReturnV1'), null, {timeout: 5000});
  await check(Promise.resolve(true), '복귀 화면에서 고객이 조작하면 일회용 복귀표 소비');
  report.departureLifecycle = {storeId: lifecycleStoreId, afterDepartureBounce, afterConfirmedReturn, afterDelayedSystemPop};
  await lifecyclePage.close();

  const focusOnlyPage = await readyPage();
  await focusOnlyPage.evaluate(() => {
    window.daedongLaunchMobileRoute = () => {};
    openAppBrowser('yogiyo');
  });
  const focusOnlyTarget = focusOnlyPage.locator('#modal:not([hidden]) [data-app-store-order]').nth(6);
  await focusOnlyTarget.waitFor({state: 'visible', timeout: 5000});
  await focusOnlyTarget.click();
  await focusOnlyPage.waitForFunction(() => Boolean(
    JSON.parse(sessionStorage.getItem('daedongAppBrowserReturnV1') || 'null')?.returnToken
  ), null, {timeout: 5000});
  await focusOnlyPage.evaluate(() => window.dispatchEvent(new Event('blur')));
  await focusOnlyPage.waitForTimeout(720);
  await focusOnlyPage.evaluate(() => window.dispatchEvent(new Event('focus')));
  const focusOnlyReturn = await focusOnlyPage.evaluate(() => ({
    correctApp: document.querySelector('#modal:not([hidden])')?.dataset.appBrowserKey === 'yogiyo',
    returnStateKept: Boolean(sessionStorage.getItem('daedongAppBrowserReturnV1'))
  }));
  await check(Promise.resolve(focusOnlyReturn.correctApp), 'hidden 신호가 없는 blur→focus 복귀에서도 요기요 목록 유지');
  await check(Promise.resolve(focusOnlyReturn.returnStateKept), '충분히 지난 focus 단독 복귀도 고객 조작 전까지 복귀표 유지');
  await focusOnlyPage.locator('#modal:not([hidden]) .modal-card').dispatchEvent('pointerup', {pointerId: 2, button: 0, clientX: 180, clientY: 420});
  await focusOnlyPage.waitForFunction(() => !sessionStorage.getItem('daedongAppBrowserReturnV1'), null, {timeout: 5000});
  report.departureLifecycle.focusOnlyReturn = focusOnlyReturn;
  await focusOnlyPage.close();

  for (const app of appDefinitions) {
    const page = await readyPage();
    await page.evaluate(() => {
      window.__exactReturnLaunches = [];
      window.daedongLaunchMobileRoute = (key, href) => {
        window.__exactReturnLaunches.push({key, href});
      };
    });
    await page.evaluate(key => openAppBrowser(key), app.key);
    const buttons = page.locator('#modal:not([hidden]) [data-app-store-order]');
    await buttons.first().waitFor({state: 'visible', timeout: 5000});
    const target = buttons.nth(10);
    await target.scrollIntoViewIfNeeded();
    const before = await target.evaluate(element => {
      const modalCard = element.closest('.modal-card');
      const elementRect = element.getBoundingClientRect();
      const cardRect = modalCard.getBoundingClientRect();
      return {
        storeId: element.dataset.appStoreOrder,
        offset: elementRect.top - cardRect.top,
        modalScroll: modalCard.scrollTop
      };
    });
    await target.click();
    await page.waitForFunction(() => window.__exactReturnLaunches?.length === 1, null, {timeout: 10000});
    const launch = await page.evaluate(() => window.__exactReturnLaunches.at(-1));
    report.lastLaunch = {app: app.key, launch, href: page.url()};
    await check(Promise.resolve(launch?.key === app.key), `${app.label}: 올바른 외부 주문앱 직접 실행`);
    const returnURL = page.url();
    await page.close();

    const returned = await coldReturnPage(returnURL);
    const immediate = await returned.evaluate(({key, storeId}) => {
      const modal = document.getElementById('modal');
      const target = document.querySelector(`[data-app-store-order="${CSS.escape(storeId)}"]`);
      return {
        modalVisible: Boolean(modal && !modal.hidden),
        correctApp: modal?.dataset.appBrowserKey === key,
        correctStore: Boolean(target),
        homeBootVisible: document.documentElement.classList.contains('daedong-external-return-pending')
      };
    }, {key: app.key, storeId: before.storeId});
    await check(Promise.resolve(
      (immediate.modalVisible && immediate.correctApp && immediate.correctStore)
      || immediate.homeBootVisible
    ), `${app.label}: 홈 화면을 노출하지 않고 복귀 화면 또는 보호 화면 즉시 표시`);
    await returned.waitForFunction(() => !document.documentElement.classList.contains('daedong-external-return-pending'), null, {timeout: 20000});
    await returned.locator(`[data-app-store-order="${before.storeId}"]`).waitFor({state: 'visible', timeout: 20000});
    const settled = await returned.evaluate(({key, storeId}) => {
      const modal = document.getElementById('modal');
      return {
        modalVisible: Boolean(modal && !modal.hidden),
        correctApp: modal?.dataset.appBrowserKey === key,
        correctStore: Boolean(document.querySelector(`[data-app-store-order="${CSS.escape(storeId)}"]`))
      };
    }, {key: app.key, storeId: before.storeId});
    await check(Promise.resolve(settled.modalVisible && settled.correctApp), `${app.label}: 주문앱 가게목록 복구 완료`);
    await check(Promise.resolve(settled.correctStore), `${app.label}: 누른 가게가 있는 동일 목록 복구`);
    await returned.waitForTimeout(1800);
    const after = await returned.locator(`[data-app-store-order="${before.storeId}"]`).evaluate(element => {
      const modalCard = element.closest('.modal-card');
      return {
        offset: element.getBoundingClientRect().top - modalCard.getBoundingClientRect().top,
        modalScroll: modalCard.scrollTop
      };
    });
    const offsetDelta = Math.abs(after.offset - before.offset);
    await check(Promise.resolve(offsetDelta <= 3), `${app.label}: 보던 가게의 화면 위치 유지`);
    report.apps.push({key: app.key, label: app.label, storeId: before.storeId, before, after, offsetDelta, immediate, settled});
    await returned.screenshot({path: `browser-order-return-${app.key}.png`, fullPage: false});
    await returned.locator('#modal:not([hidden]) .modal-card').dispatchEvent('pointerup', {
      pointerId: 3,
      button: 0,
      clientX: 180,
      clientY: 420
    });
    await returned.waitForFunction(() => (
      !sessionStorage.getItem('daedongAppBrowserReturnV1')
      && !localStorage.getItem('daedongAppBrowserReturnV1')
    ), null, {timeout: 5000});
    await returned.close();
  }

  const menuPage = await readyPage();
  const menuStoreId = stores[0].store_id;
  await menuPage.evaluate(id => openStore(fxStoreById(id)), menuStoreId);
  await menuPage.locator(`#modal:not([hidden]) [data-store-menu-preview="${menuStoreId}"]`).click();
  const menuPreview = menuPage.locator(`[data-store-menu-overlay]:not([hidden]) .store-menu-preview[data-store-id="${menuStoreId}"]`);
  await menuPreview.waitFor({state: 'visible', timeout: 10000});
  const menuTarget = menuPreview.locator('[data-menu-id="menu-11"]');
  await menuTarget.scrollIntoViewIfNeeded();
  await menuTarget.click();
  const orderSheet = menuPreview.locator('[data-menu-order-sheet]:not([hidden])');
  await orderSheet.waitFor({state: 'visible', timeout: 5000});
  await orderSheet.locator('[data-menu-other-toggle]').click();
  await menuPage.evaluate(() => {
    window.__exactReturnLaunches = [];
    window.daedongLaunchMobileRoute = (key, href) => {
      window.__exactReturnLaunches.push({key, href});
    };
  });
  await orderSheet.locator('[data-menu-external-key="baemin"]').click();
  await menuPage.waitForFunction(() => window.__exactReturnLaunches?.length === 1, null, {timeout: 10000});
  const menuReturnURL = menuPage.url();
  await menuPage.close();

  const returnedMenu = await coldReturnPage(menuReturnURL);
  await returnedMenu.locator(`[data-store-menu-overlay]:not([hidden]) .store-menu-preview[data-store-id="${menuStoreId}"]`).waitFor({state: 'visible', timeout: 20000});
  await returnedMenu.locator('[data-menu-order-sheet]:not([hidden]) [data-selected-menu-name]').waitFor({state: 'visible', timeout: 10000});
  const menuResult = await returnedMenu.evaluate(({storeId}) => ({
    storeId: document.querySelector('[data-store-menu-overlay]:not([hidden]) .store-menu-preview')?.dataset.storeId || '',
    selectedMenu: document.querySelector('[data-menu-order-sheet]:not([hidden]) [data-selected-menu-name]')?.textContent?.trim() || '',
    homeBootVisible: document.documentElement.classList.contains('daedong-external-return-pending')
  }), {storeId: menuStoreId});
  await check(Promise.resolve(menuResult.storeId === menuStoreId), '가게 음식보기에서 주문앱 복귀 시 동일 가게 복구');
  await check(Promise.resolve(menuResult.selectedMenu === '복귀 검증 메뉴 11'), '가게 음식보기에서 주문앱 복귀 시 선택한 메뉴 주문창 복구');
  report.menu = menuResult;
  await returnedMenu.screenshot({path: 'browser-order-return-menu.png', fullPage: false});
  await returnedMenu.locator('[data-store-menu-overlay]:not([hidden]) .store-menu-preview').dispatchEvent('pointerup', {
    pointerId: 4,
    button: 0,
    clientX: 180,
    clientY: 420
  });
  await returnedMenu.waitForFunction(() => (
    !sessionStorage.getItem('daedongExternalReturnRc2')
    && !localStorage.getItem('daedongExternalReturnRc2')
  ), null, {timeout: 5000});
  await returnedMenu.close();

  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  const pages = context.pages();
  await pages.at(-1)?.screenshot({path: 'browser-order-return-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-all-order-app-exact-return-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

if (!report.success) process.exit(1);
