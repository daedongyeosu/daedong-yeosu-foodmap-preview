import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const eventJs = fs.readFileSync('mukkebi-summer-event.js', 'utf8');
const pager = fs.readFileSync('store-list-horizontal-pager.js', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');
const browserCheck = fs.readFileSync('scripts/browser-mukkebi-safe-fresh-entry.mjs', 'utf8');

const earlyBoot = html.match(/<script data-daedong-fresh-entry-boot>[\s\S]*?<\/script>/)?.[0] || '';
assert.ok(earlyBoot, '첫 화면 복귀 판별보다 앞선 초기화 코드를 찾을 수 있어야 합니다.');
assert.match(earlyBoot, /history\.scrollRestoration = 'manual'/,
  '브라우저가 중간 스크롤을 복원하기 전에 head에서 수동 복원으로 바꿔야 합니다.');
assert.match(earlyBoot, /window\.daedongArmFreshEntryTop = \(\) =>/);
assert.match(earlyBoot, /FRESH_ENTRY_SAFETY_RELEASE_MS = 10000/,
  '초기화가 실패해도 화면 잠금이 영구적으로 남으면 안 됩니다.');
assert.doesNotMatch(earlyBoot, /FRESH_ENTRY_SETTLE_MS|FRESH_ENTRY_PULSE_MS|pulseFreshEntryTop/,
  '장시간 반복 보정으로 고객 스크롤과 충돌하면 안 됩니다.');
assert.match(earlyBoot, /FRESH_ENTRY_OPENING_TAP_GRACE_MS = 3000/,
  '카카오 채팅 링크를 누른 터치가 새 WebView에 전달돼도 첫 화면 보호를 해제하면 안 됩니다.');
assert.match(earlyBoot, /document\.addEventListener\('pointerdown', rememberFreshEntryPointer/);
assert.match(earlyBoot, /document\.addEventListener\('pointermove', markFreshEntryDrag/,
  '단순 링크 터치와 실제 고객 스크롤 동작을 구분해야 합니다.');
assert.doesNotMatch(earlyBoot, /\['pointerdown', 'touchstart', 'wheel', 'keydown'\]/,
  '카카오가 전달한 첫 pointerdown만으로 최상단 보호를 중단하면 안 됩니다.');
assert.match(earlyBoot, /window\.daedongReleaseFreshEntryTop = \(\) =>[\s\S]*freshEntryCatalogReady = true[\s\S]*scheduleStableFreshEntryRelease\(\)/,
  '첫 카탈로그 레이아웃 준비는 즉시 해제가 아니라 안정화 시작 신호여야 합니다.');
assert.match(earlyBoot, /window\.addEventListener\('load',[\s\S]*freshEntryLoadReady = true[\s\S]*scheduleStableFreshEntryRelease\(\)/,
  'WebView 전체 로드가 끝날 때까지 초기 상단 보호를 유지해야 합니다.');
assert.match(earlyBoot, /window\.addEventListener\('scroll', blockLateFreshEntryRestore/,
  '카카오가 뒤늦게 복원한 중간 스크롤을 이벤트로 감지해야 합니다.');
assert.match(earlyBoot, /const finishStableFreshEntry = \(\) =>[\s\S]*requestAnimationFrame[\s\S]*releaseFreshEntryVisualLock\(\)/,
  '마지막 비정상 스크롤 뒤 안정화된 페인트 경계에서 화면 잠금만 해제해야 합니다.');
assert.match(earlyBoot, /freshEntryLateGuardActive = true[\s\S]*FRESH_ENTRY_SAFETY_RELEASE_MS/,
  '화면 잠금 해제 뒤에도 카카오의 지연된 자동 스크롤 복원을 제한 시간 동안 감시해야 합니다.');
assert.doesNotMatch(earlyBoot, /window\.addEventListener\('pageshow'[\s\S]*daedongArmFreshEntryTop/,
  '카카오 화면이 다시 보일 때마다 최초 진입 잠금을 재가동하면 안 됩니다.');
assert.doesNotMatch(earlyBoot, /document\.addEventListener\('visibilitychange'[\s\S]*daedongArmFreshEntryTop/);
assert.match(earlyBoot, /window\.daedongEarlyHomeInteraction = true[\s\S]*stopFreshEntryGuard\(\)/,
  '고객이 화면을 만진 뒤에는 상단 보정이 고객 스크롤을 덮어쓰지 않아야 합니다.');
assert.match(earlyBoot, /window\.daedongMarkHomeInteraction = markEarlyHomeInteraction/,
  '늦게 준비되는 화면도 실제 고객 조작이 확인된 순간 상단 보정을 해제할 수 있어야 합니다.');
assert.match(html, /if \(!pending\) \{[\s\S]*window\.daedongArmFreshEntryTop\?\.\(\)/,
  '검증된 주문앱 복귀가 아닌 새 진입에서만 상단 보정을 시작해야 합니다.');
assert.match(html, /html\.daedong-fresh-entry-settling body\{[^}]*overflow-y:hidden!important/,
  '초기 레이아웃 전에는 WebView가 과거 중간 위치를 복원하지 못하도록 스크롤을 잠가야 합니다.');
assert.match(app, /function finishCatalogReady\(value\)[\s\S]*window\.daedongReleaseFreshEntryTop\?\.\(\)/,
  '첫 가게목록 준비 시점을 초기 진입 안정화 조건에 전달해야 합니다.');

assert.match(pager, /storeListPagerCustomerInteracted\|\|globalThis\.daedongEarlyHomeInteraction===true/,
  '목록 스크립트 준비 전의 첫 터치도 고객 상호작용으로 이어받아야 합니다.');
assert.match(pager, /storeListPagerGridPointerActive[\s\S]*Math\.abs\(nextLeft-storeListPagerLastObservedLeft\)>1[\s\S]*markStoreListPagerVerifiedCustomerInteraction\(\)/,
  '가게목록의 실제 가로 이동이 확인되면 최초 진입 상단 보호를 해제해야 합니다.');
assert.match(pager, /globalThis\.daedongMarkHomeInteraction\?\.\(\)/,
  '확인된 가게목록 스와이프를 초기 상단 보호 코드에 전달해야 합니다.');
assert.doesNotMatch(pager, /document\.addEventListener\('pointerdown',markStoreListPagerCustomerInteraction/,
  '카카오 링크를 연 첫 터치를 가게목록 고객 조작으로 오인하면 안 됩니다.');
assert.doesNotMatch(pager, /document\.addEventListener\('touchstart',markStoreListPagerCustomerInteraction/,
  '카카오 링크의 첫 터치 신호만으로 늦은 추천 영역 위치를 보존하면 안 됩니다.');
assert.match(eventJs, /window\.daedongEarlyHomeInteraction === true/,
  '먹깨비 행사창은 늦게 로드돼도 앞선 고객 터치를 알아야 합니다.');
assert.match(eventJs, /document\.querySelector\('\[data-store-service-overview-overlay\]'\)/);
assert.match(eventJs, /serviceOverview\?\.hidden[\s\S]*store-service-overview-open/,
  '주문앱별 혜택 화면이 열려 있으면 먹깨비 행사창을 열지 않아야 합니다.');
assert.match(eventJs, /const AUTO_OPEN_ENABLED = true/,
  '먹깨비 행사창은 안전한 새 홈 진입에서 한 번 표시되어야 합니다.');
assert.match(eventJs, /const RETURN_QUERY_KEYS = \['store', '__ddret', '__ddom', '__ddappfallback'\]/,
  '가게 공유·주문앱 복귀·주문방법 재진입 주소에서는 행사창을 예약하면 안 됩니다.');
assert.match(eventJs, /const AUTO_OPEN_ELIGIBLE = AUTO_OPEN_ENABLED[\s\S]*?!globalThis\.daedongEntryHadExternalReturn[\s\S]*?!globalThis\.daedongEntryIsHistoryReturn[\s\S]*?!globalThis\.daedongEntryIsDetachedKakaoReturn[\s\S]*?!globalThis\.daedongPendingExternalReturn/,
  '문서 생성 시점의 주문앱 복귀 상태를 고정해 복원 도중 표식이 지워져도 행사창이 끼어들지 않아야 합니다.');
assert.match(eventJs, /document\.wasDiscarded !== true[\s\S]*navigationType === 'navigate'/,
  '폐기 탭 복원·새로고침·뒤로가기로 되살아난 문서는 새 행사 진입으로 취급하면 안 됩니다.');
assert.match(eventJs, /function canOpen\(\{automatic = false\} = \{\}\) \{[\s\S]*automatic && \(!AUTO_OPEN_ELIGIBLE \|\| document\.visibilityState !== 'visible'\)/,
  '백그라운드 문서나 복귀 문서에서는 행사창을 열면 안 됩니다.');
assert.match(eventJs, /window\.daedongOpenMukkebiSummerEvent = \(\) => openEvent\(\)/,
  '관리자가 명시적으로 행사창을 여는 기존 진입은 자동 복귀 차단 조건과 분리해야 합니다.');
assert.match(eventJs, /function scheduleInitialOpen\(\)[\s\S]*openEvent\(\{automatic: true\}\)/,
  '600ms 자동표시만 최초 홈 전용 안전 조건을 사용해야 합니다.');
assert.match(eventJs, /function scheduleInitialOpen\(\) \{[\s\S]*if \(!AUTO_OPEN_ELIGIBLE\) return;/,
  '안전한 최초 홈 문서가 아니면 자동 행사창 예약 자체를 중단해야 합니다.');
assert.match(html, /store-list-horizontal-pager\.js\?v=[^"\n]*early-interaction-2/);
assert.match(html, /mukkebi-summer-event\.js\?v=[^"\n]*fresh-entry-popup-1/);
assert.match(html, /mukkebi-summer-event\.js\?v=[^"\n]*kakao-opening-touch-1/);
assert.match(browserCheck, /완전히 새로 들어온 홈에서만 먹깨비 팝업 한 번 표시/);
assert.match(browserCheck, /PageTransitionEvent\('pageshow'[\s\S]*같은 세션에서 다시 표시하지 않음/);
assert.match(browserCheck, /__ddret=mukkebi-return-test[\s\S]*주문앱 복귀 주소에서는 먹깨비 팝업 예약 자체를 차단/);
assert.match(browserCheck, /data-order-key="mukkebi"[\s\S]*행사 팝업이 메뉴를 덮지 않음/);
assert.match(serviceWorker, /CACHE_NAME = 'daedong-yeosu-app-shell-v27-store-card-touchstart-intent-guard'/);

console.log('initial-entry-benefits-guard-regression-test: pass');
