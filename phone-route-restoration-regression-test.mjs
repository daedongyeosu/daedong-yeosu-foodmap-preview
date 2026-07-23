import fs from 'node:fs';

const stores = JSON.parse(fs.readFileSync(new URL('./data/stores.json', import.meta.url), 'utf8'));
const phoneData = JSON.parse(fs.readFileSync(new URL('./data/phone-order-runtime.json', import.meta.url), 'utf8'));
const priorityData = JSON.parse(fs.readFileSync(new URL('./data/store-priority.json', import.meta.url), 'utf8'));
const source = fs.readFileSync(new URL('./rc3-fixes.js', import.meta.url), 'utf8');
const appSource = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const finalExperienceSource = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const htmlSource = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const classificationCsv = fs.readFileSync(new URL('./recovered-store-channel-classification.csv', import.meta.url), 'utf8');
const byId = new Map(stores.map(store => [String(store.store_id || store.id), store]));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const parseCsvLine = line => {
  const values = [];
  let value = '';
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (char === '"' && quoted && line[index + 1] === '"') {
      value += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      values.push(value);
      value = '';
    } else {
      value += char;
    }
  }
  values.push(value);
  return values;
};
const csvLines = classificationCsv.trim().split(/\r?\n/);
const csvHeaders = parseCsvLine(csvLines.shift());
const classificationRows = csvLines.map(line => Object.fromEntries(
  parseCsvLine(line).map((value, index) => [csvHeaders[index], value])
));

const phoneRoute = store => (store.routes || []).find(route => (
  route?.enabled !== false && String(route?.name || '').replace(/\s+/g, '').includes('전화')
)) || null;
const validPhone = value => /^(?:0\d{8,11}|1[568]\d{6,7})$/.test(String(value || '').replace(/\D/g, ''));
const runtimePhones = new Map((phoneData.stores || []).map(item => [String(item.store_id), item.phone]));
const clickable = new Set((phoneData.storeMappings || [])
  .filter(item => item.clickableTel === true)
  .map(item => String(item.store_id)));
for (const store of stores) {
  if (String(store.phone || '').replace(/\D/g, '')) clickable.add(String(store.store_id || store.id));
}

const blocked = new Set(['09de7c8235046632', '0ad5341dc696d4f1']);
const formerExceptions = new Set([
  'fa0bccb2d190a7c0',
  '8d9df0fbb77ce9eb',
  '9f89e6d7784cf4a2',
  '9ee73ce6168105ec'
]);
const searchable = stores.filter(store => (
  (store.store_id || store.id) && store.name?.trim() && store.name !== '제목 없음'
));
const hasDirectPhone = store => {
  const id = String(store.store_id || store.id);
  return clickable.has(id) && validPhone(runtimePhones.get(id) || store.phone);
};
const hasSafePhoneOrder = store => {
  const id = String(store.store_id || store.id);
  return hasDirectPhone(store) || (Boolean(phoneRoute(store)) && !blocked.has(id));
};

const direct = searchable.filter(hasDirectPhone);
const fallback = searchable.filter(store => !hasDirectPhone(store) && phoneRoute(store) && !blocked.has(String(store.store_id || store.id)));
const restoredExisting = fallback.filter(store => !formerExceptions.has(String(store.store_id || store.id)));
const exactSafeBatch08PhoneIds = new Set(classificationRows
  .filter(row => row.channel === 'phone_order' && row.classification === 'exact-safe' && row.recovery_status === 'batch-08-restored')
  .map(row => String(row.store_id)));
const visiblePhoneStores = searchable.filter(hasSafePhoneOrder);
const unresolved = searchable.filter(store => !hasSafePhoneOrder(store));

const addedCases = [
  ['709d27cafd434e30', '시민족발보쌈', '050713018246', 'https://bit.ly/4qWUGxu'],
  ['c057c0a0076a8eb1', '시원밀면냉면 여수점', '050841789106', 'https://bit.ly/3QPKFoX']
];
for (const [id, name, phone, url] of addedCases) {
  const store = byId.get(id);
  assert(store?.name === name, `${name}: canonical 가게 불일치`);
  assert(String(store.phone).replace(/\D/g, '') === phone, `${name}: 전화번호 복구 불일치`);
  assert(phoneRoute(store)?.url === url, `${name}: 전화경로 복구 불일치`);
}

