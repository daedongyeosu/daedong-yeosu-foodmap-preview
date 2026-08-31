import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('rc7-address-map.css', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.match(
  html,
  /<span class="brand-symbol"[^>]*><img src="app-icon\.svg\?v=official-brand-20260830-1" alt=""><\/span>/,
  '메인 워드마크의 중앙 심볼은 최종 앱 아이콘을 사용해야 합니다.'
);
assert.doesNotMatch(
  html,
  /<span class="brand-symbol"[^>]*><img src="(?:assets\/logo\.png|app-icon\.svg)"/,
  '메인 워드마크가 예전 로고 또는 캐시된 무버전 아이콘을 다시 사용하면 안 됩니다.'
);
assert.match(
  css,
  /\.topbar \.brand-symbol\s*\{[\s\S]*?border-radius:15px;/,
  '메인 로고 프레임은 스토어 아이콘과 같은 둥근 사각형이어야 합니다.'
);
assert.match(
  css,
  /\.topbar \.brand-symbol img\s*\{[\s\S]*?width:100%!important;[\s\S]*?height:100%!important;[\s\S]*?border-radius:14px!important;object-fit:contain!important/,
  '포크 끝까지 보이도록 최종 앱 아이콘 전체를 프레임 안에 맞춰야 합니다.'
);
assert.doesNotMatch(
  css,
  /\.topbar \.brand-symbol(?: img)?\s*\{[^}]*border-radius:50%/,
  '메인 로고를 원형으로 잘라 포크를 숨기면 안 됩니다.'
);
assert.match(
  serviceWorker,
  /CACHE_NAME = 'daedong-yeosu-app-shell-v30-coupang-photo-quarantine'/,
  '기존 설치본도 새 메인 로고를 받도록 앱 셸 캐시 버전을 갱신해야 합니다.'
);
assert.match(
  serviceWorker,
  /'\/app-icon\.svg\?v=official-brand-20260830-1'/,
  '서비스 워커도 버전이 지정된 공식 로고를 캐시해야 합니다.'
);

console.log('Main brand final app icon regression: PASS');
