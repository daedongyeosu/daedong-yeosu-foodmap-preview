import fs from 'node:fs';

const stores = JSON.parse(fs.readFileSync(new URL('./data/stores.json', import.meta.url), 'utf8'));
const appSource = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function storeByName(name) {
  const store = stores.find(item => item.name === name);
  assert(store, `${name}: 가게를 찾지 못함`);
  return store;
}

const blockedStores = [
  '내가 끓였찌 여서점',
  '제복이네 짜글이&제육쌈밥&두루치기 교동점',
  '정성집밥',
  '응큼떡볶이 여수점'
];

for (const name of blockedStores) {
  assert(storeByName(name).naverMap === '', `${name}: 잘못된 네이버지도 버튼이 다시 노출될 수 있음`);
}

assert(
  storeByName('땅스즉석떡볶이 여서점').naverMap === 'https://naver.me/5B0THtg4',
  '땅스즉석떡볶이 여서점: 승인된 기존 지도 연결이 변경됨'
);
assert(
  storeByName('여수회포차').naverMap === 'https://naver.me/5c8xAowV',
  '여수회포차: 승인된 네이버지도 주소가 변경됨'
);

const invalidMaps = stores.filter(store =>
  store.naverMap && !/^https?:\/\//i.test(String(store.naverMap).trim())
);
assert(invalidMaps.length === 0, `유효하지 않은 네이버지도 주소 ${invalidMaps.length}건`);

assert(
  appSource.includes("naverMap: safeHref(raw.naverMap || '')"),
  '가게 데이터의 네이버지도 안전 정규화가 제거됨'
);
assert(
  appSource.includes("if (store.naverMap && store.naverMap !== '#') quick.push"),
  '지도주소가 없는 가게의 네이버지도 버튼 생성 차단 조건이 제거됨'
);

console.log(JSON.stringify({
  status: 'PASS',
  blockedButtonStores: blockedStores,
  keptMapStores: ['땅스즉석떡볶이 여서점', '여수회포차'],
  invalidMapUrls: invalidMaps.length,
  stores: stores.length,
  routes: stores.reduce((count, store) => count + (store.routes || []).length, 0)
}, null, 2));
