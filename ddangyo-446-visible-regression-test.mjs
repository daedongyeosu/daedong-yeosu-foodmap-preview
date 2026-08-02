import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const protectedHashes = {
  'data/stores.json': '2b976a0e05ad494e6723bc191962e1d8c66e8e1d93f98e6f0750baf25bdc6630',
  'app.js': '3afb268935765cd7d775c75e6d6387c949e2f0d8b0515e3a814c34bef7853b1c',
  'store-menu-content/a089d1d54720b48e/menu.json': 'bacf5a6edbc8a9adedd9a0a6c1ef5685a6a5187b7da0cb93c5393f2b0f650878',
  'store-menu-content/domino/menu.json': '6d8307775d014a278d4a3401c6517e63cf1bdd00f75ffb9f7cea0fc6e92d26db',
  'store-menu-content/surasanggung/menu.json': '0f874cbc664814bc18fc228afa157f9d69919608548c4c626b8d733ffe697ca7'
};
for (const [file, hash] of Object.entries(protectedHashes)) {
  assert.equal(sha256(file), hash, `${file} 보호 데이터가 변경되면 안 됩니다.`);
}

const stores = json('data/stores.json');
assert.equal(stores.length, 710, '기존 710개 가게 수를 보존해야 합니다.');

const mapContext = {window: {}};
vm.runInNewContext(read('store-menu-content/ddangyo-menu-map.js'), mapContext);
const menuMap = mapContext.window.DAEDONG_DDANGYO_MENU_STORES;
assert.equal(Object.keys(menuMap).length, 446, '땡겨요 메뉴 지도는 446곳이어야 합니다.');

const enrichment = json('data/ddangyo-store-enrichment.json');
assert.equal(enrichment.stores.length, 446);
assert.deepEqual(new Set(Object.keys(menuMap)), new Set(enrichment.stores.map(row => row.targetStoreId)));
for (const [storeId, entry] of Object.entries(menuMap)) {
  assert.ok(fs.existsSync(entry.path), `${storeId} 메뉴 파일이 없습니다.`);
  const menu = json(entry.path);
  assert.equal(menu.storeId, storeId);
  assert.equal(menu.items.length, entry.itemCount);
  assert.equal(new Set(menu.items.map(item => item.sourceMenuId)).size, menu.items.length, `${storeId} 중복 메뉴`);
  assert.ok(menu.items.every(item => !('price' in item) && !('menu_unitprc' in item)), `${storeId} 가격 노출`);
}

const previewSource = read('store-menu-preview.js');
assert.match(previewSource, /const LEGACY_MENU_STORES = Object\.freeze/);
assert.match(previewSource, /\.\.\.\(window\.DAEDONG_DDANGYO_MENU_STORES \|\| \{\}\),\s*\.\.\.LEGACY_MENU_STORES/s);
const html = read('index.html');
assert.doesNotMatch(html, /store-menu-map-bridge\.js/);
assert.ok(html.indexOf('ddangyo-menu-map.js') < html.indexOf('store-menu-preview.js'));
assert.ok(!fs.existsSync('store-menu-map-bridge.js'));

const service = json('store-service-info.json');
const targets = [
  {
    id: 'f7385d8006310630',
    name: '국민학교',
    patstoNo: '1133381',
    shortUrl: 'https://bit.ly/tk-국민학교',
    itemCount: 55,
    hoursLine: '매일 오후 03:00 ~ 익일 오전 01:00',
    paymentKeys: ['yeosu-seomseom-pay'],
    deliveryKeys: []
  },
  {
    id: '6390834d3238c3eb',
    name: '황금아구 미평점',
    patstoNo: '1175753',
    shortUrl: 'https://bit.ly/tk-황금아구',
    itemCount: 17,
    hoursLine: '휴무 매주 일요일',
    paymentKeys: ['high-oil-support', 'yeosu-seomseom-pay'],
    deliveryKeys: ['free-delivery']
  }
];

for (const target of targets) {
  const baseStore = stores.find(store => String(store.id) === target.id);
  const row = enrichment.stores.find(item => item.targetStoreId === target.id);
  const menu = json(menuMap[target.id].path);
  const info = service.stores[target.id];
  assert.equal(baseStore.name, target.name);
  assert.ok(baseStore.routes.some(route => route.name === '땡겨요' && route.url === target.shortUrl));
  assert.equal(row.patstoNo, target.patstoNo);
  assert.ok(row.sourceUrls.includes(target.shortUrl), '기존 땡겨요 단축 경로를 보존해야 합니다.');
  assert.equal(menu.items.length, target.itemCount);
  assert.ok(info.hours.displayLines.includes(target.hoursLine));
  assert.deepEqual(info.payments.map(item => item.key).sort(), [...target.paymentKeys].sort());
  assert.deepEqual(info.delivery.map(item => item.key).sort(), [...target.deliveryKeys].sort());
}

console.log('PASS: 710개 원본·기존 메뉴 자산 보존, 땡겨요 446곳 직접 메뉴 연결, 국민학교·황금아구 이용정보 병합');