assert(stores.length === 650, `전체 가게 ${stores.length} (기대 650)`);
assert(searchable.length === 649, `검색 대상 ${searchable.length} (기대 649)`);
assert(stores.flatMap(store => store.routes || []).length === 4558, '주문경로는 기존 4,556건에서 전화경로 2건만 증가해야 합니다.');
assert(new Set(stores.map(store => String(store.store_id || store.id))).size === 650, '가게 ID 중복이 있습니다.');
assert(stores.every(store => String(store.store_id || store.id)), '가게 ID 누락이 있습니다.');
assert((priorityData.managedStoreIds || []).length === 149, '관리 가게 우선순위 149곳이 유지되어야 합니다.');

assert(direct.length === 548, `전화번호 직접 확인 대상 ${direct.length} (기대 548)`);
assert(fallback.length === 95, `검증 전화경로 대상 ${fallback.length} (기대 95)`);
assert(restoredExisting.length === 91, `기존 전화경로 복구 ${restoredExisting.length}곳 (기대 91)`);
assert(restoredExisting.every(store => exactSafeBatch08PhoneIds.has(String(store.store_id || store.id))), '91곳 기존 복구 경로 중 감사자료 exact-safe 기록이 없는 가게가 있습니다.');
assert(visiblePhoneStores.length === 643, `팝업·홈 전화주문 노출 ${visiblePhoneStores.length}곳 (기대 643)`);
assert(restoredExisting.length + addedCases.length === 93, '이번 복구 범위는 정확히 93곳이어야 합니다.');

const expectedUnresolved = new Set([
  '메가MGC커피 여수진남시장점(학동)',
  '불족대가 미평점',
  '오늘은카레 봉산점',
  '맛있는 반찬',
  '배가네왕족보 여문본점',
  '카페 브라운'
]);
assert(unresolved.length === 6, `차단·미확인 대상 ${unresolved.length}곳 (기대 6)`);
assert(unresolved.every(store => expectedUnresolved.has(store.name)), '차단·미확인 대상이 변경되었습니다.');
assert([...blocked].every(id => phoneRoute(byId.get(id)) && !hasSafePhoneOrder(byId.get(id))), '잘못된 전화경로 2곳은 계속 차단되어야 합니다.');

assert(source.includes('.map(store => ({store, phoneOrder: resolveStoreChannels(store).primaryOrder.phoneOrder}))'), '홈 전화주문 목록이 공통 채널 판정을 사용하지 않습니다.');
assert(source.includes('const channels = resolveStoreChannels(store);'), '가게 팝업이 공통 채널 판정을 사용하지 않습니다.');
assert(source.includes('phoneRoute && !RC3_BLOCKED_PHONE_ROUTE_STORES.has'), '전화경로 허용·차단 판정이 누락되었습니다.');
assert(source.includes('data-phone-route-store-id='), '홈 전화주문 목록의 검증 경로 링크가 누락되었습니다.');
assert(appSource.includes("const ASSET_VERSION = 'phone-route-restoration-1';"), '가게 데이터 캐시 버전이 갱신되지 않았습니다.');
assert(finalExperienceSource.includes("fxRc2Style.href='rc2-fixes.css?v=phone-route-restoration-1';"), '전화목록 스타일 캐시 버전이 갱신되지 않았습니다.');
assert(finalExperienceSource.includes("fxRc3Script.src='rc3-fixes.js?v=selected-category-label-1-phone-route-restoration-1';"), '전화경로 코드 캐시 버전이 갱신되지 않았습니다.');
assert(htmlSource.includes('app.js?v=photo-viewer-removed-1-store-share-deep-link-1-phone-route-restoration-1'), '기본 앱 캐시 버전이 갱신되지 않았습니다.');
assert(htmlSource.includes('final-experience.js?v=selected-category-label-2-store-share-deep-link-2-phone-route-restoration-1'), '최종 화면 코드 캐시 버전이 갱신되지 않았습니다.');

console.log(JSON.stringify({
  ok: true,
  totalStores: stores.length,
  searchableStores: searchable.length,
  totalRoutes: stores.flatMap(store => store.routes || []).length,
  restoredExistingPhoneRoutes: restoredExisting.length,
  addedCanonicalPhoneRoutes: addedCases.length,
  restoredThisChange: restoredExisting.length + addedCases.length,
  popupAndHomePhoneStores: visiblePhoneStores.length,
  intentionallyBlockedOrUnresolved: unresolved.map(store => store.name)
}, null, 2));
