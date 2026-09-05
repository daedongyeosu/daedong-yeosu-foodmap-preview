import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const output = path.resolve(process.env.MENU_FAMILY_REPORT_DIR || '.');
fs.mkdirSync(output, {recursive: true});
const storeId = '1111111111111111';
const store = {store_id: storeId, id: storeId, name: '메뉴 묶음 검증 가게', district: '여서동', category: '아시안', hasMenu: true,
  channelKeys: ['phone'], routes: [{name: '전화주문', url: 'tel:0610000000', enabled: true}]};
const fixture = {storeId, displayName: store.name, mainImage: 'assets/logo.png', categories: ['전체'], items: [
  {id: 'a', name: '등심 꿔바로우', description: '등심 꿔바로우와 소스', image: 'assets/logo.png', category: '일품메뉴'},
  {id: 'b', name: '등심 꿔바로우 300g', description: '', image: '', category: '', price: 18000},
  {id: 'c', name: '계란 나시고랭 (볶음밥)', description: '', image: '', category: '볶음밥'},
  {id: 'd', name: '계란볶음밥(나시고랭)', description: '', image: '', category: ''},
  {id: 'e', name: '소고기 쌀국수', description: '소고기와 쌀국수', image: '', category: '쌀국수'},
  {id: 'f', name: '매운 소고기 쌀국수', description: '', image: '', category: '쌀국수'},
  {id: 'g', name: '코카콜라 350ml', description: '', image: 'assets/logo.png', category: ''},
  {id: 'l', name: '코카콜라 355ml', description: '다른 용량의 원본 메뉴', image: '', category: ''},
  {id: 'h', name: '코카콜라 제로 355ml', description: '', image: 'assets/logo.png', category: ''},
  {id: 'i', name: '진로', description: '', image: 'assets/logo.png', category: ''},
  {id: 'j', name: '시전동(신기동)', description: '', image: '', category: '신기동(시전동)에서 주문 시 추가해주세요.'},
  {id: 'k', name: '와우회원 전용', description: '', image: '', category: ''}
]};
fixture.__menuNotes = [
  {id: 'delivery-note', kind: 'delivery', text: '일부 지역 추가 배달비 2,000원', sourceIds: ['delivery-note']},
  {id: 'food-note', kind: 'description', text: '만두피가 약간 매콤합니다.', sourceIds: ['food-note']},
  {id: 'html-note', kind: 'description', text: '<img src=x onerror=alert(1)>', sourceIds: ['html-note']},
];
const report = {success: false, checks: [], errors: []};
const browser = await chromium.launch({headless: true, ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})});
const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, locale: 'ko-KR'});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1', '1');
});
const json = value => ({status: 200, contentType: 'application/json', body: JSON.stringify(value)});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/api/catalog', route => route.fulfill(json([store])));
await context.route('**/api/services', route => route.fulfill(json({programs: [], stores: {}})));
await context.route(`**/api/store/${storeId}`, route => route.fulfill(json(store)));
await context.route(`**/api/store/${storeId}/menu`, route => route.fulfill(json(fixture)));
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
function check(value, label) { assert.ok(value, label); report.checks.push(label); }
try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof openStore === 'function' && typeof fxStoreById === 'function');
  await page.evaluate(id => openStore(fxStoreById(id)), storeId);
  await page.locator(`[data-store-menu-preview="${storeId}"]`).click();
  await page.locator('.store-menu-preview').waitFor();
  const preview = page.locator('.store-menu-preview');
  const notes = preview.locator('[data-menu-notes]');
  check(await notes.count() === 1, 'delivery and description guidance is separate from food cards');
  check((await notes.innerText()).includes('만두피가 약간 매콤합니다.'), 'orphan food description remains readable');
  check(!/2,000|2000/.test(await notes.innerText()), 'guidance never leaks prices');
  check(await notes.locator('img').count() === 0, 'guidance renders source markup as text, not active HTML');
  check(await page.locator('[data-menu-card]').count() === 7, 'all seven food, drink and alcohol families render immediately; instructions excluded');
  check(await page.locator('[data-menu-extras-toggle]').count() === 0, 'no extra action is required to reveal drinks or alcohol');
  check(await page.locator('.is-compact-extra').count() === 0, 'no menu family uses a compact card');
  const family = page.locator('[data-menu-card]').filter({has: page.locator('h3', {hasText: /^등심 꿔바로우/})});
  check(await family.count() === 1, 'photo/no-photo tangsuyuk shown once');
  await family.locator('summary').click();
  check(await family.locator('details').getAttribute('open') !== null, 'variant disclosure opens');
  check((await family.innerText()).includes('300g'), 'quantity remains visible');
  await family.locator('details img').first().waitFor({state: 'visible'});
  await page.waitForFunction(() => [...document.querySelectorAll('[data-menu-variants][open] img')].every(img => img.complete && img.naturalWidth > 0));
  check(true, 'original variant photo loads when the family is expanded');
  const variantPhotoSizes = await family.locator('details img').evaluateAll(images => images.map(image => ({
    width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height,
    availableWidth: image.parentElement.clientWidth,
    intrinsicWidth: image.getAttribute('width'), intrinsicHeight: image.getAttribute('height')
  })));
  report.variantPhotoSizes = variantPhotoSizes;
  check(variantPhotoSizes.length > 0 && variantPhotoSizes.every(size => size.intrinsicWidth === '720' && size.intrinsicHeight === '546'),
    'expanded original variant photos keep full-size 720 by 546 dimensions');
  check(variantPhotoSizes.every(size => size.width >= size.availableWidth - 1 && size.width > 250 && size.height > 150),
    'expanded original variant photos fill the available width instead of becoming thumbnails');
  check(await page.locator('[data-menu-order-sheet]').isHidden(), 'opening variants does not launch order sheet');
  await family.locator('summary').click();
  const drinkCards = page.locator('[data-menu-card]').filter({has: page.locator('h3', {hasText: /^(?:코카콜라|진로)/})});
  check(await drinkCards.count() === 3, 'drinks and alcohol are already present in the complete menu');
  const foodPhotoSize = await family.locator('.store-menu-photo').evaluate(node => ({
    width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height
  }));
  const drinkPhotoSizes = await drinkCards.locator('.store-menu-photo').evaluateAll(nodes => nodes.map(node => ({
    width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height,
    availableWidth: node.closest('[data-menu-card]').clientWidth,
    intrinsicWidth: node.querySelector('img').getAttribute('width'), intrinsicHeight: node.querySelector('img').getAttribute('height')
  })));
  report.drinkPhotoSizes = drinkPhotoSizes;
  check(drinkPhotoSizes.length === 3 && drinkPhotoSizes.every(size => size.intrinsicWidth === '720' && size.intrinsicHeight === '546'),
    'drink and alcohol images keep the same full-size dimensions as food');
  check(drinkPhotoSizes.every(size => size.width >= size.availableWidth - 1 && size.height > 150
    && Math.abs(size.width - foodPhotoSize.width) <= 1 && Math.abs(size.height - foodPhotoSize.height) <= 1),
    'drink and alcohol photos use the same large full-width layout as food on mobile');
  const search = page.locator('[data-menu-search]');
  await search.fill('계란볶음밥');
  check(await page.locator('[data-menu-card]').count() === 1, 'alternate word order finds the existing family');
  check(!/와우회원|신기동.*추가|18,?000원/.test(await preview.innerText()), 'no guide/membership/price on customer screen');
  await search.fill('콜라');
  check(await page.locator('[data-menu-card]').count() === 2, 'ordinary and zero cola remain distinct searchable families');
  const colaFamily = page.locator('[data-menu-card][data-menu-id="g"]');
  const searchPhotoSize = await colaFamily.locator('.store-menu-photo').evaluate(node => ({
    width: node.getBoundingClientRect().width, height: node.getBoundingClientRect().height
  }));
  check(searchPhotoSize.width > 0 && searchPhotoSize.width <= 120 && searchPhotoSize.height <= 120,
    'existing search-result thumbnail layout remains unchanged');
  await colaFamily.locator('summary').click();
  await colaFamily.locator('details img').first().waitFor({state: 'visible'});
  await page.waitForFunction(() => [...document.querySelectorAll('[data-menu-variants][open] img')].every(img => img.complete && img.naturalWidth > 0));
  const searchVariantPhoto = await colaFamily.locator('details img').first().evaluate(image => ({
    width: image.getBoundingClientRect().width, height: image.getBoundingClientRect().height,
    availableWidth: image.parentElement.clientWidth,
    intrinsicWidth: image.getAttribute('width'), intrinsicHeight: image.getAttribute('height')
  }));
  report.searchVariantPhoto = searchVariantPhoto;
  check(searchVariantPhoto.width >= searchVariantPhoto.availableWidth - 1 && searchVariantPhoto.width > 250
    && searchVariantPhoto.height > 150 && searchVariantPhoto.intrinsicWidth === '720' && searchVariantPhoto.intrinsicHeight === '546',
    'expanded original photo stays full-width even inside compact search results');
  await colaFamily.locator('summary').click();
  await page.evaluate(id => window.daedongMenuPreview.open(id, {menuId: 'l'}), storeId);
  check(await page.locator('[data-selected-menu-name]').innerText() === '코카콜라 355ml', 'exact search variant keeps its original quantity');
  check(await page.locator('[data-selected-menu-image]').isHidden(), '355ml without photo never borrows a 350ml photo');
  const saved = await page.evaluate(() => window.daedongMenuReturn.capture());
  check(saved.selectedVariantId === 'l', 'return state records exact variant');
  await page.evaluate(() => history.back());
  await page.waitForFunction(() => document.querySelector('[data-menu-order-sheet]')?.hidden);
  await page.evaluate(state => window.daedongMenuReturn.restore(state), saved);
  await page.waitForFunction(() => !document.querySelector('[data-menu-order-sheet]')?.hidden);
  check(await page.locator('[data-selected-menu-name]').innerText() === '코카콜라 355ml', 'return restores exact quantity instead of family default');
  await page.evaluate(() => history.back());
  await page.waitForFunction(() => document.querySelector('[data-menu-order-sheet]')?.hidden);
  check(await preview.evaluate(n => n.scrollWidth <= n.clientWidth + 1), 'no horizontal overflow at 390px');
  await page.screenshot({path: path.join(output, 'browser-menu-families.png')});
  check(report.errors.length === 0, 'no browser JavaScript errors');
  report.success = true;
} catch (error) {
  report.failure = error.stack;
  report.body = (await page.locator('body').innerText().catch(() => '')).slice(-9000);
  await page.screenshot({path: path.join(output, 'browser-menu-families-failure.png')}).catch(() => {});
} finally {
  fs.writeFileSync(path.join(output, 'browser-menu-families-report.json'), JSON.stringify(report, null, 2));
  await context.unrouteAll({behavior: 'ignoreErrors'});
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
if (!report.success) process.exitCode = 1;
