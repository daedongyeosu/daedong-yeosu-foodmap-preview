import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const service = fs.readFileSync('store-service-info.js', 'utf8');
const runtime = fs.readFileSync('data-api-runtime.js', 'utf8');
const css = fs.readFileSync('store-service-info.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const helperStart = app.indexOf('function canonicalDuplicateStoreName');
const helperEnd = app.indexOf('function canonicalSearchAliases', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, '요기요 신규 수집 중복 병합 함수를 유지해야 합니다.');

const helpers = Function(`
  const normalize = value => String(value ?? '').trim().toLowerCase().replace(/[\\s·&()\\-_/.,]/g, '');
  const imagePathFromValue = value => typeof value === 'string' ? value.trim() : String(value?.detail || value?.card || value?.src || value?.url || '').trim();
  const uniquePaths = values => [...new Set(values.map(imagePathFromValue).filter(Boolean))];
  ${app.slice(helperStart, helperEnd)}
  return {mergeYogiyoCollectorDuplicates};
`)();

const established = {
  id: '5c881a3751b1c6cf', name: '쌀쌀맞은닭 여천점(신기동)', area: '신기동', primaryNeighborhood: '신기동',
  cat: '치킨', categories: ['치킨'], channelKeys: ['direct', 'mukkebi', 'yogiyo'], legacyImage: '/existing.webp',
  legacyImages: ['/existing.webp'], managed: true, hasMenu: false, routes: [], searchAliases: [], lat: 34.7, lng: 127.6
};
const collector = {
  id: 'd86b08f1865cc35a', name: '쌀쌀맞은닭 여천점', area: '신기동', primaryNeighborhood: '신기동',
  cat: '기타', categories: ['기타'], channelKeys: ['yogiyo'], legacyImage: '/new.webp', legacyImages: ['/new.webp'],
  hasMenu: true, routes: [], searchAliases: []
};
const otherArea = {...collector, id: 'aaaaaaaaaaaaaaaa', area: '문수동', primaryNeighborhood: '문수동'};

const merged = helpers.mergeYogiyoCollectorDuplicates([established, collector, otherArea]);
assert.equal(merged.length, 2, '같은 동네의 기존 가게와 요기요 단독 신규 레코드는 한 가게로 합쳐야 합니다.');
assert.equal(merged[0].id, established.id, '주문경로와 좌표가 많은 기존 관리 ID를 보존해야 합니다.');
assert.deepEqual(merged[0].mergedStoreIds, [collector.id], '신규 수집 ID를 영업시간·상세사진 결합용 별칭으로 보존해야 합니다.');
assert.deepEqual(merged[0].legacyImages, ['/existing.webp', '/new.webp'], '기존 사진과 신규 수집 사진을 모두 보존해야 합니다.');
assert.deepEqual(merged[0].categories, ['치킨'], '신규 수집의 임시 기타 분류가 기존 정확한 분류를 오염시키면 안 됩니다.');
assert.equal(merged[0].hasMenu, true, '신규 수집 메뉴 존재 여부를 기존 가게에 이어 붙여야 합니다.');

assert.match(app, /allStores = mergeYogiyoCollectorDuplicates\(normalizedStores\)/,
  '고객 카탈로그를 만들기 전에 확정 중복을 제거해야 합니다.');
assert.match(runtime, /\.\.\.mergedStoreIds\.map\(storeId => window\.daedongDataApi\.detail\(storeId\)/,
  '가게 상세를 열 때 병합된 신규 ID의 사진과 주문경로도 함께 불러와야 합니다.');
assert.match(service, /function serviceInfoForStore\(storeOrId\)/,
  '병합된 신규 ID의 확인 영업시간을 기존 가게 카드에 연결해야 합니다.');
assert.match(service, /store-service-overview-card-image/,
  '통합 검색 결과에서 가게 대표사진을 표시해야 합니다.');
assert.match(css, /grid-template-columns:\s*68px minmax\(0, 1fr\) auto 22px/,
  '대표사진을 포함한 검색 카드 레이아웃을 유지해야 합니다.');
assert.match(html, /yogiyo-duplicate-merge-1/,
  '고객 휴대폰이 중복 병합 및 검색 사진 수정본을 즉시 받도록 캐시 버전을 올려야 합니다.');

console.log('Yogiyo duplicate store merge regression: PASS');
