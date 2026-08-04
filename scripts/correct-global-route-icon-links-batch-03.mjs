import fs from 'node:fs';

const storesPath = new URL('../data/stores.json', import.meta.url);
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));

const corrections = [
  ["f7167d017e7368e7", "롤링파스타 여서점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-롤링파스타여서점"],
  ["f7167d017e7368e7", "롤링파스타 여서점", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-롤링파스타여서점"],
  ["2bd8ea8779f87995", "리얼펍살얼음맥주 여수문수점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-리얼펍살얼음맥주여수문수점"],
  ["27ea3ca86eab89ec", "린차이나(먹깨비,땡겨요로 주문시 만두 서비스!!!)", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-린차이나"],
  ["039652f6eff5f6d7", "맛집남도밀면", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-맛집남도밀면"],
  ["92c0c6cc2688ef0d", "미미꼬마김밥 여서점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-미미꼬마김밥여서점"],
  ["92c0c6cc2688ef0d", "미미꼬마김밥 여서점", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-미미꼬마김밥여서점"],
  ["57ae8848b4ccc2a1", "본스치킨 미평점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-본스치킨미평점"],
  ["57ae8848b4ccc2a1", "본스치킨 미평점", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-본스치킨미평점"],
  ["f14bc5ec109f3af0", "빵빵김밥 여서점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-빵빵김밥여서점"],
  ["8d9e961a6ffd106f", "쑝쑝돈까스 여수미평점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/49Sf8cY"],
  ["4d45e2363f0a18dd", "아구회관", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-아구회관"],
  ["48a8921c93fca359", "여수대표치킨", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-여수대표치킨"],
  ["a8218795099e637e", "오늘은 오므라이스 여수점", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-오늘은오므라이스여수점"],
  ["a4aaeb8049d4e9f9", "우쿠야 여수여서점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-우쿠야여수여서점"],
  ["c26995210f249627", "응큼떡볶이 여수점", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-응큼떡뽁이여수점"],
  ["11442d3b3328f951", "인생아구찜 여수문수점", "먹깨비", "https://bit.ly/mk-맘스터치문수점", "https://bit.ly/mk-인생아구찜여수문수점"],
  ["75b59b6f39651fc8", "자담치킨 여수미평점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-자담치킨여수미평점"],
  ["7c9ca9471d15acc4", "제육대가 여수미평점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/4rs6xUh"],
  ["295dc97b6abaf2e2", "중국관", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-중국관"],
  ["fa5bca3967c25462", "지코바치킨 미평점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/3LHfqKD"],
  ["01f219eac1bdc294", "찜콩 갈비찜 전문", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/4ksDI89"],
  ["dddc8ea5032e3c62", "카페 브라운", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/4q9FgF0"],
  ["04036067da3dde5f", "킹콩부대찌개 여수점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/3MfMFEV"]
];

for (const [storeId, storeName, channel, from, to] of corrections) {
  const store = stores.find(value => String(value.store_id || value.id) === storeId);
  if (!store) throw new Error('store missing ' + storeId);
  if (store.name !== storeName) throw new Error('store name mismatch ' + storeId + ': ' + store.name);
  const matches = (store.routes || []).filter(route => route.name === channel && route.url === from);
  if (matches.length !== 1) throw new Error('route mismatch ' + storeName + ' ' + channel + ': ' + matches.length);
  matches[0].url = to;
}

fs.writeFileSync(storesPath, JSON.stringify(stores, null, 2) + '\n');
console.log(JSON.stringify({ correctedStores: new Set(corrections.map(([storeId]) => storeId)).size, correctedLinks: corrections.length }));

