import assert from 'node:assert/strict';
import fs from 'node:fs';

const rc2 = fs.readFileSync(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const finalExperience = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(rc2, /const RC2_FOCUS_ONLY_RETURN_DELAY_MS = \d+;/,
  '카카오가 주문앱 출발 중 focus를 튕겨도 복귀로 오인하지 않는 최소 대기시간이 필요합니다.');
assert.match(rc2, /let rc2ExternalDepartureBlurred = false;/);
assert.match(rc2, /let rc2ExternalDepartureHidden = false;/);
assert.match(rc2, /function rc2ResetExternalDepartureLifecycle\(\)[\s\S]*?rc2ExternalDepartureBlurred = false;[\s\S]*?rc2ExternalDepartureHidden = false;/,
  '주문앱을 새로 열 때마다 이전 출발 수명주기 신호를 비워야 합니다.');
assert.match(rc2, /function rc2WriteReturnState\(key, value\) \{[\s\S]*?rc2ResetExternalDepartureLifecycle\(\);/,
  '복귀 상태 저장과 출발 수명주기 초기화는 하나의 동작이어야 합니다.');

assert.match(rc2, /function rc2RestoreAfterConfirmedResume\([\s\S]*?rc2ExternalDepartureHidden[\s\S]*?rc2ExternalDepartureBlurred[\s\S]*?RC2_FOCUS_ONLY_RETURN_DELAY_MS[\s\S]*?rc2RestoreExternalSurface/,
  '실제 hidden→visible 또는 충분히 지난 blur→focus 뒤에만 저장 상태를 소비해야 합니다.');
assert.match(rc2, /window\.addEventListener\('blur',[\s\S]*?rc2ExternalDepartureBlurred = true;/,
  'focus 단독 복귀를 판단하려면 주문앱 출발 뒤 blur를 먼저 확인해야 합니다.');
assert.match(rc2, /visibilitychange[\s\S]*?if \(document\.hidden\) \{[\s\S]*?rc2ExternalDepartureHidden = true;[\s\S]*?return;/,
  '백그라운드 진입은 복원이 아니라 출발 확인으로 기록해야 합니다.');
assert.match(rc2, /window\.addEventListener\('pagehide',[\s\S]*?rc2ExternalDepartureHidden = true;/,
  'visibilitychange를 생략하는 Android WebView도 pagehide로 출발을 확인해야 합니다.');
assert.match(rc2, /window\.addEventListener\('focus', \(\) => rc2RestoreAfterConfirmedResume/,
  'focus는 확인 절차를 거친 뒤에만 복원을 시도해야 합니다.');
assert.doesNotMatch(rc2, /window\.addEventListener\('focus', restoreAfterNativeResume\)/,
  '모든 focus를 즉시 복귀로 처리하면 주문앱 출발 중 저장 상태가 삭제됩니다.');

assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*order-app-confirmed-resume-1/,
  '수정된 복귀 제어 코드가 카카오 캐시에 남지 않도록 RC2 버전을 갱신해야 합니다.');
assert.match(html, /final-experience\.js\?v=[^"\n]*order-app-confirmed-resume-1/,
  '수정된 로더가 카카오 캐시에 남지 않도록 최종 경험 스크립트 버전을 갱신해야 합니다.');

console.log('PASS 주문앱 출발 중 가짜 focus는 무시하고 실제 복귀만 복원');
