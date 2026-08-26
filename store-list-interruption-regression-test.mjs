import assert from 'node:assert/strict';
import fs from 'node:fs';

const pager = fs.readFileSync('store-list-horizontal-pager.js', 'utf8');
const pagerCss = fs.readFileSync('store-list-horizontal-pager.css', 'utf8');
const intro = fs.readFileSync('turtle-ship-hero.js', 'utf8');
const event = fs.readFileSync('mukkebi-summer-event.js', 'utf8');
const ranking = fs.readFileSync('rc6-fixes.js', 'utf8');
const experience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(pager, /grid\.scrollLeft=left;[\s\S]*requestAnimationFrame\(\(\)=>\{[\s\S]*storeListPagerProgrammatic=false/,
  '다음 가게 버튼은 긴 부드러운 스크롤 대기 없이 같은 프레임에 이동해야 합니다.');
assert.doesNotMatch(pager, /behavior:[^\n]*smooth|setTimeout\([^\n]*460|visibleCount\|\|0\)\+40/,
  '다음 가게 버튼에 460ms 애니메이션이나 40개 일괄 렌더링을 다시 넣으면 안 됩니다.');
assert.match(pager, /Math\.max\(4,pageSize\*2\)/,
  '뒤쪽 페이지 준비는 현재 화면에 필요한 소량의 카드만 추가해야 합니다.');
assert.match(pager, /status\.textContent=`가게 \$\{rangeStart\}–\$\{rangeEnd\} \/ 전체 \$\{total\}곳`/,
  '현재 표시 중인 가게 범위를 버튼 위에 알려야 합니다.');
assert.match(pager, /function revealStoreListPagerResults\(grid\)/);
assert.match(pager, /scrollStoreListPagerTo\(targetPage,\{reveal\}\)/,
  '버튼과 스와이프가 같은 즉시 이동 경로를 사용해야 합니다.');
assert.match(pager, /window\.daedongHasHomeInteraction=hasStoreListPagerCustomerInteraction/,
  '뒤늦은 팝업과 정렬 갱신이 고객의 목록 사용 여부를 확인할 수 있어야 합니다.');
assert.match(pager, /storeListPagerGridPointerActive[\s\S]*markStoreListPagerVerifiedCustomerInteraction\(\)/,
  '실제 가로 이동이 확인된 뒤에만 고객의 목록 사용으로 기록해야 합니다.');
assert.doesNotMatch(pager, /document\.addEventListener\('pointerdown',markStoreListPagerCustomerInteraction/,
  '카카오 링크를 연 첫 터치를 목록 사용으로 오인하면 안 됩니다.');
assert.match(pager, /window\.daedongCaptureStorePagerState=captureStoreListPagerState/);
assert.match(pager, /window\.daedongRestoreStorePagerState=restoreStoreListPagerState/);
assert.match(pager, /grid\.scrollLeft=Math\.max\(0,Number\(snapshot\.scrollLeft\|\|0\)\)/,
  '목록으로 돌아오면 고객이 멈춘 가로 위치를 그대로 복원해야 합니다.');
assert.doesNotMatch(pager, /STORE_LIST_PAGER_SWIPE_MIN_DISTANCE|beginStoreListPagerSwipe|finishStoreListPagerSwipe|storeListPagerSuppressClickUntil/,
  '손을 떼면 자동으로 다음 페이지에 고정하는 스와이프 재배치를 다시 넣으면 안 됩니다.');
assert.match(pager, /controls\.hidden=true/,
  '전체 가게 목록에서는 하단 이전·다음 화살표를 숨겨야 합니다.');
assert.match(pagerCss, /store-pager-swipe-enabled\{[^}]*scroll-snap-type:none/);
assert.match(pagerCss, /\.recommend-track,[\s\S]*scroll-snap-type:none!important/,
  '추천·검색·카테고리 가게 목록은 고객이 멈춘 위치에 그대로 머물러야 합니다.');
assert.match(pagerCss, /\.recommend-track>\.rail-card,[\s\S]*scroll-snap-align:none!important/,
  '가게 카드를 자동으로 끝점에 맞추는 스냅 지점을 다시 넣으면 안 됩니다.');
assert.match(pagerCss, /store-pager-swipe-enabled \+ \.store-pager-controls\{display:none!important\}/,
  '스와이프 목록이 활성화되는 즉시 하단 화살표 영역을 CSS에서도 감춰 깜빡임을 막아야 합니다.');

assert.match(intro, /customerAlreadyInteracted\(\)[\s\S]*window\.daedongHasHomeInteraction/);
assert.match(intro, /window\.setTimeout\(waitForClearHome, 0\)/,
  '첫 안내는 사용자가 목록을 보기 시작한 뒤 늦게 나타나면 안 됩니다.');
assert.doesNotMatch(intro, /setTimeout\(waitForClearHome, 900\)|\}, 320\);/);
assert.match(event, /customerAlreadyInteracted\(\)/);
assert.match(event, /function markCustomerInteraction\(\)[\s\S]*clearTimeout\(initialOpenTimer\)/);
assert.match(event, /window\.addEventListener\('scroll'/);
assert.doesNotMatch(event, /waitUntilExistingPopupCloses|new MutationObserver/,
  '행사창은 사용 중인 목록 위에 뒤늦게 나타나면 안 됩니다.');

assert.match(ranking, /preservePager=window\.daedongHasHomeInteraction\?\.\(\)===true/);
assert.match(ranking, /renderStores\(\{resetCount:!preservePager\}\)/,
  '위치 정렬 준비가 늦게 끝나도 사용 중인 목록을 첫 페이지로 초기화하면 안 됩니다.');
assert.match(ranking, /window\.daedongRestoreStorePagerState\?\.\(pagerSnapshot\)/);
assert.match(experience, /function fxRenderRailsWithoutMovingActiveList\(\)/);
assert.match(experience, /function fxCommitRailsWithoutMovingActiveList\(root,staging\)[\s\S]*section\.getBoundingClientRect\(\)\.top-before/,
  '추천 영역을 늦게 갱신해도 보고 있던 가게목록의 화면 위치를 보존해야 합니다.');
assert.match(experience, /root\.replaceChildren\(\.\.\.staging\.childNodes\)/,
  '추천 영역은 완성된 결과를 한 번에 교체해 소식 배너가 순간적으로 끼어들지 않아야 합니다.');

assert.match(html, /store-list-horizontal-pager\.css\?v=visible-results-1-free-scroll-1/);
assert.match(html, /id="storePagerStatus"[^>]*aria-live="polite"/);
assert.match(html, /store-list-horizontal-pager\.js\?v=visible-results-1-free-scroll-1-early-interaction-2/);
assert.match(html, /turtle-ship-hero\.js\?v=[^"\n]*no-late-interrupt-1/);
assert.match(html, /mukkebi-summer-event\.js\?v=[^"\n]*no-late-interrupt-3-scroll-cancel-1-layer-guard-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*list-position-stable-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*atomic-rail-refresh-1/);

console.log('store list interruption regression: PASS');
