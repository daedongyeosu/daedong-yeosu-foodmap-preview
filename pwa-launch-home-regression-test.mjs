import assert from 'node:assert/strict';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('manifest.webmanifest', 'utf8'));
const app = fs.readFileSync('app.js', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.equal(manifest.start_url, '/?source=android-app',
  '설치형 앱을 누르면 항상 홈 시작 주소로 열려야 합니다.');
assert.deepEqual(manifest.launch_handler, {client_mode: 'navigate-existing'},
  '이미 실행 중인 설치형 앱도 아이콘을 다시 누르면 시작 주소로 이동해야 합니다.');
assert.match(app, /history\.scrollRestoration = 'manual'/,
  '브라우저가 과거 중간 스크롤을 자동 복원하지 못하게 해야 합니다.');
assert.match(app, /window\.scrollTo\(0, 0\)/,
  '시작 주소가 다시 열리면 홈 최상단으로 이동해야 합니다.');
assert.match(app, /window\.launchQueue\.setConsumer\(resetInstalledAppLaunch\)/,
  '실행 중인 설치형 앱의 아이콘 재실행 이벤트를 직접 처리해야 합니다.');
assert.match(app, /sessionStorage\.setItem\(DAEDONG_LAUNCH_RELOAD_MARKER, '1'\)/,
  '오래 실행된 앱은 최신 가게 자료를 다시 받도록 한 번만 새로고침해야 합니다.');
assert.match(app, /globalThis\.daedongPendingExternalReturn/,
  '주문앱에서 돌아오는 동작은 홈 초기화에서 제외해야 합니다.');
assert.match(serviceWorker, /CACHE_NAME = 'daedong-yeosu-app-shell-v17-launch-consumer'/,
  '기존 설치본도 새 manifest를 내려받도록 앱 셸 캐시 버전을 올려야 합니다.');

console.log('pwa-launch-home-regression-test: pass');
