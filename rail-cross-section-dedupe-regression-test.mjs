import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const finalExperience = await readFile(new URL('./final-experience.js', import.meta.url), 'utf8');
const indexHtml = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const stores = JSON.parse(await readFile(new URL('./data/stores.json', import.meta.url)));
const neighborhoodData = JSON.parse(await readFile(new URL('./data/yeosu-neighborhoods.json', import.meta.url)));
const priority = JSON.parse(await readFile(new URL('./data/store-priority.json', import.meta.url)));

function functionSource(name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} 함수가 없습니다.`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} 함수 끝을 찾지 못했습니다.`);
}

assert.doesNotMatch(
  functionSource('rc2RailCandidates'),
  /allowGlobalReuse/,
  '홈 추천 섹션에서 이미 노출한 가게를 다시 허용하고 있습니다.'
);
assert.match(
  functionSource('rc2RailCandidates'),
  /globallyUsed\.has\(storeId\)/,
  '홈 추천 섹션 전체에서 가게 ID를 확인하지 않습니다.'
);
assert.doesNotMatch(
  finalExperience,
  /if\(list\.length<3\)list=fxRankStores\(spec\)\.slice\(0,8\)/,
  '초기 홈 추천 화면이 가게 수를 채우려고 이미 쓴 가게를 다시 사용합니다.'
);
assert.match(
  finalExperience,
  /list\.forEach\(store=>used\.add\(String\(store\.id\)\)\)/,
  '초기 홈 추천 화면이 선택된 카드 전체를 중복 방지 목록에 기록하지 않습니다.'
);
assert.match(
  finalExperience,
  /rc2-fixes\.js\?v=[^']*rail-cross-section-dedupe-1/,
  'RC2 중복 방지 코드의 캐시 버전이 갱신되지 않았습니다.'
);
assert.match(
  indexHtml,
  /final-experience\.js\?v=[^"]*rail-cross-section-dedupe-1/,
  '첫 화면 추천 코드의 캐시 버전이 갱신되지 않았습니다.'
);

const candidatesBySpec = {
  today: [
    {id: 'ungcheon-sashimi', brand: '웅천횟집', photo: 'ungcheon.jpg', rc6LocationBucket: 0, tier: 0},
    {id: 'today-a', brand: '오늘A', photo: 'today-a.jpg', rc6LocationBucket: 0, tier: 0},
    {id: 'today-b', brand: '오늘B', photo: 'today-b.jpg', rc6LocationBucket: 0, tier: 1}
  ],
  near: [
    {id: 'ungcheon-sashimi', brand: '웅천횟집', photo: 'ungcheon.jpg', rc6LocationBucket: 0, tier: 0},
    {id: 'near-a', brand: '가까운A', photo: 'near-a.jpg', rc6LocationBucket: 0, tier: 0},
    {id: 'near-b', brand: '가까운B', photo: 'near-b.jpg', rc6LocationBucket: 0, tier: 1},
    {id: 'near-c', brand: '가까운C', photo: 'near-c.jpg', rc6LocationBucket: 1, tier: 0}
  ],
  local: [
    {id: 'ungcheon-sashimi', brand: '웅천횟집', photo: 'ungcheon.jpg', rc6LocationBucket: 0, tier: 0},
    {id: 'local-a', brand: '지역A', photo: 'local-a.jpg', rc6LocationBucket: 0, tier: 0},
    {id: 'local-b', brand: '지역B', photo: 'local-b.jpg', rc6LocationBucket: 0, tier: 1},
    {id: 'local-c', brand: '지역C', photo: 'local-c.jpg', rc6LocationBucket: 1, tier: 0}
  ]
};

const context = {
  Set,
  String,
  Number,
  fxRankStores: spec => candidatesBySpec[spec.id],
  rc6OwnershipTier: store => store.tier,
  rc2RandomizedRailStores: stores => stores,
  rc2BrandKey: store => store.brand,
  fxPhoto: store => store.photo
};
vm.createContext(context);
vm.runInContext(functionSource('rc2RailCandidates'), context);

const globallyUsed = new Set();
const rails = ['today', 'near', 'local'].map(id =>
  context.rc2RailCandidates({id}, globallyUsed, 3).map(store => store.id)
);
const visibleIds = rails.flat();

assert.equal(visibleIds.length, 9, '중복 제거 후에도 각 추천 섹션을 새 가게로 채워야 합니다.');
assert.equal(
  new Set(visibleIds).size,
  visibleIds.length,
  `홈 추천 섹션 사이에 같은 가게가 반복됩니다: ${JSON.stringify(rails)}`
);
assert.equal(
  visibleIds.filter(id => id === 'ungcheon-sashimi').length,
  1,
  '웅천횟집이 여러 추천 섹션에 반복 노출됩니다.'
);

const managed = new Set((priority.managedStoreIds || []).map(String));
const shared = new Set((priority.sharedManagedStoreIds || []).map(String));
const normalize = value => String(value || '').toLowerCase().replace(/[\s,\/·&()\-_.]/g, '');
const sixRails = ['today', 'near', 'local', 'warm', 'appetite', 'new'];
const neighborhoodAudits = [];

for (const neighborhood of neighborhoodData.neighborhoods) {
  const location = normalize(neighborhood.name);
  const ranked = stores
    .filter(store => String(store.store_id || store.id || ''))
    .map((store, index) => {
      const id = String(store.store_id || store.id);
      const text = normalize([store.area, store.district, store.address, store.name].filter(Boolean).join(' '));
      return {
        id,
        brand: normalize(store.realBusinessName || store.name) || id,
        photo: `store-photo:${id}`,
        rc6LocationBucket: text.includes(location) ? 0 : 1,
        tier: managed.has(id) ? 0 : shared.has(id) ? 1 : 2,
        index
      };
    })
    .sort((a, b) =>
      a.rc6LocationBucket - b.rc6LocationBucket ||
      a.tier - b.tier ||
      a.index - b.index
    );
  context.activeCandidates = ranked;
  context.fxRankStores = () => context.activeCandidates;
  const used = new Set();
  const sectionIds = sixRails.map(id =>
    context.rc2RailCandidates({id}, used, 8).map(store => store.id)
  );
  const flattened = sectionIds.flat();
  assert.equal(
    new Set(flattened).size,
    flattened.length,
    `${neighborhood.name}: 홈 추천 섹션 사이에 같은 가게가 반복됩니다.`
  );
  neighborhoodAudits.push({
    neighborhood: neighborhood.name,
    visibleCards: flattened.length,
    uniqueCards: new Set(flattened).size
  });
}

console.log(JSON.stringify({
  status: 'PASS',
  rails,
  uniqueVisibleStores: new Set(visibleIds).size,
  auditedNeighborhoods: neighborhoodAudits.length,
  allNeighborhoodsUnique: neighborhoodAudits.every(item => item.visibleCards === item.uniqueCards),
  rule: '한 섹션에서 사용한 가게 ID는 아래 홈 추천 섹션에서 다시 사용하지 않음'
}, null, 2));
