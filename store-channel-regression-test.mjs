import fs from 'node:fs';

const stores = JSON.parse(fs.readFileSync(new URL('./data/stores.json', import.meta.url), 'utf8'));
const byName = name => stores.find(store => store.name === name);
const key = name => {
  const text = String(name || '').toLowerCase().replace(/\s+/g, '');
  if (text.includes('가게바로')) return 'direct';
  if (text.includes('먹깨비')) return 'mukkebi';
  if (text.includes('땡겨요')) return 'ddangyo';
  if (text.includes('온동네')) return 'ondongne';
  if (text.includes('전화')) return 'phone';
  if (text.includes('chak') || text.includes('지역상품권')) return 'chak';
  if (text.includes('요기요')) return 'yogiyo';
  if (text.includes('쿠팡')) return 'coupang';
  if (text.includes('배달의민족') || text === '배민') return 'baemin';
  return '';
};
const routes = store => new Map((store.routes || []).map(route => [key(route.name), route.url]));
const assert = (value, message) => { if (!value) throw new Error(message); };
const normal = value => String(value || '').toLowerCase().replace(/[^a-z0-9가-힣]/g, '');
const brandData = JSON.parse(fs.readFileSync(new URL('./data/brand-app-mapping.json', import.meta.url), 'utf8'));
const explicitBrands = new Map((brandData.stores || []).map(item => [String(item.store_id), item]));
const brandTemplates = [...new Map((brandData.stores || []).map(item => [normal(item.brandName), item])).entries()].filter(([name]) => name);
let resolverExceptions = 0;
let duplicateChannels = 0;
for (const store of stores.filter(item => (item.store_id || item.id) && item.name && item.name !== '제목 없음')) {
  try {
    const storeRoutes = Array.isArray(store.routes) ? store.routes : [];
    const routeMap = new Map(storeRoutes.map(route => [key(route?.name), route]).filter(([channel]) => channel));
    const identity = normal([store.brandName, store.name].filter(Boolean).join(' ').replace(/domino'?s?/gi, '도미노피자'));
    const brand = explicitBrands.get(String(store.store_id || store.id)) || brandTemplates.find(([name]) => identity.includes(name))?.[1] || null;
    const primary = ['direct','mukkebi','ddangyo','ondongne','phone'].filter(channel => routeMap.has(channel));
    if (brand) primary.push('brand');
    const external = ['yogiyo','coupang','baemin'].filter(channel => routeMap.has(channel));
    duplicateChannels += primary.filter(channel => external.includes(channel)).length;
    assert(primary.every(Boolean) && external.every(Boolean), `${store.name}: undefined 채널`);
  } catch (error) {
    resolverExceptions += 1;
    console.error(store.store_id || store.id, store.name, error.message);
  }
}
assert(resolverExceptions === 0, `resolveStoreChannels 예외 ${resolverExceptions}건`);
assert(duplicateChannels === 0, `채널 중복 ${duplicateChannels}건`);

const munsu = byName('도미노피자 문수점');
const yeocheon = byName('도미노피자 여천점(학동)');
assert(munsu && yeocheon, '도미노 두 지점 canonical 레코드가 필요합니다.');
for (const [store, expected] of [[munsu, ['direct','mukkebi','ddangyo','chak','phone','yogiyo','coupang','baemin']], [yeocheon, ['direct','mukkebi','ddangyo','chak','phone','yogiyo','coupang','baemin']]]) {
  const map = routes(store);
  for (const channel of expected) assert(map.has(channel), `${store.name}: ${channel} 누락`);
  assert(/^061\d{7,8}$/.test(String(store.phone || '').replace(/\D/g, '')), `${store.name}: 검증 전화번호 누락`);
  assert(store.brandName === '도미노피자', `${store.name}: 브랜드 정규화 실패`);
}

const source = fs.readFileSync(new URL('./rc3-fixes.js', import.meta.url), 'utf8');
assert(source.includes('function resolveStoreChannels(store)'), '공통 채널 해석기 누락');
assert(source.includes('Object.values(channels.externalOrder)'), '외부 주문 3개 공통 분류 누락');
assert(!/for \(const key of \['direct', 'mukkebi', 'ddangyo', 'ondongne', 'yogiyo'/.test(source), '다른 주문방법에 기본 채널이 섞였습니다.');

const total = stores.length;
const searchable = stores.filter(store => (store.store_id || store.id) && store.name && store.name.trim() && store.name !== '제목 없음').length;
const coordinateData = JSON.parse(fs.readFileSync(new URL('./data/store-coordinates.json', import.meta.url), 'utf8'));
const coordinateEntries = Array.isArray(coordinateData) ? coordinateData : (coordinateData.stores || coordinateData.entries || Object.values(coordinateData));
const coordinates = coordinateEntries.filter(item => item && Number.isFinite(Number(item.latitude ?? item.lat)) && Number.isFinite(Number(item.longitude ?? item.lng))).length;
assert(total === 650, `canonical 전체 ${total} (기대 650)`);
assert(searchable === 649, `검색 가능 ${searchable} (기대 649)`);
assert(coordinates === 326, `검증 좌표 ${coordinates} (기대 326)`);
console.log(JSON.stringify({ok:true,total,searchable,coordinates,resolverExceptions,duplicateChannels,dominoStores:[munsu.id,yeocheon.id]}, null, 2));
