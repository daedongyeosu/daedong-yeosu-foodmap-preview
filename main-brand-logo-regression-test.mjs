import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('rc7-address-map.css', 'utf8');
const logo = fs.readFileSync('assets/brand/daedongmap-logo.svg', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.match(
  html,
  /<img class="brand-logo" src="assets\/brand\/daedongmap-logo\.svg\?v=daedongmap-brand-20260922-1" alt="대동맵">/,
  '메인 헤더는 확정한 대동맵 통합 로고를 사용해야 합니다.'
);
assert.doesNotMatch(html, /class="brand-word(?:\s|\")|class="brand-symbol(?:\s|\")/,
  '예전 조립형 워드마크가 다시 표시되면 안 됩니다.');
assert.match(html, /<p class="brand-return-slogan">대동여수음식지도의 새 이름, 대동맵<\/p>/,
  '이름 전환 안내는 로고와 분리된 한 문장으로 표시해야 합니다.');
assert.match(css, /\.topbar \.brand-logo\{[^}]*object-fit:contain/,
  '통합 로고는 비율을 훼손하지 않고 표시해야 합니다.');
assert.match(logo, /viewBox="88 126 1593 661"/,
  '웹 로고는 불필요한 투명 여백을 제거한 뷰박스를 사용해야 합니다.');
assert.doesNotMatch(logo, /<image\b/i,
  '메인 로고 SVG 안에 래스터 이미지를 삽입하면 안 됩니다.');
assert.match(serviceWorker, /'\/assets\/brand\/daedongmap-logo\.svg\?v=daedongmap-brand-20260922-1'/,
  '서비스 워커도 버전이 지정된 새 로고를 캐시해야 합니다.');

console.log('Daedongmap integrated brand logo regression: PASS');
