import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = path => fs.readFileSync(path);
const text = path => read(path).toString('utf8');
const sha256 = path => crypto.createHash('sha256').update(read(path)).digest('hex');
const menu = JSON.parse(text('store-menu-content/a089d1d54720b48e/menu.json'));
const stores = JSON.parse(text('data/stores.json'));
const index = text('index.html');
const script = text('store-menu-preview.js');
const style = text('store-menu-preview.css');

assert.equal(menu.storeId, 'a089d1d54720b48e');
assert.equal(menu.items.length, 53);
assert.deepEqual(
  Object.fromEntries(['피자', '세트', '사이드', '음료·주류·소스'].map(category => [
    category,
    menu.items.filter(item => item.category === category).length
  ])),
  {'피자': 18, '세트': 9, '사이드': 15, '음료·주류·소스': 11}
);
assert.equal(menu.items.filter(item => item.adultOnly).length, 4);
assert.ok(menu.items.every(item => !Object.hasOwn(item, 'price')));
assert.ok(menu.items.every(item => fs.existsSync(item.image)));
assert.ok(fs.existsSync(menu.mainImage));

assert.equal(stores.length, 710);
assert.equal(stores.filter(store => String(store.store_id || store.id) === menu.storeId).length, 1);
assert.equal(
  sha256('data/stores.json'),
  '2b976a0e05ad494e6723bc191962e1d8c66e8e1d93f98e6f0750baf25bdc6630'
);
assert.equal(
  sha256('data/store-priority.json'),
  '2b91fa849797306d5f7d8e49de1d82bfbf28f85a235fee7cf0448104847b93f9'
);
assert.equal(
  sha256('data/store-coordinates.json'),
  '22f21699710ccd27de9dc73d4521fb79fac13c2a209be73e8e34519f58f087f1'
);

assert.match(index, /store-menu-preview\.css\?v=store-menu-14/);
assert.match(index, /store-menu-preview\.js\?v=store-menu-14/);
assert.match(script, /data-store-menu-preview/);
assert.match(script, /가게바로주문 결제하기/);
assert.match(script, /통화 중에도 이 메뉴를 계속 볼 수 있어요/);
assert.match(script, /다른 주문앱 보기/);
assert.match(script, /data-menu-other-list[^>]*hidden/);
assert.match(script, /다른 메뉴도 함께 주문할 수 있어요/);
assert.match(script, /원하는 메뉴를 더 추가해 함께 주문하세요/);
assert.match(script, /storeIconMarkup/);
assert.match(script, /stroke="#ff4d1f"/);
assert.doesNotMatch(script, /ui-icons\.svg#store/);
assert.match(script, /다른 주문앱 접기/);
assert.match(script, /scrollIntoView\(\{behavior: 'smooth', block: 'center'\}\)/);
assert.match(script, /assets\/mukkebi-v7\.png/);
assert.match(script, /assets\/ddangyo-v7\.png/);
assert.match(script, /phoneIconMarkup/);
assert.match(script, /circle cx="14" cy="14" r="13" fill="#ff7756"/);
assert.match(script, /daedongMenuPreview/);
assert.match(script, /daedongMenuSearch/);
assert.match(script, /daedongMenuOrder/);
assert.match(script, /addEventListener\('popstate'/);
assert.match(script, /event\.stopImmediatePropagation\(\)/);
assert.match(script, /addEventListener\('scroll'.*\{passive: true\}/);
assert.match(script, /menu-chrome-hidden/);
assert.match(script, /scrollTop <= 56/);
assert.match(script, /}, 500\)/);
assert.match(script, /menu-search-active/);
assert.match(script, /data-menu-search-cancel/);
assert.match(script, /data-menu-search-clear/);
assert.match(script, /data-menu-result-label/);
assert.match(script, /scrollRoot\.scrollTop = 0/);
assert.match(script, /menuSearchReturn/);
assert.match(script, /highlightedMenuHtml/);
assert.match(script, /data-menu-select/);
assert.match(script, /data-menu-order-sheet/);
assert.match(script, /data-selected-menu-name/);
assert.match(script, /openMenuOrderSheet/);
assert.match(script, /closeMenuOrderSheet/);
assert.doesNotMatch(script, /data\/stores\.json/);
assert.match(style, /@media \(max-width: 560px\)/);
assert.match(style, /\.store-menu-preview\.menu-chrome-hidden/);
assert.match(style, /padding-top: 54px/);
assert.match(style, /\.store-menu-preview\.menu-search-active \.store-menu-hero/);
assert.match(style, /\.store-menu-preview\.menu-search-active \.store-menu-sticky-actions/);
assert.match(style, /\.store-menu-preview\.menu-search-active \.store-menu-card/);
assert.match(style, /\.store-menu-copy mark/);
assert.match(style, /\.store-menu-card-action/);
assert.match(style, /\.menu-order-sheet-panel/);
assert.match(style, /\.menu-order-sheet\[hidden\]/);
assert.match(style, /\.menu-order-more-tip/);
assert.match(style, /\.menu-other-orders > button\.is-expanded/);
assert.match(style, /border: 2px solid #ff8b6d/);
assert.doesNotMatch(style, /\.store-menu-preview\.menu-chrome-hidden\s*\{\s*grid-template-rows/);
assert.doesNotMatch(style, /\.store-menu-preview\.menu-chrome-hidden \.store-menu-tools\s*\{[^}]*max-height/s);
assert.match(style, /translate\(-50%, calc\(100% \+ 32px\)\)/);
assert.doesNotMatch(style, /\.store-menu-sticky-actions img\s*\{[^}]*filter:/s);

console.log('alien-pizza-menu-preview-regression-test: ok');
