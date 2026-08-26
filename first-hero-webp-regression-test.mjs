import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const serviceWorker = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
const firstHeroBytes = fs.statSync(new URL('./images/01.webp', import.meta.url)).size;

assert.match(app, /index === 0 \? 'images\/01\.webp'/,
  '첫 광고 배너는 최적화한 WebP를 사용해야 합니다.');
assert.ok(firstHeroBytes < 200 * 1024,
  `첫 WebP 배너가 너무 큽니다: ${firstHeroBytes} bytes`);
assert.match(html, /app\.js\?v=[^"\n]*first-hero-webp-1/,
  '최적화한 배너 경로가 휴대전화 캐시에 가리지 않아야 합니다.');
assert.doesNotMatch(html, /rel="preload" as="image" href="images\/01\.png"/,
  '1MB가 넘는 PNG 배너를 초기 화면에서 미리 받으면 안 됩니다.');
assert.match(html, /<img src="app-icon\.svg" alt="">/,
  '현재의 가벼운 SVG 헤더 로고를 유지해야 합니다.');
assert.match(serviceWorker, /daedong-yeosu-app-shell-v16-launch-home/,
  '최신 서비스워커 캐시 전략을 예전 구현으로 되돌리면 안 됩니다.');

console.log('PASS: 첫 광고 배너를 200KB 이하 WebP로 제공하고 최신 성능 구조를 유지합니다.');
