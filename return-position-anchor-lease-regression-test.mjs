import assert from 'node:assert/strict';
import fs from 'node:fs';

const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const stabilizeStart = rc2.indexOf('function rc2StabilizeReturnPosition(saved');
const stabilizeEnd = rc2.indexOf('function rc2ArmRestoredReturnLease', stabilizeStart);
const stabilize = rc2.slice(stabilizeStart, stabilizeEnd);
assert.ok(stabilizeStart >= 0 && stabilizeEnd > stabilizeStart, '복귀 위치 안정화 함수를 찾아야 합니다.');
assert.match(stabilize, /new ResizeObserver\(queueApply\)/,
  '복귀 뒤 사진과 카드 높이가 바뀌어도 기준 가게의 위치를 유지해야 합니다.');
assert.match(stabilize, /new MutationObserver\(queueApply\)/,
  '복귀 뒤 비동기 DOM 갱신에도 기준 가게의 위치를 다시 맞춰야 합니다.');
assert.match(stabilize, /card\.addEventListener\('load', queueApply, true\)/,
  '늦게 로드되는 사진 때문에 화면이 움직이지 않도록 해야 합니다.');
assert.match(stabilize, /\['pointerdown', 'touchstart', 'wheel', 'keydown'\][\s\S]*?cancel/,
  '고객이 직접 조작하기 시작하면 자동 위치 보정을 즉시 중단해야 합니다.');
assert.match(stabilize, /safetyTimer = setTimeout\(cancel, 8000\)/,
  '자동 위치 보정은 복귀 직후의 제한된 시간에만 동작해야 합니다.');

assert.match(finalExperience, /visibleSameApp&&restoredCards>0[\s\S]*?daedongArmRestoredReturnLease/,
  '주문앱 목록 복원 직후 복귀표를 고객의 첫 조작까지 유지해야 합니다.');
assert.match(finalExperience, /daedongStabilizeReturnPosition\?\.\(saved\);[\s\S]*?daedongArmRestoredReturnLease/,
  '재구성된 주문앱 목록도 위치를 먼저 고정한 뒤 복귀표를 유지해야 합니다.');
assert.match(html, /final-experience\.js\?v=[^"\n]*single-entry-return-1[^"\n]*anchor-lease-1/);

console.log('return-position-anchor-lease-regression-test: pass');
