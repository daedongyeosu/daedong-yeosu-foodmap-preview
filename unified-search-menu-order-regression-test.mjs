import assert from 'node:assert/strict';
import fs from 'node:fs';

const service = fs.readFileSync('store-service-info.js', 'utf8');
const menu = fs.readFileSync('store-menu-preview.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(service,
  /function overviewQueryPriority\(entry\)[\s\S]*name\.startsWith\(compact\)[\s\S]*name\.includes\(compact\)[\s\S]*entry\.menuMatches\.length \? 5 : 6/,
  '가게명 완전·앞부분·포함 일치를 메뉴 일치보다 우선해야 합니다.');
assert.match(service,
  /scoped\.sort\(\(a, b\) => \([\s\S]*queryOrder\(a, b\)[\s\S]*a\.areaDistance - b\.areaDistance/,
  '가까운 순을 사용해도 가게명 검색 우선순위를 먼저 적용해야 합니다.');

assert.match(menu,
  /if \(store\.__secureDetailReady !== true\)[\s\S]*secureDetail\.enrich\(store/,
  '통합검색에서 메뉴를 바로 열 때 주문경로 상세정보를 먼저 불러와야 합니다.');
assert.match(menu,
  /function menuDisplayPriority\(item\)[\s\S]*주류[\s\S]*return 40[\s\S]*음료[\s\S]*return 30[\s\S]*추가[\s\S]*return 20/,
  '추가·사이드, 음료, 주류를 메인 메뉴 뒤로 분류해야 합니다.');
assert.match(menu,
  /activeMenu = orderedMenu\(menu\);[\s\S]*previewMarkup\(activeMenu, store\)/,
  '정렬된 메뉴를 음식보기에 렌더링해야 합니다.');

assert.match(html, /store-service-info\.js\?v=store-service-18-store-name-first-1/,
  '검색 수정본 캐시 버전이 필요합니다.');
assert.match(html, /store-menu-preview\.js\?v=store-menu-19-order-routes-and-sides-last-1/,
  '메뉴 수정본 캐시 버전이 필요합니다.');

console.log('unified-search-menu-order-regression-test: pass');
