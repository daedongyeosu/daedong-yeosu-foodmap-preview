import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const rc2 = fs.readFileSync(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const rc3 = fs.readFileSync(new URL('./rc3-fixes.js', import.meta.url), 'utf8');
const browserCheck = fs.readFileSync(new URL('./scripts/browser-other-order-method-touch.mjs', import.meta.url), 'utf8');
const finalExperience = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(rc3, /const rc3OrderMethodsPointers = new Map\(\)/, '주문방법 포인터를 문서 단위로 추적해야 합니다.');
assert.match(rc3, /const rc3OrderMethodsTouches = new Map\(\)/, 'Android WebView의 원시 터치를 문서 단위로 추적해야 합니다.');
assert.match(rc3, /document\.addEventListener\('pointerdown', rc3OnOrderMethodsPointerDown, true\)/, '복원된 상세창에도 적용되는 위임 pointerdown이 필요합니다.');
assert.match(rc3, /document\.addEventListener\('pointerup', rc3OnOrderMethodsPointerUp, true\)/, '복원된 상세창에도 적용되는 위임 pointerup이 필요합니다.');
assert.match(rc3, /document\.addEventListener\('touchstart', rc3OnOrderMethodsTouchStart, \{capture: true, passive: true\}\)/, 'Android WebView 복귀 후에도 동작하는 위임 touchstart가 필요합니다.');
assert.match(rc3, /document\.addEventListener\('touchend', rc3OnOrderMethodsTouchEnd, \{capture: true, passive: false\}\)/, '합성 클릭이 사라져도 직접 활성화하는 위임 touchend가 필요합니다.');
assert.match(rc3, /document\.elementFromPoint\(touch\.clientX, touch\.clientY\)/, '복귀 뒤 실제 터치 지점의 최상단 버튼을 다시 확인해야 합니다.');
assert.match(rc3, /window\.addEventListener\('pageshow', rc3ResetOrderMethodsTouchState, true\)/, '외부 앱 복귀 시 남은 포인터·터치 상태를 초기화해야 합니다.');
assert.match(rc3, /window\.daedongResetOrderMethodsTouchState = rc3ResetOrderMethodsTouchState/, '카카오 네이티브 복귀 재구성 전에 터치 상태를 외부에서 초기화할 수 있어야 합니다.');
assert.match(finalExperience, /selector:'\[data-rc3-other-methods\]'[\s\S]*?window\.daedongActivateOrderMethodsFallback/, '공용 터치와 버튼 직접 터치가 같은 중복 방지 경로를 사용해 동일 주문방법 화면을 두 번 쌓지 않아야 합니다.');
assert.match(app, /function handleKakaoOrderLinkClick\(event\)[\s\S]*?rc2RememberExternalReturn\(link\)[\s\S]*?void window\.daedongLaunchMobileRoute\(key, href\)/, '카카오 전용 처리기는 비교화면의 주문 계속 링크도 복귀 상태를 저장한 뒤 앱 패키지 경로로 열어야 합니다.');
assert.match(app, /function handleMobileOrderLinkClick\(event\)[\s\S]*?rc2RememberExternalReturn\(link\)[\s\S]*?void window\.daedongLaunchMobileRoute\(mobileOrderRouteKey\(link\), href\)/, '모바일 공통 처리기는 비교화면의 주문 계속 링크도 복귀 상태를 저장한 뒤 앱 패키지 경로로 열어야 합니다.');
assert.match(rc2, /if \(visibleStoreMatches\) \{[\s\S]*?window\.daedongResetOrderMethodsTouchState\?\.\(\);[\s\S]*?rebuildExisting[\s\S]*?rc2NativeHardClose\(\{fromPop: true\}\)[\s\S]*?await openStore\(store\)[\s\S]*?rc2StabilizeReturnPosition\(saved, \$\('#modal \.modal-card'\)\)/, '복귀 시 같은 가게가 보여도 카카오의 오래된 네이티브 모달 표면을 내린 뒤 새 상세 DOM으로 교체해야 합니다.');
assert.match(rc2, /function rc2NavigateReturnedDocumentOnce\(saved\) \{[\s\S]*?RC2_RETURN_DOCUMENT_RELOAD[\s\S]*?daedong-external-return-pending[\s\S]*?RC2_RETURN_GUARD_PARAM[\s\S]*?location\.replace\(/, 'DOM 밖에 남은 카카오 WebView 터치 표면은 복귀 토큰 URL로 현재 문서를 교체해 갱신해야 합니다.');
assert.match(rc2, /documentReturnToken[\s\S]*?documentFreshForReturn[\s\S]*?rc2NavigateReturnedDocumentOnce\(saved\)/, '현재 문서가 해당 복귀 토큰으로 새로 만들어지지 않았을 때만 URL 이동해야 합니다.');
assert.match(index, /window\.daedongEntryExternalReturnToken = String\(pending\.saved\.returnToken \|\| ''\)/, '새 문서의 조기 복원 단계가 담당 복귀 토큰을 기록해야 합니다.');
const visibleStoreBranch = rc2.slice(rc2.indexOf('if (visibleStoreMatches)'), rc2.indexOf('if (!modal?.hidden)', rc2.indexOf('if (visibleStoreMatches)')));
assert.match(visibleStoreBranch, /daedong-external-return-pending[\s\S]*?rc2NativeHardClose\(\{fromPop: true\}\)[\s\S]*?requestAnimationFrame\(\(\) => requestAnimationFrame\(resolve\)\)[\s\S]*?rc2ReplaceNextModal = true[\s\S]*?await openStore\(store\)[\s\S]*?rc2ReturnRebuiltToken[\s\S]*?daedongRebindOrderMethodsTrigger\?\.\(\);[\s\S]*?rc2StabilizeReturnPosition\(saved/, '카카오 복귀 상세는 홈을 가리는 동안 네이티브 표면을 두 프레임 내린 뒤 같은 히스토리 엔트리에서 재구성해야 합니다.');
assert.match(rc2, /const opened = await openStore\(store\);[\s\S]*?restoredStoreId[\s\S]*?daedongRebindOrderMethodsTrigger\?\.\(\);[\s\S]*?rc2StabilizeReturnPosition\(saved\)/, '가게 상세를 새로 연 복귀 경로도 위치를 고정하기 전에 주문방법 버튼을 다시 연결해야 합니다.');
assert.match(rc2, /prepareStoreSurface && storeSnapshot && storeSnapshot !== current[\s\S]*?rc2ModalStack\.length = 0;[\s\S]*?rc2RestoreSnapshot\(storeSnapshot\)/, '외부 주문앱을 열기 전에 원본 Preview를 가게 상세 화면으로 안정화해야 합니다.');
assert.match(rc2, /const prepareStoreSurface = Boolean\(sourceElement\?\.matches\?\.\('a\[data-community-original\]'\)\)/, '다른 주문방법의 외부 주문앱 링크에서만 출발 전 상세 화면을 안정화해야 합니다.');
assert.match(rc2, /window\.addEventListener\('focus', \(\) => rc2RestoreAfterConfirmedResume/, '카카오 외부 앱에서 돌아올 때 focus만 발생하는 경우도 출발 확인 뒤 복원해야 합니다.');
const externalBranch = rc2.slice(rc2.indexOf('if (comparedExternal)'), rc2.indexOf('const externalLink', rc2.indexOf('if (comparedExternal)')));
assert.doesNotMatch(externalBranch, /preventDefault\(\)[\s\S]*window\.location\.assign/, '카카오 WebView 원본 화면을 같은 탭 이동으로 파괴하면 안 됩니다.');
assert.match(externalBranch, /event\.preventDefault\(\)[\s\S]*?rc2RememberExternalReturn\(comparedExternal\)[\s\S]*?rc2LaunchComparedExternal\(comparedExternal, href\)/, '원본 Preview를 가게 상세로 안정화한 뒤 주문앱별 복귀 방식으로 열어야 합니다.');
assert.match(rc2, /function rc2LaunchComparedExternal\(link, href\) \{[\s\S]*?window\.daedongLaunchMobileRoute[\s\S]*?\['mukkebi', 'ddangyo', 'yogiyo', 'coupang', 'baemin'\]\.includes\(key\)[\s\S]*?window\.open\(href, '_blank', 'noopener'\)/, '지원 주문앱은 Android 패키지 경로로 열고 알 수 없는 경로만 별도 화면으로 열어야 합니다.');
assert.match(browserCheck, /document\.dispatchEvent\(new Event\('visibilitychange'\)\)/, '브라우저 회귀검사는 카카오 네이티브 숨김→복귀 수명주기를 재현해야 합니다.');
assert.match(browserCheck, /window\.dispatchEvent\(new Event\('focus'\)\)/, '브라우저 회귀검사는 focus만 오는 복귀도 재현해야 합니다.');
assert.match(browserCheck, /data-rc3-external-route="baemin"/, '별도 화면 복귀 검사는 요기요가 아닌 배달의민족 경로를 사용해야 합니다.');
assert.match(browserCheck, /dataset\.testPreparedBeforeReturn = '1'[\s\S]*navigationType === 'navigate'[\s\S]*dataset\.testPreparedBeforeReturn !== '1'[\s\S]*오래된 상세 DOM이 새 문서 스냅샷으로 교체됨/, '출발 전 상세 DOM을 복귀 시 새 URL 문서와 터치 표면으로 교체하는 실제 브라우저 검사가 없습니다.');
assert.match(browserCheck, /pointerdown[\s\S]*returnStatePresent[\s\S]*pointerup[\s\S]*returnStatePresent/, '복귀 뒤 첫 재터치 도중 history 토큰을 그대로 유지하는 검사가 필요합니다.');
assert.match(rc2, /document\.addEventListener\('pointerup', rc2ScheduleRestoredReturnSettlement, true\)/, '복귀 상태는 첫 손가락 누름이 아니라 활성화가 끝난 뒤 정리해야 합니다.');
assert.doesNotMatch(rc2, /document\.addEventListener\('pointerdown', rc2SettleRestoredReturnLease/, '첫 pointerdown에서 history를 바꾸면 카카오 WebView가 버튼 클릭을 취소할 수 있습니다.');
assert.match(rc3, /document\.visibilityState === 'visible'/, '앱 복귀로 화면이 다시 보일 때 터치 상태를 초기화해야 합니다.');
assert.match(rc3, /if \(trigger\.__rc3DirectOrderMethodsBound\) return/, '직접 바인딩 여부는 HTML 스냅샷에 직렬화되지 않는 DOM 속성으로 판단해야 합니다.');
assert.match(rc3, /trigger\.addEventListener\('pointerdown'[\s\S]*?trigger\.addEventListener\('pointerup'/, '복귀한 카카오 WebView가 문서 위임을 놓쳐도 버튼 자체가 포인터 탭을 처리해야 합니다.');
assert.match(rc3, /trigger\.addEventListener\('touchstart'[\s\S]*?trigger\.addEventListener\('touchend'/, '복귀한 Android WebView에서 버튼 자체의 원시 터치 완료를 처리해야 합니다.');
assert.match(rc3, /window\.daedongRebindOrderMethodsTrigger = \(\) => \{[\s\S]*?rc3BindOrderMethodsTrigger/, '스냅샷 복원 직후 직접 터치를 다시 연결하는 공개 훅이 필요합니다.');
assert.match(rc2, /function rc2RestoreSnapshot\(snapshot\) \{[\s\S]*?rc2ScrubCustomerCounts\(modal\);[\s\S]*?daedongRebindOrderMethodsTrigger\?\.\(\)/, '외부 앱 출발 전에 DOM 스냅샷을 다시 만들면 주문방법 버튼 이벤트도 즉시 다시 연결해야 합니다.');
assert.match(rc2, /function rc2RestoreSnapshotAfterNativeSurfaceReset\(snapshot\) \{[\s\S]*?daedong-external-return-pending[\s\S]*?rc2NativeHardClose\(\{fromPop: true\}\)[\s\S]*?requestAnimationFrame\(\(\) => requestAnimationFrame\(\(\) => \{[\s\S]*?rc2RestoreSnapshot\(snapshot\)/, '주문방법 화면에서 상세로 재진입할 때 카카오의 오래된 모달 터치 표면을 두 프레임 완전히 내려야 합니다.');
assert.match(rc2, /if \(options\.fromPop && rc2ModalStack\.length\) \{[\s\S]*?rc2RestoreSnapshotAfterNativeSurfaceReset\(rc2ModalStack\.pop\(\)\)/, '히스토리 뒤로가기로 주문방법 화면을 닫는 경로는 네이티브 표면 재생성 복원을 사용해야 합니다.');
assert.match(browserCheck, /__snapshotSurfaceResetObserved[\s\S]*?window\.hardClose\(\{fromPop: true\}\)[\s\S]*?상세 재진입 뒤 첫 터치로 다른 주문방법 선택창 다시 열림/, '실제 브라우저 검사는 주문방법 화면을 닫고 상세로 다시 들어온 직후의 첫 터치를 포함해야 합니다.');
assert.match(rc3, /function rc3ActivateOrderMethodsTrigger\(trigger, event\) \{[\s\S]*?daedongInvalidatePendingReturnRestores\?\.\(\)[\s\S]*?rc3OpenOrderMethods\(store\)[\s\S]*?setTimeout\(\(\) => \{[\s\S]*?daedongConfirmIntentionalSurfaceNavigation\?\.\(\)[\s\S]*?daedongSettleRestoredReturnLeaseNow\?\.\(\)/, '실기기에서는 복귀 작업을 즉시 무효화하고 주문방법 창을 먼저 표시한 뒤 history를 정리해야 합니다.');

const clickGuardIndex = rc3.indexOf("const other = event.target.closest('[data-rc3-other-methods]')");
const globalClickHandlerIndex = rc3.indexOf('function rc3HandleClick(event)');
assert.ok(clickGuardIndex > globalClickHandlerIndex, '중복 클릭 차단은 주문방법 버튼 분기 안에 있어야 합니다.');
assert.ok(
  rc3.indexOf('rc3OrderMethodsGhostActive(storeId)', clickGuardIndex) > clickGuardIndex,
  '터치 뒤 합성 클릭은 동일 가게의 주문방법 버튼에서만 차단해야 합니다.'
);

assert.match(index, /app\.js\?v=[^"\n]*kakao-community-separate-context-1/, 'app.js 캐시 버전이 갱신되어야 합니다.');
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*order-methods-return-stable-dom-1/, 'rc2 복귀 수정 캐시 버전이 갱신되어야 합니다.');
assert.match(index, /final-experience\.js\?v=[^"\n]*order-methods-return-stable-dom-1/, '복귀 수정 로더 캐시 버전이 갱신되어야 합니다.');
assert.match(index, /final-experience\.js\?v=[^"\n]*return-first-tap-2/, '복귀 뒤 첫 터치 수정 로더 캐시 버전이 갱신되어야 합니다.');
assert.match(index, /final-experience\.js\?v=[^"\n]*return-intent-cancel-1/, '복귀 뒤 전체 생명주기 취소 로더 캐시 버전이 갱신되어야 합니다.');
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*return-document-reload-1/, '문서 재로드 수정 rc2 캐시 버전이 갱신되어야 합니다.');
assert.match(index, /final-experience\.js\?v=[^"\n]*return-document-reload-1/, '문서 재로드 수정 로더 캐시 버전이 갱신되어야 합니다.');
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*return-document-navigation-1/, '강제 문서 이동 수정 rc2 캐시 버전이 갱신되어야 합니다.');
assert.match(index, /final-experience\.js\?v=[^"\n]*return-document-navigation-1/, '강제 문서 이동 수정 로더 캐시 버전이 갱신되어야 합니다.');
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*reentered-order-method-surface-1/, '상세 재진입 터치 표면 수정 rc2 캐시 버전이 갱신되어야 합니다.');
assert.match(index, /final-experience\.js\?v=[^"\n]*reentered-order-method-surface-1/, '상세 재진입 터치 표면 수정 로더 캐시 버전이 갱신되어야 합니다.');

for (const [name, source] of [['final-experience.js', finalExperience], ['index.html', index]]) {
  assert.match(source, /order-methods-return-touch-5/, `${name} 캐시 버전이 갱신되어야 합니다.`);
  assert.doesNotMatch(source, /order-methods-return-touch-3/, `${name}에 이전 캐시 버전이 남으면 안 됩니다.`);
  assert.doesNotMatch(source, /order-methods-mobile-touch-2/, `${name}에 더 오래된 캐시 버전이 남으면 안 됩니다.`);
}

console.log('PASS 외부 주문앱 복귀 후 다른 주문방법 보기 재터치 회귀검사');

