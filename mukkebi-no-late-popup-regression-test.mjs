import assert from 'node:assert/strict';
import fs from 'node:fs';

const eventJs = fs.readFileSync('mukkebi-summer-event.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.match(eventJs, /let customerInteracted = false/);
assert.match(eventJs, /const HIDE_DATE_KEY = 'daedongMukkebiSummerEventHiddenDateV2'/);
assert.match(eventJs, /const COMMUNITY_INTRO_SESSION_KEY = 'daedongCommunityIntroPlayedV4'/);
assert.match(eventJs, /const FOLLOWUP_CAMPAIGN_DELAY = 3000/);
assert.match(eventJs, /window\.daedongMukkebiAutoOpenPending = false/,
  '먹깨비 자동 팝업이 첫 일반 안내의 시작을 막으면 안 됩니다.');
assert.match(eventJs, /function scheduleCampaignFollowup\(\)[\s\S]*?daedongMukkebiReadyAt = readyAt[\s\S]*?openEvent\(\{afterCommunityIntro: true\}\)[\s\S]*?waitingAfterIntroClose = false/,
  '일반 안내가 끝난 뒤 충분한 간격을 두고 먹깨비 팝업을 열어야 합니다.');
assert.match(eventJs, /window\.addEventListener\('daedong:community-intro-closed', scheduleCampaignFollowup\)/,
  '먹깨비 팝업은 일반 안내 종료 신호를 받은 뒤에만 예약되어야 합니다.');
assert.match(eventJs, /orderButton\?\.addEventListener\('click',[\s\S]*?closeEvent\(\)/,
  '먹깨비 주문 버튼은 두 번째 팝업을 닫고 기존 주문 흐름으로 이동해야 합니다.');
assert.match(eventJs, /daedong:mukkebi-auto-open-settled/);
assert.match(eventJs, /window\.daedongHasHomeInteraction\?\.\(\) === true/);
assert.match(eventJs, /window\.scrollY[\s\S]*> 16/);
assert.match(eventJs, /function markCustomerInteraction\([^)]*\)[\s\S]*clearTimeout\(followupCampaignTimer\)/);
assert.match(eventJs, /document\.addEventListener\('pointerdown', rememberInteractionStart/);
assert.match(eventJs, /document\.addEventListener\('touchstart', rememberInteractionStart/);
assert.match(eventJs, /target\?\.closest\('#communityIntro'\)[\s\S]*interactionStart = null/,
  '첫 안내 닫기 터치는 후속 캠페인을 취소하는 고객 제스처로 남기면 안 됩니다.');
assert.match(eventJs, /document\.addEventListener\('pointerup', clearInteractionStart[\s\S]*document\.addEventListener\('touchend', clearInteractionStart/,
  '완료된 포인터·터치 좌표를 지워 이후 이동을 새 제스처로 오판하지 않아야 합니다.');
assert.match(eventJs, /Math\.hypot\([\s\S]*> 12/);
assert.match(eventJs, /document\.addEventListener\('click', markActionableClick/);
assert.doesNotMatch(eventJs, /document\.addEventListener\('pointerdown', markCustomerInteraction/);
assert.match(eventJs, /window\.addEventListener\('scroll'/);
assert.match(eventJs, /function scheduleInitialOpen\(\)[\s\S]*?introAlreadyPlayed[\s\S]*?scheduleCampaignFollowup\(\)/);
assert.doesNotMatch(eventJs, /new MutationObserver\(waitUntilExistingPopupCloses\)/);
assert.doesNotMatch(eventJs, /function waitUntilExistingPopupCloses/);
assert.match(html, /mukkebi-summer-event\.js\?v=[^"\n]*no-late-interrupt-3-scroll-cancel-1-layer-guard-1[^"]*kakao-opening-touch-1-startup-order-1-natural-followup-1-mukkebi-second-4/);
assert.match(serviceWorker, /CACHE_NAME = 'daedong-yeosu-app-shell-v30-food-photo-promotion'/);

console.log('Mukkebi no-late-popup regression: PASS');
