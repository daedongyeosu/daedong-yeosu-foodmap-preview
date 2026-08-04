import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = path => fs.readFileSync(path);
const text = path => read(path).toString('utf8');
const sha256 = path => crypto.createHash('sha256').update(read(path)).digest('hex');
const menuPath = 'store-menu-content/domino/menu.json';
const menu = JSON.parse(text(menuPath));
const stores = JSON.parse(text('data/stores.json'));
const index = text('index.html');
const script = text('store-menu-preview.js');

const dominoIds = ['2f4c3cfb0866c4a4', 'dc638b23f8cf3c5b'];
assert.deepEqual(menu.storeIds, dominoIds);
assert.equal(menu.displayName, '도미노피자');
assert.equal(menu.items.length, 70);
assert.deepEqual(
  Object.fromEntries(['피자', '사이드', '음료', '소스·피클'].map(category => [
    category,
    menu.items.filter(item => item.category === category).length
  ])),
  {'피자': 46, '사이드': 10, '음료': 8, '소스·피클': 6}
);
assert.equal(new Set(menu.items.map(item => item.id)).size, 70);
assert.ok(menu.items.every(item => !Object.hasOwn(item, 'price')));
assert.doesNotMatch(text(menuPath), /\d{1,3}(?:,\d{3})*원/);
assert.ok(menu.items.every(item => fs.existsSync(item.image)));
assert.ok(fs.existsSync(menu.mainImage));
assert.equal(fs.readdirSync('store-menu-content/domino').filter(file => /^item-\d{2}\.jpg$/.test(file)).length, 70);

assert.equal(stores.length, 710);
for (const storeId of dominoIds) {
  assert.equal(stores.filter(store => String(store.store_id || store.id) === storeId).length, 1);
  const configStart = script.indexOf(storeId);
  assert.ok(configStart >= 0);
  assert.ok(script.slice(configStart, configStart + 240).includes("path: 'store-menu-content/domino/menu.json'"));
}
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
assert.match(index, /store-menu-preview\.js\?v=store-menu-17/);
assert.match(script, /itemCount: 70/);
assert.match(script, /featuredCategories/);
assert.match(script, /가게바로주문 결제하기/);
assert.match(script, /전화주문하기/);
assert.match(script, /다른 메뉴도 함께 주문할 수 있어요/);
assert.doesNotMatch(script, /외계인피자 메뉴를 불러오는 중입니다/);
assert.doesNotMatch(script, /data\/stores\.json/);

console.log('domino-menu-preview-regression-test: ok');
