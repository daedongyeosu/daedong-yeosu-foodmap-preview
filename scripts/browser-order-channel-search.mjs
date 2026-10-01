import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173/';
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({viewport: {width: 390, height: 844}, deviceScaleFactor: 1});
await context.route('https://daedong-yeosu-admin.sisakim.chatgpt.site/api/native/public/**', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({items: [], cursor: null})
}));
await context.route('https://daedong-yeosu-data-api-preview.sisakim.workers.dev/**', async route => {
  const response = await fetch(route.request().url(), {
    headers: {
      Accept: 'application/json',
      'X-Daedong-Client': 'daedong-preview-web-v1-20260804',
      Origin: 'https://preview.daedongmap.com',
      Referer: 'https://preview.daedongmap.com/'
    }
  });
  await route.fulfill({
    status: response.status,
    headers: {'access-control-allow-origin': '*'},
    contentType: response.headers.get('content-type') || 'application/json',
    body: Buffer.from(await response.arrayBuffer())
  });
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto(baseUrl, {waitUntil: 'domcontentloaded', timeout: 30000});
  await page.waitForFunction(() => typeof stores !== 'undefined' && Array.isArray(stores) && stores.length > 0, null, {timeout: 30000});
  await page.waitForFunction(() => typeof window.fxOpenPhoneDirectory === 'function' && typeof window.fxOpenBrandHub === 'function', null, {timeout: 15000});

  const runtimeAudit = await page.evaluate(() => ({
    openAppBrowser: String(window.openAppBrowser).slice(0, 180),
    hasSearchRuntime: typeof window.fxRunChannelSearch === 'function',
    finalScript: [...document.scripts].some(script => script.src.includes('order-channel-search-1'))
  }));
  assert.equal(runtimeAudit.hasSearchRuntime, true, `검색 런타임이 로드되어야 함: ${JSON.stringify(runtimeAudit)}`);

  for (const key of ['mukkebi', 'ddangyo', 'yogiyo', 'coupang', 'baemin']) {
    const modalAudit = await page.evaluate(channel => {
      window.openAppBrowser(channel);
      return {
        hidden: document.querySelector('#modal')?.hidden,
        count: document.querySelectorAll('[data-channel-search-input]').length,
        text: document.querySelector('#modalContent')?.textContent?.replace(/\s+/g, ' ').trim().slice(0, 160)
      };
    }, key);
    assert.equal(modalAudit.count, 1, `${key} 검색창 DOM이 있어야 함: ${JSON.stringify(modalAudit)}`);
    const input = page.locator('[data-channel-search-input]');
    await assert.doesNotReject(() => input.waitFor({state: 'visible'}), `${key} 검색창이 보여야 함`);
    assert.equal(await input.getAttribute('placeholder'), '메뉴·가게명·혜택 검색');
    assert.ok(await page.locator('[data-channel-search-item]').count() > 0, `${key} 검색 대상 가게가 있어야 함`);
    const name = (await page.locator('[data-channel-search-item] strong').first().innerText()).trim();
    await input.fill(name);
    await page.waitForTimeout(400);
    assert.ok(await page.locator('[data-channel-search-item]:visible').count() >= 1, `${key} 가게명 검색 결과가 있어야 함`);
    assert.match(await page.locator('[data-channel-search-status]').innerText(), /검색 결과/);
  }

  await page.evaluate(() => window.fxOpenPhoneDirectory());
  assert.equal(await page.locator('.phone-order-sheet [data-channel-search-input]').getAttribute('placeholder'), '메뉴·가게명·혜택 검색');
  assert.ok(await page.locator('.phone-order-sheet [data-channel-search-item]').count() > 0, '전화주문 검색 대상이 있어야 함');

  await page.evaluate(() => window.fxOpenBrandHub('channels'));
  assert.equal(await page.locator('.brand-app-hub [data-channel-search-input]').getAttribute('placeholder'), '메뉴·가게명·혜택 검색');
  await page.locator('[data-brand-view="direct"]').click();
  await page.waitForSelector('.brand-app-hub [data-direct-brand]');
  assert.ok(await page.locator('.brand-app-hub [data-direct-brand][data-channel-search-item]').count() > 0, '직접 브랜드앱도 검색 대상이어야 함');

  await page.evaluate(() => window.openAppBrowser('mukkebi'));
  const firstId = await page.locator('[data-channel-search-item]').first().getAttribute('data-channel-search-store-ids');
  await page.route('**/api/menu-search?q=*', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({stores: {[firstId]: [{name: '회귀검사용 메뉴'}]}})
  }));
  await page.locator('[data-channel-search-input]').fill('회귀검사용 메뉴');
  await page.waitForTimeout(700);
  assert.equal(await page.locator('[data-channel-search-item]:visible').count(), 1, '메뉴명 검색은 해당 주문경로의 일치 가게만 보여야 함');
  assert.ok((await page.locator('[data-channel-search-item]:visible').first().getAttribute('data-channel-search-store-ids')).split(',').includes(firstId));

  assert.deepEqual(errors, [], `브라우저 오류가 없어야 함: ${errors.join(' | ')}`);
  console.log('주문경로별 검색 모바일 브라우저 검사 통과');
} finally {
  await browser.close();
}
