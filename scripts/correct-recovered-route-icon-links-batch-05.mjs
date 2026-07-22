import fs from 'node:fs';

const storesPath = new URL('../data/stores.json', import.meta.url);
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));

const corrections = [
  ['7a01cce02afa8141', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-주가네김치찌개찜여수여서점'],
  ['340a17ea324662dc', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-천화마라탕'],
  ['884076b36adf9697', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-촌닭두마리치킨오림점'],
  ['478795eb80081c91', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-커피어클락'],
  ['68360b2d1b0e6457', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-컴포즈커피여수여서점'],
  ['5b408dab11c7b1dd', '전화주문', 'https://bit.ly/전화-배스킨라빈스여수여서점', 'https://bit.ly/전화-케이키팩토리'],
  ['9846929c4427576a', '먹깨비', 'https://bit.ly/mk-맘스터치문수점', 'https://bit.ly/mk-푸라닭치킨여수문수점'],
  ['0a231139875a51cc', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-푸줏간고기도시락여수문수점'],
  ['4597954f924a4979', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-황금마차'],
  ['6390834d3238c3eb', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-황금아구']
];

for (const [storeId, channel, from, to] of corrections) {
  const store = stores.find(value => String(value.store_id || value.id) === storeId);
  if (!store) throw new Error(`store missing ${storeId}`);
  const matches = (store.routes || []).filter(route => route.name === channel && route.url === from);
  if (matches.length !== 1) throw new Error(`route mismatch ${store.name} ${channel}: ${matches.length}`);
  matches[0].url = to;
}

fs.writeFileSync(storesPath, `${JSON.stringify(stores, null, 2)}\n`);
console.log(JSON.stringify({ correctedStores: new Set(corrections.map(([storeId]) => storeId)).size, correctedLinks: corrections.length }));
