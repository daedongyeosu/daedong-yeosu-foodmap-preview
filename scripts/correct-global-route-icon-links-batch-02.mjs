import fs from 'node:fs';

const storesPath = new URL('../data/stores.json', import.meta.url);
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));

const corrections = [
  ["14feb7cbd67ef7e2", "1인피자 미니8 여수점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-1인피자미니8여수점"],
  ["14feb7cbd67ef7e2", "1인피자 미니8 여수점", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-1인피자미니8여수점"],
  ["068b2ae8fe32874a", "1인피자 피자먹다 여수여서점", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-1인피자피자먹다여수여서점"],
  ["e57c51a4f6294349", "계근상 여수본점(문수동)", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-계근상여수본점"],
  ["f7385d8006310630", "국민학교", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-국민학교"],
  ["f6d0e57091aa21ab", "굽네치킨&피자 문수점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-굽네치킨피자여수문수점"],
  ["f6d0e57091aa21ab", "굽네치킨&피자 문수점", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-굽네치킨피자여수문수점"],
  ["450eb70e506c2de9", "금쪽갈비 여수점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-금쪽갈비여수점"],
  ["450eb70e506c2de9", "금쪽갈비 여수점", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-금쪽갈비여수점"],
  ["f499191f0f57acc7", "기영이 숯불두마리치킨 여수여서점", "먹깨비", "https://bit.ly/mk-맘스터치문수점", "https://bit.ly/mk-기영이숯불두마리치킨여수여서점"],
  ["888abbb8bf28aa2f", "김종구식 맛치킨 전기바베큐 옛날통닭 여서점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-김종구식맛치킨전기바베큐옛날통닭여수여서점점"],
  ["888abbb8bf28aa2f", "김종구식 맛치킨 전기바베큐 옛날통닭 여서점", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-김종구식맛치킨전기바베큐옛날통닭여수여서점"],
  ["ec69425551829f69", "까치식당 문수점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-까치식당"],
  ["884d23981fd2429a", "네네치킨 둔덕미평점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-네네치킨둔덕미평점"],
  ["0d3062d5a5b94697", "다기야치킨 여문점", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-다기야치킨여문점"],
  ["9e0a2da7ddfa3d93", "다정아구 미평", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-다정아구"],
  ["8a219b158c321627", "닭가대표 숯불직화구이치킨 여수대표점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-닭가대표숯불직화구이치킨여수대표점"],
  ["f31d8c5f04fb7b79", "대박난쪽갈비 여수점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-대박난쪽갈비여수점"],
  ["406b4a0b39f729fc", "대정식당 미평점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-대정식당"],
  ["dabbebff4fca3c56", "대패가1900 문수점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-대패가1900문수점"],
  ["dabbebff4fca3c56", "대패가1900 문수점", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-대패가1900문수점"],
  ["452526604d3b10c4", "더벤티 미평점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/49RJPit"],
  ["45dc9cf61ba55263", "덮덮밥 미평점", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-덮덮밥미평점"],
  ["d6602c793047b361", "뚜레쥬르 여수미평점", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-뚜레쥬르여수미평점"],
  ["30d2edbcabcca6ec", "뚜레쥬르 여수여서점", "먹깨비", "https://bit.ly/mk-보드람치킨여수여서점", "https://bit.ly/mk-뚜레쥬르여수여서점"],
  ["30d2edbcabcca6ec", "뚜레쥬르 여수여서점", "전화주문", "https://bit.ly/전화-배스킨라빈스여수여서점", "https://bit.ly/전화-뚜레쥬르여수여서점"],
  ["3a6078da746f1953", "라홍방마라탕 문수점", "먹깨비", "https://bit.ly/mk-맘스터치문수점", "https://bit.ly/mk-라홍방마라탕문수점"]
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

