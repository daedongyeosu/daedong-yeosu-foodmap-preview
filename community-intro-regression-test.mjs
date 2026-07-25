import fs from 'node:fs';
import assert from 'node:assert/strict';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('turtle-ship-hero.css', 'utf8');
const js = fs.readFileSync('turtle-ship-hero.js', 'utf8');

const expectedOrderKeys = ['direct', 'mukkebi', 'ddangyo', 'brand', 'ondongne', 'phone', 'other'];
const actualOrderKeys = [...html.matchAll(/data-order-key="([^"]+)"/g)].map(match => match[1]);

assert.deepEqual(actualOrderKeys, expectedOrderKeys, '기존 주문방법 버튼 7개와 순서를 보존해야 합니다.');
assert.match(html, /id="communityIntro" class="community-intro" hidden aria-hidden="true" role="dialog" aria-modal="true"/);
assert.match(html, /id="communityIntroClose"[^>]*aria-label="안내 닫기"/);
assert.match(html, /여수에서 주문한다면,/);
assert.match(html, /여수를 한 번 더 생각해 주세요\./);
assert.match(html, /가게바로주문 · 먹깨비 · 땡겨요/);
assert.match(html, /브랜드앱 · 전화주문을 먼저 살펴보세요\./);
assert.match(html, /오늘의 작은 선택이/);
assert.match(html, /우리가 아끼는 여수의 맛을 내일로 이어갑니다\./);
assert.match(html, /💚 여수의 가게를 응원하는/);
assert.match(html, /가장 쉬운 방법입니다\./);
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
assert.match(css, /\.order-section \.community-order-message h2\{[\s\S]*color:#fff/);
assert.match(css, /\.order-section \.community-order-message p\{[\s\S]*background:transparent/);
assert.match(css, /\.order-section \.community-order-message p\{[\s\S]*color:#ffe95c/);
assert.match(css, /\.order-section \.community-order-message p\{[\s\S]*font-size:clamp\(15px,4vw,18px\)/);
assert.match(css, /@media\(max-width:767px\) and \(max-height:720px\)/);

assert.match(js, /daedongCommunityIntroPlayedV4/);
assert.match(js, /const INTRO_DURATION = 15000/);
assert.match(js, /sessionStorage\.getItem/);
assert.match(js, /sessionStorage\.setItem/);
assert.match(js, /new URLSearchParams\(location\.search\)\.has\('store'\)/);
assert.match(js, /introClose\?\.addEventListener\('click', finishIntro\)/);
assert.match(js, /completeIntroClose[\s\S]*sailWhenHomeIsClear/);
assert.doesNotMatch(js, /AudioContext|new Audio|\.play\(/, '첫 진입 연출에는 소리를 추가하지 않습니다.');
assert.doesNotMatch(js, /body\.style\.overflow|classList\.add\(['"]modal-open/, '안내 팝업이 기존 페이지 레이아웃을 변경하면 안 됩니다.');

console.log('community intro regression: PASS');
