import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = path => fs.readFileSync(path);
const text = path => read(path).toString('utf8');
const sha256 = path => crypto.createHash('sha256').update(read(path)).digest('hex');
const menuPath = 'store-menu-content/surasanggung/menu.json';
const menu = JSON.parse(text(menuPath));
const service = JSON.parse(text('store-service-info.json'));
const enrichment = JSON.parse(text('data/ddangyo-store-enrichment.json'));
const stores = JSON.parse(text('data/stores.json'));
const index = text('index.html');
const menuScript = text('store-menu-preview.js');
const menuStyle = text('store-menu-preview.css');
const serviceScript = text('store-service-info.js');
const serviceStyle = text('store-service-info.css');

assert.equal(menu.storeId, '7bc7239e6b509c44');
assert.equal(menu.displayName, '수라상궁 조선국밥');
assert.equal(menu.items.length, 46);
assert.deepEqual(
  Object.fromEntries(menu.categories.slice(1).map(category => [
    category,
    menu.items.filter(item => item.category === category).length
  ])),
  {
    '세트·정식': 6,
    '국밥·탕': 12,
    '수육': 4,
    '만두·딤섬': 11,
    '곁들임': 4,
    '음료': 6,
    '주류': 3
  }
);
assert.equal(new Set(menu.items.map(item => item.id)).size, 46);
assert.equal(menu.items.filter(item => item.adultOnly).length, 3);
assert.equal(menu.items.filter(item => !item.image).length, 8);
assert.ok(menu.items.every(item => !Object.hasOwn(item, 'price')));
assert.doesNotMatch(text(menuPath), /\d{1,3}(?:,\d{3})*원/);
assert.ok(menu.items.filter(item => item.image).every(item => fs.existsSync(item.image)));
assert.ok(fs.existsSync(menu.mainImage));

const store = stores.find(item => String(item.store_id || item.id) === menu.storeId);
assert.ok(store);
assert.equal(store.name, '수라상궁 조선국밥 여서점');
assert.equal(store.routes.find(route => route.name === '가게바로주문')?.url, 'https://app.notion.com/p/398da158dd2a80b6ba32fa75d2f4c137');
assert.equal(store.routes.find(route => route.name === '전화주문')?.url, 'https://bit.ly/tel0616543511');

const info = service.stores[menu.storeId];
assert.ok(info);
assert.equal(service.version, 4);
assert.deepEqual(service.deliveryBenefits, [{
  key: 'free-delivery',
  label: '무료배달 가능',
  appKeys: ['ddangyo'],
  appLabel: '땡겨요'
}]);
assert.equal(info.verifiedAt, '2026-08-02');
assert.deepEqual(info.hours.displayLines.slice(0, 3), [
  '월–토 11:00–다음 날 01:00',
  '일요일 15:00–다음 날 01:00',
  '매월 둘째 수요일 휴무'
]);
assert.equal(info.hours.weekly.mon[0].open, '11:00');
assert.equal(info.hours.weekly.mon[0].close, '01:00');
assert.equal(info.hours.weekly.sun[0].open, '15:00');
assert.deepEqual(info.hours.closures[0], {
  type: 'monthly-weekday',
  nth: 2,
  weekday: 'wed',
  label: '매월 둘째 수요일'
});
assert.deepEqual(info.payments, [{
  key: 'yeosu-seomseom-pay',
  status: 'accepted',
  appKeys: ['mukkebi', 'ddangyo'],
  appLabel: '먹깨비·땡겨요'
}]);
assert.ok(!info.payments.some(payment => ['high-oil-support', 'onnuri-gift-certificate'].includes(payment.key)));

const onnuriStore = service.stores.dc42166bad88a929;
assert.ok(onnuriStore.payments.some(payment => payment.key === 'onnuri-gift-certificate' && payment.status === 'accepted'));
assert.ok(onnuriStore.payments.some(payment => payment.key === 'yeosu-seomseom-pay' && payment.status === 'accepted'));
const supportStore = service.stores['0abd7147b7d6b1dd'];
assert.ok(supportStore.payments.some(payment => payment.key === 'high-oil-support' && payment.status === 'accepted'));
assert.ok(supportStore.payments.some(payment => payment.key === 'yeosu-seomseom-pay' && payment.status === 'accepted'));
const freeDeliveryStore = service.stores['11442d3b3328f951'];
assert.deepEqual(freeDeliveryStore.delivery, [{
  key: 'free-delivery',
  status: 'available',
  note: '땡겨요 표시 기준 · 거리·주문금액·시간 등에 따라 달라질 수 있음',
  appKeys: ['ddangyo'],
  appLabel: '땡겨요'
}]);
const enrichedStoreIds = new Set(enrichment.stores.map(item => String(item.targetStoreId)));
assert.ok(Object.keys(service.stores).every(id => (
  stores.some(item => String(item.store_id || item.id) === id) || enrichedStoreIds.has(id)
)));

