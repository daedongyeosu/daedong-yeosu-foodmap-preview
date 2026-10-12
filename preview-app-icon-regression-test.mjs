import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
const index = fs.readFileSync('index.html', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.match(manifest.name, /TEST/, '설치 앱 전체 이름에 TEST 표시가 있어야 합니다.');
assert.match(manifest.short_name, /TEST/, '휴대폰 홈 화면의 짧은 이름에 TEST 표시가 있어야 합니다.');
assert.equal(manifest.start_url, '/?source=preview-app', '미리보기 전용 시작 주소여야 합니다.');
assert.equal(manifest.icons.length, 4, '일반 및 maskable 아이콘 네 개를 제공해야 합니다.');

for (const icon of manifest.icons) {
  assert.match(icon.src, /daedong-preview-icon/, `미리보기 전용 아이콘이어야 합니다: ${icon.src}`);
  assert.ok(fs.existsSync(icon.src.replace(/^\//, '')), `아이콘 파일이 없습니다: ${icon.src}`);
}

assert.match(index, /apple-mobile-web-app-title" content="맛지도 TEST"/, 'iPhone 홈 화면 이름도 TEST로 구분해야 합니다.');
assert.match(index, /daedong-preview-icon-192\.png/, '브라우저 및 iPhone 아이콘은 미리보기 전용 파일이어야 합니다.');
assert.match(serviceWorker, /daedong-preview-icon-192\.png\?v=preview-test-icon-20261012-1/, '미리보기 아이콘은 고유 버전 주소로 캐시되어야 합니다.');
assert.match(serviceWorker, /daedong-preview-icon-maskable-512\.png/, '서비스워커가 미리보기 아이콘을 오프라인 캐시에 포함해야 합니다.');

console.log('PASS preview app icon distinction');
