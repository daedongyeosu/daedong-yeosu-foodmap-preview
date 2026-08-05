import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync('app.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const rc6 = fs.readFileSync('rc6-fixes.js', 'utf8');
const service = fs.readFileSync('store-service-info.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

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

const context = {
  window: {
    daedongStoreServiceInfo: {
      statusPriority: store => store?.statusRank ?? store?.store?.statusRank ?? 2
    }
  },
  categoryPriorityRule: () => ({
    orderedStoreIds: [],
    topStoreIds: ['closed-managed'],
    bottomStoreIds: []
  }),
  categoryPriorityOrderedIdsForRule: () => [],
  Number,
  String,
  Array,
  Map,
  Set
};
vm.createContext(context);
vm.runInContext([
  functionSource(app, 'storeBusinessStatusPriority'),
  functionSource(app, 'compareStoreBusinessStatus'),
  functionSource(app, 'sortStoresByBusinessStatus'),
  functionSource(app, 'applyCategoryPriorityOverrides')
].join('\n'), context);

context.rows = [
  {id: 'closed-managed', statusRank: 3, managed: true},
  {id: 'open-general', statusRank: 0, managed: false},
  {id: 'unknown-managed', statusRank: 2, managed: true},
  {id: 'closing-managed', statusRank: 1, managed: true},
  {id: 'open-managed', statusRank: 0, managed: true}
];

const statusOrder = vm.runInContext('sortStoresByBusinessStatus(rows).map(store => store.id)', context);
assert.deepEqual(Array.from(statusOrder), [
  'open-general',
  'open-managed',
  'closing-managed',
  'unknown-managed',
  'closed-managed'
], '모든 가게목록은 영업 중 → 곧 종료 → 시간 미확인 → 영업 종료 순이어야 합니다.');

const categoryOrder = vm.runInContext("applyCategoryPriorityOverrides(rows, '중식').map(store => store.id)", context);
assert.deepEqual(Array.from(categoryOrder), [
  'open-general',
  'open-managed',
  'closing-managed',
  'unknown-managed',
  'closed-managed'
], '관리 가게나 카테고리 고정순서가 영업상태 순서를 뒤집으면 안 됩니다.');

assert.match(app, /function filteredStores\(\)[\s\S]*const statusOrder = compareStoreBusinessStatus\(a, b\)/,
  '기본·카테고리 가게목록에 공통 영업상태 정렬을 적용해야 합니다.');
assert.match(app, /function appRegisteredStores\(key\)[\s\S]*const statusOrder = compareStoreBusinessStatus\(a, b\)/,
  '주문앱별 가게목록에도 공통 영업상태 정렬을 적용해야 합니다.');
assert.match(finalExperience, /function fxRankStores\(spec\)[\s\S]*compareStoreBusinessStatus\(a,b\)/,
  '홈 추천목록에도 공통 영업상태 정렬을 적용해야 합니다.');
assert.match(rc6, /function rc6RankCandidatesByCustomerLocation\(candidates\)[\s\S]*compareStoreBusinessStatus\(a,b\)/,
  '위치·관리 가게 정렬보다 영업상태를 먼저 적용해야 합니다.');
assert.match(rc6, /function rc6LocationRankedRail\(spec,originalRank\)[\s\S]*sortStoresByBusinessStatus/,
  '추천 레일 후처리에서도 영업상태 순서를 보존해야 합니다.');
assert.match(service, /const STATUS_SORT_PRIORITY = Object\.freeze\(\{[\s\S]*open: 0,[\s\S]*'closing-soon': 1,[\s\S]*unknown: 2,[\s\S]*closed: 3/,
  '공통 영업상태 순위는 영업 중, 곧 종료, 시간 미확인, 영업 종료 순이어야 합니다.');
assert.match(service, /window\.dispatchEvent\(new window\.CustomEvent\('daedong-store-service-ready'\)\)[\s\S]*renderStores\(\{resetCount: false\}\)/,
  '영업시간 API가 준비되면 현재 가게화면을 즉시 다시 정렬해야 합니다.');
assert.match(service, /window\.setInterval\(\(\) => \{[\s\S]*serviceLoadState === 'ready'[\s\S]*renderStores\(\{resetCount: false\}\)[\s\S]*\}, 60000\)/,
  '영업상태가 바뀌는 시각에도 1분 안에 가게순서를 다시 계산해야 합니다.');
assert.match(html, /business-status-ranking-1/,
  '브라우저가 공통 영업상태 정렬 수정본을 새로 받아야 합니다.');

console.log('global business status ranking regression: PASS');
