import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const batch = json('data/ddangyo-yeseo-batch-report.json');
const enrichment = json('data/ddangyo-store-enrichment.json');
const service = json('store-service-info.json');
const mapContext = {window: {}};
vm.runInNewContext(fs.readFileSync('store-menu-content/ddangyo-menu-map.js', 'utf8'), mapContext);
const menuMap = mapContext.window.DAEDONG_DDANGYO_MENU_STORES || {};

assert.equal(batch.inputValidLinks, 318);
assert.equal(batch.exactPatstoDuplicatesSkipped, 198);
assert.equal(batch.invalidLinksSkipped, 2);
assert.equal(batch.sameStoreChannelDuplicatesSkipped, 2);
assert.equal(batch.existingMenuAndRoutePreserved, 1);
assert.equal(batch.matchedExistingStores, 11);
assert.equal(batch.newStores, 104);
assert.equal(batch.fingerprintApplied, 115);
assert.equal(batch.serviceOnlyApplied, 1);
assert.equal(batch.applied, 116);
assert.equal(batch.generated.length, 115);

const rowsByPatsto = new Map(enrichment.stores.map(row => [String(row.patstoNo), row]));
for (const patstoNo of ['1119730', '1118341']) {
  assert.ok(!rowsByPatsto.has(patstoNo), `동일 매장 파바포장 중복 ${patstoNo}는 등록하지 않습니다.`);
}
const gamachiFingerprint = rowsByPatsto.get('1345950');
assert.ok(gamachiFingerprint, '가마치통닭 신규 원본의 사진 지문이 있어야 합니다.');
assert.equal(gamachiFingerprint.preserveExistingDdangyoRoute, true);
assert.ok(!gamachiFingerprint.ddangyoUrl, '기존 유효 주문경로를 신규 원본으로 덮어쓰면 안 됩니다.');

const gamachiMenu = json(menuMap['361f855efc21c1c2'].path);
assert.equal(gamachiMenu.source.patstoNo, '1227008', '가마치통닭 기존 메뉴를 보존해야 합니다.');
assert.ok(gamachiMenu.source.secondaryPatstoNos.includes('1345950'), '가마치통닭 신규 원본 메뉴를 병합해야 합니다.');
assert.equal(service.stores['361f855efc21c1c2'].ddangyo.patstoNo, '1345950', '가마치통닭 누락 영업·혜택은 새 자료로 보완합니다.');

const octopus = [...rowsByPatsto.values()].find(row => row.name === '나는문어 타코야끼 여수여서점');
const curry = [...rowsByPatsto.values()].find(row => row.name === '나는 카레 & 오믈렛 여수여서점');
assert.ok(octopus?.isNew && curry?.isNew);
assert.notEqual(octopus.targetStoreId, curry.targetStoreId, '샵인샵 앱표시 가게는 각각 등록해야 합니다.');
assert.equal(octopus.address, curry.address);
assert.ok(octopus.shopInShopNames.includes(curry.name));
assert.ok(curry.shopInShopNames.includes(octopus.name));

for (const row of batch.generated) {
  const fingerprint = rowsByPatsto.get(String(row.patstoNo));
  assert.ok(fingerprint, `${row.storeName} 지문 누락`);
  assert.equal(fingerprint.targetStoreId, row.storeId);
  assert.ok(fingerprint.address.startsWith('전남 여수시 '));
  assert.ok(!fingerprint.address.includes('전남광주통합특별시'));
  assert.ok(menuMap[row.storeId], `${row.storeName} 음식보기 누락`);
  const menu = json(menuMap[row.storeId].path);
  assert.ok(menu.items.length > 0);
  assert.ok(menu.items.every(item => !('price' in item) && !('menu_unitprc' in item)), `${row.storeName} 메뉴 가격 노출`);
  const info = service.stores[row.storeId];
  assert.ok(info?.hours?.weekly, `${row.storeName} 영업시간 누락`);
  assert.ok(Object.values(info.hours.weekly).flat().every(period => (
    /^\d{2}:\d{2}$/.test(period.open) && /^\d{2}:\d{2}$/.test(period.close)
  )), `${row.storeName} 24시간제 변환 실패`);
  assert.ok(service.programs.every(program => (info.payments || []).some(item => item.key === program.key)), `${row.storeName} 혜택 확인 누락`);
}

const enrichmentText = fs.readFileSync('data/ddangyo-store-enrichment.json', 'utf8');
assert.doesNotMatch(enrichmentText, /businessNumber|business_number|biz_reg_no/, '사업자번호를 고객 데이터에 저장하면 안 됩니다.');

console.log(JSON.stringify({
  ok: true,
  applied: batch.applied,
  existingStores: batch.matchedExistingStores,
  newStores: batch.newStores,
  menuAndServiceVerified: batch.generated.length
}, null, 2));
