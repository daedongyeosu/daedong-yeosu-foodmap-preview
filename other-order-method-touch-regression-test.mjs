import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const app = read('./app.js');
const finalExperience = read('./final-experience.js');
const html = read('./index.html');
const rc3 = read('./rc3-fixes.js');

const rc3Trigger = rc3.match(/<button class="([^"]*rc3-order-methods-trigger[^"]*)"[^>]*data-rc3-other-methods=/);
assert(rc3Trigger, '새 다른 주문방법 버튼을 찾을 수 없습니다.');
assert(!rc3Trigger[1].split(/\s+/).includes('store-other-toggle'), '새 버튼이 구형 팝업 처리기와 다시 충돌합니다.');

assert.match(rc3, /function rc3BindOrderMethodsTrigger\(detail\)/, '버튼 자체의 직접 동작 보조 경로가 없습니다.');
assert.match(rc3, /trigger\.addEventListener\('click',[\s\S]*?rc3OpenOrderMethods\(fxStoreById\(trigger\.dataset\.rc3OtherMethods\)\)/, '직접 동작 보조 경로가 해당 가게 주문방법을 열지 않습니다.');
assert.match(rc3, /orderAnchor\?\.insertAdjacentHTML[\s\S]*?rc3BindOrderMethodsTrigger\(detail\);/, '가게 상세를 그린 뒤 직접 동작 보조 경로가 연결되지 않습니다.');

assert.match(app, /const menu = toggle\.closest\('\.store-other-wrap'\)\?\.querySelector\('\.store-other-popover'\); if \(!menu\) return;/, '구형 팝업이 없는 버튼을 눌렀을 때의 안전장치가 없습니다.');
assert.match(html, /app\.js\?v=[^"\n]*other-order-method-touch-1/, 'app.js 캐시 갱신 표식이 없습니다.');
assert.match(html, /final-experience\.js\?v=[^"\n]*other-order-method-touch-1/, 'final-experience.js 캐시 갱신 표식이 없습니다.');
assert.match(finalExperience, /rc3-fixes\.js\?v=[^'\n]*other-order-method-touch-1/, 'rc3-fixes.js 캐시 갱신 표식이 없습니다.');

console.log('other-order-method-touch-regression: PASS');
