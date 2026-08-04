import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const stores = JSON.parse(await readFile(new URL('./data/stores.json', import.meta.url)));
const appSource = await readFile(new URL('./app.js', import.meta.url), 'utf8');
const finalSource = await readFile(new URL('./final-experience.js', import.meta.url), 'utf8');
const indexSource = await readFile(new URL('./index.html', import.meta.url), 'utf8');

const HIDDEN_STORES = new Map([
  ['6092aabddf5f7194', {name: '롯데리아 중앙점', routeCount: 8, naverMap: 'https://naver.me/G4Le7KTp'}],
  ['e0c6949efb48f4b2', {name: '롯데리아 이마트점', routeCount: 7, naverMap: ''}]
]);
const idOf = store => String(store.store_id || store.id || '');
const byId = new Map(stores.map(store => [idOf(store), store]));

for (const [id, expected] of HIDDEN_STORES) {
  const store = byId.get(id);
  assert(store, `${expected.name}: 원본 매장 데이터가 사라졌습니다`);
  assert.equal(store.name, expected.name, `${id}: 다른 매장에 비노출 ID가 연결됐습니다`);
  assert.equal(store.routes?.length, expected.routeCount, `${expected.name}: 기존 주문 링크 수가 달라졌습니다`);
  assert.equal(store.naverMap, expected.naverMap, `${expected.name}: 기존 지도 링크 값이 달라졌습니다`);
  assert(finalSource.includes(`'${id}'`), `${expected.name}: 전역 비노출 목록에서 빠졌습니다`);
}

assert.match(
  finalSource,
  /function fxVisible\(store\)\{return Boolean\(store&&store\.customerVisible!==false&&!FX_HIDDEN_STORE_IDS\.has/,
  '모든 고객 노출 경로가 사용하는 fxVisible 가드에 비노출 매장 검사가 없습니다'
);
assert.match(
  finalSource,
  /store\.customerVisible=!FX_HIDDEN_STORE_IDS\.has/,
  '매장 정규화 단계에서 비노출 상태를 지정하지 않습니다'
);
assert.match(
  appSource,
  /canonicalStores = allStores\.filter\(store => store\.customerVisible !== false &&/,
  '검색·목록·추천의 공통 원본에서 비노출 매장을 제외하지 않습니다'
);
assert.match(indexSource, /app\.js\?v=[^"']*lotteria-hidden-1/, 'app.js 캐시 갱신 키가 없습니다');
assert.match(indexSource, /final-experience\.js\?v=[^"']*lotteria-hidden-1/, 'final-experience.js 캐시 갱신 키가 없습니다');

const customerVisible = store => !HIDDEN_STORES.has(idOf(store));
const previouslyCanonical = stores.filter(store => idOf(store) && store.name && store.name.trim() !== '' && store.name !== '제목 없음');
const nowCanonical = previouslyCanonical.filter(customerVisible);
assert.equal(previouslyCanonical.length - nowCanonical.length, HIDDEN_STORES.size, '지정한 두 매장 외의 노출 상태가 달라졌습니다');
assert(HIDDEN_STORES.keys().every(id => !nowCanonical.some(store => idOf(store) === id)), '비노출 매장이 고객 노출 원본에 남았습니다');

console.log(JSON.stringify({
  hiddenStores: [...HIDDEN_STORES.values()],
  sourceStoresPreserved: true,
  orderAndMapLinksPreserved: true,
  hiddenFromCanonicalCustomerSurfaces: true,
  status: 'PASS'
}, null, 2));
