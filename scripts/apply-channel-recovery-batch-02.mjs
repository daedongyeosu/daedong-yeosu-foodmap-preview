import fs from 'node:fs';

const storesPath = new URL('../data/stores.json', import.meta.url);
const classificationPath = new URL('../recovered-store-channel-classification.csv', import.meta.url);
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));
const classificationLines = fs.readFileSync(classificationPath, 'utf8').split(/\r?\n/);

const additions = [
  {
    id: '7432d966de3f75ab',
    name: '감탄떡볶이 문수점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-감탄떡볶이문수점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-감탄떡볶이문수점' }
    ]
  },
  {
    id: 'e57c51a4f6294349',
    name: '계근상 여수본점(문수동)',
    missing: [
      { key: 'yogiyo', url: 'https://ws.yogiyo.co.kr/2bml3e' }
    ]
  },
  {
    id: '895a9425dc41ddf7',
    name: '금성칡냉면 미평점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-금성칡냉면미평점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-금성칡냉면미평점' }
    ]
  },
  {
    id: 'f499191f0f57acc7',
    name: '기영이 숯불두마리치킨 여수여서점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-기영이숯불두마리치킨여수여서점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-기영이숯불두마리치킨여수여서점' }
    ]
  },
  {
    id: '888abbb8bf28aa2f',
    name: '김종구식 맛치킨 전기바베큐 옛날통닭 여서점',
    missing: [
      { key: 'yogiyo', url: 'https://ws.yogiyo.co.kr/d2x99a' }
    ]
  },
  {
    id: '406b4a0b39f729fc',
    name: '대정식당 미평점',
    missing: [
      { key: 'yogiyo', url: 'https://ws.yogiyo.co.kr/ih4u4e' }
    ]
  },
  {
    id: '45dc9cf61ba55263',
    name: '덮덮밥 미평점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-덮덮밥미평점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-덮덮밥미평점' }
    ]
  },
  {
    id: '1ecbe36dd1efafed',
    name: '돈치킨 여수둔덕봉계점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-돈치킨여수둔덕봉계점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-돈치킨여수둔덕봉계점' }
    ]
  },
  {
    id: '2dda90913b0b1a4c',
    name: '두찜 여수국동점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-두찜여수국동점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-두찜여수국동점' }
    ]
  },
  {
    id: 'd6602c793047b361',
    name: '뚜레쥬르 여수미평점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-뚜레쥬르여수미평점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-뚜레쥬르여수미평점' }
    ]
  },
  {
    id: '30d2edbcabcca6ec',
    name: '뚜레쥬르 여수여서점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-뚜레쥬르여수여서점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-뚜레쥬르여수여서점' }
    ]
  },
  {
    id: '3a6078da746f1953',
    name: '라홍방마라탕 문수점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-라홍방마라탕문수점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-라홍방마라탕문수점' }
    ]
  },
  {
    id: 'f7167d017e7368e7',
    name: '롤링파스타 여서점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-롤링파스타여서점' }
    ]
  },
  {
    id: 'e0c6949efb48f4b2',
    name: '롯데리아 이마트점',
    missing: [
      { key: 'phone_order', url: 'https://bit.ly/phone-롯데리아이마트점' }
    ]
  },
  {
    id: '6092aabddf5f7194',
    name: '롯데리아 중앙점',
    missing: [
      { key: 'yogiyo', url: 'https://ws.yogiyo.co.kr/y0v93w' }
    ]
  },
  {
    id: '2bd8ea8779f87995',
    name: '리얼펍살얼음맥주 여수문수점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-리얼펍살얼음맥주여수문수점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-리얼펍살얼음맥주여수문수점' }
    ]
  },
  {
    id: '27ea3ca86eab89ec',
    name: '린차이나(먹깨비,땡겨요로 주문시 만두 서비스!!!)',
    missing: [
      { key: 'yogiyo', url: 'https://ws.yogiyo.co.kr/zuhcyn' }
    ]
  },
  {
    id: 'ce5dccb3d6031316',
    name: '마선생 얼큰국밥',
    missing: [
      { key: 'yogiyo', url: 'https://ws.yogiyo.co.kr/huo2ysn' }
    ]
  },
  {
    id: '039652f6eff5f6d7',
    name: '맛집남도밀면',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-맛집남도밀면' }
    ]
  },
  {
    id: '92c0c6cc2688ef0d',
    name: '미미꼬마김밥 여서점',
    missing: [
      { key: 'ddangyo', url: 'https://bit.ly/tk-미미꼬마김밥여서점' },
      { key: 'yogiyo', url: 'https://bit.ly/yo-미미꼬마김밥여서점' }
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
      ',"exact-safe","batch-02-restored",'
    );
    updatedClassifications += 1;
  }
}

fs.writeFileSync(storesPath, `${JSON.stringify(stores, null, 2)}\n`);
fs.writeFileSync(classificationPath, classificationLines.join('\n'));
console.log(JSON.stringify({ stores: additions.length, links: addedLinks, classifications: updatedClassifications }));
