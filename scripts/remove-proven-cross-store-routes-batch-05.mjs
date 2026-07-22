import fs from 'node:fs';

const storesPath = new URL('../data/stores.json', import.meta.url);
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));

// Every route below has a destination whose store title/name was verified as a
// different branch. When the exact store page does not contain a safe
// replacement, hiding the wrong button is safer than sending a customer to the
// other store.
const removals = [
  ['360b32bc2f5a850c', '1키로 오리스타 여서점', '가게바로주문', 'https://app.notion.com/p/388da158dd2a80eaac9dd9c0ebc4c875'],
  ['9cb90900e5057c72', '가마솥 볶음밥 여서점', '가게바로주문', 'https://app.notion.com/p/385da158dd2a8001a76ee3e5bc63b74d'],
  ['48113ac49e27c620', '메가MGC커피 문수점', '가게바로주문', 'https://app.notion.com/p/373da158dd2a800da5a1d8c0007c57a5'],
  ['9999f4db1009d483', '메가MGC커피 미평점', '가게바로주문', 'https://app.notion.com/p/373da158dd2a800da5a1d8c0007c57a5'],
  ['486bad289ae76e54', '멕시칸치킨 학동점', '가게바로주문', 'https://app.notion.com/p/37bda158dd2a8011bd10d4a47eb9be39'],
  ['08eecf0379470865', '메가MGC커피 여수진남시장점(학동)', '전화주문', 'https://app.notion.com/p/373da158dd2a80c7a7a3f538ab0d4843'],
  ['3c62ab40bf66608e', '참숯이면돼지 문수점', '가게바로주문', 'https://app.notion.com/p/387da158dd2a80559ca4fe51253f4fc9'],
  ['8c8ee85a0bc3b219', '처갓집양념치킨 무선점', '가게바로주문', 'https://app.notion.com/p/377da158dd2a80a18883f5f48c16cad2'],
  ['0ee3922e77afa736', '배가네왕족보 여문본점', '전화주문', 'https://app.notion.com/p/39bda158dd2a806e8ac6e41ae413ee2f'],
  ['585904750de0000c', '땡초닭발 미평점', '가게바로주문', 'https://app.notion.com/p/39bda158dd2a80f4982fea55e72b7633'],
  ['1ecbe36dd1efafed', '돈치킨 여수둔덕봉계점', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점'],
  ['4d45e2363f0a18dd', '아구회관', '먹깨비', 'https://bit.ly/mk-보드람치킨여수여서점'],
  ['8d9df0fbb77ce9eb', '콩불 여수중앙점', '가게바로주문', 'https://bit.ly/auto-두찜여수국동점'],
  ['8d9df0fbb77ce9eb', '콩불 여수중앙점', '먹깨비', 'https://bit.ly/mk-두찜여수국동점'],
  ['8d9df0fbb77ce9eb', '콩불 여수중앙점', '쿠팡이츠', 'https://bit.ly/cu-두찜여수국동점'],
  ['8d9df0fbb77ce9eb', '콩불 여수중앙점', '배달의민족', 'https://bit.ly/bm-두찜여수국동점'],
  ['6620c4ab87f00e86', '포포샌드', '쿠팡이츠', 'https://bit.ly/cu-맘스터치문수점'],
  ['6620c4ab87f00e86', '포포샌드', '배달의민족', 'https://bit.ly/bm-맘스터치문수점'],
  ['9f89e6d7784cf4a2', '피자프렌드 미평점', '가게바로주문', 'https://bit.ly/auto-외계인피자여수점'],
  ['9f89e6d7784cf4a2', '피자프렌드 미평점', '먹깨비', 'https://bit.ly/mk-외계인피자여수점']
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
