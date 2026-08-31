import fs from 'node:fs';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const storeId = 'a089d1d54720b48e';
const store = {
  store_id: storeId,
  name: '공용 닫기 검증 가게',
  district: '미평동',
  category: '치킨',
  categories: ['치킨'],
  hasMenu: true,
  channelKeys: ['phone'],
  routes: [{name: '전화주문', url: 'tel:0610000000', enabled: true}]
};
const menu = {
  displayName: '공용 닫기 검증 메뉴',
  mainImage: 'assets/logo.png',
  categories: ['전체', '치킨'],
  items: [{
    id: 'modal-close-touch-menu',
    category: '치킨',
    name: '공용 닫기 검증 메뉴',
    description: '카카오톡 터치와 클릭 관통 검증용 메뉴',
    image: ''
  }]
};
const report = {success: false, checks: [], errors: []};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH
    ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH}
    : {})
});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  isMobile: true,
  hasTouch: true,
  locale: 'ko-KR',
  userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.6.0'
});
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
await context.route(`**/api/store/${storeId}/menu`, route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(menu)
}));
await context.route(`**/api/store/${storeId}`, route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(store)
}));
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));

const check = async (condition, message) => {
  const ok = await condition;
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};

const dispatchTouch = async locator => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('터치 대상 위치를 확인할 수 없습니다.');
  const point = {x: box.x + box.width / 2, y: box.y + box.height / 2};
  await locator.evaluate((target, position) => {
    const touch = {identifier: 81, clientX: position.x, clientY: position.y};
    const dispatch = (type, touches, changedTouches) => {
      const event = new Event(type, {bubbles: true, cancelable: true});
      Object.defineProperties(event, {
        touches: {value: touches},
        targetTouches: {value: touches},
        changedTouches: {value: changedTouches}
      });
      target.dispatchEvent(event);
    };
    dispatch('touchstart', [touch], [touch]);
    dispatch('touchend', [], [touch]);
  }, point);
};

