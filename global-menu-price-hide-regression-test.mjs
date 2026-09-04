import assert from 'node:assert/strict';
import fs from 'node:fs';

const menu = fs.readFileSync('store-menu-preview.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(menu, /function publicMenuDescription\(value\)[\s\S]*replace\(MENU_PREFIX_PRICE_PATTERN, ' '\)[\s\S]*replace\(MENU_SUFFIX_PRICE_PATTERN, ' '\)/,
  '고객 메뉴 설명에서 가격 표현을 제거해야 합니다.');
assert.match(menu, /MENU_PRIVATE_PRICE_FIELDS[\s\S]*for \(const key of MENU_PRIVATE_PRICE_FIELDS\) delete next\[key\]/,
  '주문앱 원본의 명시적 가격 필드도 고객 메뉴 객체에서 제거해야 합니다.');
assert.match(menu, /function publicMenuIdentity\(value\)[\s\S]*공기\|공깃[\s\S]*밥[\s\S]*포함\|제공/,
  '공기밥 포함 안내만 다른 동일 메뉴를 하나로 판단해야 합니다.');
assert.match(menu, /const groups = new Map\(\)[\s\S]*publicMenuIdentity\(item\.name\)[\s\S]*winner\.__sourceIds/,
  '모든 가게의 고객 메뉴를 이름 기준으로 통합하고 원본 식별자 연결을 보존해야 합니다.');
assert.match(menu, /activeMenu\.items\.flatMap[\s\S]*item\.__sourceIds/,
  '통합 전 메뉴 검색 결과로 들어와도 통합된 대표 메뉴를 찾을 수 있어야 합니다.');
assert.match(menu, /const canonicalId = String\(item\.id \|\| id\)[\s\S]*dataset\.menuId \|\| ''\) === canonicalId/,
  '통합으로 제거된 원본 메뉴 식별자로 들어와도 대표 메뉴 카드를 열어야 합니다.');
assert.match(menu, /MENU_HIDDEN_MEMBERSHIP_PATTERN[\s\S]*item\?\.name[\s\S]*item\?\.description[\s\S]*item\?\.category[\s\S]*return null/,
  '쿠팡이츠 와우회원 표시가 어떤 고객 메뉴 필드에도 노출되면 안 됩니다.');
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*global-price-hide-1[^"\n]*semantic-menu-dedupe-1/,
  '설치형 앱과 휴대전화가 가격 차단·메뉴 통합 코드를 즉시 받아야 합니다.');
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*membership-label-hide-1/,
  '기존 휴대전화 캐시가 와우회원 차단 코드를 즉시 갱신해야 합니다.');

console.log('global menu price hide regression: PASS');
