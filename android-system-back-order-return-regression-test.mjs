import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(rc2, /const RC2_EXTERNAL_RETURN_POP_GUARD_MS = 1500;/,
  'Android 시스템 뒤로가기 직후의 popstate만 제한적으로 보호해야 합니다.');

function extractAssignedFunction(source, name) {
  const start = source.indexOf(`${name} = function`);
  assert.ok(start >= 0, `${name} 함수를 찾아야 합니다.`);
  const signatureEnd = source.indexOf(') {', start);
  assert.ok(signatureEnd >= 0, `${name} 함수 본문을 찾아야 합니다.`);
  const bodyStart = signatureEnd + 2;
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${name} 함수의 끝을 찾지 못했습니다.`);
}

const hardCloseSource = extractAssignedFunction(rc2, 'hardClose');
let nativeCloseCount = 0;
let restoreCount = 0;
let finishCount = 0;
const context = {
  hardClose: null,
  rc2ModalStack: [],
  rc2ExternalDepartureHidden: false,
  rc2ExternalReturnPopGuardUntil: 0,
  rc2PendingExternalReturnState: () => ({storeId: 'wong-gimbap'}),
  rc2RestoreExternalSurface: async () => { restoreCount += 1; return true; },
  rc2ResetExternalDepartureLifecycle() {},
  rc2NativeHardClose() { nativeCloseCount += 1; },
  rc2RestoreSnapshot() {},
  window: {daedongFinishExternalReturnBoot() { finishCount += 1; }},
  Date
};
vm.createContext(context);
vm.runInContext(`${hardCloseSource};hardClose({fromPop:true});`, context);
await new Promise(resolve => setImmediate(resolve));

assert.equal(nativeCloseCount, 0,
  '배민·쿠팡이츠에서 휴대폰 시스템 뒤로가기로 복귀할 때 가게 상세를 닫아 홈으로 보내면 안 됩니다.');
assert.equal(restoreCount, 1,
  '시스템 뒤로가기 popstate는 저장된 주문앱 복귀 화면을 복원해야 합니다.');
assert.equal(finishCount, 1,
  '복원 완료 뒤에만 첫 화면 복귀 차단을 해제해야 합니다.');

context.rc2PendingExternalReturnState = () => null;
context.rc2ExternalReturnPopGuardUntil = Date.now() + 1000;
vm.runInContext('hardClose({fromPop:true});', context);
assert.equal(nativeCloseCount, 0,
  'visibilitychange가 먼저 복원을 끝낸 직후 도착한 시스템 뒤로가기 popstate도 한 번은 무시해야 합니다.');

assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*android-system-back-return-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*android-system-back-return-1/);

console.log('android-system-back-order-return-regression-test: pass');
