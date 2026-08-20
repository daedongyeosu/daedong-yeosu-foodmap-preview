import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const rc2 = await readFile(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const rc3 = await readFile(new URL('./rc3-fixes.js', import.meta.url), 'utf8');
const finalExperience = await readFile(new URL('./final-experience.js', import.meta.url), 'utf8');
const html = await readFile(new URL('./index.html', import.meta.url), 'utf8');

const expectedAssignments = [
  ['today', '7bc7239e6b509c44', '수라상궁 조선국밥 여서점'],
  ['near', 'd86586aaef8454c9', '조선밀면&냉면 여수여서점'],
  ['local', '04910f606ba038a6', '오워래 수제 돈까스'],
  ['group', '84c118675c0caa4c', '바오탕수 여서점'],
  ['solo', '0cc943f6a58888d0', '왕창 돼지두루치기 여서점']
];

for (const [rail, id, name] of expectedAssignments) {
  assert.match(rc2, new RegExp(`${rail}: ['"]${id}['"]\\s*,?\\s*\\/\\/ ${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`), `${name}의 기존 고유 ID가 ${rail} 추천 우선순위에 고정되어야 합니다.`);
}

for (const neighborhood of ['여서동', '문수동', '오림동']) {
  assert.match(rc2, new RegExp(`RC2_MANAGED_REGION_PRIORITY_NEIGHBORHOODS[^;]+['"]${neighborhood}['"]`), `${neighborhood} 이용자에게만 지정 우선순위가 적용되어야 합니다.`);
}

assert.match(rc2, /rankedById\.get\(priorityId\) \|\| fxStoreById\(priorityId\)/, '주제 정규식에 걸리지 않는 배정 가게도 해당 추천 섹션에 강제로 포함되어야 합니다.');
assert.match(rc2, /normalSlotCount = Math\.max\(0, limit - 1\)/, '각 섹션은 배정된 가게 한 곳의 자리만 먼저 확보해야 합니다.');
assert.match(rc2, /storeBusinessStatusPriority\(priority\) !== 0/, '영업 중이 아닌 배정 가게는 우선 자리를 확보하면 안 됩니다.');
assert.match(rc2, /rc2ManagedRegionDailyPosition\(spec, priorityId\)/, '배정 가게는 날짜에 따라 1·2·3번째 자리를 순환해야 합니다.');
assert.match(rc2, /const key = `\$\{status\}:\$\{bucket\}:\$\{tier\}`/, '나머지 후보는 영업상태·지역·관리 가게 순위를 유지해야 합니다.');
assert.match(rc2, /const finish = \(\) => rc2ApplyManagedRegionPriority\(result, spec, limit, rankedStores\)/, '모든 추천 후보 생성 경로가 지정 우선순위를 거쳐야 합니다.');
assert.match(rc3, /const cards = rc2ApplyManagedRegionPriority\(diversifiedCards, spec, 8, rankedStores\)/, '화면에 그리기 직전에도 한 번 계산한 동일 후보군으로 날짜별 1·2·3번째 자리를 최종 고정해야 합니다.');
assert.match(finalExperience, /rc2-fixes\.js\?v=[^']*managed-region-priority-3/, '추천 코드 캐시를 갱신해야 합니다.');
assert.match(finalExperience, /rc3-fixes\.js\?v=[^']*managed-region-priority-3/, '최종 추천 렌더링 코드 캐시를 갱신해야 합니다.');
assert.match(html, /final-experience\.js\?v=[^"]*managed-region-priority-3/, '배포 페이지가 새 추천 코드를 즉시 불러와야 합니다.');

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

const priorityStores = expectedAssignments.map(([, id, name]) => ({id, name, statusRank: 0}));
const ordinaryStores = Array.from({length: 8}, (_, index) => ({id: `ordinary-${index + 1}`, statusRank: 0}));
const storesById = new Map(priorityStores.map(store => [store.id, store]));
const context = {
  RC2_RAIL_RANDOM_SEED: '2026-08-07',
  RC2_MANAGED_REGION_PRIORITY_STORE_BY_RAIL: Object.fromEntries(expectedAssignments.map(([rail, id]) => [rail, id])),
  RC2_MANAGED_REGION_PRIORITY_NEIGHBORHOODS: new Set(['여서동', '문수동', '오림동']),
  state: {location: '', addressLabel: '', coords: null},
  neighborhoodFor: value => ['여서동', '문수동', '오림동', '둔덕동'].find(name => String(value || '').includes(name)) || '',
  rc6ClosestNeighborhood: () => '',
  fxStoreById: id => storesById.get(String(id)),
  fxVisible: () => true,
  storeBusinessStatusPriority: store => store.statusRank,
  sortStoresByBusinessStatus: list => [...list].sort((left, right) => left.statusRank - right.statusRank),
  Date,
  Map,
  Number,
  Set,
  String,
  Math
};
vm.createContext(context);
vm.runInContext(`${extractFunction(rc2, 'rc2StringSeed')};${extractFunction(rc2, 'rc2ManagedRegionPriorityNeighborhood')};${extractFunction(rc2, 'rc2ManagedRegionDailyPosition')};${extractFunction(rc2, 'rc2ApplyManagedRegionPriority')};this.dailyPosition=rc2ManagedRegionDailyPosition;this.applyPriority=rc2ApplyManagedRegionPriority;`, context);

for (const neighborhood of ['여서동', '문수동', '오림동']) {
  context.state.location = neighborhood;
  for (const [rail, assignedId] of expectedAssignments) {
    const result = context.applyPriority(ordinaryStores, {id: rail}, 8, []);
    const expectedIndex = context.dailyPosition({id: rail}, assignedId, context.RC2_RAIL_RANDOM_SEED);
    assert.equal(result[expectedIndex].id, assignedId, `${neighborhood}의 ${rail} 섹션은 배정된 가게를 오늘의 1·2·3번째 자리 중 하나에 보여야 합니다.`);
    assert.equal(result.filter(store => priorityStores.some(priority => priority.id === store.id)).length, 1, `${neighborhood}의 ${rail} 섹션에는 배정된 가게 한 곳만 우선 삽입해야 합니다.`);
  }
}

for (const [rail, assignedId] of expectedAssignments) {
  const positions = ['2026-08-07', '2026-08-08', '2026-08-09']
    .map(day => context.dailyPosition({id: rail}, assignedId, day))
    .sort();
  assert.deepEqual(Array.from(positions), [0, 1, 2], `${rail} 배정 가게는 사흘 동안 1·2·3번째 자리를 모두 순환해야 합니다.`);
}

context.state.location = '둔덕동';
assert.deepEqual(Array.from(context.applyPriority(ordinaryStores, {id: 'today'}, 8, []), store => store.id), ordinaryStores.map(store => store.id), '다른 동네의 기존 추천 순서는 바꾸면 안 됩니다.');

context.state.location = '여서동';
priorityStores[0].statusRank = 3;
const statusProtected = context.applyPriority(ordinaryStores, {id: 'today'}, 8, []);
assert.equal(statusProtected.some(store => store.id === priorityStores[0].id), false, '영업하지 않는 배정 가게는 우선 노출하면 안 됩니다.');
assert.deepEqual(Array.from(statusProtected, store => store.id), ordinaryStores.map(store => store.id), '배정 가게가 영업하지 않으면 기존 추천 순서를 그대로 유지해야 합니다.');

console.log('managed region recommendation priority regression test passed');
