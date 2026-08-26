import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const eventJs = fs.readFileSync('mukkebi-summer-event.js', 'utf8');
const pager = fs.readFileSync('store-list-horizontal-pager.js', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

const earlyBoot = html.match(/<script data-daedong-fresh-entry-boot>[\s\S]*?<\/script>/)?.[0] || '';
assert.ok(earlyBoot, '첫 화면 복귀 판별보다 앞선 초기화 코드를 찾을 수 있어야 합니다.');
assert.match(earlyBoot, /history\.scrollRestoration = 'manual'/,
  '브라우저가 중간 스크롤을 복원하기 전에 head에서 수동 복원으로 바꿔야 합니다.');
assert.match(earlyBoot, /window\.daedongArmFreshEntryTop = \(\) =>/);
assert.match(earlyBoot, /FRESH_ENTRY_SETTLE_MS = 20000/,
  '카카오 인앱브라우저의 늦은 콘텐츠·스크롤 복원까지 최초 진입 상단을 지켜야 합니다.');
assert.match(earlyBoot, /FRESH_ENTRY_PULSE_MS = 200/);
assert.match(earlyBoot, /FRESH_ENTRY_OPENING_TAP_GRACE_MS = 3000/,
  '카카오 채팅 링크를 누른 터치가 새 WebView에 전달돼도 첫 화면 보호를 해제하면 안 됩니다.');
assert.match(earlyBoot, /document\.addEventListener\('pointerdown', rememberFreshEntryPointer/);
assert.match(earlyBoot, /document\.addEventListener\('pointermove', markFreshEntryDrag/,
  '단순 링크 터치와 실제 고객 스크롤 동작을 구분해야 합니다.');
assert.doesNotMatch(earlyBoot, /\['pointerdown', 'touchstart', 'wheel', 'keydown'\]/,
  '카카오가 전달한 첫 pointerdown만으로 최상단 보호를 중단하면 안 됩니다.');
assert.match(earlyBoot, /setTimeout\(pulseFreshEntryTop, FRESH_ENTRY_PULSE_MS\)/,
  '최초 진입 보정 시간 동안 늦은 중간 스크롤 복원을 반복해서 되돌려야 합니다.');
assert.match(earlyBoot, /window\.addEventListener\('pageshow'[\s\S]*daedongArmFreshEntryTop/,
  '카카오 인앱브라우저가 기존 페이지를 다시 표시해도 새 진입 상단을 확인해야 합니다.');
assert.match(earlyBoot, /document\.addEventListener\('visibilitychange'[\s\S]*visibilityState === 'visible'[\s\S]*daedongArmFreshEntryTop/);
assert.match(earlyBoot, /window\.daedongEarlyHomeInteraction = true[\s\S]*stopFreshEntrySettle\(\)/,
  '고객이 화면을 만진 뒤에는 상단 보정이 고객 스크롤을 덮어쓰지 않아야 합니다.');
assert.match(html, /if \(!pending\) \{[\s\S]*window\.daedongArmFreshEntryTop\?\.\(\)/,
  '검증된 주문앱 복귀가 아닌 새 진입에서만 상단 보정을 시작해야 합니다.');
assert.match(html, /html\.daedong-fresh-entry-settling\{scroll-behavior:auto!important;overflow-anchor:none\}/);

assert.match(pager, /storeListPagerCustomerInteracted\|\|globalThis\.daedongEarlyHomeInteraction===true/,
  '목록 스크립트 준비 전의 첫 터치도 고객 상호작용으로 이어받아야 합니다.');
assert.match(eventJs, /window\.daedongEarlyHomeInteraction === true/,
  '먹깨비 행사창은 늦게 로드돼도 앞선 고객 터치를 알아야 합니다.');
assert.match(eventJs, /document\.querySelector\('\[data-store-service-overview-overlay\]'\)/);
assert.match(eventJs, /serviceOverview\?\.hidden[\s\S]*store-service-overview-open/,
  '주문앱별 혜택 화면이 열려 있으면 먹깨비 행사창을 열지 않아야 합니다.');
assert.match(eventJs, /const AUTO_OPEN_ENABLED = false/,
  '먹깨비 행사창은 홈 진입이나 카카오 작업 복귀 때 자동으로 열리면 안 됩니다.');
assert.match(eventJs, /function scheduleInitialOpen\(\) \{[\s\S]*if \(!AUTO_OPEN_ENABLED\) return;/,
  '자동 행사창 예약 자체를 중단해 혜택 화면과 홈 화면을 가로채지 않아야 합니다.');
assert.match(html, /store-list-horizontal-pager\.js\?v=[^"\n]*early-interaction-1/);
assert.match(html, /mukkebi-summer-event\.js\?v=[^"\n]*auto-popup-disabled-1/);
assert.match(serviceWorker, /CACHE_NAME = 'daedong-yeosu-app-shell-v24-initial-top-benefits-guard'/);

console.log('initial-entry-benefits-guard-regression-test: pass');
