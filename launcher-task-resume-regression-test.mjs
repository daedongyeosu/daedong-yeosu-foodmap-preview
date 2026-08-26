import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('app.js', 'utf8');
const bootSource = source.slice(0, source.indexOf('const DAEDONG_TAP_MOVE_TOLERANCE'));
assert.ok(bootSource.length > 0, '설치형 앱 시작 코드를 분리할 수 있어야 합니다.');

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
  Date: {now: () => wallNow},
  performance: {now: () => 3000},
  history: {scrollRestoration: 'auto'},
  location: {reload: () => { reloads += 1; }},
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
assert.equal(reloads, 0, '검증 과정에서 불필요한 새로고침이 발생하면 안 됩니다.');

console.log('launcher task resume regression: PASS');
