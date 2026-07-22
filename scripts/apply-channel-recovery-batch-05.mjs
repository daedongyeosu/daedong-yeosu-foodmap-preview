import fs from 'node:fs';

const storesPath = new URL('../data/stores.json', import.meta.url);
const classificationPath = new URL('../recovered-store-channel-classification.csv', import.meta.url);
const stores = JSON.parse(fs.readFileSync(storesPath, 'utf8'));
const classificationLines = fs.readFileSync(classificationPath, 'utf8').split(/\r?\n/);

const additions = [
  ['7a01cce02afa8141', '주가네김치찌개&찜 여수여서점', [['yogiyo', 'https://bit.ly/yo-주가네김치찌개찜여수여서점']]],
  ['7919e0b7f8d5b436', '쫑포피자 문수점', [
    ['ddangyo', 'https://bit.ly/tk-쫑포피자문수점'],
    ['yogiyo', 'https://bit.ly/yo-쫑포피자문수점']
  ]],
  ['340a17ea324662dc', '천화마라탕', [
    ['yogiyo', 'https://bit.ly/yo-천화마라탕'],
    ['coupang_eats', 'https://bit.ly/cu-천화마라탕'],
    ['baemin', 'https://bit.ly/bm-천화마라탕']
  ]],
  ['3d512878922a19db', '초이커피', [
    ['ddangyo', 'https://bit.ly/tk-초이커피'],
    ['yogiyo', 'https://bit.ly/yo-초이커피']
  ]],
  ['884076b36adf9697', '촌닭두마리치킨 오림점', [
    ['ddangyo', 'https://bit.ly/tk-촌닭두마리치킨오림점'],
    ['yogiyo', 'https://bit.ly/yo-촌닭두마리치킨오림점']
  ]],
  ['478795eb80081c91', '커피어클락', [
    ['ddangyo', 'https://bit.ly/tk-커피어클락'],
    ['yogiyo', 'https://bit.ly/yo-커피어클락']
  ]],
  ['68360b2d1b0e6457', '컴포즈커피 여수여서점', [
    ['ddangyo', 'https://bit.ly/tk-컴포즈커피여수여서점'],
    ['yogiyo', 'https://bit.ly/yo-컴포즈커피여수여서점']
  ]],
  ['5b408dab11c7b1dd', '케이키팩토리', [['ddangyo', 'https://bit.ly/tk-케이키팩토리']]],
  ['d9730ed96e5fbd9a', '틈 돈까스 미평점', [
    ['ddangyo', 'https://bit.ly/tk-틈돈까스미평점'],
    ['yogiyo', 'https://bit.ly/yo-틈돈까스미평점']
  ]],
  ['9846929c4427576a', '푸라닭치킨 여수문수점', [
    ['ddangyo', 'https://bit.ly/tk-푸라닭치킨여수문수점'],
    ['yogiyo', 'https://bit.ly/yo-푸라닭치킨여수문수점']
  ]],
  ['0a231139875a51cc', '푸줏간 고기도시락 여수문수점', [
    ['ddangyo', 'https://bit.ly/tk-푸줏간고기도시락여수문수점'],
    ['yogiyo', 'https://bit.ly/yo-푸줏간고기도시락여수문수점']
  ]],
  ['abb76aa470e26f7a', '피자스쿨 여문점', [
    ['ddangyo', 'https://bit.ly/tk-피자스쿨여문점'],
    ['phone_order', 'https://bit.ly/tel-피자스쿨여문점'],
    ['yogiyo', 'https://bit.ly/yo-피자스쿨여문점']
  ]],
  ['91622c10687d56dd', '향미진짬뽕', [
    ['ddangyo', 'https://bit.ly/tk-향미진짬뽕'],
    ['yogiyo', 'https://ws.yogiyo.co.kr/vi2fbz'],
    ['baemin', 'https://bit.ly/bm-향미진짬뽕']
  ]],
  ['36419c4127ce96c4', '호미스피자 여수점', [['yogiyo', 'https://bit.ly/yo-호미스피자여수점']]],
  ['23f9cb364b06cd44', '호식이두마리치킨 국동점', [
    ['ddangyo', 'https://bit.ly/tk-호식이두마리치킨국동점'],
    ['yogiyo', 'https://bit.ly/yo-호식이두마리치킨국동점']
  ]],
  ['1ed1cc571c81df01', '홍콩반점0410 여수문수점', [
    ['ddangyo', 'https://bit.ly/tk-홍콩반점0410여수문수점'],
    ['yogiyo', 'https://bit.ly/yo-홍콩반점0410여수문수점']
  ]],
  ['4597954f924a4979', '황금마차', [['ddangyo', 'https://bit.ly/tk-황금마차']]],
  ['6390834d3238c3eb', '황금아구 미평점', [['yogiyo', 'https://ws.yogiyo.co.kr/f0rsu8g']]],
  ['9ee73ce6168105ec', '더벤티 여수국동항점', [['local_gift_app', 'https://bit.ly/chak-yeosu']]]
];

const labels = {
  local_gift_app: 'CHAK 지역상품권',
  ddangyo: '땡겨요',
  phone_order: '전화주문',
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
      ',"exact-safe","batch-05-restored",'
    );
    updatedClassifications += 1;
  }
}

fs.writeFileSync(storesPath, `${JSON.stringify(stores, null, 2)}\n`);
fs.writeFileSync(classificationPath, classificationLines.join('\n'));
console.log(JSON.stringify({ stores: additions.length, links: addedLinks, classifications: updatedClassifications }));
