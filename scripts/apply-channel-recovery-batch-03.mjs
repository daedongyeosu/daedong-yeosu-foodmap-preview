import fs from 'node:fs';

const storesPath = new URL('../data/stores.json', import.meta.url);
const classificationPath = new URL('../recovered-store-channel-classification.csv', import.meta.url);
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));
const classificationLines = fs.readFileSync(classificationPath, 'utf8').split(/\r?\n/);

const additions = [
  {
    id: '7a151d290e01dc51',
    name: '미치게 본점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-미치게본점' },
      { key: 'coupang_eats', url: 'https://bit.ly/cu-미치게본점' },
      { key: 'baemin', url: 'https://bit.ly/bm-미치게본점' }
    ]
  },
  {
    id: '720bbd7fb87816a7',
    name: '반올림피자 여수미평점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-반올림피자여수미평점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-반올림피자여수미평점' }
    ]
  },
  {
    id: 'c938cc2ee278ce23',
    name: '배떡 여수점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-배떡여수점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-배떡여수점' }
    ]
  },
  {
    id: '0619092f600c5be4',
    name: '배스킨라빈스 여수여서점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-배스킨라빈스여수여서점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-배스킨라빈스여수여서점' }
    ]
  },
  {
    id: '0987413e7ca12e2a',
    name: '백년족발',
    missing: [
      { key: 'coupang_eats', url: 'https://bit.ly/cu-백년족발' },
      { key: 'baemin', url: 'https://bit.ly/bm-백년족발' }
    ]
  },
  {
    id: '6c3386fc9f4a5b5b',
    name: '백수초밥',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-백수초밥' }
    ]
  },
  {
    id: '40c638502decc604',
    name: '백억 흑미 꼬마김밥',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-백억흑미꼬마김밥' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-백억흑미꼬마김밥' }
    ]
  },
  {
    id: '7c03a236a9c011b4',
    name: '봉구스밥버거 문수점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-봉구스밥버거문수점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-봉구스밥버거문수점' }
    ]
  },
  {
    id: '8d36892e33e3536b',
    name: '봉명동내커피 여수문수점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-봉명동내커피여수문수점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-봉명동내커피여수문수점' }
    ]
  },
  {
    id: 'ba73ff085a9fe8a1',
    name: '부대찌개 전쟁터',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-부대찌개전쟁터' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-부대찌개전쟁터' }
    ]
  },
  {
    id: 'c1a35b0c8903cd57',
    name: '북촌손만두&피냉면 여수문수점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-북촌손만두피냉면여수문수점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-북촌손만두피냉면여수문수점' }
    ]
  },
  {
    id: '8d21bc80dd49679e',
    name: '빵위에치즈 여수점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-빵위에치즈여수점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-빵위에치즈여수점' },
      { key: 'coupang_eats', url: 'https://bit.ly/cu-빵위에치즈1인피자' },
      { key: 'baemin', url: 'https://bit.ly/bm-빵위에치즈1인피자' }
    ]
  },
  {
    id: '9509311543276bbf',
    name: '삼첩분식 미평점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-삼첩분식미평점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-삼첩분식미평점' }
    ]
  },
  {
    id: '90cd1600c54ce7d0',
    name: '서영이네김밥 미평점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-서영이네김밥미평점' }
    ]
  },
  {
    id: '6daf3c1e0dfb68fe',
    name: '서울깍두기 미평직영점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-서울깍두기미평직영점' }
    ]
  },
  {
    id: 'c59a5a8f5a91ce24',
    name: '수해복마라탕 여수미평점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-수해복마라탕여수미평점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-수해복마라탕여수미평점' }
    ]
  },
  {
    id: '1945b6a42e0da33c',
    name: '쉐프의 생 안심탕수육 문수점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-쉐프의생안심탕수육문수점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-쉐프의생안심탕수육문수점' }
    ]
  },
  {
    id: 'd89dce51902e9756',
    name: '써브웨이 여서점',
    missing: [
      { key: 'yogiyo', url: 'https://bit.ly/yo-써브웨이여서점' }
    ]
  },
  {
    id: 'c56d65926bf2b224',
    name: '아주커치킨 둔덕점',
    missing: [
      { key: 'yogiyo', url: 'https://ws.yogiyo.co.kr/vmuzp8' }
    ]
  },
  {
    id: 'e66f136d0e468b6e',
    name: '아주커치킨 문수점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-아주커치킨문수점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-아주커치킨문수점' }
    ]
  }
];

const labels = {
  ddangyo: '땡겨요',
  yogiyo: '요기요',
  coupang_eats: '쿠팡이츠',
  baemin: '배달의민족',
  mukkebi: '먹깨비',
  ondongne: '온동네',
  direct_order: '가게바로주문',
  local_gift_app: 'CHAK 지역상품권',
  phone_order: '전화주문'
};

const channelKey = name => {
  const text = String(name || '').replace(/\s+/g, '').toLowerCase();
  if (text.includes('가게바로')) return 'direct_order';
  if (text.includes('먹깨비')) return 'mukkebi';
  if (text.includes('땡겨요')) return 'ddangyo';
  if (text.includes('온동네')) return 'ondongne';
  if (text.includes('전화')) return 'phone_order';
  if (text.includes('chak') || text.includes('지역상품권')) return 'local_gift_app';
  if (text.includes('요기요')) return 'yogiyo';
  if (text.includes('쿠팡')) return 'coupang_eats';
  if (text.includes('배달의민족') || text === '배민') return 'baemin';
  return '';
};

let addedLinks = 0;
let updatedClassifications = 0;

for (const item of additions) {
  const store = stores.find(value => String(value.store_id || value.id) === item.id);
  if (!store) throw new Error(`store missing ${item.id}`);
  if (store.name !== item.name) throw new Error(`store name mismatch ${item.id}: ${store.name}`);

  store.routes = Array.isArray(store.routes) ? store.routes : [];
  const existing = new Set(store.routes.map(route => channelKey(route.name)));

  for (const route of item.missing) {
    if (existing.has(route.key)) throw new Error(`existing channel ${store.name} ${route.key}`);
    store.routes.push({ name: labels[route.key], url: route.url, enabled: true });
    existing.add(route.key);
    addedLinks += 1;

    const prefix = `"${item.id}",`;
    const channelToken = `,"${route.key}",`;
    const statusToken = ',"exact-safe","pending",';
    const indexes = classificationLines
      .map((line, index) => line.startsWith(prefix) && line.includes(channelToken) && line.includes(statusToken) ? index : -1)
      .filter(index => index >= 0);
    if (indexes.length !== 1) {
      throw new Error(`classification mismatch ${store.name} ${route.key}: ${indexes.length}`);
    }
    classificationLines[indexes[0]] = classificationLines[indexes[0]].replace(
      statusToken,
      ',"exact-safe","batch-03-restored",'
    );
    updatedClassifications += 1;
  }
}

fs.writeFileSync(storesPath, `${JSON.stringify(stores, null, 2)}\n`);
fs.writeFileSync(classificationPath, classificationLines.join('\n'));
console.log(JSON.stringify({ stores: additions.length, links: addedLinks, classifications: updatedClassifications }));
