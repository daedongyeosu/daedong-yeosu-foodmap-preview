import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const app = read('./app.js');
const finalExperience = read('./final-experience.js');
const html = read('./index.html');
const rc3 = read('./rc3-fixes.js');
const rc3Css = read('./rc3-fixes.css');
const browserCheck = read('./scripts/browser-other-order-method-touch.mjs');
const previewWorkflow = read('./.github/workflows/preview-api-client-checks.yml');

const rc3Trigger = rc3.match(/<button class="([^"]*rc3-order-methods-trigger[^"]*)"[^>]*data-rc3-other-methods=/);
assert(rc3Trigger, '새 다른 주문방법 버튼을 찾을 수 없습니다.');
assert(!rc3Trigger[1].split(/\s+/).includes('store-other-toggle'), '새 버튼이 구형 팝업 처리기와 다시 충돌합니다.');

assert.match(rc3, /function rc3BindOrderMethodsTrigger\(detail\)/, '버튼 자체의 직접 동작 보조 경로가 없습니다.');
assert.match(rc3, /function rc3ActivateOrderMethodsTrigger\(trigger, event\)/, '버튼 활성화 경로가 한곳으로 통합되지 않았습니다.');
assert.match(rc3, /trigger\.addEventListener\('pointerup',[\s\S]*?rc3ActivateOrderMethodsTrigger\(trigger, event\)/, '휴대폰 터치 종료 시 주문방법을 여는 보조 경로가 없습니다.');
assert.match(rc3, /rc3OrderMethodsGhostClickUntil = Date\.now\(\) \+ 800/, '터치 직후 새 모달의 주문앱으로 새는 ghost click 차단 시간이 없습니다.');
assert.match(rc3, /Date\.now\(\) < rc3OrderMethodsGhostClickUntil[\s\S]*?stopImmediatePropagation/, 'ghost click이 document capture 단계에서 차단되지 않습니다.');
assert.match(rc3, /Math\.hypot\([\s\S]*?\) > 10\) touchPointer\.moved = true;/, '스크롤 중 잘못 열리는 것을 막는 터치 이동 판정이 없습니다.');
assert.match(rc3, /trigger\.addEventListener\('click',[\s\S]*?rc3ActivateOrderMethodsTrigger\(trigger, event\)/, '클릭·키보드 보조 경로가 해당 가게 주문방법을 열지 않습니다.');
assert.match(rc3, /orderAnchor\?\.insertAdjacentHTML[\s\S]*?rc3BindOrderMethodsTrigger\(detail\);/, '가게 상세를 그린 뒤 직접 동작 보조 경로가 연결되지 않습니다.');

assert.match(rc3Css, /\.rc3-order-methods-trigger\s*\{[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto\s*!important;[\s\S]*?pointer-events:\s*auto\s*!important;[\s\S]*?touch-action:\s*manipulation;/, '다른 주문방법 버튼의 두 칸 가로 배치와 전체 터치 영역이 고정되지 않았습니다.');
assert.match(rc3Css, /\.rc3-order-methods-trigger\s*>\s*span:first-child\s*\{[\s\S]*?white-space:\s*nowrap;[\s\S]*?word-break:\s*keep-all;/, '다른 주문방법 문구의 한 줄 표시가 고정되지 않았습니다.');
assert.match(rc3Css, /\.rc3-order-methods-trigger\s*>\s*\*\s*\{[\s\S]*?pointer-events:\s*none\s*!important;/, '글자나 화살표 대신 버튼 전체가 터치를 받도록 고정되지 않았습니다.');

assert.match(browserCheck, /isMobile:\s*true/, '모바일 브라우저 조건 검사가 없습니다.');
assert.match(browserCheck, /hasTouch:\s*true/, '실제 터치 입력 조건 검사가 없습니다.');
assert.match(browserCheck, /본스치킨 미평점/, '본스치킨 회귀 검사가 없습니다.');
assert.match(browserCheck, /손수김밥 양지점/, '손수김밥 회귀 검사가 없습니다.');
assert.match(browserCheck, /trigger\.tap\(\)/, '버튼을 마우스 클릭이 아닌 실제 터치로 검사하지 않습니다.');
assert.match(browserCheck, /window\.daedongCatalogReady && typeof window\.daedongCatalogReady\.then === 'function'[\s\S]*page\.evaluate\(\(\) => window\.daedongCatalogReady\)/,
  '카탈로그 준비 Promise가 생기기 전에 검색을 시작하면 안 됩니다.');
assert.match(browserCheck, /order-methods-sheet[\s\S]*polling: 25, timeout: 3000/,
  '첫 터치 뒤 선택창 렌더링을 실제 DOM 상태로 확인해야 합니다.');
assert.match(browserCheck, /console\.log\(JSON\.stringify\(report, null, 2\)\)/,
  '브라우저 실패 원인은 CI 로그에서 바로 확인할 수 있어야 합니다.');
assert.match(previewWorkflow, /node scripts\/browser-other-order-method-touch\.mjs/, 'PR에서 주문방법 모바일 터치 검사를 실행하지 않습니다.');

assert.match(app, /const menu = toggle\.closest\('\.store-other-wrap'\)\?\.querySelector\('\.store-other-popover'\); if \(!menu\) return;/, '구형 팝업이 없는 버튼을 눌렀을 때의 안전장치가 없습니다.');
assert.match(html, /app\.js\?v=[^"\n]*other-order-method-touch-1/, 'app.js 캐시 갱신 표식이 없습니다.');
assert.match(html, /final-experience\.js\?v=[^"\n]*order-methods-mobile-touch-2/, 'final-experience.js 캐시 갱신 표식이 없습니다.');
assert.match(finalExperience, /rc3-fixes\.css\?v=[^'\n]*order-methods-mobile-touch-2/, 'rc3-fixes.css 캐시 갱신 표식이 없습니다.');
assert.match(finalExperience, /rc3-fixes\.js\?v=[^'\n]*order-methods-mobile-touch-2/, 'rc3-fixes.js 캐시 갱신 표식이 없습니다.');

console.log('other-order-method-touch-regression: PASS');
