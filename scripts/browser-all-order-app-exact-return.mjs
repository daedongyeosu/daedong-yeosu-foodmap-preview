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

const coldReturnPage = async () => {
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  return page;
};

try {
  for (const app of appDefinitions) {
    const page = await readyPage();
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
    await page.waitForURL(url => url.origin !== baseOrigin, {timeout: 10000});
    await check(Promise.resolve(true), `${app.label}: 외부 주문앱으로 이동`);
    await page.close();

    const returned = await coldReturnPage();
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
    await check(Promise.resolve(immediate.modalVisible && immediate.correctApp), `${app.label}: 홈 화면을 거치지 않고 주문앱 가게목록 즉시 복구`);
    await check(Promise.resolve(immediate.correctStore), `${app.label}: 누른 가게가 있는 동일 목록 복구`);
    await returned.waitForFunction(() => !document.documentElement.classList.contains('daedong-external-return-pending'), null, {timeout: 20000});
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
    report.apps.push({key: app.key, label: app.label, storeId: before.storeId, before, after, offsetDelta, immediate});
    await returned.screenshot({path: `browser-order-return-${app.key}.png`, fullPage: false});
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
  await orderSheet.locator('[data-menu-external-key="baemin"]').click();
  await menuPage.waitForURL(url => url.origin !== baseOrigin, {timeout: 10000});
  await menuPage.close();

  const returnedMenu = await coldReturnPage();
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
