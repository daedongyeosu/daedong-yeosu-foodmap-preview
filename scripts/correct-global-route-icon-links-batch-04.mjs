import fs from 'node:fs';

const storesPath = new URL('../data/stores.json', import.meta.url);
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));

const corrections = [
  ['5768a9d8a72502ef', '조선제일 감자탕&뼈해장국 여서점', '땡겨요', 'https://bit.ly/tk-배스킨라빈스여수여서점', 'https://bit.ly/tk-조선제일감자탕뼈해장국여서점'],
  ['5768a9d8a72502ef', '조선제일 감자탕&뼈해장국 여서점', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-조선제일감자탕뼈해장국여서점'],
  ['0eea4a740e820fd3', '타코아찌 타코야끼전문점 문수점', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-타코아찌타코야끼전문점문수점'],
  ['0eea4a740e820fd3', '타코아찌 타코야끼전문점 문수점', '땡겨요', 'https://bit.ly/tk-배스킨라빈스여수여서점', 'https://bit.ly/tk-타코아찌타코야끼전문점문수점'],
  ['a037743d0ee273e2', '정성집밥', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-정성집밥'],
  ['a037743d0ee273e2', '정성집밥', '땡겨요', 'https://bit.ly/tk-배스킨라빈스여수여서점', 'https://bit.ly/tk-정성집밥'],
  ['a037743d0ee273e2', '정성집밥', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-정성집밥'],
  ['320d26d67b993c4a', '아로이태국음식전문점', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-아로이태국음식전문점'],
  ['320d26d67b993c4a', '아로이태국음식전문점', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-아로이태국음식전문점'],
  ['08e5e26653436fef', '알토랑반찬 여수문수본점', '먹깨비', 'https://bit.ly/mk-맘스터치문수점', 'https://bit.ly/mk-알토랑반찬여수문수본점'],
  ['08e5e26653436fef', '알토랑반찬 여수문수본점', '땡겨요', 'https://bit.ly/tk-맘스터치문수점', 'https://bit.ly/tk-알토랑반찬여수문수본점'],
  ['768e4fe8150f5039', '정성이 가득찬 반찬', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-정성이가득찬반찬'],
  ['768e4fe8150f5039', '정성이 가득찬 반찬', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-정성이가득찬반찬'],
  ['0ad5341dc696d4f1', '맛있는 반찬', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/49V0SPi'],
  ['d409f6d9118b7bad', '황금손 반찬', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-황금손반찬'],
  ['d409f6d9118b7bad', '황금손 반찬', '땡겨요', 'https://bit.ly/tk-배스킨라빈스여수여서점', 'https://bit.ly/tk-황금손반찬'],
  ['17d9bf1de3d671fd', '해인이네 여서점', '먹깨비', 'https://bit.ly/mk-%EB%B3%B4%EB%93%9C%EB%9E%8C%EC%B9%98%ED%82%A8%EC%97%AC%EC%88%98%EC%97%AC%EC%84%9C%EC%A0%90', 'https://bit.ly/mk-해인이네'],
  ['17d9bf1de3d671fd', '해인이네 여서점', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-해인이네']
];

for (const [storeId, storeName, channel, from, to] of corrections) {
  const store = stores.find(value => String(value.store_id || value.id) === storeId);
  if (!store) throw new Error('store missing ' + storeId);
  if (store.name !== storeName) throw new Error('store name mismatch ' + storeId + ': ' + store.name);
  const matches = (store.routes || []).filter(route => route.name === channel && route.url === from);
  if (matches.length !== 1) throw new Error('route mismatch ' + storeName + ' ' + channel + ': ' + matches.length);
  matches[0].url = to;
}

const removalStore = stores.find(value => String(value.store_id || value.id) === '320d26d67b993c4a');
if (!removalStore) throw new Error('removal store missing');
const beforeLength = removalStore.routes.length;
removalStore.routes = removalStore.routes.filter(route => !(
  route.name === '땡겨요' && route.url === 'https://bit.ly/tk-배스킨라빈스여수여서점'
));
if (removalStore.routes.length !== beforeLength - 1) throw new Error('unsafe route removal mismatch');

fs.writeFileSync(storesPath, JSON.stringify(stores, null, 2) + '\n');
console.log(JSON.stringify({ correctedStores: 9, correctedLinks: corrections.length, removedLinks: 1 }));
