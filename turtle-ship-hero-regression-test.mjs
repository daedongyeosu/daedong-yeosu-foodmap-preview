import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('turtle-ship-hero.css', 'utf8');
const js = fs.readFileSync('turtle-ship-hero.js', 'utf8');

const checks = [
  ['새 거북선 장면이 홈 배경에 존재', html.includes('id="turtleShipHeroScene"')],
  ['모바일 압축 자산 사용', html.includes('turtle-ship-hero-mobile-v2.webp')],
  ['데스크톱 압축 자산 사용', html.includes('turtle-ship-hero-v2.webp')],
  ['기존 바다선 제거', !html.includes('class="sea-line"')],
  ['구형 효과용 DOM은 비가시 상태', html.includes('id="navalLane" hidden')],
  ['거북선 레이어가 터치를 가로막지 않음', /\.turtle-ship-hero-scene\s*\{[\s\S]*?pointer-events:none/.test(css)],
  ['남동쪽에서 북서쪽으로 축소 이동', css.includes('translate3d(42%,18%,0) scale(1.08)') && css.includes('translate3d(-83%,-153%,0) scale(.16)')],
  ['세션당 한 번만 실행', js.includes('daedongTurtleShipHeroPlayedV1') && js.includes('alreadyPlayed')],
  ['시작 광고·팝업이 닫힌 홈에서 운항', js.includes('homeIsClear') && js.includes('MutationObserver')],
  ['데이터·주문 이벤트와 분리', !/stores|routes|data-order-key|openStore|openModal/.test(js)]
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exit(1);
