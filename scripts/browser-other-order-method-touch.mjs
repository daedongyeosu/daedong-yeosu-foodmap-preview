import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const report = {success: false, viewport: {width: 390, height: 844}, checks: [], errors: []};
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({viewport: report.viewport, locale: 'ko-KR'});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));

const check = async (condition, message) => {
  const ok = await condition;
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('#storeGrid .store-card', {timeout: 15000});
  await page.locator('#mainSearch').fill('본스치킨');
  const card = page.locator('#storeGrid .store-card').filter({hasText: '본스치킨'}).first();
  await card.waitFor({state: 'visible', timeout: 10000});
  await card.click();

  const trigger = page.locator('#modal:not([hidden]) [data-rc3-other-methods]');
  await trigger.waitFor({state: 'visible', timeout: 10000});
  await check(trigger.isEnabled(), '본스치킨 다른 주문방법 보기 버튼 활성화');
  await trigger.click();
  await check(
    page.locator('#modal:not([hidden]) .order-methods-sheet').isVisible(),
    '첫 번째 터치로 다른 주문방법 선택창 열림'
  );
  await check(
    page.locator('.order-methods-sheet [data-rc3-external-route]').count().then(count => count > 0),
    '실제 등록된 외부 주문앱 선택지 표시'
  );
  await check(Promise.resolve(report.errors.length === 0), '버튼 터치 중 브라우저 오류 없음');
  await page.screenshot({path: 'browser-other-order-method-touch.png', fullPage: false});
  report.success = true;
} catch (error) {
  report.failure = error.stack || String(error);
  await page.screenshot({path: 'browser-other-order-method-touch-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-other-order-method-touch-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

if (!report.success) process.exit(1);
