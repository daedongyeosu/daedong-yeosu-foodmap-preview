import fs from 'node:fs';

const storesPath = new URL('../data/stores.json', import.meta.url);
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));

const corrections = [
  ['170c2c5b7b5a24c1', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-양지골수육'],
  ['4b2a2803e3a4c80a', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-양철북곱창여수미평점'],
  ['4b2a2803e3a4c80a', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-양철북곱창여수미평점'],
  ['a60a8b15c1648b9b', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-여수돌산꽈배기'],
  ['6739ddf6736ef934', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-여수하늘'],
  ['9949709e121ff949', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-연변양꼬치구이미평점'],
  ['48033be58064b50c', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-오븐에꾸운닭여문점'],
  ['b05ef0b1b1774d35', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-올떡볶이여수봉계점'],
  ['8f4cfdc693976989', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-우정통닭'],
  ['49470f61773e41e2', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-유림식당'],
  ['49470f61773e41e2', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-유림식당'],
  ['2fb0f76b3d55052b', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-윤가네선어'],
  ['2fb0f76b3d55052b', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-윤가네선어'],
  ['b929bcd743be8b12', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-장충동왕족발여수점'],
  ['b929bcd743be8b12', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-장충동왕족발여수점'],
  ['76235bf473121cbe', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-족발자리'],
  ['eb1005c7067bc9d4', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-족팔계왕족발'],
  ['eb1005c7067bc9d4', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-족팔계왕족발']
];

for (const [storeId, channel, from, to] of corrections) {
  const store = stores.find(value => String(value.store_id || value.id) === storeId);
  if (!store) throw new Error(`store missing ${storeId}`);
  const matches = (store.routes || []).filter(route => route.name === channel && route.url === from);
  if (matches.length !== 1) throw new Error(`route mismatch ${store.name} ${channel}: ${matches.length}`);
  matches[0].url = to;
}

const removalStore = stores.find(value => String(value.store_id || value.id) === 'b878080708bef825');
if (!removalStore) throw new Error('store missing b878080708bef825');
const beforeLength = removalStore.routes.length;
removalStore.routes = removalStore.routes.filter(route => !(
  route.name === '먹깨비' && route.url === 'https://bit.ly/mk-보드람치킨여수여서점'
));
if (removalStore.routes.length !== beforeLength - 1) throw new Error('unsafe route removal mismatch');

fs.writeFileSync(storesPath, `${JSON.stringify(stores, null, 2)}\n`);
console.log(JSON.stringify({ correctedStores: new Set(corrections.map(([storeId]) => storeId)).size, correctedLinks: corrections.length, removedLinks: 1 }));
