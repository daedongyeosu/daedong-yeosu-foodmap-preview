import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const json = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const report = json('data/ddangyo-yeseo-completeness-report.json');
const batch = json('data/ddangyo-yeseo-batch-report.json');
const enrichment = json('data/ddangyo-store-enrichment.json');
const photoManifest = json('data/photo-manifest.json');
const service = json('store-service-info.json');
const runtime = fs.readFileSync('ddangyo-preview-runtime.js', 'utf8');
const serviceRuntime = fs.readFileSync('store-service-info.js', 'utf8');
const mapContext = {window: {}};
vm.runInNewContext(fs.readFileSync('store-menu-content/ddangyo-menu-map.js', 'utf8'), mapContext);
const menuMap = mapContext.window.DAEDONG_DDANGYO_MENU_STORES || {};

assert.equal(report.auditedSourceStores, 116);
assert.equal(report.verifiedMenuStoresWithoutLoss, 115);
assert.equal(report.verifiedSourceMenuItems, 8464);
assert.equal(report.verifiedSourceMenuImages, 6827);
assert.equal(report.correctedBreakTimeStores, 15);
assert.equal(report.correctedRegularClosureStores, 49);
assert.equal(report.correctedTemporaryClosureStores, 2);
assert.equal(report.correctedShopPhotoStores, 18);
assert.equal(report.correctedShopPhotos, 55);
assert.equal(report.couponSourceStores, 4);
assert.equal(report.couponMismatches, 0);
assert.equal(report.benefitMismatches, 0);

const targetIds = [...batch.generated.map(row => row.storeId), '361f855efc21c1c2'];
const targetInfo = targetIds.map(id => service.stores[id]);
assert.ok(targetInfo.every(Boolean), '116개 원본 가게의 영업·혜택 자료가 모두 있어야 합니다.');
assert.equal(targetInfo.filter(info => info.hours.breaks?.length).length, 15);
assert.equal(targetInfo.filter(info => info.hours.closures?.some(rule => rule.type !== 'date-range')).length, 49);
assert.equal(targetInfo.filter(info => info.hours.closures?.some(rule => rule.type === 'date-range')).length, 2);

for (const info of targetInfo) {
  for (const rule of info.hours.breaks || []) {
    for (const weekday of rule.weekdays || []) {
      assert.ok(!(info.hours.weekly[weekday] || []).some(period => (
        period.open === rule.open && period.close === rule.close
      )), '브레이크타임을 영업시간으로 중복 계산하면 안 됩니다.');
    }
  }
}

const jeongdam = service.stores['31b6b1235ae7e6f4'];
assert.deepEqual(jeongdam.hours.weekly.mon, [{open: '10:00', close: '21:00'}]);
assert.deepEqual(jeongdam.hours.breaks, [{
  open: '15:00',
  close: '17:00',
  weekdays: ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'],
  label: '브레이크 타임 매일 오후 03:00 ~ 오후 05:00'
}]);
assert.ok(jeongdam.hours.closures.some(rule => rule.type === 'weekly' && rule.weekday === 'wed'));

const gamachiRow = enrichment.stores.find(row => row.patstoNo === '1345950');
assert.ok(gamachiRow && !gamachiRow.isNew && gamachiRow.mergeShopImages);
assert.equal(gamachiRow.shopImages.length, 6);
assert.ok(!gamachiRow.ddangyoUrl, '가마치통닭 기존 주문경로는 그대로 보존해야 합니다.');
assert.equal(enrichment.stores.filter(row => !row.isNew && row.mergeShopImages).length, 12);
const photoEntryById = new Map(photoManifest.entries.map(entry => [String(entry.storeId || ''), entry]));
const photoRows = enrichment.stores.filter(row => !row.isNew && row.mergeShopImages);
let manifestPhotoStores = 0;
let runtimePhotoStores = 0;
for (const row of photoRows) {
  const entry = photoEntryById.get(row.targetStoreId);
  if (!entry) {
    runtimePhotoStores += 1;
    continue;
  }
  manifestPhotoStores += 1;
  const visible = new Set([entry.src, ...(entry.additionalSrcs || []), ...(entry.gallery || [])].filter(Boolean));
  assert.ok(row.shopImages.every(url => visible.has(url)), `${row.name} 사진목록 우선순위로 땡겨요 사진이 가려지면 안 됩니다.`);
}
assert.equal(manifestPhotoStores, 7);
assert.equal(runtimePhotoStores, 5);

const gamachi = json(menuMap['361f855efc21c1c2'].path);
const addedNames = [
  '가마치 두마리', '매운국물닭발', '깐풍 콤보', '텐더500g', '똥집튀김',
  '간장똥집', '순살 닭강정', '닭발튀김', '깐풍치킨', '깐풍 순살'
];
assert.equal(gamachi.items.length, 63);
for (const name of addedNames) {
  const item = gamachi.items.find(row => row.name === name);
  assert.ok(item?.image, `가마치통닭 ${name} 메뉴 또는 사진 누락`);
}
assert.deepEqual(report.mergedExistingMenuStore, {
  storeId: '361f855efc21c1c2',
  storeName: '가마치통닭 여서점',
  addedItems: 10,
  addedImages: 12,
  finalItems: 63
});

assert.match(runtime, /function addVerifiedShopImages\(store, row, report\)/);
assert.match(runtime, /if \(!row\?\.mergeShopImages\) return/);
assert.match(runtime, /store\.legacyImages = unique/);
assert.match(serviceRuntime, /rule\.type === 'weekly'/);
assert.match(serviceRuntime, /rule\.type === 'date-range'/);
assert.match(serviceRuntime, /function breakFor\(hours, parts\)/);
assert.match(serviceRuntime, /label: '브레이크 타임'/);

console.log(JSON.stringify({
  ok: true,
  auditedStores: report.auditedSourceStores,
  correctedShopPhotos: report.correctedShopPhotos,
  correctedBreakTimeStores: report.correctedBreakTimeStores,
  correctedRegularClosureStores: report.correctedRegularClosureStores,
  correctedTemporaryClosureStores: report.correctedTemporaryClosureStores,
  mergedMenuItems: report.mergedExistingMenuStore.addedItems
}, null, 2));
