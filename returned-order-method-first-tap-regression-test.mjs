import assert from 'node:assert/strict';
import fs from 'node:fs';

const rc2 = fs.readFileSync(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const rc3 = fs.readFileSync(new URL('./rc3-fixes.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const browserCheck = fs.readFileSync(new URL('./scripts/browser-other-order-method-touch.mjs', import.meta.url), 'utf8');
const exactReturnCheck = fs.readFileSync(new URL('./scripts/browser-all-order-app-exact-return.mjs', import.meta.url), 'utf8');
const finalExperience = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(rc2, /const RC2_RETURN_SETTLE_DELAY_MS = 500;/, '첫 터치 활성화가 끝난 뒤 복귀 상태를 정리할 지연 시간이 필요합니다.');
assert.doesNotMatch(rc2, /document\.addEventListener\('pointerdown', rc2SettleRestoredReturnLease/, 'pointerdown에서 history를 변경하면 카카오 WebView가 같은 터치를 취소할 수 있습니다.');
assert.doesNotMatch(rc2, /document\.addEventListener\('touchstart', rc2SettleRestoredReturnLease/, 'touchstart에서 복귀 상태를 동기 정리하면 안 됩니다.');
assert.match(rc2, /document\.addEventListener\('pointerup', rc2ScheduleRestoredReturnSettlement, true\)/, 'pointerup 뒤에 복귀 상태 정리를 예약해야 합니다.');
assert.match(rc2, /document\.addEventListener\('touchend', rc2ScheduleRestoredReturnSettlement, \{capture: true, passive: true\}\)/, 'Android 원시 touchend 뒤에도 정리를 예약해야 합니다.');
assert.match(rc2, /function rc2ScheduleRestoredReturnSettlement\(\) \{[\s\S]*?setTimeout\([\s\S]*?rc2SettleRestoredReturnLease\(\)[\s\S]*?RC2_RETURN_SETTLE_DELAY_MS/, '정리는 현재 터치 활성화 순서 밖에서 지연 실행해야 합니다.');
assert.match(rc2, /function rc2SettleRestoredReturnLease\(\) \{[\s\S]*?rc2ReadReturnState\(lease\.key\)[\s\S]*?current\?\.returnToken[\s\S]*?lease\.saved\.returnToken/, '지연 정리가 새 주문앱 출발 토큰을 지우지 않도록 토큰을 다시 검증해야 합니다.');
assert.match(rc2, /function rc2WriteReturnState\(key, value\) \{[\s\S]{0,160}?rc2InvalidatePendingReturnRestores\(\);[\s\S]{0,120}?rc2CancelRestoredReturnSettlement\(\);/, '새 주문앱 출발 전에 이전 복귀 작업과 상태 정리 예약을 취소해야 합니다.');
assert.match(rc2, /function rc2SettleRestoredReturnLeaseNow\(\) \{[\s\S]*?clearTimeout\(rc2RestoredReturnSettleTimer\)[\s\S]*?rc2SettleRestoredReturnLease\(\)/, '주문방법 창을 열기 직전에 예약을 취소하고 복귀 상태를 즉시 확정해야 합니다.');
assert.match(rc2, /window\.daedongSettleRestoredReturnLeaseNow = rc2SettleRestoredReturnLeaseNow/, '주문방법 버튼에서 원자적으로 복귀 상태를 확정할 수 있어야 합니다.');
assert.match(rc2, /window\.daedongConfirmIntentionalSurfaceNavigation = rc2ConfirmIntentionalStoreOpen/, '복귀 후 새 화면 이동은 남은 복귀 생명주기를 모두 취소할 수 있어야 합니다.');
assert.match(rc2, /let rc2ReturnLifecycleEpoch = 0/, '진행 중인 카카오 복귀 작업을 세대별로 무효화해야 합니다.');
assert.match(rc2, /function rc2InvalidatePendingReturnRestores\(\)[\s\S]*?rc2ReturnLifecycleEpoch \+= 1[\s\S]*?rc2StoreRestorePromise = null[\s\S]*?rc2SurfaceRestorePromise = null/, '새 화면 선택 시 대기 중인 모든 복귀 작업을 무효화해야 합니다.');
assert.match(rc2, /window\.daedongInvalidatePendingReturnRestores = rc2InvalidatePendingReturnRestores/, '카카오 첫 터치에서 history 변경 없이 복귀 작업만 먼저 무효화할 수 있어야 합니다.');
assert.match(rc2, /if \(visibleStoreMatches\) \{[\s\S]*?rc2ReturnRebuiltToken[\s\S]*?rebuildExisting[\s\S]*?rc2ReplaceNextModal = true[\s\S]*?await openStore\(store\)[\s\S]*?rc2ReturnRebuiltToken = String\(saved\.returnToken/, '카카오가 자체 복원한 오래된 가게 상세는 같은 복귀 토큰에서 한 번 전체 재구성해야 합니다.');
assert.match(rc2, /if \(visibleStoreMatches\) \{[\s\S]*?daedongResetOrderMethodsTouchState\?\.\(\);[\s\S]*?daedongRebindOrderMethodsTrigger\?\.\(\);[\s\S]*?rc2StabilizeReturnPosition\(saved, \$\('#modal \.modal-card'\)\)/, '재구성한 가게 상세에 터치 연결과 정확한 스크롤 복원을 다시 적용해야 합니다.');
assert.match(rc2, /function rc2ConfirmIntentionalStoreOpen\(\) \{[\s\S]*?rc2InvalidatePendingReturnRestores\(\)/, '첫 터치에서 지연 복귀 작업부터 취소해야 합니다.');
assert.match(rc2, /const restoreEpoch = rc2ReturnLifecycleEpoch[\s\S]*?rc2ReturnRestoreCancelled\(restoreEpoch\)/, '비동기 복귀 작업은 화면을 바꾸기 전에 취소 세대를 확인해야 합니다.');
assert.match(rc3, /function rc3ActivateOrderMethodsTrigger\(trigger, event\) \{[\s\S]*?preventDefault\(\)[\s\S]*?daedongInvalidatePendingReturnRestores\?\.\(\)[\s\S]*?(?:rc3OpenOrderMethods|openCommunityChoice)[\s\S]*?setTimeout\(\(\) => \{[\s\S]*?daedongConfirmIntentionalSurfaceNavigation\?\.\(\)[\s\S]*?daedongSettleRestoredReturnLeaseNow\?\.\(\)[\s\S]*?\}, 0\)/, '카카오 첫 터치는 주문방법 화면을 먼저 열고 history 정리는 다음 작업으로 미뤄야 합니다.');
assert.match(rc3, /function rc3ActivateOrderMethodsFallback\(trigger, event\)[\s\S]*?rc3OrderMethodsGhostActive\(storeId\)[\s\S]*?rc3MarkOrderMethodsActivation\(storeId\)[\s\S]*?rc3ActivateOrderMethodsTrigger\(trigger, event\)/, '복원된 HTML 버튼의 클릭 대체 경로도 중복 실행을 막고 주문방법 화면을 열어야 합니다.');
assert.match(rc3, /data-rc3-other-methods=[\s\S]*?onclick="return window\.daedongActivateOrderMethodsFallback \? window\.daedongActivateOrderMethodsFallback\(this, event\) : false"/, '카카오가 이벤트 없는 HTML만 복원해도 버튼 자체에 지속 가능한 클릭 대체 경로가 남아야 합니다.');
assert.match(rc3, /function rc3BindOrderMethodsTrigger\(detail, \{force = false\} = \{\}\)[\s\S]*?force && trigger\.__rc3DirectOrderMethodsBound[\s\S]*?cloneNode\(true\)[\s\S]*?replaceWith\(replacement\)/, '복귀 재연결은 카카오가 남긴 오래된 바인딩 표식을 믿지 말고 버튼 노드를 교체해야 합니다.');
assert.match(rc3, /window\.daedongRebindOrderMethodsTrigger = \(\) => \{[\s\S]*?rc3BindOrderMethodsTrigger\([\s\S]*?\{force: true\}\)/, '주문앱 복귀 재연결은 강제 모드로 실행되어야 합니다.');
assert.match(rc3, /window\.daedongActivateOrderMethodsTrigger = rc3ActivateOrderMethodsTrigger/, '초기 공용 터치 계층이 주문방법 버튼을 직접 열 수 있어야 합니다.');
const earlyBridgeIndex = finalExperience.indexOf("selector:'[data-rc3-other-methods]'");
const rc2LoaderIndex = finalExperience.indexOf("const fxRc2Script=document.createElement('script')");
assert.ok(earlyBridgeIndex >= 0 && earlyBridgeIndex < rc2LoaderIndex, '주문방법 첫 터치 브리지는 동적 복귀 스크립트보다 먼저 등록되어야 합니다.');
assert.match(finalExperience, /selector:'\[data-rc3-other-methods\]'[\s\S]*?window\.daedongActivateOrderMethodsTrigger[\s\S]*?return typeof activate==='function'\?activate\(target,event\):false/, '공용 pointerup/touchend 계층이 복귀 버튼을 직접 활성화해야 합니다.');
assert.match(app, /function clearDaedongGhostClickOnNewPress\(\)[\s\S]*?daedongGhostClick = null[\s\S]*?document\.addEventListener\('pointerdown', clearDaedongGhostClickOnNewPress, true\)[\s\S]*?document\.addEventListener\('touchstart', clearDaedongGhostClickOnNewPress/, '새로운 실제 터치는 이전 화면에서 남은 가짜 클릭 방지표를 해제해야 합니다.');
assert.match(browserCheck, /pointerdown[\s\S]*returnStatePresent[\s\S]*pointerup[\s\S]*returnStatePresent/, '실제 브라우저 검사에서 재터치 전체 동안 복귀 상태가 유지되는지 확인해야 합니다.');
assert.match(browserCheck, /재터치 완료 뒤 복귀 보호 상태 정리/, '버튼 활성화 뒤 복귀 상태가 정리되는지 확인해야 합니다.');
assert.match(exactReturnCheck, /dispatchEvent\('pointerup'/, '정확 복귀 검사도 고객의 완료된 상호작용으로 복귀 상태를 정리해야 합니다.');

for (const [name, source] of [['final-experience.js', finalExperience], ['index.html', index]]) {
  assert.match(source, /return-first-tap-2/, `${name} 캐시 버전이 갱신되어야 합니다.`);
  assert.match(source, /return-activation-atomic-1/, `${name} 실기기 재터치 수정 캐시 버전이 갱신되어야 합니다.`);
  assert.match(source, /return-intent-cancel-1/, `${name} 실기기 복귀 생명주기 취소 캐시 버전이 갱신되어야 합니다.`);
  assert.match(source, /return-early-tap-bridge-1/, `${name} 카카오 복귀 첫 터치 브리지 캐시 버전이 갱신되어야 합니다.`);
  assert.match(source, /order-sheet-before-history-1/, `${name} 카카오 주문방법 화면 우선 표시 캐시 버전이 갱신되어야 합니다.`);
  assert.match(source, /restored-button-direct-touch-1/, `${name} 복원된 버튼 직접 터치 수정 캐시 버전이 갱신되어야 합니다.`);
  assert.match(source, /visible-return-rebind-1/, `${name} 카카오 보이는 상세 복귀 재연결 캐시 버전이 갱신되어야 합니다.`);
  assert.match(source, /restored-inline-fallback-1/, `${name} 카카오 복원 HTML 클릭 대체 경로 캐시 버전이 갱신되어야 합니다.`);
  assert.match(source, /visible-return-detail-rebuild-1/, `${name} 카카오 복원 상세 전체 재구성 캐시 버전이 갱신되어야 합니다.`);
}
assert.match(index, /real-second-tap-after-sheet-1/, '새 주문방법 화면의 정상 두 번째 터치 수정 캐시 버전이 갱신되어야 합니다.');

console.log('PASS 외부 주문앱 복귀 뒤 다른 주문방법 첫 터치 회귀검사');
