import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const menu = fs.readFileSync('store-menu-preview.js', 'utf8');
const service = fs.readFileSync('store-service-info.js', 'utf8');
const serviceStyle = fs.readFileSync('store-service-info.css', 'utf8');
const rc5 = fs.readFileSync('rc5-fixes.js', 'utf8');
const rc7 = fs.readFileSync('rc7-address-map.js', 'utf8');
const intro = fs.readFileSync('turtle-ship-hero.js', 'utf8');
const summer = fs.readFileSync('mukkebi-summer-event.js', 'utf8');

assert.match(app, /function installDaedongTapAction\(\{selector, activate\}\)/,
  '모든 닫기·돌아가기 화면이 공유할 신뢰 가능한 탭 처리기가 필요합니다.');
assert.match(app, /document\.addEventListener\('pointerup', finishPointer, true\)/,
  'pointerdown에서 창을 숨겨 클릭이 아래 화면으로 관통하지 않도록 pointerup에서 처리해야 합니다.');
assert.match(app, /document\.addEventListener\('touchend', finishTouch, \{capture: true, passive: false\}\)/,
  '카카오톡 Android WebView의 순수 touchend 입력을 처리해야 합니다.');
assert.match(app, /daedongGhostClick[\s\S]*document\.addEventListener\('click',[\s\S]*consumeDaedongEvent\(event\)/,
  '닫힌 창 아래의 가게가 같은 탭의 후속 click으로 열리지 않도록 관통 방지가 필요합니다.');
assert.doesNotMatch(app, /document\.addEventListener\('pointerdown',[\s\S]{0,260}#modal \.modal-close[\s\S]{0,160}hardClose\(\)/,
  '공용 모달을 pointerdown 순간 닫는 예전 구현을 되살리면 안 됩니다.');

for (const selector of [
  '#modal .modal-close',
  '.popover-close',
  '[data-back-app-browser]',
  '.store-other-close',
  '.startup-close'
]) {
  assert.ok(app.includes(`selector: '${selector}'`), `${selector}를 공용 탭 처리기에 연결해야 합니다.`);
}
assert.match(service, /installDaedongTapAction\?\.\(\{[\s\S]*selector: '\[data-store-service-overview-close\]'/,
  '영업시간·결제·배달혜택 화면 X가 순수 터치로 닫혀야 합니다.');
assert.match(serviceStyle, /\.store-service-overview > header \{[\s\S]{0,180}position: sticky;[\s\S]{0,100}z-index: 5;/,
  '혜택 섹션으로 이동해도 영업정보 X가 화면 밖으로 사라지면 안 됩니다.');
assert.match(service, /function requestOverviewClose\(\)[\s\S]{0,260}hideOverview\(\);[\s\S]{0,180}daedongServiceHistoryClose[\s\S]{0,100}history\.back\(\)/,
  '영업정보 X는 이력 이동을 기다리지 않고 화면을 먼저 닫아야 합니다.');
assert.match(app, /dataset\.daedongServiceHistoryClose === '1'[\s\S]{0,180}delete document\.documentElement\.dataset\.daedongServiceHistoryClose;[\s\S]{0,60}return;/,
  '영업정보 이력 정리가 아래 가게 상세까지 닫지 않도록 한 번만 소비해야 합니다.');
assert.match(menu, /installDaedongTapAction\?\.\(\{[\s\S]*selector: '\[data-menu-order-sheet-close\]'/,
  '음식 주문방법 선택 시트 X와 배경이 순수 터치로 닫혀야 합니다.');
assert.match(rc5, /installDaedongTapAction\?\.\(\{selector:'\[data-rc5-postcode-close\]'/,
  '주소검색 돌아가기 버튼이 순수 터치로 작동해야 합니다.');
assert.match(rc7, /installDaedongTapAction\?\.\(\{[\s\S]*selector: '\[data-rc7-step-back\]'/,
  '주소 지도 단계의 왼쪽 화살표가 순수 터치로 작동해야 합니다.');
assert.match(intro, /installDaedongTapAction\(\{[\s\S]*selector: '#communityIntroClose'/,
  '첫 안내창 X가 공용 터치 처리기를 사용해야 합니다.');
assert.match(summer, /installDaedongTapAction\(\{[\s\S]*selector: '#mukkebiSummerClose'/,
  '먹깨비 행사창 X가 공용 터치 처리기를 사용해야 합니다.');

assert.match(html, /app\.js\?v=[^"\n]*modal-touch-close-1/);
assert.match(html, /turtle-ship-hero\.js\?v=[^"\n]*shared-touch-close-1/);
assert.match(html, /store-service-info\.js\?v=[^"\n]*shared-touch-close-1/);
assert.match(html, /store-service-info\.css\?v=[^"\n]*sticky-close-1/);
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*order-sheet-touch-close-1/);
assert.match(html, /mukkebi-summer-event\.js\?v=[^"\n]*shared-touch-close-1/);
assert.match(finalExperience, /rc5-fixes\.js\?v=[^'\n]*postcode-touch-back-1/);
assert.match(finalExperience, /rc7-address-map\.js\?v=[^'\n]*step-touch-back-1/);

console.log('modal close touch regression: PASS');
