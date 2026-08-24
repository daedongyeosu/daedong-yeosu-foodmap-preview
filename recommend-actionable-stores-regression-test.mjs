import assert from 'node:assert/strict';
import fs from 'node:fs';

const experience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(experience, /function fxHasCustomerAction\(store\)/,
  '추천 가게에 고객이 실제로 쓸 수 있는 행동이 있는지 확인해야 합니다.');
assert.match(experience, /resolved\.utilities\?\.naverMap\|\|resolved\.happyOrder\|\|\[\.\.\.primary,\.\.\.external\]\.some\(Boolean\)/,
  '네이버지도·주문경로·전화 중 하나라도 확인된 가게만 추천해야 합니다.');
assert.match(experience, /stores\.filter\(fxVisible\)\.filter\(fxHasCustomerAction\)\.filter\(store=>fxThemeMatch\(store,spec\)\)/,
  '아무 이용 수단이 없는 가게는 추천 레일에 들어가면 안 됩니다.');
assert.match(html, /final-experience\.js\?v=[^"\n]*recommend-actionable-only-1/,
  '고객 행동 가능 추천 기준의 캐시 갱신 표식이 필요합니다.');

console.log('recommend actionable stores regression: PASS');
