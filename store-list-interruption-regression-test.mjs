import assert from 'node:assert/strict';
import fs from 'node:fs';

const pager = fs.readFileSync('store-list-horizontal-pager.js', 'utf8');
const pagerCss = fs.readFileSync('store-list-horizontal-pager.css', 'utf8');
const intro = fs.readFileSync('turtle-ship-hero.js', 'utf8');
const event = fs.readFileSync('mukkebi-summer-event.js', 'utf8');
const ranking = fs.readFileSync('rc6-fixes.js', 'utf8');
const experience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const serviceInfo = fs.readFileSync('store-service-info.js', 'utf8');

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
assert.match(pager, /document\.addEventListener\('pointerdown',markStoreListPagerCustomerInteraction/);
assert.match(pager, /window\.daedongCaptureStorePagerState=captureStoreListPagerState/);
assert.match(pager, /window\.daedongRestoreStorePagerState=restoreStoreListPagerState/);
assert.match(pager, /const STORE_LIST_PAGER_SWIPE_MIN_DISTANCE=48/);
assert.match(pager, /grid\.addEventListener\('touchstart',beginStoreListPagerSwipe,\{passive:true\}\)/);
assert.match(pager, /grid\.addEventListener\('touchend',finishStoreListPagerSwipe,\{passive:true\}\)/);
assert.match(pager, /moveStoreListPager\(deltaX<0\?'next':'prev',\{reveal:false,fromPage:gesture\.page\}\)/,
  '한 번의 가로 스와이프는 시작한 페이지를 기준으로 정확히 한 페이지만 이동해야 합니다.');
assert.match(pager, /controls\.hidden=true/,
  '전체 가게 목록에서는 하단 이전·다음 화살표를 숨겨야 합니다.');
assert.match(pager, /storeListPagerSuppressClickUntil=Date\.now\(\)\+500/,
  '스와이프가 가게 카드 터치로 오인되면 안 됩니다.');
assert.match(pager, /const positions=cards\.map\(card=>card\.offsetLeft\)/,
  '카드 위치는 한 번에 읽어 레이아웃 강제 재계산을 최소화해야 합니다.');
assert.match(pager, /storeListPagerLayout\?\.grid===grid[\s\S]*return storeListPagerLayout\.metrics/,
  '스크롤 중에는 측정한 카드 배치를 재사용해야 합니다.');
assert.match(pager, /positions\.forEach\(\(left,index\)=>/,
  '스크롤 위치 판정은 캐시된 카드 좌표를 사용해야 합니다.');
assert.match(pager, /applyStoreListPager\(metrics\)/,
  '같은 프레임 안에서 이미 측정한 배치를 다시 측정하면 안 됩니다.');
assert.equal((pager.match(/offsetLeft/g)||[]).length,1,
  'offsetLeft 읽기는 일괄 좌표 수집 한 곳에만 있어야 합니다.');
assert.match(pagerCss, /store-pager-swipe-enabled\{[^}]*scroll-snap-type:x mandatory/);
assert.match(pagerCss, /store-pager-swipe-enabled \+ \.store-pager-controls\{display:none!important\}/,
  '스와이프 목록이 활성화되는 즉시 하단 화살표 영역을 CSS에서도 감춰 깜빡임을 막아야 합니다.');

assert.match(intro, /customerAlreadyInteracted\(\)[\s\S]*window\.daedongHasHomeInteraction/);
assert.match(intro, /window\.setTimeout\(waitForClearHome, 0\)/,
  '첫 안내는 사용자가 목록을 보기 시작한 뒤 늦게 나타나면 안 됩니다.');
assert.doesNotMatch(intro, /setTimeout\(waitForClearHome, 900\)|\}, 320\);/);
assert.match(event, /customerAlreadyInteracted\(\)/);
assert.match(event, /window\.setTimeout\(openEvent, 0\)/);
assert.doesNotMatch(event, /setTimeout\(openEvent, 220\)|waitUntilExistingPopupCloses, 1100/,
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

assert.match(html, /store-list-horizontal-pager\.css\?v=visible-results-1-swipe-paging-1/);
assert.match(html, /id="storePagerStatus"[^>]*aria-live="polite"/);
assert.match(html, /store-list-horizontal-pager\.js\?v=visible-results-1-swipe-paging-1-layout-cache-1/);
assert.match(html, /turtle-ship-hero\.js\?v=[^"\n]*no-late-interrupt-1/);
assert.match(html, /mukkebi-summer-event\.js\?v=[^"\n]*no-late-interrupt-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*list-position-stable-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*atomic-rail-refresh-1/);

assert.match(serviceInfo, /const SERVICE_BOOT_FALLBACK_MS = 1200;/,
  '영업시간은 화면 진입 후 최대 1.2초 안에 불러오기 시작해야 합니다.');
assert.match(serviceInfo, /Promise\.race\(\[[\s\S]*wait\(SERVICE_BOOT_FALLBACK_MS\)[\s\S]*\]\)\.then\(\(\) => beginServiceLoad\(\)\)/,
  '카탈로그가 준비되면 추가 지연 없이 영업시간을 불러와야 합니다.');
assert.doesNotMatch(serviceInfo, /SERVICE_BOOT_DELAY_MS|wait\(6000\)/,
  '고객 화면에 영업시간을 6초 늦게 표시하는 지연을 다시 넣으면 안 됩니다.');
assert.match(html, /store-service-info\.js\?v=[^"\n]*fast-hours-bootstrap-1/);

console.log('store list interruption regression: PASS');
