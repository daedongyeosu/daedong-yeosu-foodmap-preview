import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync('app.js', 'utf8');
const rc3 = fs.readFileSync('rc3-fixes.js', 'utf8');
const rc6 = fs.readFileSync('rc6-fixes.js', 'utf8');
const rc7 = fs.readFileSync('rc7-address-map.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const phoneRuntime = JSON.parse(fs.readFileSync('data/phone-order-runtime.json', 'utf8'));

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

const phoneContext = {
  rc3InternalPhoneByStore: new Map(),
  String
};
vm.createContext(phoneContext);
vm.runInContext([
  functionSource(rc3, 'rc3Digits'),
  functionSource(rc3, 'rc3VerifiedPhone')
].join('\n'), phoneContext);
phoneContext.store = {id: 'valid', phone: '061-123-4567'};
assert.equal(vm.runInContext('rc3VerifiedPhone(store)', phoneContext), '0611234567', '정상 여수 전화번호는 표시해야 합니다.');
phoneContext.store = {id: 'invalid-prefix', phone: '01385692798'};
assert.equal(vm.runInContext('rc3VerifiedPhone(store)', phoneContext), '', '존재하지 않는 013 번호를 전화 버튼으로 노출하면 안 됩니다.');
phoneContext.store = {id: 'invalid-length', phone: '031030926'};
assert.equal(vm.runInContext('rc3VerifiedPhone(store)', phoneContext), '', '길이가 잘못된 지역번호를 전화 버튼으로 노출하면 안 됩니다.');
phoneContext.store = {id: 'virtual-number', phone: '0507-1343-8176'};
assert.equal(vm.runInContext('rc3VerifiedPhone(store)', phoneContext), '050713438176', '정상 050 안심번호는 전화 버튼에서 누락하면 안 됩니다.');
for (const [index, item] of (phoneRuntime.stores || []).entries()) {
  phoneContext.store = {id: `runtime-${index}`, phone: item.phone};
  assert.notEqual(vm.runInContext('rc3VerifiedPhone(store)', phoneContext), '', `등록 전화번호 ${item.phone}를 검증식이 숨기면 안 됩니다.`);
}

const routeContext = {
  BLOCKED_STORE_ROUTE_KEYS: {
    '9ee73ce6168105ec': new Set(['direct', 'phone', 'yogiyo', 'coupang', 'baemin'])
  },
  String,
  Boolean,
  Array
};
vm.createContext(routeContext);
vm.runInContext([
  functionSource(app, 'storeRouteIsBlocked'),
  functionSource(app, 'routeFor')
].join('\n'), routeContext);
routeContext.store = {
  id: '9ee73ce6168105ec',
  routes: [
    {key: 'baemin', url: 'https://bit.ly/auto-배스킨라빈스여수여서점'},
    {key: 'chak', url: 'https://example.com/chak'}
  ]
};
assert.equal(vm.runInContext("routeFor(store, 'baemin')", routeContext), undefined, '다른 가게로 연결되는 더벤티 주문 링크는 차단해야 합니다.');
assert.equal(vm.runInContext("routeFor(store, 'chak').key", routeContext), 'chak', '문제가 확인되지 않은 별도 이용정보까지 막으면 안 됩니다.');

const areaContext = {
  normalize: value => String(value || '').trim().toLowerCase().replace(/[\s·&()\-_/.,]/g, ''),
  String
};
vm.createContext(areaContext);
vm.runInContext(functionSource(app, 'isPlaceholderAreaLabel'), areaContext);
assert.equal(vm.runInContext("isPlaceholderAreaLabel('홈화면')", areaContext), true, '홈화면은 동네명이 아닙니다.');
assert.equal(vm.runInContext("isPlaceholderAreaLabel('-')", areaContext), true, '빈 자리표시 기호는 동네명이 아닙니다.');
assert.equal(vm.runInContext("isPlaceholderAreaLabel('여서동')", areaContext), false, '실제 동네명은 보존해야 합니다.');
Object.assign(areaContext, {
  routeKey: value => String(value || ''),
  safeHref: value => String(value || ''),
  isCustomerUsableExternalRoute: () => true,
  parseCoordinate: value => value === null || value === undefined || value === '' ? null : Number(value),
  uniquePaths: values => values.filter(Boolean),
  canonicalSearchAliases: () => [],
  neighborhoodsFor: value => String(value || '').includes('학동') ? ['학동'] : [],
  normalizedNeighborhoodNames: values => Array.isArray(values) && values.includes('학동') ? ['학동'] : [],
  closestNeighborhoodForCoordinates: () => '',
  Set,
  Array,
  Boolean,
  Number
});
vm.runInContext(functionSource(app, 'normalizedStore'), areaContext);
areaContext.rawStore = {id: 'bad-area', name: '테스트가게', district: '홈화면', neighborhoods: ['학동'], category: '한식'};
const normalizedArea = vm.runInContext('normalizedStore(rawStore, 0)', areaContext);
assert.equal(normalizedArea.area, '학동', '잘못된 동네명은 확인된 동네로 대체해야 합니다.');
assert.equal(normalizedArea.tags.includes('홈화면'), false, '잘못된 동네명이 검색·표시 태그에 남으면 안 됩니다.');

const rankingContext = {
  rc6RainMode: 'rain1',
  rc6RainManagedRatio: () => 0.7,
  rc6OwnershipTier: store => store.managed ? 0 : 2,
  storeBusinessStatusPriority: store => store.statusRank,
  sortStoresByBusinessStatus: list => [...list].sort((a, b) => a.statusRank - b.statusRank)
};
vm.createContext(rankingContext);
vm.runInContext(functionSource(rc6, 'rc6ApplyRainExposure'), rankingContext);
rankingContext.candidates = [
  ...Array.from({length: 9}, (_, index) => ({id: `closed-${index}`, statusRank: 3, managed: true})),
  {id: 'open-general', statusRank: 0, managed: false},
  {id: 'closing-general', statusRank: 1, managed: false},
  {id: 'unknown-general', statusRank: 2, managed: false}
];
const rankedIds = vm.runInContext('rc6ApplyRainExposure(candidates, 8).map(store => store.id)', rankingContext);
assert.deepEqual(Array.from(rankedIds).slice(0, 3), ['open-general', 'closing-general', 'unknown-general'],
  '노출 대상을 자르기 전에 영업 중 → 곧 종료 → 시간 미확인 순을 보장해야 합니다.');
assert.match(rc6, /rc6ApplyRainExposure\(sortStoresByBusinessStatus\(ranked\),8\)/,
  '가까운 가게도 영업상태 정렬 후 노출 수를 제한해야 합니다.');

assert.match(html, /<div class="build-mark" hidden><\/div>/, '고객 화면에 내부 검수 후보 문구를 노출하면 안 됩니다.');
assert.doesNotMatch(rc6, /온라인 검수 후보/, 'RC6 초기화가 내부 검수 문구를 되살리면 안 됩니다.');
assert.doesNotMatch(rc7, /주소·지도 UX 검수 후보/, '주소 초기화가 내부 검수 문구를 되살리면 안 됩니다.');
assert.match(html, /app\.js\?v=[^"]*release-readiness-1/, '브라우저가 새 가게 정규화·경로 차단 코드를 받아야 합니다.');
assert.match(finalExperience, /rc3-fixes\.js\?v=[^']*release-readiness-1/, '브라우저가 엄격한 전화 검증 코드를 받아야 합니다.');
assert.match(finalExperience, /rc6-fixes\.js\?v=[^']*release-readiness-1/, '브라우저가 가까운 가게 정렬 수정본을 받아야 합니다.');

console.log('release readiness regression: PASS');
