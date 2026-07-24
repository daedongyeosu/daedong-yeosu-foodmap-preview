import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('turtle-ship-hero.css', 'utf8');
const js = fs.readFileSync('turtle-ship-hero.js', 'utf8');
const finalCss = fs.readFileSync('final-experience.css', 'utf8');

const checks = [
  ['새 거북선 장면이 홈 배경에 존재', html.includes('id="turtleShipHeroScene"')],
  ['거북선 CSS·JS 캐시 버전 갱신', html.includes('turtle-ship-hero.css?v=13') && html.includes('turtle-ship-hero.js?v=8')],
  ['버튼 유리판만 30%로 조정', html.includes('final-experience.css?v=category-first-paint-1-turtle-glass-1') && finalCss.includes('--order-glass:rgba(255,255,255,.30)') && finalCss.includes('backdrop-filter:blur(2px)')],
  ['북서향 후방 3/4 구도 명시', html.includes('data-heading="northwest-rear-three-quarter"')],
  ['북서향 모바일 압축 자산 사용', html.includes('turtle-ship-northwest-mobile-v4.webp')],
  ['북서향 데스크톱 압축 자산 사용', html.includes('turtle-ship-northwest-v4.webp')],
  ['기존 바다선 제거', !html.includes('class="sea-line"')],
  ['구형 효과용 DOM은 비가시 상태', html.includes('id="navalLane" hidden')],
  ['주문 버튼·배너 간격을 거북선 작업 전 수치로 원상복구', html.includes('class="turtle-ship-passage"') && /\.turtle-ship-passage\s*\{[\s\S]*?height:30px/.test(css) && /@media\(max-width:767px\)[\s\S]*?\.turtle-ship-passage\s*\{[\s\S]*?height:28px/.test(css)],
  ['거북선 레이어가 터치를 가로막지 않음', /\.turtle-ship-hero-scene\s*\{[\s\S]*?pointer-events:none/.test(css)],
  ['거북선 때문에 버튼을 이동하지 않음', html.indexOf('id="turtleShipHeroScene"') < html.indexOf('<header class="topbar">') && !/turtle-ship-passage[^>]*>[\s\S]*?id="turtleShipHeroScene"/.test(html)],
  ['큰 투명 선체의 안정적인 합성', css.includes('backface-visibility:hidden') && css.includes('will-change:transform,opacity') && !css.includes('contain:layout paint')],
  ['투명 선체를 CSS 배경으로 직접 합성', css.includes("background:url('assets/yeosu-ux/turtle-ship-northwest-v4.webp')") && css.includes("background-image:url('assets/yeosu-ux/turtle-ship-northwest-mobile-v4.webp')")],
  ['모바일에서 5배급으로 웅장하게 출항', css.includes('width:180vw') && css.includes('scale(2.05)') && html.includes('width="1400" height="700"')],
  ['실제 복구된 바다 간격을 운항 기준점으로 사용', js.includes('syncPassageCenter') && js.includes('--turtle-passage-center') && css.includes('var(--turtle-passage-center,68%)')],
  ['간격 축소와 무관하게 기존 거북선 항로 높이 유지', js.includes('originalCourseOffset') && js.includes('? 56') && js.includes('Math.min(54, Math.max(41, window.innerWidth * 0.05))')],
  ['선미에서 용머리 방향으로 북서향 축소 이동', css.includes('translate3d(8%,-35%,0) scale(2.05)') && css.includes('translate3d(-38%,-89%,0) scale(.62)') && !css.includes('-153%')],
  ['16.8초 동안 후반까지 유유히 운항 뒤 자연스럽게 종료', css.includes('16.8s cubic-bezier(.22,.55,.2,1)') && css.includes('94%') && js.includes('setTimeout(markFinished, 17500)')],
  ['세션당 한 번만 실행', js.includes('daedongTurtleShipHeroPlayedV2') && js.includes('alreadyPlayed')],
  ['시작 광고·팝업이 닫힌 홈에서 운항', js.includes('homeIsClear') && js.includes('MutationObserver')],
  ['데이터·주문 이벤트와 분리', !/stores|routes|data-order-key|openStore|openModal/.test(js)]
];

const failed = checks.filter(([, passed]) => !passed);
for (const [name, passed] of checks) console.log(`${passed ? 'PASS' : 'FAIL'} ${name}`);
if (failed.length) process.exit(1);
