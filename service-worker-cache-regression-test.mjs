import assert from 'node:assert/strict';
import fs from 'node:fs';

const serviceWorker = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

assert.match(serviceWorker, /daedong-yeosu-app-shell-v6-static-performance/,
  '새 서비스워커가 설치되도록 앱 셸 캐시 버전을 올려야 합니다.');
assert.match(serviceWorker, /daedong-yeosu-runtime-v6-static-performance/,
  '정적 파일용 런타임 캐시를 분리해야 합니다.');
assert.match(serviceWorker, /\['style', 'script', 'image', 'font'\]\.includes\(request\.destination\)/,
  'CSS·자바스크립트·이미지·폰트를 정적 파일로 판별해야 합니다.');
assert.match(serviceWorker, /if \(isStaticAsset\(event\.request, requestUrl\)\) \{\s*event\.respondWith\(staleWhileRevalidate\(event\)\)/,
  '정적 파일은 캐시를 즉시 사용하고 백그라운드에서 갱신해야 합니다.');
assert.doesNotMatch(serviceWorker, /fetch\(event\.request, \{cache: 'no-store'\}\)\s*\.catch\(\(\) => caches\.match\(event\.request\)\)/,
  '모든 정적 파일을 매번 no-store로 다시 받는 경로를 되살리면 안 됩니다.');
assert.match(serviceWorker, /event\.request\.mode === 'navigate'[\s\S]*fetch\(event\.request, \{cache: 'no-store'\}\)/,
  'HTML 이동은 최신 배포를 즉시 확인할 수 있도록 network-first를 유지해야 합니다.');

console.log('PASS: 반복 방문에서 정적 파일 캐시를 사용하고 HTML은 최신 배포를 확인합니다.');
