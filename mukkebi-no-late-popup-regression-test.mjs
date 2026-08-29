import assert from 'node:assert/strict';
import fs from 'node:fs';

const eventJs = fs.readFileSync('mukkebi-summer-event.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.match(eventJs, /let customerInteracted = false/);
assert.match(eventJs, /const HIDE_DATE_KEY = 'daedongMukkebiSummerEventHiddenDateV2'/);
assert.match(eventJs, /const COMMUNITY_INTRO_SESSION_KEY = 'daedongCommunityIntroPlayedV4'/);
assert.match(eventJs, /const FOLLOWUP_INTRO_DELAY = 3000/);
assert.doesNotMatch(eventJs, /function openEvent[\s\S]*?sessionStorage\.setItem\(COMMUNITY_INTRO_SESSION_KEY, '1'\)[\s\S]*?eventLayer\.hidden = false/,
  '행사창이 열렸다는 이유만으로 일반 안내를 본 것으로 처리하면 안 됩니다.');
assert.match(eventJs, /function scheduleCommunityIntroFollowup\(\)[\s\S]*?daedongCommunityIntroReadyAt = readyAt[\s\S]*?daedong:mukkebi-followup-ready/,
  '행사창을 닫은 뒤 충분한 간격을 두고 일반 안내 재개 신호를 보내야 합니다.');
assert.match(eventJs, /function closeEvent\(\{showCommunityIntro = true\} = \{\}\)[\s\S]*?scheduleCommunityIntroFollowup\(\)/,
  '일반적인 행사창 닫기는 두 번째 안내를 자연스럽게 예약해야 합니다.');
assert.match(eventJs, /orderButton\?\.addEventListener\('click',[\s\S]*?closeEvent\(\{showCommunityIntro:false\}\)/,
  '주문하러 이동하는 고객에게 두 번째 팝업을 끼워 넣으면 안 됩니다.');
assert.match(eventJs, /window\.daedongMukkebiAutoOpenPending = AUTO_OPEN_ELIGIBLE/);
assert.match(eventJs, /daedong:mukkebi-auto-open-settled/);
assert.match(eventJs, /window\.daedongHasHomeInteraction\?\.\(\) === true/);
assert.match(eventJs, /window\.scrollY[\s\S]*> 16/);
assert.match(eventJs, /function markCustomerInteraction\(\)[\s\S]*clearTimeout\(initialOpenTimer\)/);
assert.match(eventJs, /document\.addEventListener\('pointerdown', rememberInteractionStart/);
assert.match(eventJs, /document\.addEventListener\('touchstart', rememberInteractionStart/);
assert.match(eventJs, /Math\.hypot\([\s\S]*> 12/);
assert.match(eventJs, /document\.addEventListener\('click', markActionableClick/);
assert.doesNotMatch(eventJs, /document\.addEventListener\('pointerdown', markCustomerInteraction/);
assert.match(eventJs, /window\.addEventListener\('scroll'/);
assert.match(eventJs, /function scheduleInitialOpen\(\)[\s\S]*}, 600\)/);
assert.doesNotMatch(eventJs, /new MutationObserver\(waitUntilExistingPopupCloses\)/);
assert.doesNotMatch(eventJs, /function waitUntilExistingPopupCloses/);
assert.match(html, /mukkebi-summer-event\.js\?v=[^"\n]*no-late-interrupt-3-scroll-cancel-1-layer-guard-1[^"]*kakao-opening-touch-1-startup-order-1-natural-followup-1/);
assert.match(serviceWorker, /CACHE_NAME = 'daedong-yeosu-app-shell-v29-menu-placeholder-logo'/);

console.log('Mukkebi no-late-popup regression: PASS');
