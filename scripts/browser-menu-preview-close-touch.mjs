import fs from 'node:fs';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const storeId = 'a089d1d54720b48e';
const store = {
  store_id: storeId,
  name: '카카오톡 닫기 검증 가게',
  district: '미평동',
  category: '치킨',
  categories: ['치킨'],
  hasMenu: true,
  channelKeys: ['phone'],
  routes: [{name: '전화주문', url: 'tel:0610000000', enabled: true}]
};
const menu = {
  displayName: '카카오톡 닫기 검증 메뉴',
  mainImage: 'assets/logo.png',
  categories: ['전체', '치킨'],
  items: [{
    id: 'touch-close-menu-1',
    category: '치킨',
    name: '터치 닫기 검증 메뉴',
    description: '카카오톡 안드로이드 웹뷰 닫기 버튼 검증용 메뉴',
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
await context.addInitScript(() => {
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1', '1');
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

const openPreview = async () => {
  const detail = page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${storeId}"]`);
  if (!await detail.isVisible()) {
    await page.locator(`#storeGrid .store-card[data-id="${storeId}"]`).tap();
    await detail.waitFor({state: 'visible', timeout: 10000});
  }
  await page.locator(`[data-store-menu-preview="${storeId}"]`).tap();
  await page.waitForSelector('[data-store-menu-overlay]:not([hidden]) .store-menu-preview', {timeout: 5000});
};

const dispatchTouchClose = async locator => {
  const box = await locator.boundingBox();
  if (!box) throw new Error('메뉴 닫기 버튼 위치를 확인할 수 없습니다.');
  const point = {x: box.x + box.width / 2, y: box.y + box.height / 2};
  await locator.evaluate((button, position) => {
    const touch = {identifier: 71, clientX: position.x, clientY: position.y};
    const dispatch = (type, touches, changedTouches) => {
      const event = new Event(type, {bubbles: true, cancelable: true});
      Object.defineProperties(event, {
        touches: {value: touches},
        targetTouches: {value: touches},
        changedTouches: {value: changedTouches}
      });
      button.dispatchEvent(event);
    };
    dispatch('touchstart', [touch], [touch]);
    dispatch('touchend', [], [touch]);
  }, point);
};

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof openStore === 'function', null, {timeout: 15000});

  const closeButtons = [
    {index: 0, label: '왼쪽 화살표'},
    {index: 1, label: '오른쪽 X'}
  ];
  for (const {index, label} of closeButtons) {
    await openPreview();
    const buttons = page.locator('[data-store-menu-overlay]:not([hidden]) [data-menu-preview-close]');
    await check(buttons.count().then(count => count === 2), `${label}: 두 메뉴 닫기 버튼 유지`);
    await dispatchTouchClose(buttons.nth(index));
    await page.waitForFunction(() => document.querySelector('[data-store-menu-overlay]')?.hidden === true, null, {timeout: 1000});
    await check(page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${storeId}"]`).isVisible(), `${label}: 음식 미리보기를 닫고 가게 상세로 복귀`);
    await check(page.evaluate(() => history.state?.daedongMenuPreview !== true), `${label}: 메뉴 미리보기 히스토리 정리`);
  }

  await page.screenshot({path: 'browser-menu-preview-close-touch.png', fullPage: false});
  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  report.diagnostics = await page.evaluate(() => ({
    url: location.href,
    title: document.title,
    readyState: document.readyState,
    bodyText: document.body?.innerText?.slice(0, 1000) || '',
    storeGridHTML: document.querySelector('#storeGrid')?.innerHTML?.slice(0, 1000) || '',
    scripts: [...document.scripts].map(script => script.src || 'inline').slice(-12)
  })).catch(diagnosticError => ({error: diagnosticError.message}));
  await page.screenshot({path: 'browser-menu-preview-close-touch-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-menu-preview-close-touch-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
