import fs from 'node:fs';

const storesPath = new URL('../data/stores.json', import.meta.url);
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));

const foreignUrl = 'https://app.notion.com/p/38eda158dd2a805cb72bc0187ae51579';
const targetStores = [
  ['31ffaa41b54a57aa', '이라이타코야끼 봉산점'],
  ['de1d344e8798f0dd', '인생냉면 국동점'],
  ['7c1c77a3d0c35a43', '잇텐스시 국동점'],
  ['401e4210d0416b54', '자연산오징어회 봉산점'],
  ['82b2cd167c1e053b', '조선다방 국동점'],
  ['bef7f3b6456df7fd', '조선다방 돌산점'],
  ['cfd74ce112f2b187', '조선다방 엑스포점'],
  ['44a0e464d6d22c38', '중앙돈까스 국동점'],
  ['cd2ecfcd707cd2c7', '청춘꼬마김밥 여수국동점'],
  ['9acc51c50813ce03', '초밥처럼 봉산점'],
  ['5ada4cec81d04ced', '치킨갱스터 국동유탑점'],
  ['9abb1d4db21758ad', '카레상 봉산점'],
  ['9ab837d6e24d69df', '카페요아정 여수엑스포점'],
  ['87dcf0c9a9804bd2', '킹스타피자 관문점'],
  ['728262018f22a2cc', '투썸플레이스 한재사거리점'],
  ['b17cdef5234b021b', '파리바게뜨 여수교동점'],
  ['e9dc60119d9cdfb5', '파리바게뜨 여수국동점'],
  ['6059e7ea81c9f4d1', '파리바게뜨 여수엑스포점'],
  ['1bdc59414a5c8b64', '파리바게뜨 여수중앙점'],
  ['e16359de9292f582', '피자알볼로 여수엑스포점(수정동)'],
  ['7b221aa6623bd0a2', '하이오커피 여수신월국동항점'],
  ['06f2a251304b0a51', '한끼국밥&갈비찜 국동점'],
  ['8f8486e4cd5aaec3', '항아리치킨&깐풍기 봉산점'],
  ['43780265104bccba', '핵떡 여수봉산점'],
  ['18503945dc9c16c8', '홍紅 곱도리탕 봉강점'],
  ['8cb29ac81df85b54', '여수언니 교동점'],
  ['4e83618703e993b5', '걸작떡볶이치킨 여수중앙점'],
  ['91798b85e5a50244', '진남집밥 교동점'],
  ['144ed6ece1f4734a', '여수팥빙수 교동점'],
  ['411052fdc9de5d44', '모노데일리 남산점'],
  ['e5b0545e92f03409', '이조삼계탕 충무점'],
  ['98a1464075ea68e5', '포슈아 쌀국수배달전문 서교점'],
  ['b58c688c90df4687', '본죽&비빔밥 여수중앙점'],
  ['8dc7782b3cb4bdcf', '김밥세상 광무점'],
  ['3bcce1dd4c36eee0', '동백 봉강점'],
  ['5942ed8c00fa1037', '금도령찜닭 여수봉강점']
];

for (const [storeId, storeName] of targetStores) {
  const store = stores.find(value => String(value.store_id || value.id) === storeId);
  if (!store) throw new Error(`store missing ${storeId}`);
  if (store.name !== storeName) throw new Error(`store name mismatch ${storeId}: ${store.name}`);
  const matches = (store.routes || []).filter(route => route.name === '가게바로주문' && route.url === foreignUrl);
  if (matches.length !== 1) throw new Error(`route mismatch ${storeName}: ${matches.length}`);
  store.routes = store.routes.filter(route => !(route.name === '가게바로주문' && route.url === foreignUrl));
}

const owners = stores.filter(store => (store.routes || []).some(route => route.name === '가게바로주문' && route.url === foreignUrl));
if (owners.length !== 1 || owners[0].name !== '동대문엽기떡볶이 문수점') {
  throw new Error(`foreign URL owners mismatch: ${owners.map(store => store.name).join(', ')}`);
}

fs.writeFileSync(storesPath, `${JSON.stringify(stores, null, 2)}\n`);
console.log(JSON.stringify({ correctedStores: targetStores.length, removedLinks: targetStores.length, preservedOwner: owners[0].name }));
