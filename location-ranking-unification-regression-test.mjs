import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync('app.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const rc6 = fs.readFileSync('rc6-fixes.js', 'utf8');
const services = fs.readFileSync('store-service-info.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');

function functionSource(source, name) {
  const start = source.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} 함수가 있어야 합니다.`);
  const body = source.indexOf('{', start);
  let depth = 0;
  for (let cursor = body; cursor < source.length; cursor += 1) {
    if (source[cursor] === '{') depth += 1;
    if (source[cursor] === '}' && --depth === 0) return source.slice(start, cursor + 1);
  }
  throw new Error(`${name} 함수 범위를 찾지 못했습니다.`);
}

assert.match(app, /window\.daedongCatalogReady = new Promise/,
  'API 가게목록 준비 상태를 공통 Promise로 공개해야 합니다.');
assert.match(app, /normalizedNeighborhoodNames\(raw\.neighborhoods\|\|\[\]\)/,
  'API가 제공한 복수 동네를 정규화해야 합니다.');
assert.match(app, /closestNeighborhoodForCoordinates\(\{lat,lng\}\)/,
  '주소·동네가 없는 가게는 좌표로 가장 가까운 여수 동네를 보완해야 합니다.');
assert.match(finalExperience, /await window\.daedongCatalogReady;await fxInitialize\(\);await rc6Initialize\(\)/,
  '추천·위치 레이어는 가게목록이 준비된 뒤 초기화해야 합니다.');
assert.match(services, /window\.daedongLocationRankingReady \|\| Promise\.resolve\(false\)/,
  '영업 중·혜택 목록은 위치 정렬 초기화까지 기다려야 합니다.');

const coordinateContext = {
  canonicalStores: [
    {id: 'catalog', lat: 34.761, lng: 127.671, coordinateSource: 'store', neighborhoods: []},
    {id: 'static', lat: 34.700, lng: 127.600, coordinateSource: 'store', neighborhoods: ['학동']},
    {id: 'missing', lat: null, lng: null, coordinateSource: '', neighborhoods: []}
  ],
  rc6Coordinates: {
    static: {status: 'verified', latitude: 34.755, longitude: 127.665}
  },
  coordinateStores: [],
  rc6LocationCache: {key: 'old', stores: ['old']},
  storeNeighborhoods: store => store.neighborhoods || [],
  closestNeighborhoodForCoordinates: point => point.lat > 34.758 ? '신기동' : '학동',
  rc6Verified: store => Boolean(store.coordinateVerified && Number.isFinite(store.lat) && Number.isFinite(store.lng)),
  Number,
  Set,
  String,
  Boolean
};
vm.createContext(coordinateContext);
vm.runInContext(functionSource(rc6, 'rc6ApplyCoordinates'), coordinateContext);
vm.runInContext('rc6ApplyCoordinates()', coordinateContext);

const [catalogCoordinate, staticCoordinate, missingCoordinate] = coordinateContext.canonicalStores;
assert.deepEqual(
  {lat: catalogCoordinate.lat, lng: catalogCoordinate.lng, verified: catalogCoordinate.coordinateVerified},
  {lat: 34.761, lng: 127.671, verified: true},
  '정적 좌표표에 없어도 API 카탈로그 좌표를 버리면 안 됩니다.'
);
assert.deepEqual(
  {lat: staticCoordinate.lat, lng: staticCoordinate.lng, source: staticCoordinate.coordinateSource},
  {lat: 34.755, lng: 127.665, source: 'verified-static'},
  '검증된 정적 좌표는 API 좌표보다 우선해야 합니다.'
);
assert.equal(missingCoordinate.lat, null, '좌표가 없는 가게를 0,0 좌표로 오인하면 안 됩니다.');
assert.equal(missingCoordinate.coordinateVerified, false, '좌표가 없는 가게는 검증 좌표로 표시하면 안 됩니다.');
assert(catalogCoordinate.neighborhoods.includes('신기동'), 'API 좌표에서 동네를 보완해야 합니다.');
assert.equal(coordinateContext.coordinateStores.length, 2, '실제 좌표가 있는 가게만 거리 계산 대상이어야 합니다.');

const newRailContext = {
  rc6RankCandidatesByCustomerLocation: candidates => candidates,
  rc6OwnershipTier: store => store.tier,
  storeBusinessStatusPriority: store => store.statusRank ?? 2,
  Number,
  Date,
  String
};
vm.createContext(newRailContext);
vm.runInContext(`${functionSource(rc6, 'rc6NewnessRank')}\n${functionSource(rc6, 'rc6RankNewStoresByCustomerLocation')}`, newRailContext);
newRailContext.candidates = [
  {id: 'old', name: '기존가게', rawIndex: 10, tier: 0, rc6LocationBucket: 0},
  {id: 'new', name: '신규가게', rawIndex: 30, tier: 0, rc6LocationBucket: 0},
  {id: 'other-area', name: '다른동네신규', rawIndex: 99, tier: 0, rc6LocationBucket: 1}
];
const newestOrder = vm.runInContext('rc6RankNewStoresByCustomerLocation(candidates).map(store => store.id)', newRailContext);
assert.deepEqual(Array.from(newestOrder), ['new', 'old', 'other-area'],
  '신규가게는 같은 동네·관리등급 안에서 최신순이어야 하며 다른 동네가 앞서면 안 됩니다.');
assert.match(rc2, /RC2_RAIL_RANDOM_SEED = new Date\(\)\.toLocaleDateString\('sv-SE', \{timeZone: 'Asia\/Seoul'\}\)/,
  '추천 목록은 새로고침할 때마다 바뀌지 않는 일별 시드를 사용해야 합니다.');
assert.match(rc2, /spec\.kind === 'new' \? group\.stores : rc2RandomizedRailStores/,
  '신규가게 목록을 무작위로 섞으면 안 됩니다.');

const serviceOrderContext = {
  locationMode: 'nearby',
  overviewQuery: '',
  activeStatus: 'all',
  referenceCoordinate: () => ({lat: 34.76, lng: 127.67}),
  overviewIdentityPriority: () => 0,
  overviewStatusPriority: () => 0,
  overviewMenuEvidencePriority: () => 0,
  String,
  Boolean
};
vm.createContext(serviceOrderContext);
vm.runInContext(functionSource(services, 'compareOverviewEntries'), serviceOrderContext);
serviceOrderContext.rows = [
  {id: 'other-managed', locationBucket: 1, ownershipTier: 0, areaDistance: 0.1, area: '학동', index: 0},
  {id: 'local-general', locationBucket: 0, ownershipTier: 2, areaDistance: 0.2, area: '신기동', index: 1},
  {id: 'local-managed', locationBucket: 0, ownershipTier: 0, areaDistance: 2.0, area: '신기동', index: 2}
];
const nearbyOrder = vm.runInContext('[...rows].sort(compareOverviewEntries).map(row => row.id)', serviceOrderContext);
assert.deepEqual(Array.from(nearbyOrder), ['local-managed', 'local-general', 'other-managed'],
  '영업 중 목록도 선택 동네 → 관리가게 → 실제 거리 순서를 지켜야 합니다.');
serviceOrderContext.locationMode = 'all';
const allOrder = vm.runInContext('[...rows].sort(compareOverviewEntries).map(row => row.id)', serviceOrderContext);
assert.deepEqual(Array.from(allOrder), ['other-managed', 'local-general', 'local-managed'],
  '여수 전체 모드에서는 기존 가게 순서를 보존해야 합니다.');

serviceOrderContext.locationMode = 'nearby';
serviceOrderContext.overviewQuery = '아이스크림';
serviceOrderContext.overviewIdentityPriority = row => row.identityPriority ?? 4;
serviceOrderContext.overviewStatusPriority = row => ({open: 0, 'closing-soon': 1, unknown: 2, closed: 3})[row.status.state];
serviceOrderContext.overviewMenuEvidencePriority = row => row.menuEvidencePriority;
serviceOrderContext.searchRows = [
  {id: 'unknown-local-photo', identityPriority: 4, status: {state: 'unknown'}, menuEvidencePriority: 0, locationBucket: 0, ownershipTier: 0, areaDistance: 0.1, area: '신기동', index: 0},
  {id: 'open-local-category', identityPriority: 4, status: {state: 'open'}, menuEvidencePriority: 2, locationBucket: 0, ownershipTier: 2, areaDistance: 0.2, area: '신기동', index: 1},
  {id: 'open-nearby-photo', identityPriority: 4, status: {state: 'open'}, menuEvidencePriority: 0, locationBucket: 1, ownershipTier: 2, areaDistance: 2.0, area: '미평동', index: 2},
  {id: 'closing-local-photo', identityPriority: 4, status: {state: 'closing-soon'}, menuEvidencePriority: 0, locationBucket: 0, ownershipTier: 0, areaDistance: 0.3, area: '신기동', index: 3},
  {id: 'closed-local-photo', identityPriority: 4, status: {state: 'closed'}, menuEvidencePriority: 0, locationBucket: 0, ownershipTier: 0, areaDistance: 0.4, area: '신기동', index: 4}
];
const searchOrder = vm.runInContext('[...searchRows].sort(compareOverviewEntries).map(row => row.id)', serviceOrderContext);
assert.deepEqual(Array.from(searchOrder), [
  'open-nearby-photo',
  'open-local-category',
  'closing-local-photo',
  'unknown-local-photo',
  'closed-local-photo'
], '검색 결과에만 영업상태와 실제 메뉴 근거 우선순위를 적용해야 합니다.');
assert.match(services, /entry\.areas\.includes\(ensureSelectedArea\(\)\)/,
  '복수 동네 가게는 어느 등록 동네를 선택해도 포함되어야 합니다.');
assert.match(services, /storeCoordinate\s*\? distanceBetween\(reference, storeCoordinate\)/,
  '영업 중 목록은 동네 중심점보다 가게 실제 좌표 거리를 우선해야 합니다.');

for (const version of [
  'location-ranking-unified-1',
  'location-ranking-ready-1',
  'location-stable-newest-1',
  'location-coordinate-merge-1'
]) {
  assert(index.includes(version) || finalExperience.includes(version), `브라우저 캐시 버전이 필요합니다: ${version}`);
}

console.log('PASS 위치·주소 기반 가게 정렬 통합 회귀검사');
