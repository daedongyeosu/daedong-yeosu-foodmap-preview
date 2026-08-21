import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const app = read('./app.js');
const finalExperience = read('./final-experience.js');
const html = read('./index.html');
const rc2 = read('./rc2-fixes.js');
const rc3 = read('./rc3-fixes.js');
const rc3Css = read('./rc3-fixes.css');
const browserCheck = read('./scripts/browser-other-order-method-touch.mjs');
const previewWorkflow = read('./.github/workflows/preview-api-client-checks.yml');

const rc3Trigger = rc3.match(/<button class="([^"]*rc3-order-methods-trigger[^"]*)"[^>]*data-rc3-other-methods=/);
assert(rc3Trigger, '새 다른 주문방법 버튼을 찾을 수 없습니다.');
assert(!rc3Trigger[1].split(/\s+/).includes('store-other-toggle'), '새 버튼이 구형 팝업 처리기와 다시 충돌합니다.');

assert.match(rc3, /function rc3BindOrderMethodsTrigger\(detail\)/, '버튼의 위임 터치 경로 표식이 없습니다.');
assert.match(rc3, /function rc3ActivateOrderMethodsTrigger\(trigger, event\)/, '버튼 활성화 경로가 한곳으로 통합되지 않았습니다.');
assert.match(rc3, /document\.addEventListener\('pointerdown', rc3OnOrderMethodsPointerDown, true\)/, 'HTML 복원 뒤에도 살아 있는 document pointerdown 경로가 없습니다.');
assert.match(rc3, /document\.addEventListener\('pointerup', rc3OnOrderMethodsPointerUp, true\)/, 'HTML 복원 뒤에도 살아 있는 document pointerup 경로가 없습니다.');
assert.match(rc3, /document\.addEventListener\('touchstart', rc3OnOrderMethodsTouchStart, \{capture: true, passive: true\}\)/, '삼성 인앱 브라우저용 document touchstart 대체 경로가 없습니다.');
assert.match(rc3, /document\.addEventListener\('touchend', rc3OnOrderMethodsTouchEnd, \{capture: true, passive: false\}\)/, 'pointer 복귀 실패 시 동작할 document touchend 대체 경로가 없습니다.');
assert.match(rc3, /document\.elementFromPoint\(touch\.clientX, touch\.clientY\)/, '복귀 뒤 실제 최상단 터치 대상을 다시 확인하지 않습니다.');
assert.match(rc3, /function rc3MarkOrderMethodsActivation\(storeId\)[\s\S]*?Date\.now\(\) \+ 800/, '터치 직후 새 모달의 주문앱으로 새는 ghost click 차단 시간이 없습니다.');
assert.match(rc3, /function rc3OrderMethodsGhostActive\(storeId\)[\s\S]*?rc3OrderMethodsGhostClickStoreId/, 'ghost click이 해당 주문방법 버튼에서만 차단되지 않습니다.');
assert.match(rc3, /Math\.hypot\([\s\S]*?\) > 10\) state\.moved = true;/, '스크롤 중 잘못 열리는 것을 막는 터치 이동 판정이 없습니다.');
assert.match(rc3, /const other = event\.target\.closest\('\[data-rc3-other-methods\]'\);[\s\S]*?rc3ActivateOrderMethodsTrigger\(other, event\)/, '클릭·키보드 보조 경로가 해당 가게 주문방법을 열지 않습니다.');
assert.match(rc3, /window\.addEventListener\('pageshow', rc3ResetOrderMethodsTouchState, true\)/, '외부 주문앱에서 복귀할 때 남은 터치 상태를 초기화하지 않습니다.');
assert.match(rc3, /trigger\.removeAttribute\('data-rc3-direct-bound'\)/, 'HTML 스냅샷에 남은 과거 직접 바인딩 표식을 제거하지 않습니다.');
assert.doesNotMatch(rc3, /trigger\.addEventListener\('pointer(?:down|move|up|cancel)'/, 'HTML 복원 시 사라지는 노드 직접 포인터 리스너가 다시 생겼습니다.');
assert.match(rc3, /orderAnchor\?\.insertAdjacentHTML[\s\S]*?rc3BindOrderMethodsTrigger\(detail\);/, '가게 상세를 그린 뒤 위임 터치 표식이 연결되지 않습니다.');

assert.match(rc2, /rc2ModalStack\.some\(snapshot => snapshot\?\.html\?\.includes\('class="store-detail"'\)\)/, '여러 겹 주문 모달에서도 원래 가게 상세 복귀 경로를 찾지 못합니다.');
assert.match(rc2, /if \(comparedExternal && hasStoreDetailInModalFlow\)[\s\S]*?event\.stopImmediatePropagation\(\)[\s\S]*?rc2RememberExternalReturn\(comparedExternal, \{prepareStoreSurface: true\}\)/, '외부 주문앱 이동 전에 같은 가게 복귀 상태를 저장하고 화면을 안정화해야 합니다.');
assert.doesNotMatch(rc2.match(/if \(comparedExternal && hasStoreDetailInModalFlow\)[\s\S]*?const externalLink =/)?.[0] || '', /window\.location\.assign\(href\)/, '카카오 원본 Preview 화면을 같은 탭 이동으로 파괴하면 안 됩니다.');

assert.match(rc3Css, /\.rc3-order-methods-trigger\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s*!important;[\s\S]*?pointer-events:\s*auto\s*!important;[\s\S]*?touch-action:\s*manipulation;/, '다른 주문방법 버튼의 두 칸 가로 배치와 전체 터치 영역이 고정되지 않았습니다.');
assert.match(rc3Css, /\.rc3-order-methods-trigger\s*>\s*span:first-child\s*\{[\s\S]*?white-space:\s*nowrap;[\s\S]*?word-break:\s*keep-all;/, '다른 주문방법 문구의 한 줄 표시가 고정되지 않았습니다.');
assert.match(rc3Css, /\.rc3-order-methods-trigger\s*>\s*\*\s*\{[\s\S]*?pointer-events:\s*none\s*!important;/, '글자나 화살표 대신 버튼 전체가 터치를 받도록 고정되지 않았습니다.');

assert.match(browserCheck, /isMobile:\s*true/, '모바일 브라우저 조건 검사가 없습니다.');
assert.match(browserCheck, /hasTouch:\s*true/, '실제 터치 입력 조건 검사가 없습니다.');
assert.match(browserCheck, /본스치킨 미평점/, '본스치킨 회귀 검사가 없습니다.');
assert.match(browserCheck, /손수김밥 양지점/, '손수김밥 회귀 검사가 없습니다.');
assert.match(browserCheck, /trigger\.tap\(\)/, '버튼을 마우스 클릭이 아닌 실제 터치로 검사하지 않습니다.');
assert.match(browserCheck, /SM-S938N[\s\S]*KAKAOTALK/, '실제 신고 기종과 카카오 인앱 브라우저 조건이 없습니다.');
assert.match(browserCheck, /context\.waitForEvent\('page'[\s\S]*externalLink\.tap\(\)[\s\S]*externalPage\.close\(\)[\s\S]*page\.bringToFront\(\)/, '외부 주문앱을 별도 화면으로 열고 원본 Preview로 복귀하는 검사가 없습니다.');
assert.match(browserCheck, /document\.dispatchEvent\(new Event\('visibilitychange'\)\)[\s\S]*window\.dispatchEvent\(new Event\('focus'\)\)/, '카카오 네이티브 숨김·복귀 수명주기 검사가 없습니다.');
assert.match(browserCheck, /returnedTrigger\.tap\(\)[\s\S]*외부 주문앱 복귀 뒤 두 번째 터치로 다시 열림/, '외부 앱 복귀 뒤 다른 주문방법을 다시 터치하는 검사가 없습니다.');
assert.match(browserCheck, /document\.elementFromPoint/, '복귀 뒤 투명 가림막이 버튼을 덮는지 검사하지 않습니다.');
assert.match(browserCheck, /window\.daedongCatalogReady && typeof window\.daedongCatalogReady\.then === 'function'[\s\S]*page\.evaluate\(\(\) => window\.daedongCatalogReady\)/,
  '카탈로그 준비 Promise가 생기기 전에 검색을 시작하면 안 됩니다.');
assert.match(browserCheck, /order-methods-sheet[\s\S]*polling: 25, timeout: 3000/,
  '첫 터치 뒤 선택창 렌더링을 실제 DOM 상태로 확인해야 합니다.');
assert.match(browserCheck, /console\.log\(JSON\.stringify\(report, null, 2\)\)/,
  '브라우저 실패 원인은 CI 로그에서 바로 확인할 수 있어야 합니다.');
assert.match(previewWorkflow, /node scripts\/browser-other-order-method-touch\.mjs/, 'PR에서 주문방법 모바일 터치 검사를 실행하지 않습니다.');

assert.match(app, /const menu = toggle\.closest\('\.store-other-wrap'\)\?\.querySelector\('\.store-other-popover'\); if \(!menu\) return;/, '구형 팝업이 없는 버튼을 눌렀을 때의 안전장치가 없습니다.');
assert.match(html, /app\.js\?v=[^"\n]*other-order-method-touch-1/, 'app.js 캐시 갱신 표식이 없습니다.');
assert.match(html, /final-experience\.js\?v=[^"\n]*order-methods-return-touch-5/, 'final-experience.js 캐시 갱신 표식이 없습니다.');
assert.match(finalExperience, /rc3-fixes\.css\?v=[^'\n]*order-methods-return-touch-5/, 'rc3-fixes.css 캐시 갱신 표식이 없습니다.');
assert.match(finalExperience, /rc3-fixes\.js\?v=[^'\n]*order-methods-return-touch-5/, 'rc3-fixes.js 캐시 갱신 표식이 없습니다.');

console.log('other-order-method-touch-regression: PASS');

