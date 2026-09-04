import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const read = path => readFile(new URL(path, import.meta.url), 'utf8');
const [prioritySource, app, finalExperience, rc6, dataApi, html] = await Promise.all([
  read('./data/store-priority.json'),
  read('./app.js'),
  read('./final-experience.js'),
  read('./rc6-fixes.js'),
  read('./data-api.js'),
  read('./index.html')
]);
const priority = JSON.parse(prioritySource);
const formerStores = [
  ['361f855efc21c1c2', '가마치통닭 여서점'],
  ['b8267998349b16e1', '노랑통닭 여서문수점'],
  ['14feb7cbd67ef7e2', '1인피자 미니8 여수점']
];
const formerIds = formerStores.map(([id]) => id);

assert.deepEqual(priority.deprioritizedStoreIds, formerIds, '가맹 종료 세 가게를 정확히 후순위 목록에 둬야 합니다.');
for (const [id, name] of formerStores) {
  assert.ok(!priority.managedStoreIds.includes(id), `${name}은 가맹점 우선목록에서 빠져야 합니다.`);
}
assert.equal(priority.stats.managedCanonicalStores, 147, '가맹점 수는 두 곳 제외 결과와 일치해야 합니다.');
assert.equal(priority.stats.deprioritizedCanonicalStores, 3, '후순위 가게 수를 명시해야 합니다.');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} 함수가 있어야 합니다.`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} 함수 범위를 찾지 못했습니다.`);
}

const ordinary = {id: 'ordinary', name: '일반 가게', lat: 10, lng: 0, statusRank: 0};
const former = {id: formerIds[0], name: formerStores[0][1], lat: 0.1, lng: 0, statusRank: 0};
const managedId = priority.managedStoreIds[0];
const managed = {id: managedId, name: '현재 가맹점', lat: 20, lng: 0, statusRank: 0};
const rc6Context = {
  rc6StorePriority: priority,
  rc6ManagedStoreIds: new Set(),
  rc6SharedManagedStoreIds: new Set(),
  rc6DeprioritizedStoreIds: new Set(),
  categoryPriorityOverrides: {},
  LOCATION_CATEGORY_PRIORITY_OVERRIDES: {},
  canonicalStores: [former, ordinary, managed],
  rc6LocationCache: {},
  rc6NearStores: () => [former, ordinary, managed],
  compareStoreBusinessStatus: () => 0,
  Set, String, Number, Map
};
vm.createContext(rc6Context);
vm.runInContext(`${extractFunction(rc6, 'rc6ApplyStorePriority')};${extractFunction(rc6, 'rc6OwnershipTier')};${extractFunction(rc6, 'rc6RankCandidatesByCustomerLocation')};this.apply=rc6ApplyStorePriority;this.tier=rc6OwnershipTier;this.rank=rc6RankCandidatesByCustomerLocation;`, rc6Context);
rc6Context.apply();
assert.equal(former.managed, false, '가맹 종료 가게의 managed 표시는 false여야 합니다.');
assert.equal(former.deprioritized, true, '가맹 종료 가게에 후순위 표시를 적용해야 합니다.');
assert.equal(rc6Context.tier(managed), 0, '현재 가맹점은 기존 우선순위를 유지해야 합니다.');
assert.equal(rc6Context.tier(ordinary), 2, '일반 가게는 기존 일반 순위를 유지해야 합니다.');
assert.equal(rc6Context.tier(former), 3, '가맹 종료 가게는 일반 가게보다 낮은 순위여야 합니다.');
assert.deepEqual(Array.from(rc6Context.rank([former, ordinary]), store => store.id), [ordinary.id, former.id], '가까운 가게 추천에서도 가맹 종료 가게를 일반 가게 뒤에 둬야 합니다.');
assert.match(rc6, /spec\.kind==='near'\)ranked=rc6RankCandidatesByCustomerLocation\(rc6NearStores\(\)\)/, '가까운 가게 rail도 후순위 정렬을 반드시 거쳐야 합니다.');

const listContext = {
  stores: [former, ordinary],
  state: {brandId: '', query: '', sortByDistance: true, location: '여수시 전체', category: '전체', coords: {lat: 0, lng: 0}},
  BRAND_BY_ID: {}, REGION_DEFAULT_AREA: '여수시 전체',
  relevance: () => 1,
  haversine: (_from, to) => Number(to.lat),
  storeMatchesLocation: () => true,
  storeMatchesCategory: () => true,
  brandMatchesStore: () => true,
  compareStoreBusinessStatus: () => 0,
  applyCategoryPriorityOverrides: list => list,
  Number
};
vm.createContext(listContext);
vm.runInContext(`${extractFunction(app, 'filteredStores')};this.filtered=filteredStores;`, listContext);
assert.deepEqual(Array.from(listContext.filtered(), store => store.id), [ordinary.id, former.id], '가게목록에서도 더 가까운 가맹 종료 가게를 일반 가게 뒤에 둬야 합니다.');

const railContext = {
  stores: [former, ordinary],
  fxVisible: () => true,
  fxHasCustomerAction: () => true,
  fxThemeMatch: () => true,
  fxDistance: store => store.lat,
  storeHasChannel: () => true,
  compareStoreBusinessStatus: () => 0
};
vm.createContext(railContext);
vm.runInContext(`${extractFunction(finalExperience, 'fxRankStores')};this.rank=fxRankStores;`, railContext);
assert.deepEqual(Array.from(railContext.rank({kind: 'local', pattern: /./}), store => store.id), [ordinary.id, former.id], '저수수료 주문경로가 있어도 추천 rail에서는 가맹 종료 가게를 맨 뒤로 보내야 합니다.');

assert.match(rc6, /rc6OwnershipTier\(store\)<2/, '메인 가게 배너는 현재 가맹점만 사용해야 합니다.');
assert.match(rc6, /store-priority\.json\?v=former-managed-bottom-1/, '후순위 데이터 캐시를 갱신해야 합니다.');
assert.match(finalExperience, /rc6-fixes\.js\?v=[^']*former-managed-bottom-1/, '추천 코드 캐시를 갱신해야 합니다.');
assert.match(html, /app\.js\?v=[^"\n]*former-managed-bottom-1/, '가게목록 코드 캐시를 갱신해야 합니다.');
assert.match(html, /final-experience\.js\?v=[^"\n]*former-managed-bottom-1/, '추천 진입 코드 캐시를 갱신해야 합니다.');
assert.doesNotMatch(dataApi.match(/CUSTOMER_HIDDEN_STORE_IDS[\s\S]*?\]\);/)?.[0] || '', /14feb7cbd67ef7e2/, '미니8의 정상 대표 가게는 삭제하지 않고 후순위로만 보내야 합니다.');

console.log('former managed stores bottom regression test passed');
