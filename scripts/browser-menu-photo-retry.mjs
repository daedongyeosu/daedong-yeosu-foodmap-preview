import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4196';
const storeId = '1111111111111111';
const store = {id: storeId, store_id: storeId, name: '메뉴 사진 복구 검증', image: 'assets/notion-store-photos/fb32c4e0939b54/01.webp', category: '치킨', hasMenu: true, channelKeys: ['phone'], routes: [{name: '전화주문', url: 'tel:0610000000', enabled: true}]};
const menu = {storeId, displayName: store.name, mainImage: store.image, categories: ['메뉴'], items: [
  {id: 'retry', name: '프라이드치킨', image: '/photo-retry-test-1.png', category: '메뉴'},
  {id: 'manual', name: '양념치킨', image: '/photo-retry-test-2.png', category: '메뉴'},
  {id: 'healthy', name: '간장치킨', image: '/photo-retry-test-3.png', category: '메뉴'}
]};
const browser = await chromium.launch({headless: true, ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})});
const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, locale: 'ko-KR'});
const json = value => ({status: 200, contentType: 'application/json', body: JSON.stringify(value)});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1', '1');
});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/api/native/public/catalog', route => route.fulfill(json({items: [], cursor: null})));
await context.route('**/api/native/public/store/*', route => route.fulfill({status: 404, body: '{}'}));
await context.route('**/api/catalog', route => route.fulfill(json([store])));
await context.route('**/api/services', route => route.fulfill(json({programs: [], stores: {}})));
await context.route(`**/api/store/${storeId}`, route => route.fulfill(json(store)));
await context.route(`**/api/store/${storeId}/menu`, route => route.fulfill(json(menu)));
const attempts = [0, 0, 0]; let manualEnabled = false;
const png = fs.readFileSync(new URL('../assets/app-icons/daedong-app-icon-192.png', import.meta.url));
await context.route('**/photo-retry-test-*.png', route => {
  const index = Number(route.request().url().match(/test-(\d)/)[1]) - 1;
  attempts[index]++;
  if ((index === 0 && attempts[index] === 1) || (index === 1 && !manualEnabled)) return route.abort('failed');
  return route.fulfill({status: 200, contentType: 'image/png', body: png});
});
const page = await context.newPage();
try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(id => typeof openStore === 'function' && typeof fxStoreById === 'function' && Boolean(fxStoreById(id)), storeId);
  await page.evaluate(id => openStore(fxStoreById(id)), storeId);
  await page.locator(`[data-store-menu-preview="${storeId}"]`).click();
  const first = page.locator('[data-menu-id="retry"] img').first();
  await first.waitFor({state: 'visible'});
  await page.waitForFunction(() => document.querySelector('[data-menu-id="retry"] img')?.naturalWidth > 0);
  assert.equal(attempts[0], 2);
  const manual = page.locator('[data-menu-id="manual"]');
  await manual.scrollIntoViewIfNeeded();
  await manual.locator('.store-menu-photo-retry').waitFor({state: 'visible'});
  assert.equal(await manual.locator('img').first().getAttribute('data-menu-image-attempts'), '2');
  assert.equal(attempts[1], 3);
  assert.equal(await manual.locator('img').first().isHidden(), true);
  await page.screenshot({path: 'browser-menu-photo-retry-fallback.png'});
  manualEnabled = true;
  await manual.locator('.store-menu-photo-retry').tap();
  await page.waitForFunction(() => document.querySelector('[data-menu-id="manual"] img')?.naturalWidth > 0);
  assert.equal(await page.locator('[data-menu-order-sheet]').isHidden(), true, 'retry must not open ordering sheet');
  const healthy = page.locator('[data-menu-id="healthy"]');
  await healthy.scrollIntoViewIfNeeded();
  await page.waitForFunction(() => document.querySelector('[data-menu-id="healthy"] img')?.naturalWidth > 0);
  assert.equal(attempts[2], 1);
  await manual.scrollIntoViewIfNeeded();
  await page.screenshot({path: 'browser-menu-photo-retry-recovered.png'});
  console.log(JSON.stringify({success: true, viewport: '390x844', attempts, checks: ['transient recovery', 'bounded retries', 'compact fallback', 'manual recovery', 'order untouched', 'healthy image unchanged']}));
} catch (error) {
  console.error(JSON.stringify({attempts, images: await page.locator('img[data-menu-image-managed]').evaluateAll(images => images.map(i => ({src:i.src,complete:i.complete,width:i.naturalWidth,loading:i.loading,attempts:i.dataset.menuImageAttempts}))).catch(()=>[])}));
  throw error;
} finally {await browser.close();}
