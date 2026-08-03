import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const stores = JSON.parse(fs.readFileSync(new URL('./data/stores.json', import.meta.url), 'utf8'));
const service = JSON.parse(fs.readFileSync(new URL('./store-service-info.json', import.meta.url), 'utf8'));
const report = JSON.parse(fs.readFileSync(new URL('./data/ddangyo-service-coverage-report.json', import.meta.url), 'utf8'));
const runtime = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const menuMapSource = fs.readFileSync(new URL('./store-menu-content/ddangyo-menu-map.js', import.meta.url), 'utf8');
const context = {window: {}};
vm.createContext(context);
vm.runInContext(menuMapSource, context);
const menuMap = context.window.DAEDONG_DDANGYO_MENU_STORES || {};

const ddangyoRoute = store => (store.routes || []).some(route => (
  String(route.key || '').toLowerCase() === 'ddangyo'
  || String(route.name || '').includes('땡겨요')
));
const ddangyoEntries = Object.entries(service.stores).filter(([, entry]) => entry?.ddangyo?.patstoNo);
const missingRouteService = stores.filter(store => ddangyoRoute(store) && !service.stores[store.id]);

assert.equal(stores.length, 710, '기존 710개 가게 목록을 보존해야 합니다.');
assert.equal(Object.keys(menuMap).length, 713, '음식보기 713곳을 보존해야 합니다.');
assert.equal(Object.keys(service.stores).length, 722, '영업·혜택 자료는 722곳이어야 합니다.');
assert.equal(ddangyoEntries.length, 676, '땡겨요 원본 확인 자료는 676곳이어야 합니다.');
assert.ok(Object.keys(menuMap).every(id => service.stores[id]), '음식보기 가게에 영업·혜택 자료 누락이 있습니다.');
assert.ok(ddangyoEntries.every(([, entry]) => entry.hours?.weekly), '땡겨요 확인 가게에 영업시간 누락이 있습니다.');
assert.ok(ddangyoEntries.every(([, entry]) => (
  service.programs.every(program => (entry.payments || []).some(item => (
    item.key === program.key && ['accepted', 'unavailable'].includes(item.status)
  )))
  && (entry.delivery || []).some(item => (
    item.key === 'free-delivery' && ['available', 'unavailable'].includes(item.status)
  ))
)), '확인한 땡겨요 혜택이 다시 미확인으로 표시될 수 있습니다.');

assert.deepEqual(missingRouteService.map(store => store.id).sort(), [
  '08e5e26653436fef',
  '8d9df0fbb77ce9eb',
  '9f89e6d7784cf4a2',
  'fa0bccb2d190a7c0'
].sort(), '땡겨요 영업·혜택 미연결은 깨진 링크 1곳과 다른 가게 링크 3곳만 남아야 합니다.');

const teum = service.stores.d9730ed96e5fbd9a;
assert.deepEqual(teum.hours.weekly.mon, [{open: '11:30', close: '20:00'}]);
assert.deepEqual(teum.hours.displayLines, ['매일 오전 11:30 ~ 오후 08:00']);
assert.equal(teum.payments.find(item => item.key === 'yeosu-seomseom-pay')?.status, 'accepted');
for (const key of ['high-oil-support', 'onnuri-gift-certificate', 'ddangyo-coupon', 'ddangyo-timesale']) {
  assert.equal(teum.payments.find(item => item.key === key)?.status, 'unavailable', `틈 돈까스 ${key} 확인 상태가 잘못됐습니다.`);
}
assert.equal(teum.delivery.find(item => item.key === 'free-delivery')?.status, 'unavailable');

assert.equal(report.menuPreviewMissingService.length, 0);
assert.equal(report.ddangyoRouteServiceCovered, 715);
assert.equal(report.explicitBenefitStatusRecords, 676);
assert.match(runtime, /현재 쿠폰 없음 확인/);
assert.match(runtime, /현재 타임세일 없음 확인/);
assert.match(runtime, /현재 확인된 주문앱 혜택 없음/);
assert.match(html, /store-service-16-yeseo-complete/);

console.log(JSON.stringify({
  ok: true,
  registeredStores: stores.length,
  menuPreviewStores: Object.keys(menuMap).length,
  serviceRecords: Object.keys(service.stores).length,
  ddangyoSourceRecords: ddangyoEntries.length,
  ddangyoRouteServiceCovered: report.ddangyoRouteServiceCovered,
  unresolvedSafeExclusions: missingRouteService.length
}, null, 2));
