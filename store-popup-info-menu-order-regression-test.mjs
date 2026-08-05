import assert from 'node:assert/strict';
import fs from 'node:fs';

const service = fs.readFileSync('store-service-info.js', 'utf8');
const menu = fs.readFileSync('store-menu-preview.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(service,
  /const target = detail\.querySelector\('\[data-store-menu-preview\]'\)[\s\S]*?detail\.querySelector\('\.detail-routes'\)[\s\S]*?target\.before\(panel\)/,
  '영업시간·혜택은 음식보기와 주문방법보다 먼저 배치해야 합니다.');
assert.match(menu,
  /const servicePanel = detail\.querySelector\('\[data-store-service-detail\]'\)[\s\S]*?insertAdjacentHTML\(servicePanel \? 'afterend' : 'beforebegin'/,
  '늦게 생성되는 음식보기 버튼도 영업시간·혜택 바로 뒤에 배치해야 합니다.');
assert.match(html, /store-service-info\.js\?v=store-service-22-mobile-api-deadline-1/);
assert.match(html, /store-menu-preview\.js\?v=store-menu-21-chrome-reveal-delay-1/);

console.log('store-popup-info-menu-order-regression-test: pass');
