import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const bootSource = source.slice(0, source.indexOf('const DAEDONG_TAP_MOVE_TOLERANCE'));
assert.ok(bootSource.length > 0, '설치형 앱 시작 코드를 분리할 수 있어야 합니다.');
assert.match(bootSource, /document\.addEventListener\('pointerdown', detectDaedongResumeGap/,
  '설치형 Android 래퍼가 타이머보다 먼저 전달한 재개 터치에서도 중단된 시간 간격을 확인해야 합니다.');
assert.match(bootSource, /document\.addEventListener\('touchstart', detectDaedongResumeGap/);
assert.match(html, /app\.js\?v=[^"\n]*kakao-pointer-resume-1/,
  '고객의 기존 캐시에 남은 앱 코드를 새 재개 감지 버전으로 교체해야 합니다.');

let wallNow = 0;
let reloads = 0;
const intervals = [];
const windowListeners = new Map();
const documentListeners = new Map();
const scrollingElement = {scrollTop: 900};
const body = {scrollTop: 900};
const sessionValues = new Map([['daedong-installed-launch-reloaded', '1']]);

function addListener(registry, type, listener, options = {}) {
  const current = registry.get(type) || [];
  current.push({listener, once: Boolean(options?.once)});
  registry.set(type, current);
}

function dispatch(registry, type) {
  const current = [...(registry.get(type) || [])];
  registry.set(type, current.filter(item => !item.once));
  current.forEach(item => item.listener({type}));
}

const sandbox = {
  console,
  URLSearchParams,
  Date: {now: () => wallNow},
  performance: {now: () => 3000},
  history: {scrollRestoration: 'auto'},
  location: {search: '?source=android-app', reload: () => { reloads += 1; }},
  sessionStorage: {
    getItem: key => sessionValues.get(key) ?? null,
    setItem: (key, value) => sessionValues.set(key, String(value)),
    removeItem: key => sessionValues.delete(key)
  },
  document: {
    readyState: 'complete',
    visibilityState: 'visible',
    scrollingElement,
    documentElement: scrollingElement,
    body,
    addEventListener: (type, listener, options) => addListener(documentListeners, type, listener, options)
  },
  requestAnimationFrame: listener => listener(),
  setTimeout: listener => { listener(); return 1; },
  setInterval: listener => { intervals.push(listener); return intervals.length; },
  matchMedia: () => ({matches: false}),
  addEventListener: (type, listener, options) => addListener(windowListeners, type, listener, options),
  scrollTo: (_x, y) => {
    scrollingElement.scrollTop = y;
    body.scrollTop = y;
  }
};
sandbox.window = sandbox;
vm.runInNewContext(bootSource, sandbox, {filename: 'app-launch-boot.js'});

dispatch(windowListeners, 'pageshow');
scrollingElement.scrollTop = 740;
body.scrollTop = 740;
dispatch(windowListeners, 'pageshow');
assert.equal(scrollingElement.scrollTop, 0,
  '같은 PWABuilder Chrome 작업의 두 번째 pageshow는 홈 최상단으로 이동해야 합니다.');

scrollingElement.scrollTop = 810;
body.scrollTop = 810;
dispatch(documentListeners, 'resume');
assert.equal(scrollingElement.scrollTop, 0,
  'Android Page Lifecycle resume도 홈 최상단으로 이동해야 합니다.');

scrollingElement.scrollTop = 920;
body.scrollTop = 920;
wallNow = 3000;
intervals.at(-1)();
assert.equal(scrollingElement.scrollTop, 0,
  '런처가 다른 이벤트를 누락해도 중단된 타이머 간격으로 홈을 복구해야 합니다.');

sandbox.daedongReadEarlyExternalReturn = () => ({returnToken: 'valid-order-return'});
scrollingElement.scrollTop = 680;
body.scrollTop = 680;
wallNow = 6000;
intervals.at(-1)();
assert.equal(scrollingElement.scrollTop, 680,
  '검증된 주문앱 복귀 중에는 보던 위치를 홈 초기화로 덮어쓰면 안 됩니다.');
sandbox.daedongReadEarlyExternalReturn = () => null;
wallNow = 7000;
dispatch(windowListeners, 'pageshow');
assert.equal(scrollingElement.scrollTop, 680,
  '주문앱 복귀 토큰을 소비한 직후 이어지는 pageshow도 보던 위치를 보존해야 합니다.');
wallNow = 8000;
sandbox.daedongLastValidatedExternalReturnAt = wallNow;
dispatch(windowListeners, 'pageshow');
assert.equal(scrollingElement.scrollTop, 680,
  '복귀 처리기가 토큰을 소비했다고 알린 직후에도 보던 위치를 보존해야 합니다.');
wallNow = 14000;
dispatch(windowListeners, 'pageshow');
assert.equal(scrollingElement.scrollTop, 0,
  '주문앱 복귀 유예시간이 지난 뒤 앱 아이콘으로 재실행하면 홈으로 이동해야 합니다.');

scrollingElement.scrollTop = 770;
body.scrollTop = 770;
wallNow = 17000;
dispatch(documentListeners, 'pointerdown');
assert.equal(scrollingElement.scrollTop, 0,
  '카카오가 타이머 재개보다 먼저 첫 터치를 전달해도 기존 중간 위치를 홈으로 되돌려야 합니다.');

scrollingElement.scrollTop = 650;
body.scrollTop = 650;
wallNow = 17500;
dispatch(documentListeners, 'pointerdown');
assert.equal(scrollingElement.scrollTop, 650,
  '정상 실행 중 이어지는 고객 터치는 홈으로 강제 이동시키면 안 됩니다.');

sandbox.daedongReadEarlyExternalReturn = () => ({returnToken: 'valid-order-return'});
scrollingElement.scrollTop = 880;
body.scrollTop = 880;
wallNow = 22000;
dispatch(documentListeners, 'pointerdown');
assert.equal(scrollingElement.scrollTop, 880,
  '검증된 주문앱 복귀의 첫 터치는 중단 시간이 길어도 보던 위치를 보존해야 합니다.');
assert.equal(reloads, 0, '검증 과정에서 불필요한 새로고침이 발생하면 안 됩니다.');

console.log('launcher task resume regression: PASS');
