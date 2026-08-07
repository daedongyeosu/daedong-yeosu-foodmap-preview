import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const rc2 = await readFile(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const finalExperience = await readFile(new URL('./final-experience.js', import.meta.url), 'utf8');
const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');

const expectedStores = [
  ['7bc7239e6b509c44', '수라상궁 조선국밥 여서점'],
  ['d86586aaef8454c9', '조선밀면&냉면 여수여서점'],
  ['04910f606ba038a6', '오워래 수제 돈까스'],
  ['84c118675c0caa4c', '바오탕수 여서점']
];

for (const [id, name] of expectedStores) {
  assert.match(rc2, new RegExp(`['"]${id}['"]\\s*,?\\s*\\/\\/ ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `${name}의 기존 고유 ID가 추천 우선순위에 고정되어야 합니다.`);
}

for (const neighborhood of ['여서동', '문수동', '오림동']) {
  assert.match(rc2, new RegExp(`RC2_MANAGED_REGION_PRIORITY_NEIGHBORHOODS[^;]+['"]${neighborhood}['"]`), `${neighborhood} 이용자에게만 지정 우선순위가 적용되어야 합니다.`);
}

for (const rail of ['today', 'near', 'local', 'group', 'solo']) {
  assert.match(rc2, new RegExp(`RC2_MANAGED_REGION_PRIORITY_RAILS[^;]+['"]${rail}['"]`), `${rail} 추천 섹션에 지정 우선순위가 적용되어야 합니다.`);
}

assert.match(rc2, /rankedById\.get\(id\) \|\| fxStoreById\(id\)/, '주제 정규식에 걸리지 않는 지정 가게도 해당 추천 섹션에 강제로 포함되어야 합니다.');
assert.match(rc2, /normalSlotCount = Math\.max\(0, limit - priority\.length\)/, '각 섹션은 네 지정 가게의 자리를 먼저 확보해야 합니다.');
assert.match(rc2, /sortStoresByBusinessStatus\(\[\.\.\.priority, \.\.\.normal\]\)/, '우선 가게를 포함해도 영업상태 정렬 계약을 지켜야 합니다.');
assert.match(rc2, /const finish = \(\) => rc2ApplyManagedRegionPriority\(result, spec, limit, rankedStores\)/, '모든 추천 후보 생성 경로가 지정 우선순위를 거쳐야 합니다.');
assert.match(finalExperience, /rc2-fixes\.js\?v=[^']*managed-region-priority-1/, '추천 코드 캐시를 갱신해야 합니다.');
assert.match(html, /final-experience\.js\?v=[^"]*managed-region-priority-1/, '배포 페이지가 새 추천 코드를 즉시 불러와야 합니다.');

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

const priorityStores = expectedStores.map(([id, name]) => ({id, name, statusRank: 0}));
const ordinaryStores = Array.from({length: 8}, (_, index) => ({id: `ordinary-${index + 1}`, statusRank: 0}));
const storesById = new Map(priorityStores.map(store => [store.id, store]));
const context = {
  RC2_MANAGED_REGION_PRIORITY_STORE_IDS: expectedStores.map(([id]) => id),
  RC2_MANAGED_REGION_PRIORITY_NEIGHBORHOODS: new Set(['여서동', '문수동', '오림동']),
  RC2_MANAGED_REGION_PRIORITY_RAILS: new Set(['today', 'near', 'local', 'group', 'solo']),
  state: {location: '', addressLabel: '', coords: null},
  neighborhoodFor: value => ['여서동', '문수동', '오림동', '둔덕동'].find(name => String(value || '').includes(name)) || '',
  rc6ClosestNeighborhood: () => '',
  fxStoreById: id => storesById.get(String(id)),
  fxVisible: () => true,
  sortStoresByBusinessStatus: list => [...list].sort((left, right) => left.statusRank - right.statusRank),
  Map,
  Set,
  String,
  Math
};
vm.createContext(context);
vm.runInContext(`${extractFunction(rc2, 'rc2ManagedRegionPriorityNeighborhood')};${extractFunction(rc2, 'rc2ApplyManagedRegionPriority')};this.applyPriority=rc2ApplyManagedRegionPriority;`, context);

for (const neighborhood of ['여서동', '문수동', '오림동']) {
  context.state.location = neighborhood;
  for (const rail of ['today', 'near', 'local', 'group', 'solo']) {
    const result = context.applyPriority(ordinaryStores, {id: rail}, 8, []);
    assert.deepEqual(Array.from(result.slice(0, 4), store => store.id), expectedStores.map(([id]) => id), `${neighborhood}의 ${rail} 섹션은 네 지정 가게를 가장 먼저 보여야 합니다.`);
  }
}

context.state.location = '둔덕동';
assert.deepEqual(Array.from(context.applyPriority(ordinaryStores, {id: 'today'}, 8, []), store => store.id), ordinaryStores.map(store => store.id), '다른 동네의 기존 추천 순서는 바꾸면 안 됩니다.');

context.state.location = '여서동';
priorityStores.at(-1).statusRank = 3;
const statusProtected = context.applyPriority(ordinaryStores, {id: 'today'}, 8, []);
assert.equal(statusProtected.some(store => store.id === priorityStores.at(-1).id), true, '영업종료 상태여도 지정 가게의 추천 자리는 보존해야 합니다.');
assert.equal(statusProtected.at(-1).id, priorityStores.at(-1).id, '지정 우선노출도 영업 중 → 영업종료 상태 순서를 깨면 안 됩니다.');

console.log('managed region recommendation priority regression test passed');
