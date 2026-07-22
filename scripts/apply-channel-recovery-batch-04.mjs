import fs from 'node:fs';

const storesPath = new URL('../data/stores.json', import.meta.url);
const classificationPath = new URL('../recovered-store-channel-classification.csv', import.meta.url);
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));
const classificationLines = fs.readFileSync(classificationPath, 'utf8').split(/\r?\n/);

const additions = [
  ['da8665eac406cc04', '앨리스토리커피', [['ddangyo', 'https://bit.ly/tk-앨리스토리커피']]],
  ['170c2c5b7b5a24c1', '양지골수육', [['ddangyo', 'https://bit.ly/tk-양지골수육']]],
  ['4b2a2803e3a4c80a', '양철북곱창 미평점', [['yogiyo', 'https://ws.yogiyo.co.kr/0a4rcj']]],
  ['a60a8b15c1648b9b', '여수 돌산 꽈배기', [
    ['ddangyo', 'https://bit.ly/tk-여수돌산꽈배기'],
    ['yogiyo', 'https://bit.ly/yo-여수돌산꽈배기']
  ]],
  ['b878080708bef825', '여수싱싱회&육회 문수본점', [['ddangyo', 'https://bit.ly/tk-여수싱싱회육회문수본점']]],
  ['6739ddf6736ef934', '여수하늘', [['ddangyo', 'https://bit.ly/tk-여수하늘']]],
  ['071664b07428a1d3', '여수회포차', [['yogiyo', 'https://bit.ly/yo-여수회포차']]],
  ['115416d8f8939ff3', '여정식당 여문점', [
    ['ddangyo', 'https://bit.ly/tk-여정식당여문점'],
    ['yogiyo', 'https://ws.yogiyo.co.kr/rn991l'],
    ['baemin', 'https://bit.ly/bm-여정식당여문점']
  ]],
  ['9949709e121ff949', '연변양꼬치구이 미평점', [
    ['ddangyo', 'https://bit.ly/tk-연변양꼬치구이미평점'],
    ['yogiyo', 'https://bit.ly/yo-연변양꼬치구이미평점']
  ]],
  ['48033be58064b50c', '오븐에꾸운닭 여문점', [
    ['ddangyo', 'https://bit.ly/tk-오븐에꾸운닭여문점'],
    ['yogiyo', 'https://bit.ly/yo-오븐에꾸운닭여문점']
  ]],
  ['b05ef0b1b1774d35', '올떡볶이 여수봉계점', [
    ['ddangyo', 'https://bit.ly/tk-올떡볶이여수봉계점'],
    ['yogiyo', 'https://bit.ly/yo-올떡볶이여수봉계점']
  ]],
  ['b016e6c2fc4217ea', '요아정 여수여서점', [
    ['ddangyo', 'https://bit.ly/tk-요아정여수여서점'],
    ['yogiyo', 'https://bit.ly/yo-요아정여수여서점']
  ]],
  ['8f4cfdc693976989', '우정통닭', [['ddangyo', 'https://bit.ly/tk-우정통닭']]],
  ['b6d8f721f526761f', '원할머니보쌈족발 여수여서점', [
    ['ddangyo', 'https://bit.ly/tk-원할머니보쌈족발여수여서점'],
    ['yogiyo', 'https://bit.ly/yo-원할머니보쌈족발여수여서점']
  ]],
  ['49470f61773e41e2', '유림식당', [['yogiyo', 'https://bit.ly/yo-유림식당']]],
  ['2fb0f76b3d55052b', '윤가네 선어', [
    ['ddangyo', 'https://bit.ly/tk-윤가네선어'],
    ['yogiyo', 'https://bit.ly/yo-윤가네선어']
  ]],
  ['52aac4b5adef4d89', '을찌로국물떡볶이 국동점', [
    ['ddangyo', 'https://bit.ly/tk-을찌로국물떡볶이국동점'],
    ['yogiyo', 'https://bit.ly/yo-을찌로국물떡볶이국동점']
  ]],
  ['b929bcd743be8b12', '장충동왕족발 여수점', [
    ['ddangyo', 'https://bit.ly/tk-장충동왕족발여수점'],
    ['yogiyo', 'https://bit.ly/yo-장충동왕족발여수점']
  ]],
  ['76235bf473121cbe', '족발자리', [['ddangyo', 'https://bit.ly/tk-족발자리']]],
  ['eb1005c7067bc9d4', '족팔계왕족발', [
    ['yogiyo', 'https://ws.yogiyo.co.kr/oyevu7'],
    ['coupang_eats', 'https://bit.ly/cu-족팔계왕족발'],
    ['baemin', 'https://bit.ly/bm-족팔계왕족발']
  ]]
];

const labels = {
  ddangyo: '땡겨요',
  yogiyo: '요기요',
  coupang_eats: '쿠팡이츠',
  baemin: '배달의민족'
};

const channelKey = name => {
  const text = String(name || '').replace(/\s+/g, '').toLowerCase();
  if (text.includes('땡겨요')) return 'ddangyo';
  if (text.includes('요기요')) return 'yogiyo';
  if (text.includes('쿠팡')) return 'coupang_eats';
  if (text.includes('배달의민족') || text === '배민') return 'baemin';
  if (text.includes('가게바로')) return 'direct_order';
  if (text.includes('먹깨비')) return 'mukkebi';
  if (text.includes('온동네')) return 'ondongne';
  if (text.includes('전화')) return 'phone_order';
  if (text.includes('chak') || text.includes('지역상품권')) return 'local_gift_app';
  return '';
};

let addedLinks = 0;
let updatedClassifications = 0;

for (const [id, name, missing] of additions) {
  const store = stores.find(value => String(value.store_id || value.id) === id);
  if (!store) throw new Error(`store missing ${id}`);
  if (store.name !== name) throw new Error(`store name mismatch ${id}: ${store.name}`);
  store.routes = Array.isArray(store.routes) ? store.routes : [];
  const existing = new Set(store.routes.map(route => channelKey(route.name)));

  for (const [key, url] of missing) {
    if (existing.has(key)) throw new Error(`existing channel ${name} ${key}`);
    store.routes.push({ name: labels[key], url, enabled: true });
    existing.add(key);
    addedLinks += 1;

    const prefix = `"${id}",`;
    const channelToken = `,"${key}",`;
    const statusToken = ',"exact-safe","pending",';
    const indexes = classificationLines
      .map((line, index) => line.startsWith(prefix) && line.includes(channelToken) && line.includes(statusToken) ? index : -1)
      .filter(index => index >= 0);
    if (indexes.length !== 1) throw new Error(`classification mismatch ${name} ${key}: ${indexes.length}`);
    classificationLines[indexes[0]] = classificationLines[indexes[0]].replace(
      statusToken,
      ',"exact-safe","batch-04-restored",'
    );
    updatedClassifications += 1;
  }
}

fs.writeFileSync(storesPath, `${JSON.stringify(stores, null, 2)}\n`);
fs.writeFileSync(classificationPath, classificationLines.join('\n'));
console.log(JSON.stringify({ stores: additions.length, links: addedLinks, classifications: updatedClassifications }));
