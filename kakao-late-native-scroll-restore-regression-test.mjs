import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const source = html.match(/<script data-daedong-fresh-entry-boot>\s*([\s\S]*?)<\/script>/)?.[1] || '';
assert.ok(source, 'fresh-entry 초기 보호 스크립트를 찾을 수 있어야 합니다.');

let now = 0;
let nextTimerId = 1;
const timers = new Map();
const windowListeners = new Map();
const documentListeners = new Map();
const classes = new Set();
const scrollingElement = {scrollTop: 0};
const body = {scrollTop: 0};

const addListener = (registry, type, listener) => {
  const current = registry.get(type) || [];
  current.push(listener);
  registry.set(type, current);
};
const dispatch = (registry, type, event = {}) => {
  for (const listener of registry.get(type) || []) listener({type, ...event});
};
const setTimeoutFake = (listener, delay = 0) => {
  const id = nextTimerId++;
  timers.set(id, {listener, dueAt: now + Number(delay || 0)});
  return id;
};
const clearTimeoutFake = id => timers.delete(id);
const advanceTo = target => {
  while (true) {
    const ready = [...timers.entries()]
      .filter(([, timer]) => timer.dueAt <= target)
      .sort((left, right) => left[1].dueAt - right[1].dueAt)[0];
    if (!ready) break;
    const [id, timer] = ready;
    timers.delete(id);
    now = timer.dueAt;
    timer.listener();
  }
  now = target;
};

const sandbox = {
  console,
  Math,
  Number,
  performance: {now: () => now},
  history: {scrollRestoration: 'auto'},
  document: {
    readyState: 'complete',
    scrollingElement,
    documentElement: {
      scrollTop: 0,
      classList: {
        add: value => classes.add(value),
        remove: value => classes.delete(value)
      }
    },
    body,
    addEventListener: (type, listener) => addListener(documentListeners, type, listener)
  },
  addEventListener: (type, listener) => addListener(windowListeners, type, listener),
  setTimeout: setTimeoutFake,
  clearTimeout: clearTimeoutFake,
  requestAnimationFrame: listener => listener(now),
  scrollTo: (_x, y) => {
    scrollingElement.scrollTop = y;
    body.scrollTop = y;
    sandbox.scrollY = y;
  },
  scrollY: 0
};
sandbox.window = sandbox;
vm.runInNewContext(source, sandbox, {filename: 'fresh-entry-boot.js'});

sandbox.daedongArmFreshEntryTop();
sandbox.daedongReleaseFreshEntryTop();
advanceTo(1200);
assert.equal(classes.has('daedong-fresh-entry-settling'), false,
  '초기 화면 잠금은 목록이 준비되면 풀려 사용자가 화면을 조작할 수 있어야 합니다.');

advanceTo(5000);
scrollingElement.scrollTop = 720;
body.scrollTop = 720;
sandbox.scrollY = 720;
dispatch(windowListeners, 'scroll');
assert.equal(scrollingElement.scrollTop, 0,
  '카카오 WebView가 초기 잠금 해제 뒤 늦게 과거 위치를 복원해도 홈 최상단을 유지해야 합니다.');

dispatch(documentListeners, 'pointerdown', {clientX: 100, clientY: 400});
dispatch(documentListeners, 'pointermove', {clientX: 100, clientY: 360});
scrollingElement.scrollTop = 320;
body.scrollTop = 320;
sandbox.scrollY = 320;
dispatch(windowListeners, 'scroll');
assert.equal(scrollingElement.scrollTop, 320,
  '실제 사용자가 드래그한 뒤에는 늦은 복원 보호가 정상 스크롤을 방해하면 안 됩니다.');

console.log('kakao late native scroll restore regression: PASS');
