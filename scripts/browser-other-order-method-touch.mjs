import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const report = {success: false, viewport: {width: 390, height: 844}, checks: [], errors: [], stores: []};
const stores = [
  {
    store_id: 'a100000000000001',
    name: '본스치킨 미평점',
    district: '미평동',
    category: '치킨',
    categories: ['치킨'],
    channelKeys: ['yogiyo', 'baemin'],
    routes: [
      {name: '요기요', url: 'https://orders.example.test/yogiyo/vons', enabled: true},
      {name: '배달의민족', url: 'https://orders.example.test/baemin/vons', enabled: true}
    ]
  },
  {
    store_id: 'a100000000000002',
    name: '손수김밥 양지점',
    district: '미평동',
    category: '한식',
    categories: ['한식'],
    channelKeys: ['yogiyo', 'baemin'],
    routes: [
      {name: '요기요', url: 'https://orders.example.test/yogiyo/handsu', enabled: true},
      {name: '배달의민족', url: 'https://orders.example.test/baemin/handsu', enabled: true}
    ]
  }
];
const detailsById = new Map(stores.map(store => [store.store_id, store]));
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({
  viewport: report.viewport,
  isMobile: true,
  hasTouch: true,
  locale: 'ko-KR',
  userAgent: 'Mozilla/5.0 (Linux; Android 15; SM-S938N Build/AP3A.240905.015.A2) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36 KAKAOTALK 25.7.2'
});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV1', '1');
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
await context.route('**/api/store/*', route => {
  const id = new URL(route.request().url()).pathname.split('/').filter(Boolean).at(-1);
  const detail = detailsById.get(id);
  return route.fulfill({
    status: detail ? 200 : 404,
    contentType: 'application/json',
    body: JSON.stringify(detail || {error: 'not found'})
  });
});
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));

const check = async (condition, message) => {
  const ok = await condition;
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};

async function checkStore(storeName, screenshotName) {
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
  await page.screenshot({path: screenshotName, fullPage: false});

  const externalRoute = page.locator('.order-methods-sheet [data-rc3-external-route]').first();
  await externalRoute.tap();
  const guide = page.locator('#modal:not([hidden]) .community-guide');
  await guide.waitFor({state: 'visible', timeout: 3000});
  const externalLink = guide.locator('a[data-community-original]');
  await externalLink.waitFor({state: 'visible', timeout: 3000});
  const expectedExternalURL = await externalLink.getAttribute('href');

  await Promise.all([
    page.waitForURL(url => url.hostname === 'orders.example.test', {timeout: 5000}),
    externalLink.tap()
  ]);
  await check(
    Promise.resolve(page.url() === expectedExternalURL),
    `${storeName} 외부 주문앱을 새 탭이 아닌 복귀 가능한 현재 탭으로 열기`
  );

  await page.goBack({waitUntil: 'domcontentloaded'});
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
  const returnedHitTarget = await returnedTrigger.evaluate(element => {
    const rect = element.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return Boolean(hit && (hit === element || element.contains(hit)));
  });
  await check(Promise.resolve(returnedHitTarget), `${storeName} 복귀 뒤 버튼 위에 투명 가림막 없음`);

  await returnedTrigger.tap();
  await page.waitForFunction(
    () => document.querySelector('#modal:not([hidden]) .order-methods-sheet')?.getBoundingClientRect().height > 0,
    null,
    {polling: 25, timeout: 3000}
  );
  await check(
    page.locator('#modal:not([hidden]) .order-methods-sheet').isVisible(),
    `${storeName} 외부 주문앱 복귀 뒤 두 번째 터치로 다시 열림`
  );
}

try {
  await checkStore('본스치킨 미평점', 'browser-other-order-method-touch-vons.png');
  await checkStore('손수김밥 양지점', 'browser-other-order-method-touch-handsu.png');
  await check(Promise.resolve(report.errors.length === 0), '두 가게 모바일 터치 중 브라우저 오류 없음');
  report.success = true;
} catch (error) {
  report.failure = error.stack || String(error);
  report.debug = await page.evaluate(() => ({
    modalHidden: document.querySelector('#modal')?.hidden,
    modalText: document.querySelector('#modal')?.innerText?.slice(0, 1000) || '',
    modalHtml: document.querySelector('#modal')?.innerHTML?.slice(0, 2000) || ''
  })).catch(() => null);
  await page.screenshot({path: 'browser-other-order-method-touch-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-other-order-method-touch-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
