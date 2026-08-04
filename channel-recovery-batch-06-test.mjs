import fs from 'node:fs';

const stores = JSON.parse(fs.readFileSync(new URL('./data/stores.json', import.meta.url), 'utf8'));
const phoneData = JSON.parse(fs.readFileSync(new URL('./data/phone-order-runtime.json', import.meta.url), 'utf8'));
const byId = new Map(stores.map(store => [String(store.store_id || store.id), store]));
const routeKey = name => {
  const value = String(name || '').replace(/\s+/g, '').toLowerCase();
  if (value.includes('가게바로')) return 'direct';
  if (value.includes('먹깨비')) return 'mukkebi';
  if (value.includes('땡겨요')) return 'ddangyo';
  if (value.includes('전화')) return 'phone';
  if (value.includes('chak') || value.includes('지역상품권')) return 'chak';
  if (value.includes('요기요')) return 'yogiyo';
  if (value.includes('쿠팡')) return 'coupang';
  if (value.includes('배달의민족') || value === '배민') return 'baemin';
  return '';
};
const routeMap = store => new Map((store.routes || []).map(route => [routeKey(route.name), route.url]).filter(([key]) => key));
const assert = (condition, message) => { if (!condition) throw new Error(message); };

const cases = [
  {
    id: 'fb798d3119a28415',
    name: '60계치킨 여수미평점',
    phone: '0616539282',
    expected: ['mukkebi', 'ddangyo', 'chak', 'phone', 'yogiyo', 'coupang', 'baemin'],
    absent: ['direct']
  },
  {
    id: '6286966a0169a76b',
    name: '배스킨라빈스 여수미평점',
    phone: '0616533131',
    expected: ['ddangyo', 'chak', 'phone', 'yogiyo', 'coupang', 'baemin'],
    absent: ['direct', 'mukkebi'],
    naverMap: 'https://bit.ly/4cieSE0'
  }
];

for (const item of cases) {
  const store = byId.get(item.id);
  assert(store?.name === item.name, `${item.name}: canonical 레코드 불일치`);
  assert(String(store.phone).replace(/\D/g, '') === item.phone, `${item.name}: 전화번호 불일치`);
  if (item.naverMap) assert(store.naverMap === item.naverMap, `${item.name}: 네이버지도 누락`);
  const routes = routeMap(store);
  for (const key of item.expected) assert(routes.has(key), `${item.name}: ${key} 누락`);
  for (const key of item.absent) assert(!routes.has(key), `${item.name}: 사용 불가 ${key}가 노출됨`);
  const mapping = phoneData.storeMappings.find(value => String(value.store_id) === item.id);
  const phone = phoneData.stores.find(value => String(value.store_id) === item.id);
  assert(mapping?.clickableTel === true, `${item.name}: 전화주문 런타임 매핑 누락`);
  assert(String(phone?.phone) === item.phone, `${item.name}: 전화주문 런타임 번호 누락`);
}

const restoredUrls = new Set(cases.flatMap(item => [...routeMap(byId.get(item.id)).values()]));
for (const store of stores) {
  if (cases.some(item => item.id === String(store.store_id || store.id))) continue;
  for (const route of store.routes || []) {
    assert(!restoredUrls.has(route.url) || route.url === 'https://bit.ly/chak-yeosu', `${store.name}: 복구 링크가 다른 가게에도 연결됨`);
  }
}

assert(stores.length === 650, `canonical ${stores.length}`);
assert(stores.filter(store => store.name && store.name !== '제목 없음').length === 649, '검색 가능 가게 수 불일치');
console.log(JSON.stringify({ok: true, restoredStores: cases.map(item => item.name), restoredLinks: 12, intentionallyHiddenDirectLinks: 2}, null, 2));
