import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import vm from 'node:vm';

const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const protectedHashes = {
  'data/stores.json': '2b976a0e05ad494e6723bc191962e1d8c66e8e1d93f98e6f0750baf25bdc6630',
  'app.js': '46a20f6b5a424c1fdd92e47b7e635458d92a77db75daadb4d8738f704949dc20',
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
const menuMapIds = Object.keys(menuMap);
assert.equal(menuMapIds.length, 713, '땡겨요 메뉴 지도는 713곳이어야 합니다.');

const enrichment = json('data/ddangyo-store-enrichment.json');
assert.equal(enrichment.stores.length, 561);
assert.equal(enrichment.stores.filter(row => row.isNew).length, 131, '신규 땡겨요 가게는 131곳이어야 합니다.');
assert.ok(enrichment.stores.every(row => menuMap[row.targetStoreId]), '기존·신규 땡겨요 지문의 메뉴 연결을 모두 보존해야 합니다.');

const allStoreIds = new Set([
  ...stores.map(store => String(store.id || store.store_id)),
  ...enrichment.stores.filter(row => row.isNew).map(row => row.targetStoreId)
]);
assert.equal(allStoreIds.size, 841, '기존 710곳과 신규 131곳의 내부 총합은 841곳이어야 합니다.');

const expansion = json('data/ddangyo-menu-expansion-report.json');
assert.equal(expansion.previousMapCount, 598);
assert.equal(expansion.generatedCount, 115);
assert.equal(expansion.finalMapCount, 713);
assert.deepEqual(expansion.rejectedCrossStoreIds.sort(), [
  '8d9df0fbb77ce9eb',
  '9f89e6d7784cf4a2',
  'fa0bccb2d190a7c0'
]);
assert.deepEqual(expansion.unresolved.map(row => row.storeId).sort(), ['08e5e26653436fef']);

for (const [storeId, entry] of Object.entries(menuMap)) {
  assert.ok(allStoreIds.has(storeId), `${storeId}는 현재 내부 가게 목록에 존재해야 합니다.`);
  assert.ok(fs.existsSync(entry.path), `${storeId} 메뉴 파일이 없습니다.`);
  const menu = json(entry.path);
  assert.equal(menu.storeId, storeId);
  assert.equal(menu.items.length, entry.itemCount);
  assert.equal(new Set(menu.items.map(item => item.sourceMenuId)).size, menu.items.length, `${storeId} 중복 메뉴`);
  assert.ok(menu.items.every(item => !('price' in item) && !('menu_unitprc' in item)), `${storeId} 가격 노출`);
}

const legacyMenuIds = ['a089d1d54720b48e', '2f4c3cfb0866c4a4', 'dc638b23f8cf3c5b', '7bc7239e6b509c44'];
const visibleMenuIds = new Set([...menuMapIds, ...legacyMenuIds]);
assert.equal(visibleMenuIds.size, 715, '음식보기 가능한 가게는 중복 제외 715곳이어야 합니다.');

const runtimeDdangyoIds = new Set();
for (const store of stores) {
  if ((store.routes || []).some(route => route.key === 'ddangyo' || String(route.name || '').replace(/\s/g, '').includes('땡겨요'))) {
    runtimeDdangyoIds.add(String(store.id || store.store_id));
  }
}
for (const row of enrichment.stores) runtimeDdangyoIds.add(row.targetStoreId);
assert.equal(runtimeDdangyoIds.size, 719, '땡겨요 주문경로 가게는 719곳이어야 합니다.');
assert.deepEqual([...runtimeDdangyoIds].filter(id => !visibleMenuIds.has(id)).sort(), [
  '08e5e26653436fef',
  '8d9df0fbb77ce9eb',
  '9f89e6d7784cf4a2',
  'fa0bccb2d190a7c0'
]);

const previewSource = read('store-menu-preview.js');
assert.match(previewSource, /const LEGACY_MENU_STORES = Object\.freeze/);
assert.match(previewSource, /\.\.\.\(window\.DAEDONG_DDANGYO_MENU_STORES \|\| \{\}\),\s*\.\.\.LEGACY_MENU_STORES/s);
const html = read('index.html');
assert.doesNotMatch(html, /store-menu-map-bridge\.js/);
assert.ok(html.indexOf('ddangyo-menu-map.js') < html.indexOf('store-menu-preview.js'));
assert.match(html, /ddangyo-menu-map\.js\?v=20260804-1/);
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
  },
  {
    id: '884d23981fd2429a',
    name: '네네치킨 둔덕미평점',
    patstoNo: '',
    shortUrl: 'https://bit.ly/tk-네네치킨둔덕미평점',
    itemCount: 58,
    hoursLine: '',
    paymentKeys: ['yeosu-seomseom-pay'],
    deliveryKeys: []
  }
];

for (const target of targets) {
  const baseStore = stores.find(store => String(store.id) === target.id);
  const row = enrichment.stores.find(item => item.targetStoreId === target.id);
  const menu = json(menuMap[target.id].path);
  const info = service.stores[target.id];
  assert.equal(baseStore.name, target.name);
  assert.ok(baseStore.routes.some(route => route.name === '땡겨요' && route.url === target.shortUrl));
  if (row) {
    assert.equal(row.patstoNo, target.patstoNo);
    assert.ok(row.sourceUrls.includes(target.shortUrl), '기존 땡겨요 단축 경로를 보존해야 합니다.');
  }
  assert.equal(menu.items.length, target.itemCount);
  if (target.hoursLine) assert.ok(info.hours.displayLines.includes(target.hoursLine));
  if (info) {
    assert.deepEqual((info.payments || []).filter(item => item.status === 'accepted').map(item => item.key).sort(), [...target.paymentKeys].sort());
    assert.deepEqual((info.delivery || []).filter(item => item.status === 'available').map(item => item.key).sort(), [...target.deliveryKeys].sort());
  }
}

const nene = json(menuMap['884d23981fd2429a'].path);
assert.equal(nene.source.patstoNo, '1195676');
assert.equal(nene.storeName, '네네치킨 둔덕미평점');
assert.equal(nene.items.length, 58);

const kingJjajang = service.stores.a4ba6805e73e7e76;
assert.ok(kingJjajang, '짜장왕 왕서방 영업정보가 있어야 합니다.');
assert.deepEqual(kingJjajang.hours.displayLines, [
  '매일 오전 10:00 ~ 익일 오전 02:00',
  '땡겨요 브레이크 타임 매일 오전 02:00 ~ 오전 10:00 반영'
]);
for (const periods of Object.values(kingJjajang.hours.weekly)) {
  assert.deepEqual(periods, [{open: '10:00', close: '02:00'}]);
}
for (const info of Object.values(service.stores)) {
  const hasBreak = (info.hours?.displayLines || []).some(line => /브레이크|휴게/.test(line));
  const hasFake24Hours = Object.values(info.hours?.weekly || {}).flat()
    .some(period => period.open === '00:00' && period.close === '00:00');
  assert.ok(!(hasBreak && hasFake24Hours), '브레이크타임을 둔 가게를 24시간 영업으로 계산하면 안 됩니다.');
}

console.log('PASS: 기존 710개 원본 보존, 여서동 링크 지문·메뉴·영업혜택 연결, 네네치킨 58개 확인');
