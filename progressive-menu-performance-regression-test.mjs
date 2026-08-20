import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const menu = fs.readFileSync('store-menu-preview.js', 'utf8');
const menuStyle = fs.readFileSync('store-menu-preview.css', 'utf8');
const rc4 = fs.readFileSync('rc4-fixes.js', 'utf8');
const performanceBudget = fs.readFileSync('scripts/browser-customer-performance-budget.mjs', 'utf8');
const deployedIntegration = fs.readFileSync('scripts/browser-alien-pizza-menu-search.mjs', 'utf8');
const storeService = fs.readFileSync('store-service-info.js', 'utf8');

assert.match(fs.readFileSync('app.js', 'utf8'), /history\.scrollRestoration = 'manual'/,
  '같은 문서의 메뉴·상세 히스토리 이동에서 브라우저 자동 스크롤 복원이 터치를 막으면 안 됩니다.');

assert.match(menu, /const INITIAL_MENU_RENDER_COUNT = 12/);
assert.match(menu, /menu\.items\.slice\(0, INITIAL_MENU_RENDER_COUNT\)\.map\(item => menuCardMarkup\(item\)\)/,
  '메뉴 전체를 첫 화면에서 한꺼번에 DOM으로 만들면 안 됩니다.');
assert.match(menu, /requestIdleCallback\(callback, \{timeout: 180\}\)/,
  '나머지 메뉴 렌더링은 브라우저 유휴 시간으로 분할해야 합니다.');
assert.match(menu, /menuRenderObserver = new IntersectionObserver[\s\S]*rootMargin: '900px 0px'/,
  '남은 메뉴 카드는 사용자가 목록 아래쪽에 접근할 때만 추가해야 합니다.');
assert.match(menu, /addEventListener\('scroll', onProgressiveScroll, \{passive: true\}\)/,
  '교차 감지 신호를 놓쳐도 실제 스크롤에서 다음 메뉴 묶음을 준비해야 합니다.');
assert.match(menu, /scheduleNextChunk = \(priority = 'idle'\)[\s\S]*priority === 'interaction'[\s\S]*runChunk\(null\)[\s\S]*scheduleNextChunk\('interaction'\)/,
  '사용자가 끝으로 스크롤한 경우 프레임·타이머 제한과 무관하게 다음 12개 메뉴를 즉시 표시해야 합니다.');
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*interaction-priority-1/,
  '설치형 앱도 우선순위 렌더링 코드를 즉시 받도록 캐시 키를 갱신해야 합니다.');
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*direct-scroll-chunk-1/,
  '설치형 앱도 직접 메뉴 묶음 렌더링 코드를 즉시 받아야 합니다.');
