import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('store-menu-preview.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const mobileBlock = css.slice(css.indexOf('@media (max-width: 720px)'), css.indexOf('@media (max-width: 560px)'));

assert.match(
  mobileBlock,
  /\.store-menu-sticky-actions\s*>\s*header\s*\{[\s\S]*?display:\s*none;/,
  '모바일 주문 고정창은 설명 머리글을 숨겨 첫 메뉴를 과도하게 가리지 않아야 합니다.'
);
assert.match(
  mobileBlock,
  /\.store-menu-sticky-actions\s*\{[\s\S]*?padding:\s*6px;[\s\S]*?gap:\s*0;/,
  '모바일 주문 고정창은 버튼 한 줄 높이로 압축해야 합니다.'
);
assert.match(
  mobileBlock,
  /\.store-menu-sticky-actions\s*>\s*nav\s*\{[\s\S]*?grid-template-columns:\s*none;[\s\S]*?grid-auto-flow:\s*column;[\s\S]*?grid-auto-columns:\s*minmax\(0,\s*1fr\);/,
  '주문방법 개수와 무관하게 모바일 고정 버튼은 한 줄을 유지해야 합니다.'
);
assert.match(
  mobileBlock,
  /button\.is-direct\s+small\s*\{[\s\S]*?display:\s*none;/,
  '모바일 준비중 버튼의 보조 문구가 고정창 높이를 늘리면 안 됩니다.'
);
assert.match(
  html,
  /store-menu-preview\.css\?v=[^"']*compact-order-dock-1/,
  '고객 브라우저가 압축된 모바일 주문창 CSS를 새로 받아야 합니다.'
);

console.log('menu sticky actions mobile regression: PASS');
