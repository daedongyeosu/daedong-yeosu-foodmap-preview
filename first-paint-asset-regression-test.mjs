import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const serviceWorker = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
const firstHeroBytes = fs.statSync(new URL('./images/01.webp', import.meta.url)).size;
const headerLogoBytes = fs.statSync(new URL('./assets/logo-header.webp', import.meta.url)).size;

assert.match(html, /rel="preload" as="image" href="images\/01\.webp" type="image\/webp"/,
  '첫 배너는 최적화한 WebP 파일을 미리 받아야 합니다.');
assert.doesNotMatch(html, /rel="preload" as="image" href="images\/01\.png"/,
  '1MB가 넘는 첫 PNG 배너를 초기 화면에서 미리 받으면 안 됩니다.');
assert.match(app, /index === 0 \? 'images\/01\.webp'/,
  '화면에 그리는 첫 배너도 preload와 같은 WebP여야 합니다.');
assert.match(html, /<img src="assets\/logo-header\.webp"[^>]*width="384" height="256">/,
  '작은 헤더에는 전용 최적화 로고를 사용해야 합니다.');
assert.match(serviceWorker, /'\/assets\/logo-header\.webp'/,
  '앱 셸 설치가 큰 원본 로고 대신 헤더용 로고를 저장해야 합니다.');
assert.ok(firstHeroBytes < 200 * 1024,
  `첫 WebP 배너가 너무 큽니다: ${firstHeroBytes} bytes`);
assert.ok(headerLogoBytes < 50 * 1024,
  `헤더 로고가 너무 큽니다: ${headerLogoBytes} bytes`);

console.log('PASS: 첫 화면 핵심 이미지 용량을 줄이고 preload와 실제 표시 파일을 일치시켰습니다.');
