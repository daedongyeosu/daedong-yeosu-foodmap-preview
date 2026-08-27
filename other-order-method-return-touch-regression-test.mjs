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
assert.match(rc3, /function rc3ResetOrderMethodsTouchState\(\) \{[\s\S]*?rc3ExternalRouteActivationUntil = 0;[\s\S]*?rc3ExternalRouteActivationKey = ''/, '복귀 시 이전 주문앱 선택의 중복 방지 시간도 초기화해야 합니다.');
assert.match(finalExperience, /selector:'\[data-rc3-other-methods\]'[\s\S]*?window\.daedongActivateOrderMethodsFallback/, '공용 터치와 버튼 직접 터치가 같은 중복 방지 경로를 사용해 동일 주문방법 화면을 두 번 쌓지 않아야 합니다.');
assert.match(app, /function handleKakaoOrderLinkClick\(event\)[\s\S]*?link\?\.matches\('a\[data-community-original\]\[target="_blank"\]'\)\) return/, '카카오 전용 같은 탭 처리기는 비교화면 주문앱 링크를 가로채면 안 됩니다.');
assert.match(app, /function handleMobileOrderLinkClick\(event\)[\s\S]*?link\?\.matches\('a\[data-community-original\]\[target="_blank"\]'\)\) return/, '모바일 공통 같은 탭 처리기는 비교화면 주문앱 링크를 가로채면 안 됩니다.');
const visibleStoreBranch = rc2.slice(rc2.indexOf('if (visibleStoreMatches)'), rc2.indexOf('if (!modal?.hidden)', rc2.indexOf('if (visibleStoreMatches)')));
assert.match(visibleStoreBranch, /daedongResetOrderMethodsTouchState\?\.\(\);[\s\S]*?daedongRebindOrderMethodsTrigger\?\.\(\);[\s\S]*?rc2StabilizeReturnPosition\(saved/, '복귀 시 출발 전에 준비한 같은 상세 DOM의 터치 상태와 연결만 복원해야 합니다.');
assert.doesNotMatch(visibleStoreBranch, /rc2NativeHardClose|openStore\(|location\.replace|rc2NavigateReturnedDocumentOnce|rc2ReturnRebuiltToken/, '이미 보이는 가게 상세를 닫거나 재구성하거나 새 문서로 이동하면 실기기 두 번째 터치가 다시 끊깁니다.');
assert.match(rc2, /const opened = await openStore\(store\);[\s\S]*?restoredStoreId[\s\S]*?daedongRebindOrderMethodsTrigger\?\.\(\);[\s\S]*?rc2StabilizeReturnPosition\(saved\)/, '가게 상세를 새로 연 복귀 경로도 위치를 고정하기 전에 주문방법 버튼을 다시 연결해야 합니다.');
assert.match(rc2, /prepareStoreSurface && storeSnapshot && storeSnapshot !== current[\s\S]*?rc2ModalStack\.length = 0;[\s\S]*?rc2RestoreSnapshot\(storeSnapshot\)/, '외부 주문앱을 열기 전에 원본 Preview를 가게 상세 화면으로 안정화해야 합니다.');
assert.match(rc2, /const prepareStoreSurface = Boolean\(sourceElement\?\.matches\?\.\([\s\S]*?data-community-original[\s\S]*?data-rc3-external-route[\s\S]*?data-rc3-single-external/, '주문앱 항목을 한 번 눌러 바로 출발하는 경우에도 상세 화면을 안정화해야 합니다.');
assert.match(rc2, /window\.addEventListener\('focus', \(\) => rc2RestoreAfterConfirmedResume/, '카카오 외부 앱에서 돌아올 때 focus만 발생하는 경우도 출발 확인 뒤 복원해야 합니다.');
const externalBranch = rc2.slice(rc2.indexOf('if (comparedExternal)'), rc2.indexOf('const externalLink', rc2.indexOf('if (comparedExternal)')));
assert.doesNotMatch(externalBranch, /preventDefault\(\)[\s\S]*window\.location\.assign/, '카카오 WebView 원본 화면을 같은 탭 이동으로 파괴하면 안 됩니다.');
assert.match(externalBranch, /event\.preventDefault\(\)[\s\S]*?rc2RememberExternalReturn\(comparedExternal\)[\s\S]*?rc2LaunchComparedExternal\(comparedExternal, href\)/, '원본 Preview를 가게 상세로 안정화한 뒤 주문앱별 복귀 방식으로 열어야 합니다.');
assert.match(rc2, /function rc2LaunchComparedExternal\(link, href\) \{[\s\S]*?window\.open\(href, '_blank', 'noopener'\)[\s\S]*?return true/, '비교화면 주문앱은 원본 Preview 상세 DOM을 보존하는 별도 실행 경로를 사용해야 합니다.');
const comparedLauncher = rc2.match(/function rc2LaunchComparedExternal\(link, href\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(comparedLauncher, /routeKey === 'yogiyo'[\s\S]*?androidBrowser[\s\S]*?daedongDataApi\.yogiyoWebRoute[\s\S]*?rc2SubmitYogiyoBrowserNavigation\(yogiyoUrl\)/, 'Android 요기요는 카카오·삼성 인터넷 모두 같은 브라우저 방문기록의 웹 가게 상세로 이동해야 합니다.');
assert.match(rc2, /function rc2SubmitYogiyoBrowserNavigation[\s\S]*?form\.method = 'get'[\s\S]*?form\.target = '_self'[\s\S]*?form\.submit\(\)/, 'S25에서 요기요 네이티브 앱 호출을 피하는 브라우저 GET 폼 이동이 필요합니다.');
assert.doesNotMatch(comparedLauncher, /window\.location\.assign/, '요기요 HTTPS 주소를 스크립트로 직접 이동하면 S25가 네이티브 앱을 다시 실행합니다.');
assert.doesNotMatch(comparedLauncher, /daedongLaunchYogiyoFromCurrentKakao/, '요기요 네이티브 앱 작업으로 넘기면 삼성 홈으로 끊길 수 있습니다.');
assert.match(browserCheck, /document\.dispatchEvent\(new Event\('visibilitychange'\)\)/, '브라우저 회귀검사는 카카오 네이티브 숨김→복귀 수명주기를 재현해야 합니다.');
assert.match(browserCheck, /window\.dispatchEvent\(new Event\('focus'\)\)/, '브라우저 회귀검사는 focus만 오는 복귀도 재현해야 합니다.');
assert.match(browserCheck, /data-rc3-external-route="baemin"/, '별도 화면 복귀 검사는 요기요가 아닌 배달의민족 경로를 사용해야 합니다.');
assert.match(browserCheck, /context\.waitForEvent\('page'[\s\S]*dataset\.testPreparedBeforeReturn = '1'[\s\S]*externalPage\.close\(\)[\s\S]*dataset\.testPreparedBeforeReturn === '1'[\s\S]*준비된 상세 DOM을 그대로 유지/, '별도 주문앱 화면을 닫고 돌아왔을 때 같은 상세 DOM을 보존하는 실제 브라우저 검사가 없습니다.');
assert.match(browserCheck, /외부 주문앱 복귀 뒤 주문앱 목록 열린 상태 유지[\s\S]*data-rc3-external-route="coupang"[\s\S]*목록을 다시 열지 않고 다른 주문앱 곧바로 실행/, '복귀 뒤 목록을 그대로 유지하고 다른 주문앱을 즉시 선택하는 검사가 필요합니다.');
assert.match(rc2, /document\.addEventListener\('pointerup', rc2ScheduleRestoredReturnSettlement, true\)/, '복귀 상태는 첫 손가락 누름이 아니라 활성화가 끝난 뒤 정리해야 합니다.');
assert.doesNotMatch(rc2, /document\.addEventListener\('pointerdown', rc2SettleRestoredReturnLease/, '첫 pointerdown에서 history를 바꾸면 카카오 WebView가 버튼 클릭을 취소할 수 있습니다.');
assert.match(rc3, /document\.visibilityState === 'visible'/, '앱 복귀로 화면이 다시 보일 때 터치 상태를 초기화해야 합니다.');
assert.match(rc3, /if \(trigger\.__rc3DirectOrderMethodsBound\) return/, '직접 바인딩 여부는 HTML 스냅샷에 직렬화되지 않는 DOM 속성으로 판단해야 합니다.');
assert.match(rc3, /trigger\.addEventListener\('pointerdown'[\s\S]*?trigger\.addEventListener\('pointerup'/, '복귀한 카카오 WebView가 문서 위임을 놓쳐도 버튼 자체가 포인터 탭을 처리해야 합니다.');
assert.match(rc3, /trigger\.addEventListener\('touchstart'[\s\S]*?trigger\.addEventListener\('touchend'/, '복귀한 Android WebView에서 버튼 자체의 원시 터치 완료를 처리해야 합니다.');
assert.match(rc3, /window\.daedongRebindOrderMethodsTrigger = \(\) => \{[\s\S]*?rc3BindOrderMethodsTrigger/, '스냅샷 복원 직후 직접 터치를 다시 연결하는 공개 훅이 필요합니다.');
assert.match(rc2, /function rc2RestoreSnapshot\(snapshot\) \{[\s\S]*?rc2ScrubCustomerCounts\(modal\);[\s\S]*?daedongRebindOrderMethodsTrigger\?\.\(\)/, '외부 앱 출발 전에 DOM 스냅샷을 다시 만들면 주문방법 버튼 이벤트도 즉시 다시 연결해야 합니다.');
assert.match(rc2, /function rc2RestoreSnapshotAfterNativeSurfaceReset\(snapshot\) \{[\s\S]*?daedong-external-return-pending[\s\S]*?rc2NativeHardClose\(\{fromPop: true\}\)[\s\S]*?requestAnimationFrame\(\(\) => requestAnimationFrame\(\(\) => \{[\s\S]*?rc2RestoreSnapshot\(snapshot\)/, '주문방법 화면에서 상세로 재진입할 때 카카오의 오래된 모달 터치 표면을 두 프레임 완전히 내려야 합니다.');
assert.match(rc2, /function rc2NavigateOrderMethodReentry\(snapshot\) \{[\s\S]*?sessionStorage\.setItem\(RC2_ORDER_METHOD_REENTRY[\s\S]*?RC2_ORDER_METHOD_REENTRY_PARAM[\s\S]*?location\.replace\(/, '실제 손가락 경로에서는 주문방법 상세 재진입을 새 문서로 교체해 카카오의 죽은 네이티브 터치 표면을 폐기해야 합니다.');
assert.match(rc2, /if \(options\.fromPop && rc2ModalStack\.length\) \{[\s\S]*?order-methods-sheet[\s\S]*?rc2NavigateOrderMethodReentry\(snapshot\)[\s\S]*?rc2RestoreSnapshotAfterNativeSurfaceReset\(snapshot\)/, '주문방법 화면을 닫는 경로는 문서 재생성을 우선하고 실패할 때만 기존 표면 복원을 사용해야 합니다.');
assert.match(index, /orderMethodReentryKey = 'daedongOrderMethodReentryV1'[\s\S]*?daedongPendingOrderMethodReentry[\s\S]*?daedong-external-return-pending/, '새 문서는 가게 상세가 준비될 때까지 홈 대신 복귀 보호화면을 유지해야 합니다.');
assert.doesNotMatch(index, /daedong-external-return-pending body>\*\{visibility:hidden/, '복귀 보호화면 뒤의 실제 상세 DOM을 숨기면 삼성 카카오가 버튼 히트테스트를 만들지 않습니다.');
assert.match(index, /daedong-external-return-pending body::before,[\s\S]*?pointer-events:none/, '복귀 보호화면은 실제 상세를 숨기지 않고 비대화형 불투명 커버로만 가려야 합니다.');
assert.match(finalExperience, /function fxPrepareOrderMethodReentryUrl\(saved\)[\s\S]*?searchParams\.delete\(FX_ORDER_METHOD_REENTRY_PARAM\)[\s\S]*?history\.replaceState/, '일회용 재진입 URL 표식은 상세 모달을 만들기 전에 제거해야 합니다.');
assert.match(finalExperience, /function fxOpenSharedStoreFromUrl\(\)[\s\S]*?fxPrepareOrderMethodReentryUrl\(orderMethodReentry\)[\s\S]*?openStore\(store\)/, '삼성 카카오 히트테스트를 보존하려면 URL 정리가 openStore보다 먼저 실행되어야 합니다.');
assert.match(finalExperience, /function fxFinishOrderMethodReentry\(saved[\s\S]*?sessionStorage\.removeItem\(FX_ORDER_METHOD_REENTRY\)[\s\S]*?requestAnimationFrame\(\(\)=>requestAnimationFrame\([\s\S]*?daedongFinishExternalReturnBoot/, '새 상세가 두 프레임 그려진 뒤 복귀 보호화면을 해제해야 합니다.');
const finishOrderReentry = finalExperience.match(/function fxFinishOrderMethodReentry\(saved[\s\S]*?\n\}/)?.[0] || '';
assert.doesNotMatch(finishOrderReentry, /history\.replaceState/, '상세 모달을 만든 뒤 history를 바꾸면 실제 버튼 표면이 다시 죽을 수 있습니다.');
assert.match(browserCheck, /inlineDocumentStartedAt[\s\S]*?data-rc3-order-methods-close[\s\S]*?timeOrigin === inlineDocumentStartedAt[\s\S]*?url === inlineDocumentUrl[\s\S]*?인라인 닫기 뒤 두 번째 터치로 다른 주문방법 선택창 다시 열림/, '실제 브라우저 검사는 닫기와 두 번째 터치 사이에 문서·URL이 그대로인지 확인해야 합니다.');
assert.match(rc3, /function rc3ActivateOrderMethodsTrigger\(trigger, event\) \{[\s\S]*?if \(singleExternalKey\)[\s\S]*?else \{[\s\S]*?rc3OpenOrderMethods\(store, trigger\)/, '여러 주문방법 보기는 외부 복귀·히스토리 처리 없이 같은 상세의 인라인 영역만 열어야 합니다.');
const inlineOrderMethods = rc3.match(/function rc3OpenOrderMethods\(store, trigger\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.doesNotMatch(inlineOrderMethods, /openModal|history\.|location\./, '두 번째 실손 터치를 위해 주문방법 열기/닫기에서 표면 교체를 완전히 제거해야 합니다.');

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
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*physical-order-reentry-document-1/, '실손 터치 재진입 문서 수정 rc2 캐시 버전이 갱신되어야 합니다.');
assert.match(index, /final-experience\.js\?v=[^"\n]*physical-order-reentry-document-1/, '실손 터치 재진입 문서 수정 로더 캐시 버전이 갱신되어야 합니다.');
assert.match(index, /final-experience\.js\?v=[^"\n]*physical-order-hit-surface-1/, '실손 히트테스트 표면 수정 로더 캐시 버전이 갱신되어야 합니다.');
assert.match(index, /final-experience\.js\?v=[^"\n]*inline-order-methods-1/, '인라인 주문방법 구조 변경 로더 캐시 버전이 갱신되어야 합니다.');
assert.match(index, /app\.js\?v=[^"\n]*stable-separated-order-return-1/, '별도 주문앱 복귀 app.js 캐시 버전이 갱신되어야 합니다.');
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*stable-separated-order-return-1/, '별도 주문앱 복귀 rc2 캐시 버전이 갱신되어야 합니다.');
assert.match(index, /final-experience\.js\?v=[^"\n]*stable-separated-order-return-2/, '별도 주문앱 복귀 로더 캐시 버전이 갱신되어야 합니다.');
assert.match(finalExperience, /rc3-fixes\.js\?v=[^'\n]*stable-separated-order-return-2/, '복귀 시 주문앱 선택 중복 방지 초기화 rc3 캐시 버전이 갱신되어야 합니다.');

for (const [name, source] of [['final-experience.js', finalExperience], ['index.html', index]]) {
  assert.match(source, /order-methods-return-touch-5/, `${name} 캐시 버전이 갱신되어야 합니다.`);
  assert.doesNotMatch(source, /order-methods-return-touch-3/, `${name}에 이전 캐시 버전이 남으면 안 됩니다.`);
  assert.doesNotMatch(source, /order-methods-mobile-touch-2/, `${name}에 더 오래된 캐시 버전이 남으면 안 됩니다.`);
}

console.log('PASS 외부 주문앱 복귀 후 다른 주문방법 보기 재터치 회귀검사');

