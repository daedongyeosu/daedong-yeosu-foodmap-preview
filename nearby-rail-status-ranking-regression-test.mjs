import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
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

const ranked = [
  {id: 'open-general', statusRank: 0, rc6LocationBucket: 0, tier: 2},
  {id: 'closing-managed', statusRank: 1, rc6LocationBucket: 0, tier: 0},
  {id: 'unknown-managed', statusRank: 2, rc6LocationBucket: 0, tier: 0},
  {id: 'closed-managed', statusRank: 3, rc6LocationBucket: 0, tier: 0}
];
const context = {
  fxRankStores: () => ranked,
  storeBusinessStatusPriority: store => store.statusRank,
  rc6OwnershipTier: store => store.tier,
  rc2RandomizedRailStores: stores => [...stores].reverse(),
  rc2BrandKey: store => store.id,
  fxPhoto: store => `${store.id}.jpg`,
  sortStoresByBusinessStatus: stores => [...stores].sort((a, b) => a.statusRank - b.statusRank),
  state: {location: '둔덕동', addressLabel: '둔덕동', coords: null},
  Number,
  String,
  Set,
  Map
};
vm.createContext(context);
vm.runInContext(functionSource(rc2, 'rc2RailCandidates'), context);

const actual = vm.runInContext("rc2RailCandidates({id:'near',kind:'near'},new Set(),8,new Map()).map(store=>store.id)", context);
assert.deepEqual(Array.from(actual), [
  'open-general',
  'closing-managed',
  'unknown-managed',
  'closed-managed'
], '지금 가까운 가게의 최종 카드도 영업상태 순서를 지켜야 합니다.');

assert.match(rc2, /const key = `\$\{status\}:\$\{bucket\}:\$\{tier\}`/,
  '추천 레일의 무작위 다양화는 같은 영업상태 안에서만 해야 합니다.');
assert.match(rc2, /const finish = \(\) => sortStoresByBusinessStatus\(result\)/,
  '추천 레일의 중복제거·다양화가 끝난 뒤 영업상태를 최종 검증해야 합니다.');
assert.match(finalExperience, /rc2-fixes\.js\?v=[^']*nearby-status-final-1/,
  '브라우저가 가까운 가게 최종 정렬 수정본을 새로 받아야 합니다.');
assert.match(html, /final-experience\.js\?v=[^\"]*nearby-status-final-1/,
  '브라우저가 가까운 가게 캐시 갱신 코드가 담긴 상위 스크립트도 새로 받아야 합니다.');

console.log('nearby rail status ranking regression: PASS');
