import fs from 'node:fs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const coordinates = read('data/store-coordinates.json');
const naverRuntime = read('data/naver-map-runtime.json');
const phoneRuntime = read('data/phone-order-runtime.json');
const checks = [];
const errors = [];
const check = (condition, message) => (condition ? checks : errors).push(message);
const legacyPrivatePaths = [
  'data/stores.json',
  'data/ddangyo-store-enrichment.json',
  'data/store-menu-search-index.json',
  'store-service-info.json',
  'store-menu-content/ddangyo-menu-map.js',
  'ddangyo-preview-runtime.js'
];
check(legacyPrivatePaths.every(file => !fs.existsSync(file)), '공개 정적 원본 제거');
const menuSearchIndexFiles = fs.existsSync('data/store-menu-search-index')
  ? fs.readdirSync('data/store-menu-search-index').filter(file => file.endsWith('.json'))
  : [];
check(menuSearchIndexFiles.length === 0, '공개 메뉴 검색 원본 제거');

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

const report = {
  success: errors.length === 0,
  pass: checks.length,
  warn: 0,
  fail: errors.length,
  checks,
  warnings: [],
  errors
};
fs.writeFileSync('data-validation-report.json', `${JSON.stringify(report, null, 2)}\n`);
for (const item of checks) console.log('PASS', item);
for (const item of errors) console.error('FAIL', item);
if (errors.length) process.exit(1);
