import assert from 'node:assert/strict';
import fs from 'node:fs';

const service = fs.readFileSync('store-service-info.js', 'utf8');
const menu = fs.readFileSync('store-menu-preview.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(service,
  /const topStatusTarget = detail\.querySelector\('\[data-store-menu-preview\]'\)[\s\S]*?detail\.querySelector\('\.detail-routes'\)[\s\S]*?topStatusTarget\.before\(topStatus\)/,
  '현재 영업상태는 음식보기 바로 앞에 배치해야 합니다.');
assert.match(service,
  /const actionsTarget = detail\.querySelector\('\.detail-personal-actions'\)[\s\S]*?actionsTarget\.before\(panel\)/,
  '영업시간·혜택은 주문방법 뒤, 하단 개인기능 앞에 배치해야 합니다.');
assert.doesNotMatch(service,
  /<h3>영업시간·주문앱별 혜택<\/h3>\s*<\/div>\s*<span class="store-service-status/,
  '영업상태는 상세 이용정보 안에 중복 표시하지 않아야 합니다.');
assert.match(menu,
  /const topStatus = detail\.querySelector\('\[data-store-service-top-status\]'\)[\s\S]*?insertAdjacentHTML\(topStatus \? 'afterend' : 'beforebegin'/,
  '늦게 생성되는 음식보기 버튼도 영업상태 뒤, 주문방법 앞에 배치해야 합니다.');
assert.doesNotMatch(menu, /const servicePanel = detail\.querySelector\('\[data-store-service-detail\]'\)/);
assert.match(html, /store-service-info\.css\?v=store-service-12-search-status-order-1/);
assert.match(html, /store-service-info\.js\?v=store-service-25-menu-search-status-order-1/);
assert.match(html, /store-menu-preview\.js\?v=store-menu-22-customer-popup-order-1/);

console.log('store-popup-info-menu-order-regression-test: pass');