const waitForModalHistory = async () => {
  await page.waitForFunction(() => !history.state?.daedongModal, null, {timeout: 3000}).catch(() => {});
  await page.waitForTimeout(120);
};

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof window.installDaedongTapAction === 'function', null, {timeout: 15000});

  const intro = page.locator('#communityIntro');
  await intro.waitFor({state: 'visible', timeout: 5000});
  await dispatchTouch(page.locator('#communityIntroClose'));
  await check(intro.evaluate(node => node.hidden), '첫 안내창 X가 순수 touchstart/touchend로 닫힘');
  await page.waitForTimeout(900);
  const summer = page.locator('#mukkebiSummerEvent');
  await check(summer.evaluate(node => node.hidden), '첫 안내창을 닫은 직후 먹깨비 팝업이 연달아 뜨지 않음');
  await page.waitForFunction(() => {
    const popup = document.querySelector('#mukkebiSummerEvent');
    return popup?.hidden === false || popup?.dataset.blockReason === 'campaign-ended';
  }, null, {timeout: 5000});
  const summerCampaignEnded = await summer.getAttribute('data-block-reason') === 'campaign-ended';
  if (summerCampaignEnded) {
    await check(summer.isHidden(), '종료된 먹깨비 행사는 공용 닫기 검증 중에도 표시하지 않음');
  } else {
    await summer.waitFor({state: 'visible', timeout: 5000});
    await dispatchTouch(page.locator('#mukkebiSummerClose'));
    await check(summer.evaluate(node => node.hidden), '두 번째 먹깨비 행사창 X가 순수 touchstart/touchend로 닫힘');
  }

  await page.evaluate(() => {
    const sentinel = document.createElement('button');
    sentinel.id = 'modalCloseTapThroughSentinel';
    sentinel.type = 'button';
    sentinel.style.cssText = 'position:fixed;right:14px;top:10px;width:64px;height:64px;z-index:1';
    sentinel.addEventListener('click', () => { window.__modalCloseTapThrough = (window.__modalCloseTapThrough || 0) + 1; });
    document.body.append(sentinel);
    window.__modalCloseTapThrough = 0;
    openModal('<section><h2 id="modalTitle">관통 방지 검증</h2><p>공용 모달</p></section>');
  });
  await page.locator('#modal .modal-close').tap();
  await page.waitForFunction(() => document.querySelector('#modal')?.hidden === true, null, {timeout: 1000});
  await page.waitForTimeout(180);
  await check(page.evaluate(() => window.__modalCloseTapThrough === 0), 'X를 닫은 같은 탭이 아래 버튼으로 관통하지 않음');
  await waitForModalHistory();

  await page.evaluate(() => openModal('<section><h2 id="modalTitle">순수 터치 검증</h2></section>'));
  await dispatchTouch(page.locator('#modal .modal-close'));
  await check(page.locator('#modal').evaluate(node => node.hidden), '공용 모달 X가 순수 touchstart/touchend로 닫힘');
  await waitForModalHistory();

  await page.evaluate(() => {
    openModal('<section><h2 id="modalTitle">이전 목록</h2></section>');
    openModal('<section><h2 id="modalTitle">중첩 상세</h2></section>');
  });
  await dispatchTouch(page.locator('#modal .modal-close'));
  await page.waitForFunction(() => document.querySelector('#modalTitle')?.textContent === '이전 목록', null, {timeout: 1500});
  await check(page.locator('#modalTitle').textContent().then(text => text === '이전 목록'), '중첩 상세 X가 이전 목록으로 복귀');
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('#modal')?.hidden === true, null, {timeout: 1500});

  await page.locator('[data-store-service-quick-benefit]').tap();
  const serviceOverlay = page.locator('[data-store-service-overview-overlay]');
  await serviceOverlay.waitFor({state: 'visible', timeout: 3000});
  const serviceClose = page.locator('[data-store-service-overview-close]');
  report.serviceCloseProbe = await serviceClose.evaluate(button => {
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return {rect: {x: rect.x, y: rect.y, width: rect.width, height: rect.height}, hit: hit?.outerHTML?.slice(0, 180) || ''};
  });
  await dispatchTouch(serviceClose);
  await page.waitForFunction(() => document.querySelector('[data-store-service-overview-overlay]')?.hidden === true, null, {timeout: 1500});
  await check(serviceOverlay.evaluate(node => node.hidden), '영업시간·결제·배달혜택 화면 X가 순수 터치로 닫힘');

  await page.waitForFunction(() => window.areaModal?.name === 'addressModal', null, {timeout: 8000});
  await page.locator('#locationBtn').tap();
  await page.waitForSelector('#modal:not([hidden]) [data-rc7-step="saved"]', {timeout: 3000});
  await page.evaluate(() => {
    document.querySelector('[data-rc7-step="saved"]').hidden = true;
    document.querySelector('[data-rc7-step="map"]').hidden = false;
  });
  await dispatchTouch(page.locator('[data-rc7-step="map"] [data-rc7-step-back]'));
  await check(page.locator('[data-rc7-step="saved"]').evaluate(node => !node.hidden), '주소 지도 왼쪽 화살표가 순수 터치로 이전 단계 복귀');
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('#modal')?.hidden === true, null, {timeout: 1500});

  await page.locator(`#storeGrid .store-card[data-id="${storeId}"]`).tap();
  await page.waitForSelector(`#modal:not([hidden]) .store-detail[data-store-id="${storeId}"]`, {timeout: 5000});
  await page.locator(`[data-store-menu-preview="${storeId}"]`).tap();
  await page.waitForSelector('[data-store-menu-overlay]:not([hidden]) [data-menu-select]', {timeout: 5000});
  await page.locator('[data-menu-select]').first().tap();
  const orderSheet = page.locator('[data-menu-order-sheet]');
  await orderSheet.waitFor({state: 'visible', timeout: 3000});
  await dispatchTouch(orderSheet.locator('.menu-order-sheet-panel [data-menu-order-sheet-close]'));
  await page.waitForFunction(() => document.querySelector('[data-menu-order-sheet]')?.hidden === true, null, {timeout: 1500});
  await check(page.locator('.store-menu-preview').isVisible(), '주문방법 선택 시트 X가 순수 터치로 닫히고 음식 미리보기 유지');
  await dispatchTouch(page.locator('[data-store-menu-overlay]:not([hidden]) [data-menu-preview-close]').first());
  await page.waitForFunction(() => document.querySelector('[data-store-menu-overlay]')?.hidden === true, null, {timeout: 1500});
  await dispatchTouch(page.locator('#modal .modal-close'));
  await page.waitForFunction(() => document.querySelector('#modal')?.hidden === true, null, {timeout: 1500});
  await waitForModalHistory();

  await page.waitForFunction(() => typeof rc2OpenRailList === 'function', null, {timeout: 3000});
  await page.evaluate(() => rc2OpenRailList('near'));
  await page.waitForFunction(() => document.querySelector('#modalTitle')?.textContent === '지금 가까운 가게', null, {timeout: 1500});
  await dispatchTouch(page.locator('#modal .modal-close'));
  await check(page.locator('#modal').evaluate(node => node.hidden), '지금 가까운 가게 X가 순수 touchstart/touchend로 닫힘');

  await page.screenshot({path: 'browser-modal-close-touch.png', fullPage: false});
  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  report.diagnostics = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    readyState: document.readyState,
    bodyText: document.body?.innerText?.slice(0, 1200) || '',
    modalHidden: document.querySelector('#modal')?.hidden,
    modalTitle: document.querySelector('#modalTitle')?.textContent || '',
    bodyClasses: document.body?.className || ''
  })).catch(diagnosticError => ({error: diagnosticError.message}));
  await page.screenshot({path: 'browser-modal-close-touch-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-modal-close-touch-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
