import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const report = {success: false, checks: [], errors: []};
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  locale: 'ko-KR'
});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));

const check = async (condition, message) => {
  const ok = await condition;
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};

async function openStore(storeId) {
  await page.evaluate(id => openStore(fxStoreById(id)), storeId);
  await page.waitForSelector(`#modal:not([hidden]) .store-detail[data-store-id="${storeId}"]`, {timeout: 5000});
  await check(
    page.locator(`[data-store-menu-preview="${storeId}"] strong`).innerText().then(value => value.trim() === '70개 ›'),
    `${storeId} 음식보기 70개 표시`
  );
  await page.locator(`[data-store-menu-preview="${storeId}"]`).click();
  await page.waitForSelector('.store-menu-preview', {timeout: 5000});
  await check(page.locator('#storeMenuTitle').innerText().then(value => value.trim() === '도미노피자'), `${storeId} 도미노 음식보기 열림`);
  await check(page.locator('[data-menu-card]').count().then(count => count === 70), `${storeId} 전체 메뉴 70개 로드`);
}

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('#storeGrid .store-card', {timeout: 15000});
  await page.waitForFunction(() => typeof fxStoreById === 'function' && typeof openStore === 'function');

  await openStore('2f4c3cfb0866c4a4');
  await check(
    page.locator('[data-menu-category]').allInnerTexts().then(values => values.join('|') === '전체|피자|사이드|음료|소스·피클'),
    '도미노 전용 메뉴 분류 표시'
  );
  await check(
    page.locator('.store-menu-hero dl').innerText().then(value => value.includes('46') && value.includes('10') && value.includes('8')),
    '도미노 피자·사이드·음료 수량 표시'
  );
  await page.locator('[data-menu-category="음료"]').click();
  await check(page.locator('[data-menu-card]:visible').count().then(count => count === 8), '음료 분류 8개 표시');
  await page.locator('[data-menu-category="전체"]').click();

  const search = page.locator('[data-menu-search]');
  await search.focus();
  await search.fill('치즈폴레');
  await check(page.locator('[data-menu-card]:visible').count().then(count => count >= 5), '치즈폴레 검색 결과 표시');
  await check(page.locator('[data-menu-card]:visible mark').count().then(count => count > 0), '도미노 검색어 강조');
  await page.locator('[data-menu-card]:visible').first().click();
  await check(page.locator('[data-menu-order-sheet]').evaluate(node => !node.hidden), '도미노 메뉴 터치 시 주문방법 선택창 열림');
  const firstDirectHref = await page.locator('[data-menu-order-sheet] [data-menu-order="direct"]').getAttribute('href');
  await check(Promise.resolve(firstDirectHref === 'https://app.notion.com/p/38dda158dd2a80b798f7c9f559716e3c'), '여천점 기존 가게바로주문 링크 유지');
  await check(page.locator('[data-menu-order-sheet] [data-menu-order="phone"] .menu-order-icon svg circle').count().then(count => count === 1), '도미노 전화주문 아이콘 표시');
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('[data-menu-order-sheet]')?.hidden === true);
  await check(page.locator('.store-menu-preview').isVisible(), '주문창 뒤로가기 후 도미노 음식보기 유지');
  await page.goBack();
  await page.waitForFunction(() => !document.querySelector('.store-menu-preview')?.classList.contains('menu-search-active'));
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('[data-store-menu-overlay]')?.hidden === true);
  await check(page.locator('#modal:not([hidden]) .store-detail[data-store-id="2f4c3cfb0866c4a4"]').isVisible(), '음식보기 뒤로가기 후 여천점 가게화면 유지');

  await page.locator('#modal [data-close-modal], #modal .close, #modal .modal-close').first().click().catch(() => {});
  await page.waitForTimeout(100);
  await openStore('dc638b23f8cf3c5b');
  const secondDirectHref = await page.locator('.store-menu-sticky-actions .primary').getAttribute('href');
  await check(Promise.resolve(secondDirectHref === 'https://bit.ly/auto-domino'), '문수점 기존 가게바로주문 링크 유지');
  await check(Promise.resolve(secondDirectHref !== firstDirectHref), '두 지점의 주문 링크를 서로 섞지 않음');
  await page.screenshot({path: 'browser-domino-menu-preview.png', fullPage: false});

  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  await page.screenshot({path: 'browser-domino-menu-preview-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-domino-menu-preview-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

if (!report.success) process.exit(1);
