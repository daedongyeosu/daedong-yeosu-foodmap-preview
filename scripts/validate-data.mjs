import fs from 'node:fs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const stores = read('data/stores.json');
const coordinates = read('data/store-coordinates.json');
const naverRuntime = read('data/naver-map-runtime.json');
const phoneRuntime = read('data/phone-order-runtime.json');
const checks = [];
const errors = [];
const check = (condition, message) => (condition ? checks : errors).push(message);
const text = value => String(value ?? '').trim();

check(Array.isArray(stores) && stores.length >= 650, `가게 목록 650곳 이상: ${stores.length}`);
check(new Set(stores.map(store => String(store.id))).size === stores.length, '가게 ID 중복 없음');
check(stores.filter(store => text(store.name)).length >= 650, '이름 있는 가게 650곳 이상');

const invalidRoutes = [];
for (const store of stores) {
  for (const route of store.routes || []) {
    if (route.enabled === false) continue;
    if (!/^(https?:\/\/|tel:)/i.test(text(route.url))) {
      invalidRoutes.push(`${store.name}:${route.name}:${route.url}`);
    }
  }
}
check(invalidRoutes.length === 0, '주문·전화 경로 URL 형식 정상');

const coordinateValues = Array.isArray(coordinates) ? coordinates : Object.values(coordinates);
const invalidCoordinates = coordinateValues.filter(item => {
  const rawLat = item.lat ?? item.latitude;
  const rawLng = item.lng ?? item.longitude;
  if (rawLat == null || rawLng == null || rawLat === '' || rawLng === '') return false;
  const lat = Number(rawLat);
  const lng = Number(rawLng);
  return Number.isFinite(lat) && Number.isFinite(lng) && !(lat >= 33 && lat <= 36 && lng >= 126 && lng <= 129);
});
check(invalidCoordinates.length === 0, '등록 좌표가 전남권 범위');

check(naverRuntime && typeof naverRuntime === 'object', '네이버지도 런타임 데이터 읽기');
check(phoneRuntime && typeof phoneRuntime === 'object', '전화주문 런타임 데이터 읽기');

const hasPhoto = store => Boolean(text(store.image || store.img) || (Array.isArray(store.images) && store.images.length));
const withPhoto = stores.filter(hasPhoto).length;
const report = {
  success: errors.length === 0,
  pass: checks.length,
  warn: 0,
  fail: errors.length,
  photoCoverage: {withPhoto, awaiting: stores.length - withPhoto},
  categories: new Set(stores.map(store => text(store.category || store.cat)).filter(Boolean)).size,
  checks,
  warnings: [],
  errors,
  invalidRoutes
};
fs.writeFileSync('data-validation-report.json', `${JSON.stringify(report, null, 2)}\n`);
for (const item of checks) console.log('PASS', item);
for (const item of errors) console.error('FAIL', item);
if (errors.length) process.exit(1);