assert.equal(stores.length, 710);
assert.equal(sha256('data/stores.json'), '2b976a0e05ad494e6723bc191962e1d8c66e8e1d93f98e6f0750baf25bdc6630');
assert.equal(sha256('data/store-priority.json'), '2b91fa849797306d5f7d8e49de1d82bfbf28f85a235fee7cf0448104847b93f9');
assert.equal(sha256('data/store-coordinates.json'), '22f21699710ccd27de9dc73d4521fb79fac13c2a209be73e8e34519f58f087f1');

assert.match(index, /store-service-info\.css\?v=store-service-8-unified-menu-search-1/);
assert.match(index, /store-service-info\.js\?v=store-service-10-unified-menu-search-1/);
assert.match(index, /store-menu-preview\.css\?v=store-menu-14/);
assert.match(index, /store-menu-preview\.js\?v=store-menu-17/);
assert.match(menuScript, /store-menu-content\/surasanggung\/menu\.json/);
assert.match(menuScript, /itemCount: 46/);
assert.match(menuScript, /음식 사진은 실제 조리된 음식과 다를 수 있습니다/);
assert.match(menuScript, /is-text-only/);
assert.match(menuScript, /data-menu-has-photo/);
assert.doesNotMatch(menuScript, /store-menu-photo-placeholder|사진 미제공/);
assert.match(menuScript, /daedongStoreServiceInfo\?\.ready/);
assert.doesNotMatch(menuScript, /data-store-service-menu-summary/);
assert.match(menuScript, /data-menu-sticky-order/);
assert.doesNotMatch(menuScript, /class="store-menu-order"/);
assert.match(menuScript, /channels\.primaryOrder\?\.mukkebi/);
assert.match(menuScript, /channels\.primaryOrder\?\.ddangyo/);
assert.match(menuScript, /channels\.externalOrder\?\.coupangEats/);
assert.match(menuScript, /channels\.externalOrder\?\.baemin/);
assert.match(menuScript, /data-menu-sticky-other-toggle/);
assert.match(menuScript, /data-menu-sticky-external/);
assert.match(menuScript, /다른 주문앱은 버튼 안에 있습니다/);
assert.match(menuStyle, /\.store-menu-sticky-actions > nav > a\.is-direct svg path/);
assert.match(menuStyle, /\.store-menu-sticky-other-list\[hidden\]/);
assert.match(menuStyle, /\.store-menu-sticky-other-list > div/);
assert.match(menuStyle, /\.store-menu-card\.is-text-only/);
assert.match(menuStyle, /\.store-menu-age-badge/);
assert.match(menuStyle, /\.store-menu-preview\.menu-search-active \.store-menu-card\.is-text-only/);
assert.doesNotMatch(menuScript, /menuMarkup/);
assert.match(serviceScript, /Asia\/Seoul/);
assert.match(serviceScript, /monthly-weekday/);
assert.match(serviceScript, /영업시간·결제·배달혜택 찾기/);
assert.match(serviceScript, /내 위치 가까운 순/);
assert.match(serviceScript, /동네만 보기/);
assert.match(serviceScript, /여수 전체/);
assert.match(serviceScript, /지금 영업 중/);
assert.match(serviceScript, /곧 영업 종료/);
assert.match(serviceScript, /주문앱별 혜택 미확인/);
assert.match(serviceScript, /회색 미확인은 사용 불가가 아니라 아직 확인되지 않은 정보/);
assert.match(serviceScript, /sourceStores\(\)\.map/);
assert.match(serviceScript, /data-store-service-benefit/);
assert.match(serviceScript, /deliveryBenefits/);
assert.match(serviceScript, /무료배달은 거리·주문금액·시간에 따라 달라질 수 있으므로/);
assert.match(serviceScript, /dataset\.storeServiceDetail/);
assert.match(serviceScript, /영업시간·주문앱별 혜택/);
assert.match(serviceScript, /무료배달 여부 미확인/);
assert.match(serviceScript, /사용 불가가 아니라 아직 확인되지 않은 정보/);
assert.match(serviceScript, /data-store-service-status/);
assert.match(serviceScript, /data-store-service-location-mode/);
assert.match(serviceScript, /daedongStoreServiceOverview/);
assert.match(serviceScript, /\['all', '전체', null\]/);
assert.match(serviceScript, /isEntireStoreList \? '전체 가게'/);
assert.match(serviceScript, /count === null \? ''/);
assert.doesNotMatch(serviceScript, /data\/stores\.json/);
assert.match(serviceStyle, /\.store-service-search-entry\s*\{\s*margin: -4px 16px 15px;/);
assert.match(serviceStyle, /\.store-service-card-payment\.is-delivery/);
assert.match(serviceStyle, /\.store-service-overview-payments b\.is-delivery/);
assert.match(serviceStyle, /\.store-service-detail-panel/);
assert.match(serviceStyle, /\.store-service-detail-benefit\.is-available\.is-delivery/);
assert.match(serviceStyle, /@media \(max-width: 380px\)[\s\S]*?margin-right: 10px;[\s\S]*?margin-left: 10px;/);

console.log('surasanggung-menu-service-regression-test: ok');
