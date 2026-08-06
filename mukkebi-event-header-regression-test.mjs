import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('mukkebi-summer-event.css', 'utf8');

assert.match(
  html,
  /class="mukkebi-summer-partners"><span>여수시 · 전남신용보증재단<\/span><strong>먹깨비<\/strong>/,
  '기관명과 먹깨비 이름은 화면 확대 시 글자 중간이 잘리지 않도록 분리해야 합니다.',
);
assert.match(
  html,
  /mukkebi-summer-event\.css\?v=20260807-header-readability-1/,
  '수정된 팝업 스타일이 고객 브라우저 캐시에 가려지지 않아야 합니다.',
);
assert.match(css, /\.mukkebi-summer-head\{[^}]*padding:76px 22px 25px/, '닫기 버튼 전용 상단 공간을 확보해야 합니다.');
assert.match(css, /\.mukkebi-summer-partners strong\{[^}]*font-size:18px/, '먹깨비 이름을 기관명보다 크게 강조해야 합니다.');
assert.match(css, /\.mukkebi-summer-partners span,\.mukkebi-summer-partners strong\{white-space:nowrap\}/, '기관명과 먹깨비 단어 내부가 줄바꿈되면 안 됩니다.');
assert.match(css, /\.mukkebi-summer-partners\{[^}]*word-break:keep-all/, 'Android 글자 확대에서도 한글 단어 중간 줄바꿈을 막아야 합니다.');
assert.match(css, /\.mukkebi-summer-close\{[^}]*width:48px;height:48px/, '닫기 버튼은 충분한 터치 크기를 유지해야 합니다.');

console.log('PASS: 먹깨비 행사 팝업 제목과 닫기 버튼이 분리되고 먹깨비 이름이 선명하게 표시됩니다.');
