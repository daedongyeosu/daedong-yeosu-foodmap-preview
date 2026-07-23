import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('turtle-ship-hero.css', 'utf8');
const js = fs.readFileSync('turtle-ship-hero.js', 'utf8');

const checks = [
  ['새 거북선 장면이 홈 배경에 존재', html.includes('id="turtleShipHeroScene"')],
  ['북서향 모바일 압축 자산 사용', html.includes('turtle-ship-northwest-mobile-v3.webp')],
  ['북서향 데스크톱 압축 자산 사용', html.includes('turtle-ship-northwest-v3.webp')],
  ['기존 바다선 제거', !html.includes('class="sea-line"')],
  ['구형 효과용 DOM은 비가시 상태', html.includes('id="navalLane" hidden')],
  ['거북선이 선명하게 보이는 열린 바다 구간', html.includes('class="turtle-ship-passage"') && /\.turtle-ship-passage\s*\{[\s\S]*?height:clamp\(190px,20vw,250px\)/.test(css)],
  ['거북선 레이어가 터치를 가로막지 않음', /\.turtle-ship-hero-scene\s*\{[\s\S]*?pointer-events:none/.test(css)],
  ['모바일에서 현재보다 약 3배 크게 출항', css.includes('width:180vw') && css.includes('scale(1.24)') && html.includes('width="1400" height="700"')],
  ['실제 바다 구간 중심을 운항 기준점으로 사용', js.includes('syncPassageCenter') && js.includes('--turtle-passage-center') && css.includes('var(--turtle-passage-center,67%)')],
  ['바다 안에서 남동쪽에서 북서쪽으로 축소 이동', css.includes('translate3d(24%,-47%,0) scale(1.24)') && css.includes('translate3d(-28%,-58%,0) scale(.34)') && !css.includes('-153%')],
  ['12.6초 동안 유유히 운항 뒤 자연스럽게 종료', css.includes('12.6s linear') && js.includes('setTimeout(markFinished, 13200)')],
  ['세션당 한 번만 실행', js.includes('daedongTurtleShipHeroPlayedV1') && js.includes('alreadyPlayed')],
  ['시작 광고·팝업이 닫힌 홈에서 운항', js.includes('homeIsClear') && js.includes('MutationObserver')],
  ['데이터·주문 이벤트와 분리', !/stores|routes|data-order-key|openStore|openModal/.test(js)]
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exit(1);
