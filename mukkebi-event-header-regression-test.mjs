import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('mukkebi-summer-event.css', 'utf8');
const js = fs.readFileSync('mukkebi-summer-event.js', 'utf8');

assert.match(
  html,
  /class="mukkebi-summer-partners"><span>여수시<\/span><strong>먹깨비<\/strong>/,
  '기관명과 먹깨비 이름은 화면 확대 시 글자 중간이 잘리지 않도록 분리해야 합니다.',
);
assert.match(
  html,
  /mukkebi-summer-event\.css\?v=20260807-viewport-fit-1-close-glow-removed-1-immediate-close-1-island-expo-coupon-2/,
  '수정된 팝업 스타일이 고객 브라우저 캐시에 가려지지 않아야 합니다.',
);
assert.match(css, /\.mukkebi-summer-head\{[^}]*padding:76px 22px 25px/, '일반 화면에서는 닫기 버튼 전용 상단 공간을 유지해야 합니다.');
assert.match(css, /\.mukkebi-summer-partners strong\{[^}]*font-size:18px/, '일반 화면에서는 먹깨비 이름을 기관명보다 크게 강조해야 합니다.');
assert.match(css, /\.mukkebi-summer-partners span,\.mukkebi-summer-partners strong\{white-space:nowrap\}/, '기관명과 먹깨비 단어 내부가 줄바꿈되면 안 됩니다.');
assert.match(css, /\.mukkebi-summer-partners\{[^}]*word-break:keep-all/, 'Android 글자 확대에서도 한글 단어 중간 줄바꿈을 막아야 합니다.');
assert.match(css, /\.mukkebi-summer-close\{[^}]*width:48px;height:48px/, '닫기 버튼은 충분한 터치 크기를 유지해야 합니다.');
assert.match(css, /\.mukkebi-summer-close\{[^}]*touch-action:manipulation/, 'Android 터치에서 닫기 버튼 입력을 지연하면 안 됩니다.');
assert.match(js, /window\.installDaedongTapAction\(\{[\s\S]*selector: '#mukkebiSummerClose'[\s\S]*dismissEventImmediately\(event\)/,
  '먹깨비 팝업 X는 스크롤 제스처와 구분되는 공통 모바일 탭 경로를 사용해야 합니다.');
assert.doesNotMatch(js, /closeButton\?\.addEventListener\('pointerdown', dismissEventImmediately\)/,
  '손가락을 대는 순간 닫으면 스크롤 시작을 닫기로 오인할 수 있습니다.');
assert.match(js, /function dismissEventImmediately\(event\)[\s\S]*?closeEvent\(\)/, '먹깨비 팝업 닫기 뒤처리 전에 화면부터 숨겨야 합니다.');
const headerRule = css.match(/\.mukkebi-summer-head\{[^}]*\}/)?.[0] || '';
assert.doesNotMatch(headerRule, /radial-gradient/, '닫기 버튼 주변의 장식용 원형 음영은 없어야 합니다.');
assert.match(headerRule, /background:linear-gradient\(145deg,#00bfdc,#0875d9 66%,#064bb7\)/, '기존 파란 배경 그라데이션은 유지해야 합니다.');

const compactMatch = css.match(/@media\(max-height:700px\)\{([\s\S]*?)\n\}/);
assert.ok(compactMatch, '세로가 짧은 모바일 화면용 팝업 배치가 있어야 합니다.');
const compact = compactMatch[1];
assert.match(compact, /\.mukkebi-summer-event\{padding:8px\}/, '짧은 화면에서는 팝업 바깥 여백을 줄여야 합니다.');
assert.match(compact, /\.mukkebi-summer-card\{[^}]*max-height:calc\(100dvh - 16px\)/, '팝업은 짧은 화면의 표시 영역 안에 들어가야 합니다.');
assert.match(compact, /\.mukkebi-summer-head\{padding:62px 14px 13px\}/, '48px 닫기 버튼 공간을 남기면서 제목 영역 높이를 줄여야 합니다.');
assert.match(compact, /\.mukkebi-summer-details\{grid-template-columns:1fr 1fr/, '네 개의 행사 안내는 두 열로 유지해 한 화면에 보여야 합니다.');
assert.match(css, /\.mukkebi-summer-details li\{[^}]*word-break:keep-all/, '한글 안내가 글자 중간에서 잘리면 안 됩니다.');
assert.match(compact, /\.mukkebi-summer-order\{padding:9px 11px/, '주문 버튼은 보이면서도 세로 공간을 과도하게 차지하지 않아야 합니다.');
assert.match(compact, /\.mukkebi-summer-hide\{margin-top:5px/, '오늘 하루 보지 않기 버튼도 같은 화면에 보여야 합니다.');
assert.match(css, /@media\(max-height:560px\)/, '더 짧은 브라우저 화면을 위한 추가 압축 배치가 있어야 합니다.');
assert.match(html, /id="mukkebiSummerOrder"[^>]*>먹깨비로 주문하기<\/button>/, '먹깨비 주문 버튼을 유지해야 합니다.');
assert.match(html, /id="mukkebiSummerHideToday"[^>]*>오늘 하루 보지 않기<\/button>/, '오늘 하루 보지 않기 버튼을 유지해야 합니다.');

console.log('PASS: 먹깨비 행사 팝업의 전체 내용과 버튼이 짧은 모바일 화면 안에 맞춰집니다.');