assert.match(menu, /addEventListener\('pointerdown'[\s\S]*data-menu-preview-close[\s\S]*requestCloseMenuPreview\(\)/,
  '메뉴 닫기 버튼은 click을 기다리지 말고 터치 시작 즉시 닫혀야 합니다.');
assert.match(menu, /data-menu-image-src=/);
assert.match(menu, /const MAX_CONCURRENT_MENU_IMAGE_LOADS = 2/,
  '메뉴 사진을 한꺼번에 너무 많이 받아 터치를 막으면 안 됩니다.');
assert.match(menu, /new IntersectionObserver[\s\S]*rootMargin: '160px 0px'/,
  '메뉴 사진은 스크롤 근처에 도달할 때만 불러와야 합니다.');
assert.match(menu, /resetMenuImageLoading\(\{cancelActive: true\}\)/,
  '메뉴를 닫으면 보이지 않는 사진 로딩도 취소해야 합니다.');
const closeMenuBody = menu.match(/function closeMenuPreview\(\) \{([\s\S]*?)\n  \}/)?.[1] || '';
assert.doesNotMatch(closeMenuBody, /overlay\.innerHTML\s*=\s*''/,
  '메뉴 X 직후 큰 DOM을 비우며 전역 감시기를 깨워 터치를 막으면 안 됩니다.');
assert.match(performanceBudget, /menuImageCancellationExpected = true[\s\S]*data-menu-preview-close/,
  '성능 검사는 메뉴 닫기 직전부터 의도된 이미지 취소를 구분해야 합니다.');
assert.match(performanceBudget, /request\.resourceType\(\) === 'image'[\s\S]*\/\\\/store-menu-content\\\/[\s\S]*ERR_ABORTED/,
  '성능 검사는 메뉴 사진의 ERR_ABORTED만 의도된 취소로 분류해야 합니다.');
assert.match(performanceBudget, /history\.state\?\.daedongMenuPreview === true[\s\S]*page\.evaluate\(\(\) => history\.back\(\)\)/,
  '뒤로가기는 메뉴 히스토리가 준비된 뒤 실제 앱과 같은 History API로 검사해야 합니다.');
assert.doesNotMatch(performanceBudget, /page\.goBack\(/,
  '같은 문서의 메뉴 뒤로가기를 전체 페이지 이동 API로 검사하면 안 됩니다.');
assert.match(performanceBudget, /__qaRepeatMenuStart = performance\.now\(\)[\s\S]*__qaRepeatMenuReadyAt \?\?= performance\.now\(\)/,
  '반복 메뉴 표시 시간은 검사기 바깥이 아니라 실제 브라우저 DOM 표시 시점으로 측정해야 합니다.');
assert.match(performanceBudget, /waitForFunction\(\(storeId\) => Boolean\(document\.querySelector\([\s\S]*data-store-menu-overlay[\s\S]*targetStoreId/,
  '반복 메뉴 준비 검사는 애니메이션 안정성 판정이 아니라 실제 DOM 표시 상태를 기다려야 합니다.');
assert.match(performanceBudget, /menuCloseStateAfterDispatch = await page\.evaluate[\s\S]*if \(!report\.measurements\.menuCloseStateAfterDispatch\.hidden\)[\s\S]*polling: 25/,
  '메뉴 닫기는 이벤트 직후 상태를 먼저 읽고 필요할 때만 짧은 간격으로 재확인해야 합니다.');
assert.match(performanceBudget, /if \(!report\.measurements\.detailCloseStateAfter50Ms\.hidden\)[\s\S]*state: 'hidden'/,
  '상세 화면이 이미 즉시 닫혔다면 불필요한 외부 폴링을 반복하면 안 됩니다.');
assert.match(performanceBudget, /scroll\.scrollTop = scroll\.scrollHeight;[\s\S]*dispatchEvent\(new Event\('scroll'\)\)/,
  '점진적 메뉴 검사는 실제 손가락 스크롤과 같은 scroll 신호를 발생시켜야 합니다.');
assert.match(deployedIntegration, /const searchResultName = await[\s\S]*searchResultName\.includes\('베지'\)/,
  '배포 통합검사는 바뀔 수 있는 전체 메뉴명을 고정하지 말고 실제 검색 결과를 확인해야 합니다.');
assert.match(deployedIntegration, /value === searchResultName/,
  '검색 결과에서 고른 메뉴명이 주문방법 선택창에 그대로 유지되어야 합니다.');
assert.doesNotMatch(deployedIntegration, /page\.goBack\(/,
  '배포 통합검사도 실제 앱과 같은 History API 뒤로가기를 사용해야 합니다.');
assert.match(menuStyle, /content-visibility: auto/);
assert.match(menuStyle, /contain-intrinsic-size: auto 360px/);

assert.match(storeService, /target\?\.closest\('\[data-store-menu-overlay\]'\)\) return false/,
  '메뉴 묶음을 추가할 때 주문 혜택 감시기가 전체 가게 목록을 다시 훑으면 안 됩니다.');
assert.match(storeService, /let serviceSurfaceRefreshFrame = 0[\s\S]*requestAnimationFrame[\s\S]*mutations\.some\(mutationTouchesServiceSurface\)/,
  '관련 화면 변화가 연속되더라도 주문 혜택 장식은 한 프레임에 한 번만 갱신해야 합니다.');
assert.match(html, /store-service-info\.js\?v=[^"\n]*targeted-surface-observer-1/,
  '설치형 앱도 범위가 제한된 화면 감시 코드를 즉시 받아야 합니다.');

assert.doesNotMatch(html, /<script\s+src="https:\/\/js\.sentry-cdn\.com\//,
  'Sentry Replay를 HTML 파싱 전에 동기 실행하면 안 됩니다.');
assert.match(html, /setTimeout\([\s\S]*requestIdleCallback\(loadSentry, \{timeout: 4000\}\)[\s\S]*30000\)/,
  '모니터링은 초기 터치 구간이 지난 뒤 유휴 시간에 시작해야 합니다.');
assert.doesNotMatch(rc4, /function rc4InstallEvents\(\)\{[^\n]*rc4LoadPostcode\(\)\.catch/,
  '주소검색 외부 모듈은 사용자가 주소검색을 누르기 전에 받으면 안 됩니다.');
assert.match(html, /store-menu-preview\.css\?v=[^"\n]*progressive-render-1/);
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*progressive-render-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*postcode-on-demand-1/);

console.log('progressive menu performance regression: PASS');
