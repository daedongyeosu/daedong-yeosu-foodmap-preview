import fs from 'node:fs';

const storesPath = new URL('../data/stores.json', import.meta.url);
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));

// Residual one-to-one duplicate destinations found after the exact-page audit.
// Remove only the duplicated destination from the copied branch; all distinct
// routes on both stores remain untouched.
const removals = [
  ['1d6b92bb000bbc08', '가마치통닭 소호점', '요기요', 'https://ws.yogiyo.co.kr/wo81k0'],
  ['1d6b92bb000bbc08', '가마치통닭 소호점', '쿠팡이츠', 'https://web.coupangeats.com/share?storeId=853966&dishId=&key=b7d0ca85-a876-4a5a-8165-6d4b2e7d0d7f'],
  ['1d6b92bb000bbc08', '가마치통닭 소호점', '배달의민족', 'https://s.baemin.com/Nm000zzEausdF'],
  ['d14f1e6669383a88', '메가MGC커피 여수교동점', '땡겨요', 'https://fdofd.ddangyo.com/gateway1.html?yEFuFqi='],
  ['e334f4707bd1046f', '떡순이 알찬만두 문수점', '먹깨비', 'http://mukkebi.com/shop.php?data=199172'],
  ['e334f4707bd1046f', '떡순이 알찬만두 문수점', '땡겨요', 'https://fdofd.ddangyo.com/gateway1.html?jARRyNy='],
  ['571770a25990ba97', '웅천횟집', '요기요', 'https://ws.yogiyo.co.kr/w4q24re'],
  ['571770a25990ba97', '웅천횟집', '땡겨요', 'https://fdofd.ddangyo.com/gateway1.html?hdPOwoC='],
  ['90fed609e43aafb2', '이라이타코야끼&카페1리터 여문점', '땡겨요', 'https://fdofd.ddangyo.com/gateway1.html?dbJMgro='],
  ['7d9f7e5be4bb49db', '아주커치킨 여수돌산대교점', '요기요', 'https://ws.yogiyo.co.kr/0j9cdx'],
  ['7d9f7e5be4bb49db', '아주커치킨 여수돌산대교점', '쿠팡이츠', 'https://web.coupangeats.com/share?storeId=285489&dishId=&key=1bc58d83-b570-439c-bfb7-b84e1590fe57'],
  ['7d9f7e5be4bb49db', '아주커치킨 여수돌산대교점', '배달의민족', 'https://s.baemin.com/WW000gmZNNtpU']
];

for (const [storeId, storeName, channel, url] of removals) {
  const store = stores.find(value => String(value.store_id || value.id) === storeId);
  if (!store) throw new Error(`store missing ${storeId}`);
  if (store.name !== storeName) throw new Error(`store name mismatch ${storeId}: ${store.name}`);
  const matches = (store.routes || []).filter(route => route.name === channel && route.url === url);
  if (matches.length !== 1) throw new Error(`route mismatch ${storeName} ${channel}: ${matches.length}`);
  store.routes = store.routes.filter(route => !(route.name === channel && route.url === url));
}

fs.writeFileSync(storesPath, `${JSON.stringify(stores, null, 2)}\n`);
console.log(JSON.stringify({ correctedStores: new Set(removals.map(value => value[0])).size, removedLinks: removals.length }));
