import fs from 'node:fs';

const storesPath = new URL('../data/stores.json', import.meta.url);
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));

const corrections = [
  ['c97c66bc78a649ea', '교촌치킨 둔덕점', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/4qIgihb'],
  ['c97c66bc78a649ea', '교촌치킨 둔덕점', '땡겨요', 'https://bit.ly/tk-배스킨라빈스여수여서점', 'https://bit.ly/3LVdOwS'],
  ['895a9425dc41ddf7', '금성칡냉면 미평점', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점', 'https://bit.ly/mk-금성칡냉면미평점']
];

for (const [storeId, storeName, channel, from, to] of corrections) {
  const store = stores.find(value => String(value.store_id || value.id) === storeId);
  if (!store) throw new Error(`store missing ${storeId}`);
  if (store.name !== storeName) throw new Error(`store name mismatch ${storeId}: ${store.name}`);
  const matches = (store.routes || []).filter(route => route.name === channel && route.url === from);
  if (matches.length !== 1) throw new Error(`route mismatch ${storeName} ${channel}: ${matches.length}`);
  matches[0].url = to;
}

fs.writeFileSync(storesPath, `${JSON.stringify(stores, null, 2)}\n`);
console.log(JSON.stringify({ correctedStores: 2, correctedLinks: corrections.length }));
