import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('rc7-address-map.css', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.match(
  html,
  /<span class="brand-symbol"[^>]*><img src="app-icon\.svg" alt=""><\/span>/,
  '메인 워드마크의 중앙 심볼은 최종 앱 아이콘을 사용해야 합니다.'
);
assert.doesNotMatch(
  html,
  /<span class="brand-symbol"[^>]*><img src="assets\/logo\.png"/,
  '메인 워드마크가 예전 로고 이미지를 다시 사용하면 안 됩니다.'
);
assert.match(
  css,
  /\.topbar \.brand-symbol img\s*\{[\s\S]*?width:100%!important;[\s\S]*?height:100%!important;[\s\S]*?object-fit:cover!important/,
  '최종 앱 아이콘이 원형 심볼 영역을 정확히 채워야 합니다.'
);
assert.match(
  serviceWorker,
  /CACHE_NAME = 'daedong-yeosu-app-shell-v9-main-logo'/,
  '기존 설치본도 새 메인 로고를 받도록 앱 셸 캐시 버전을 갱신해야 합니다.'
);

console.log('Main brand final app icon regression: PASS');
