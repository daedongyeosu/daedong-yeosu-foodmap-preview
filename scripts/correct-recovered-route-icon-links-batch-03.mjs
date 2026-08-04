import fs from 'node:fs';

const storesPath = new URL('../data/stores.json', import.meta.url);
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));

const corrections = [
  ['7a151d290e01dc51', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-미치게본점'],
  ['720bbd7fb87816a7', '먹깨비', 'https://bit.ly/mk-60계치킨여서문수점', 'https://bit.ly/mk-반올림피자여수미평점'],
  ['0987413e7ca12e2a', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-백년족발'],
  ['0987413e7ca12e2a', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-백년족발'],
  ['6c3386fc9f4a5b5b', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-백수초밥'],
  ['6c3386fc9f4a5b5b', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-백수초밥'],
  ['40c638502decc604', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-백억흑미꼬마김밥'],
  ['7c03a236a9c011b4', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-봉구스밥버거문수점'],
  ['c1a35b0c8903cd57', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-북촌손만두피냉면여수문수점'],
  ['9509311543276bbf', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-삼첩분식미평점'],
  ['9509311543276bbf', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-삼첩분식미평점'],
  ['90cd1600c54ce7d0', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-서영이네김밥미평점'],
  ['c59a5a8f5a91ce24', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-수해복마라탕여수미평점'],
  ['1945b6a42e0da33c', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-쉐프의생안심탕수육문수점'],
  ['e66f136d0e468b6e', '먹깨비', 'https://bit.ly/mk-맘스터치문수점', 'https://bit.ly/mk-아주커치킨문수점']
];

for (const [storeId, channel, from, to] of corrections) {
  const store = stores.find(value => String(value.store_id || value.id) === storeId);
  if (!store) throw new Error(`store missing ${storeId}`);
  const matches = (store.routes || []).filter(route => route.name === channel && route.url === from);
  if (matches.length !== 1) throw new Error(`route mismatch ${store.name} ${channel}: ${matches.length}`);
  matches[0].url = to;
}

fs.writeFileSync(storesPath, `${JSON.stringify(stores, null, 2)}\n`);
console.log(JSON.stringify({ stores: new Set(corrections.map(([storeId]) => storeId)).size, links: corrections.length }));
