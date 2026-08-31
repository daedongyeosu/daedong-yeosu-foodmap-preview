import assert from 'node:assert/strict';
import fs from 'node:fs';

const js = fs.readFileSync(new URL('./store-menu-preview.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./store-menu-preview.css', import.meta.url), 'utf8');

assert.match(js, /return '';/, '사진이 없을 때 오염된 대표이미지 대체물을 강제로 표시하지 않아야 합니다.');
assert.match(js, /store-menu-hero\$\{heroImage \? '' : ' is-no-photo'\}/, '사진 없는 메뉴 화면은 전용 레이아웃이어야 합니다.');
assert.match(css, /\.store-menu-preview\s*\{[^}]*grid-template-rows:\s*auto minmax\(0, 1fr\) auto/s, '주문 버튼은 메뉴 스크롤과 겹치지 않는 별도 행이어야 합니다.');
assert.match(css, /\.store-menu-sticky-actions\s*\{[^}]*position:\s*relative/s, '주문 버튼이 메뉴 카드 위에 고정되어서는 안 됩니다.');
assert.match(css, /\.store-menu-hero\.is-no-photo/, '사진 없는 가게의 영웅영역이 과도한 빈 공간을 만들지 않아야 합니다.');
assert.match(css, /font-size:\s*clamp\(28px, 9vw, 38px\)/, '모바일 가게명은 화면 폭에 맞게 제한되어야 합니다.');

console.log('coupang menu quarantine mobile regression test passed');
