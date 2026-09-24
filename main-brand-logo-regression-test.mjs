import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('rc7-address-map.css', 'utf8');
const logo = fs.readFileSync('assets/brand/yeosu-taste-map-logo.png');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.match(
  html,
  /<img class="brand-logo" src="assets\/brand\/yeosu-taste-map-logo\.png\?v=yeosu-taste-map-20260924-preview-1" alt="여수맛지도">/,
  '메인 헤더는 확정한 여수맛지도 통합 로고를 사용해야 합니다.'
);
assert.doesNotMatch(html, /class="brand-word(?:\s|\")|class="brand-symbol(?:\s|\")/,
  '예전 조립형 워드마크가 다시 표시되면 안 됩니다.');
assert.match(html, /<p class="brand-return-slogan">여수의 맛과 주문경로를 한눈에, 여수맛지도<\/p>/,
  '브랜드 설명은 로고와 분리된 한 문장으로 표시해야 합니다.');
assert.match(css, /\.topbar \.brand-logo\{[^}]*object-fit:contain/,
  '통합 로고는 비율을 훼손하지 않고 표시해야 합니다.');
assert.equal(logo.subarray(1, 4).toString('ascii'), 'PNG');
assert.match(serviceWorker, /'\/assets\/brand\/yeosu-taste-map-logo\.png\?v=yeosu-taste-map-20260924-preview-1'/,
  '서비스 워커도 버전이 지정된 새 로고를 캐시해야 합니다.');

console.log('Yeosu Taste Map integrated brand logo regression: PASS');
