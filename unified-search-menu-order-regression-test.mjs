import assert from 'node:assert/strict';
import fs from 'node:fs';

const service = fs.readFileSync('store-service-info.js', 'utf8');
const serviceStyle = fs.readFileSync('store-service-info.css', 'utf8');
const menu = fs.readFileSync('store-menu-preview.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} 함수가 있어야 합니다.`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} 함수 끝을 찾지 못했습니다.`);
}

const overviewStatusPriority = new Function(
  'STATUS_SORT_PRIORITY',
  `${extractFunction(service, 'overviewStatusPriority')}; return overviewStatusPriority;`
)({open: 0, 'closing-soon': 1, unknown: 2, closed: 3});
const overviewMenuEvidencePriority = new Function(
  `${extractFunction(service, 'overviewMenuEvidencePriority')}; return overviewMenuEvidencePriority;`
)();

assert.deepEqual(
  ['open', 'closing-soon', 'unknown', 'closed'].map(state => overviewStatusPriority({status: {state}})),
  [0, 1, 2, 3],
  '검색 결과는 영업 중, 곧 종료, 시간 미확인, 영업 종료 순이어야 합니다.'
);
assert.deepEqual([
  overviewMenuEvidencePriority({menuMatches: [{image: 'menu.jpg'}]}),
  overviewMenuEvidencePriority({menuMatches: [{image: ''}]}),
  overviewMenuEvidencePriority({menuMatches: []})
], [0, 1, 2], '같은 영업상태에서는 메뉴사진, 메뉴명, 카테고리 일치 순이어야 합니다.');

assert.match(service,
  /function overviewIdentityPriority\(entry\)[\s\S]*name\.startsWith\(compact\)[\s\S]*name\.includes\(compact\)[\s\S]*return 4/,
  '가게명 완전·앞부분·포함 검색은 영업상태보다 먼저 찾아야 합니다.');
assert.match(service,
  /function compareOverviewEntries\(a, b\)[\s\S]*identityOrder[\s\S]*statusOrder[\s\S]*menuEvidenceOrder[\s\S]*a\.locationBucket - b\.locationBucket[\s\S]*a\.ownershipTier - b\.ownershipTier[\s\S]*a\.areaDistance - b\.areaDistance/,
  '메뉴 검색은 가게명, 영업상태, 메뉴 근거, 위치, 관리 가게, 거리 순이어야 합니다.');
assert.match(service, /const MENU_MATCH_PREVIEW_LIMIT = 2/,
  '모바일에서 가게별 일치 메뉴는 대표 2개씩 먼저 보여줘야 합니다.');
assert.match(service,
  /\.sort\(\(a, b\) => Number\(Boolean\(b\.image\)\) - Number\(Boolean\(a\.image\)\)\)/,
  '일치 메뉴 안에서도 사진 있는 메뉴를 먼저 보여줘야 합니다.');
assert.match(service,
  /\['closing-soon', '곧 종료',[\s\S]*\['unknown', '시간 미확인',[\s\S]*\['closed', '영업 종료'/,
  '영업상태 필터도 곧 종료, 시간 미확인, 영업 종료 순이어야 합니다.');
assert.match(serviceStyle,
  /data-store-service-status="closing-soon"[\s\S]*color: #815116;[\s\S]*background: #fff0cb;/,
  '곧 종료는 경고 의미의 호박색으로 표시해야 합니다.');
assert.match(serviceStyle,
  /\.store-service-overview-list \{[\s\S]*?gap: 16px;/,
  '검색 결과의 가게별 카드 사이에는 눈에 띄는 간격이 있어야 합니다.');
assert.match(serviceStyle,
  /\.store-service-overview-group \{[\s\S]*?border: 2px solid #9fb0c2;[\s\S]*?box-shadow: 0 7px 20px rgba\(18, 42, 74, \.1\);/,
  '가게 정보 전체는 진한 외곽선과 그림자로 한 덩어리임을 분명히 보여야 합니다.');
assert.match(serviceStyle,
  /\.store-service-menu-matches \{[\s\S]*?border-top: 2px solid #d7c4b8;/,
  '가게 기본정보와 일치 메뉴 사이의 내부 구분선도 분명해야 합니다.');

assert.match(menu,
  /if \(store\.__secureDetailReady !== true\)[\s\S]*secureDetail\.enrich\(store/,
  '통합검색에서 메뉴를 바로 열 때 주문경로 상세정보를 먼저 불러와야 합니다.');
assert.match(menu,
  /function menuDisplayPriority\(item\)[\s\S]*주류[\s\S]*return 40[\s\S]*음료[\s\S]*return 30[\s\S]*추가[\s\S]*return 20/,
  '추가·사이드, 음료, 주류를 메인 메뉴 뒤로 분류해야 합니다.');
assert.match(menu,
  /activeMenu = orderedMenu\(menu\);[\s\S]*previewMarkup\(activeMenu, store\)/,
  '정렬된 메뉴를 음식보기에 렌더링해야 합니다.');
assert.match(menu,
  /menuChromeRevealTimer = window\.setTimeout\(\(\) => \{[\s\S]*?menu-chrome-hidden[\s\S]*?\}, 1200\);/,
  '사진 탐색을 멈춘 뒤 검색창과 주문방법은 1.2초 후에 다시 나타나야 합니다.');

assert.match(html, /store-service-info\.css\?v=store-service-13-search-status-order-1-card-status-1-search-store-boundary-1-category-heading-wrap-1/,
  '영업상태 색상 수정본 캐시 버전이 필요합니다.');
assert.match(html, /store-service-info\.css\?v=[^"\n]*search-store-boundary-1/,
  '검색 가게별 경계선 수정본 캐시 버전이 필요합니다.');
assert.match(html, /store-service-info\.js\?v=store-service-26-deferred-bootstrap-1-menu-search-status-order-1/,
  '검색 수정본 캐시 버전이 필요합니다.');
assert.match(html, /store-menu-preview\.js\?v=store-menu-22-customer-popup-order-1/,
  '메뉴 수정본 캐시 버전이 필요합니다.');

console.log('unified-search-menu-order-regression-test: pass');
