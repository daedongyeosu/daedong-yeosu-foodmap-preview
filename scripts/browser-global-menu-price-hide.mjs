import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const proxyApiOrigin = process.env.PERF_PROXY_API_ORIGIN || '';
const report = {success: false, checks: [], errors: []};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH
    ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH}
    : {})
});
const context = await browser.newContext({viewport: {width: 390, height: 844}, locale: 'ko-KR'});
if (proxyApiOrigin) {
  const localOrigin = new URL(baseURL).origin;
  await context.route(`${proxyApiOrigin}/api/**`, async route => {
    const response = await route.fetch({headers: {...route.request().headers(), origin: 'https://preview.daedongmap.com'}});
    await route.fulfill({response, headers: {...response.headers(), 'access-control-allow-origin': localOrigin}});
  });
}
await context.addInitScript(() => sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1', '1'));
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
  await page.waitForFunction(() => typeof fxStoreById === 'function' && typeof openStore === 'function');
  await page.evaluate(() => openStore(fxStoreById('0e6d7a1000b1c53b')));
  await page.waitForSelector('#modal:not([hidden]) .store-detail[data-store-id="0e6d7a1000b1c53b"]', {timeout: 5000});
  await page.locator('[data-store-menu-preview="0e6d7a1000b1c53b"]').click();
  await page.waitForSelector('.store-menu-preview', {timeout: 5000});

  const total = Number.parseInt(await page.locator('[data-menu-result-count]').innerText(), 10);
  report.total = total;
  await check(total === 21, `우사골설렁탕 메뉴를 중복 없는 21개로 표시: ${total}`);
  const menuSnapshot = await page.evaluate(() => window.daedongMenuPreviewState?.capture?.() || null).catch(() => null);
  report.menuSnapshot = menuSnapshot;
  const text = await page.locator('.store-menu-preview').innerText();
  await check(!/(?:\d{1,3}(?:,\d{3})+|\d+)\s*(?:원|₩|KRW|USD)/i.test(text), '메뉴 화면에 가격이 전혀 표시되지 않음');

  await page.locator('[data-menu-search]').fill('설렁탕');
  await page.waitForFunction(() => [...document.querySelectorAll('[data-menu-card]:not([hidden]) h3')]
    .every(node => String(node.textContent || '').trim().length > 0));
  const names = await page.locator('[data-menu-card]:visible h3')
    .evaluateAll(nodes => nodes.map(node => String(node.textContent || '').trim()));
  report.seolleongtangNames = names;
  await check(names.includes('설렁탕(공기밥포함)') && names.includes('특설렁탕(공기밥포함)'), '사진 있는 대표 설렁탕 메뉴를 보존');
  await check(!names.includes('설렁탕') && !names.includes('특 설렁탕'), '이름만 조금 다른 중복 설렁탕 메뉴를 제거');
  await page.screenshot({path: 'browser-global-menu-price-hide.png', fullPage: false});
  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  await page.screenshot({path: 'browser-global-menu-price-hide-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-global-menu-price-hide-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
