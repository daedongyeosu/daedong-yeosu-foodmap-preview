import assert from 'node:assert/strict';
import fs from 'node:fs';

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
assert.match(rc2, /rc2RestoreAfterExternalPage\(\{rebuildExisting = false\} = \{\}\)/, '복귀 시 이미 보이는 상세창도 선택적으로 재구성할 수 있어야 합니다.');
assert.match(rc2, /visibleStoreMatches && !rebuildExisting/, '일반 복원과 카카오 네이티브 복귀 재구성을 구분해야 합니다.');
assert.match(rc2, /window\.daedongResetOrderMethodsTouchState\?\.\(\);[\s\S]*?rc2NativeHardClose\([\s\S]*?await new Promise\(resolve => requestAnimationFrame/, '카카오 복귀 시 터치 상태를 비우고 기존 모달을 완전히 닫은 다음 새 화면을 열어야 합니다.');
assert.match(rc2, /window\.addEventListener\('focus', restoreAfterNativeResume\)/, '카카오 외부 앱에서 돌아올 때 focus만 발생하는 경우도 복원해야 합니다.');
const externalBranch = rc2.slice(rc2.indexOf('if (comparedExternal && hasStoreDetailInModalFlow)'), rc2.indexOf('const externalLink', rc2.indexOf('if (comparedExternal && hasStoreDetailInModalFlow)')));
assert.doesNotMatch(externalBranch, /preventDefault\(\)[\s\S]*window\.location\.assign/, '카카오 WebView 원본 화면을 같은 탭 이동으로 파괴하면 안 됩니다.');
assert.match(browserCheck, /document\.dispatchEvent\(new Event\('visibilitychange'\)\)/, '브라우저 회귀검사는 카카오 네이티브 숨김→복귀 수명주기를 재현해야 합니다.');
assert.match(browserCheck, /window\.dispatchEvent\(new Event\('focus'\)\)/, '브라우저 회귀검사는 focus만 오는 복귀도 재현해야 합니다.');
assert.match(rc3, /document\.visibilityState === 'visible'/, '앱 복귀로 화면이 다시 보일 때 터치 상태를 초기화해야 합니다.');
assert.match(rc3, /trigger\.removeAttribute\('data-rc3-direct-bound'\)/, 'HTML 스냅샷에 남은 과거 직접 바인딩 표식을 제거해야 합니다.');
assert.doesNotMatch(rc3, /trigger\.addEventListener\('pointer(?:down|up|move|cancel)'/, 'HTML 복원 시 사라지는 노드 전용 포인터 리스너를 다시 사용하면 안 됩니다.');

const clickGuardIndex = rc3.indexOf("const other = event.target.closest('[data-rc3-other-methods]')");
const globalClickHandlerIndex = rc3.indexOf('function rc3HandleClick(event)');
assert.ok(clickGuardIndex > globalClickHandlerIndex, '중복 클릭 차단은 주문방법 버튼 분기 안에 있어야 합니다.');
assert.ok(
  rc3.indexOf('rc3OrderMethodsGhostActive(storeId)', clickGuardIndex) > clickGuardIndex,
  '터치 뒤 합성 클릭은 동일 가게의 주문방법 버튼에서만 차단해야 합니다.'
);

for (const [name, source] of [['final-experience.js', finalExperience], ['index.html', index]]) {
  assert.match(source, /order-methods-return-touch-5/, `${name} 캐시 버전이 갱신되어야 합니다.`);
  assert.doesNotMatch(source, /order-methods-return-touch-3/, `${name}에 이전 캐시 버전이 남으면 안 됩니다.`);
  assert.doesNotMatch(source, /order-methods-mobile-touch-2/, `${name}에 더 오래된 캐시 버전이 남으면 안 됩니다.`);
}

console.log('PASS 외부 주문앱 복귀 후 다른 주문방법 보기 재터치 회귀검사');
