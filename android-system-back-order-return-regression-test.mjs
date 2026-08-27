import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.doesNotMatch(rc2, /RC2_EXTERNAL_RETURN_POP_GUARD_MS|rc2ExternalReturnPopGuardUntil/,
  '기기별로 늦게 오는 popstate를 짧은 타이머로 추측하면 안 됩니다.');

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

vm.runInContext('hardClose({fromPop:true});', context);
assert.equal(nativeCloseCount, 0,
  '복원 뒤 늦게 도착한 시스템 뒤로가기 popstate도 복귀표가 남아 있는 동안 홈으로 보내면 안 됩니다.');
assert.equal(restoreCount, 2,
  '시간과 무관하게 남아 있는 정확한 복귀표로 동일 화면을 다시 확인해야 합니다.');

context.rc2PendingExternalReturnState = () => null;
vm.runInContext('hardClose({fromPop:true});', context);
assert.equal(nativeCloseCount, 1,
  '고객이 화면을 조작해 복귀표가 정리된 뒤의 정상 뒤로가기는 기존 닫기 동작을 수행해야 합니다.');

assert.match(rc2, /function rc2ArmRestoredReturnLease\(key, saved\)[\s\S]*?rc2RestoredReturnLease = \{key, saved\}/,
  '복원 직후에는 일회용 복귀표를 고객의 첫 조작까지 유지해야 합니다.');
assert.match(rc2, /function rc2SettleRestoredReturnLease\(\)[\s\S]*?rc2ClearReturnState\(lease\.key, lease\.saved\)[\s\S]*?rc2ClearDurableReturn/,
  '고객이 복원 화면을 확인한 뒤에만 저장소와 쿠키의 복귀표를 함께 정리해야 합니다.');
assert.doesNotMatch(rc2, /document\.addEventListener\('(pointerdown|touchstart)', rc2(Settle|Schedule)RestoredReturn/,
  '첫 손가락이 닿는 동안 history를 변경하면 카카오 WebView가 같은 탭의 클릭을 취소할 수 있습니다.');
assert.match(rc2, /document\.addEventListener\('pointerup', rc2ScheduleRestoredReturnSettlement, true\)/);
assert.match(rc2, /document\.addEventListener\('touchend', rc2ScheduleRestoredReturnSettlement/);

assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*android-system-back-return-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*android-system-back-return-1/);

console.log('android-system-back-order-return-regression-test: pass');
