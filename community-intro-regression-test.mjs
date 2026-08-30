import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('turtle-ship-hero.css', 'utf8');
const js = fs.readFileSync('turtle-ship-hero.js', 'utf8');
const regionJs = fs.readFileSync('region-config.js', 'utf8');

const expectedOrderKeys = ['direct', 'mukkebi', 'ddangyo', 'brand', 'ondongne', 'phone', 'other'];
const actualOrderKeys = [...html.matchAll(/data-order-key="([^"]+)"/g)].map(match => match[1]);

assert.deepEqual(actualOrderKeys, expectedOrderKeys, '기존 주문방법 버튼 7개와 순서를 보존해야 합니다.');
assert.match(html, /id="communityIntro" class="community-intro" hidden aria-hidden="true" role="dialog" aria-modal="true"/);
assert.match(html, /id="communityIntroClose"[^>]*aria-label="안내 닫기"/);
assert.match(html, /여수에서 주문한다면,/);
assert.match(html, /여수를 한 번 더 생각해 주세요\./);
assert.match(html, /class="community-intro-action">주문 전, 가게에 힘이 되는 방법부터 선택해 주세요\.<\/strong>/);
assert.match(html, /class="community-intro-methods">가게바로주문 · 먹깨비 · 땡겨요<br>브랜드앱 · 전화주문<\/strong>/);
assert.match(html, /수수료 부담은 낮추고,/);
assert.match(html, /여수의 맛은 더 오래 이어집니다\./);
assert.doesNotMatch(html, /브랜드앱 · 전화주문을 먼저 살펴보세요\./);
assert.doesNotMatch(html, /오늘의 작은 선택이/);
assert.doesNotMatch(html, /가장 쉬운 방법입니다\./);
assert.match(html, /가게에 힘이 되는 주문방법/);
assert.match(html, /가게바로주문·먹깨비·땡겨요·브랜드앱·전화주문을 먼저 살펴보세요\./);
assert.match(html, /여수의 맛을 찾는 날마다, 대동여수음식지도\./);
assert.match(html, /community-order-message/);
assert.match(html, /15초 후 자동으로 닫힙니다\./);
assert.doesNotMatch(html, /자동으로 닫히며 거북선이 출항합니다\./);

assert.match(css, /\.community-intro\{[\s\S]*position:fixed/);
assert.match(css, /\.community-intro\{[\s\S]*pointer-events:auto/);
assert.match(css, /\.community-intro\[hidden\]\{[\s\S]*display:none!important/);
assert.match(css, /\.yeosu-night-shell:has\(\.community-intro:not\(\[hidden\]\)\)\{[\s\S]*z-index:60/);
assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
assert.match(css, /\.community-intro-card\{[\s\S]*background:/);
assert.match(css, /\.community-intro-close\{/);
assert.match(css, /community-popup-progress 15s linear/);
assert.match(css, /\.community-intro-card h2\{[\s\S]*font-size:clamp\(18px,4vw,23px\)/,
  '기존 지역 메시지는 보조 크기로 낮춰야 합니다.');
assert.match(css, /\.community-intro-action\{[\s\S]*font-size:clamp\(20px,4\.8vw,27px\)[\s\S]*font-weight:950/,
  '고객 행동 문구는 기존 지역 메시지보다 크고 진해야 합니다.');
assert.match(css, /\.community-intro-methods\{[\s\S]*font-size:clamp\(21px,5\.2vw,29px\)[\s\S]*font-weight:950/,
  '주문방법 목록이 팝업에서 가장 크게 보여야 합니다.');
assert.match(html, /turtle-ship-hero\.css\?v=community-order-priority-1-/,
  '기존 방문자도 새 팝업 위계를 받도록 CSS 캐시 버전을 갱신해야 합니다.');
assert.match(html, /region-config\.js\?v=korean-particle-fix-2/,
  '기존 방문자도 올바른 지역명 조사를 받도록 지역 설정 캐시 버전을 갱신해야 합니다.');
assert.match(regionJs, /function regionWithEulReul\(name\)/,
  '지역명 받침에 맞춰 을\/를 조사를 선택해야 합니다.');
assert.match(regionJs, /replaceText\('\.community-intro-lead', `\$\{regionWithEulReul\(active\.shortName\)\} 한 번 더 생각해 주세요\.`\)/,
  '여수을 같은 잘못된 지역명 조사가 화면에 나오면 안 됩니다.');
assert.doesNotMatch(regionJs, /`\$\{active\.shortName\}을 한 번 더 생각해 주세요\.`/);
assert.match(css, /\.order-section \.community-order-message h2\{[\s\S]*color:#fff/);
assert.match(css, /\.order-section \.community-order-message p\{[\s\S]*background:transparent/);
assert.match(css, /\.order-section \.community-order-message p\{[\s\S]*color:#ffe95c/);
assert.match(css, /\.order-section \.community-order-message p\{[\s\S]*font-size:clamp\(15px,4vw,18px\)/);
assert.match(css, /@media\(max-width:767px\) and \(max-height:720px\)/);

assert.match(js, /daedongCommunityIntroPlayedV4/);
assert.match(js, /document\.getElementById\('mukkebiSummerEvent'\)/);
assert.match(js, /window\.daedongMukkebiAutoOpenPending !== true/);
assert.match(js, /daedong:mukkebi-auto-open-settled/);
assert.match(js, /const INTRO_DURATION = 15000/);
assert.match(js, /sessionStorage\.getItem/);
assert.match(js, /sessionStorage\.setItem/);
assert.match(js, /window\.daedongEntryHadExternalReturn === true/,
  '주문앱에서 돌아오는 화면에는 첫 방문 안내를 다시 띄우면 안 됩니다.');
assert.match(js, /daedong-external-return-pending/,
  '주문앱 복귀 화면을 구성하는 동안 첫 방문 안내가 복원을 가로막으면 안 됩니다.');
assert.match(js, /new URLSearchParams\(location\.search\)\.has\('store'\)/);
assert.match(js, /window\.installDaedongTapAction\(\{[\s\S]*selector: '#communityIntroClose'[\s\S]*dismissIntroImmediately\(event\)/,
  '첫 안내 X는 스크롤 제스처와 구분되는 공통 모바일 탭 경로를 사용해야 합니다.');
assert.doesNotMatch(js, /introClose\?\.addEventListener\('pointerdown', dismissIntroImmediately\)/,
  '손가락을 대는 순간 닫으면 스크롤 시작을 닫기로 오인할 수 있습니다.');
assert.match(js, /introClose\?\.addEventListener\('click', dismissIntroImmediately\)/,
  '공통 탭 유틸리티를 쓸 수 없는 환경의 클릭 대체 경로를 유지해야 합니다.');
assert.match(js, /function finishIntro\(\{immediate = false\} = \{\}\)[\s\S]*?if \(immediate\) \{[\s\S]*?completeIntroClose\(\);[\s\S]*?return;/);
assert.match(js, /completeIntroClose[\s\S]*sailWhenHomeIsClear/);
assert.doesNotMatch(js, /AudioContext|new Audio|\.play\(/, '첫 진입 연출에는 소리를 추가하지 않습니다.');
assert.doesNotMatch(js, /body\.style\.overflow|classList\.add\(['"]modal-open/, '안내 팝업이 기존 페이지 레이아웃을 변경하면 안 됩니다.');

console.log('community intro regression: PASS');
