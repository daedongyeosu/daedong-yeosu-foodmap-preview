import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('app.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const mobileRule = css.match(/@media\(max-width:520px\)\{[^\n]+\}/)?.[0] || '';
assert.ok(mobileRule, '모바일 가게목록 스타일을 찾을 수 있어야 합니다.');
assert.match(
  mobileRule,
  /\.store-grid\{[^}]*align-items:flex-start[^}]*\}/,
  '가로 목록의 모든 가게카드를 가장 긴 카드 높이로 늘리면 안 됩니다.'
);
assert.match(
  mobileRule,
  /\.store-grid>\.store-card\{[^}]*align-self:flex-start[^}]*\}/,
  '각 가게카드는 자기 콘텐츠 높이만 사용해야 합니다.'
);
assert.doesNotMatch(
  mobileRule,
  /\.store-grid>\.store-card\{[^}]*(?:height|min-height):(?:100%|100dvh|100vh)/,
  '모바일 가게카드에 화면 또는 부모 높이를 강제로 적용하면 안 됩니다.'
);
assert.match(
  html,
  /app\.css\?v=[^"\n]*mobile-card-natural-height-1/,
  '고객 휴대전화가 새 모바일 카드 스타일을 즉시 받아야 합니다.'
);

console.log('mobile store card height regression: PASS');
