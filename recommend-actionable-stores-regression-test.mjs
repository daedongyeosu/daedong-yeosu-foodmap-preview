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
assert.match(experience, /const hasCustomerRoute=FX_REGION\.code!==['"]yeosu['"]\|\|store\.channelKeys\.some\(Boolean\)/,
  '여수 가게는 검증된 고객 이용 경로가 하나 이상일 때만 공개해야 합니다.');
assert.match(experience, /store\.customerVisible=hasCustomerRoute&&/,
  '주문앱·전화·지도 경로가 모두 없는 가게는 검색과 전체 목록에서도 숨겨야 합니다.');
assert.match(html, /final-experience\.js\?v=[^"\n]*recommend-actionable-only-1/,
  '고객 행동 가능 추천 기준의 캐시 갱신 표식이 필요합니다.');
assert.match(html, /final-experience\.js\?v=[^"\n]*customer-action-gate-1/,
  '고객 행동 경로 공개 기준의 캐시 갱신 표식이 필요합니다.');

console.log('recommend actionable stores regression: PASS');
