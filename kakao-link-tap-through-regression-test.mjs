import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const source = html.match(/<script data-daedong-fresh-entry-boot>\s*([\s\S]*?)<\/script>/)?.[1] || '';
assert.ok(source, '카카오 첫 진입 최상단 보호 코드를 찾을 수 있어야 합니다.');
assert.match(html, /daedong-fresh-entry-settling body\{[^}]*overflow-y:hidden!important/,
  '첫 카탈로그 레이아웃이 준비될 때까지 WebView의 중간 스크롤 복원을 잠가야 합니다.');
assert.doesNotMatch(source, /FRESH_ENTRY_PULSE_MS|pulseFreshEntryTop/,
  '고객 스크롤과 충돌하는 장시간 반복 보정은 다시 추가하면 안 됩니다.');
assert.doesNotMatch(source, /addEventListener\('pageshow'|addEventListener\('visibilitychange'/,
  '일반 카카오 화면이 다시 보일 때마다 최초 진입 잠금을 재가동하면 안 됩니다.');

function createFreshEntryRuntime() {
  let clock = 0;
  let nextTimer = 1;
  const listeners = new Map();
  const timers = new Map();
  const rootClasses = new Set();
  const scrollingElement = {scrollTop: 0};
  const body = {scrollTop: 0};
  const addEventListener = (type, listener) => {
    const current = listeners.get(type) || [];
    current.push(listener);
    listeners.set(type, current);
  };
  const dispatch = (type, event = {}) => {
    for (const listener of listeners.get(type) || []) listener({type, ...event});
  };
  const sandbox = {
    Date: {now: () => clock},
    Math,
    performance: {now: () => clock},
    history: {scrollRestoration: 'auto'},
    document: {
      scrollingElement,
      documentElement: {
        scrollTop: 0,
        classList: {
          add: value => rootClasses.add(value),
          remove: value => rootClasses.delete(value)
        }
      },
      body,
      addEventListener
    },
    addEventListener,
    requestAnimationFrame: listener => { listener(); return 1; },
    setTimeout: (listener, delay = 0) => {
      const id = nextTimer++;
      timers.set(id, {listener, delay: Number(delay) || 0});
      return id;
    },
    clearTimeout: id => timers.delete(id),
    scrollTo: (_x, y) => { scrollingElement.scrollTop = y; body.scrollTop = y; }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(source, sandbox, {filename: 'fresh-entry-boot.js'});
  return {
    sandbox,
    rootClasses,
    scrollingElement,
    body,
    dispatch,
    runTimersThrough(maxDelay) {
      const pending = [...timers.entries()]
        .filter(([, timer]) => timer.delay <= maxDelay)
        .sort((left, right) => left[1].delay - right[1].delay);
      for (const [id, timer] of pending) {
        if (!timers.delete(id)) continue;
        timer.listener();
      }
    },
    setClock(value) { clock = value; }
  };
}

const opening = createFreshEntryRuntime();
opening.sandbox.daedongArmFreshEntryTop();
assert.equal(opening.rootClasses.has('daedong-fresh-entry-settling'), true,
  '일반 새 방문은 첫 레이아웃 동안 스크롤 잠금을 가져야 합니다.');

opening.setClock(200);
opening.dispatch('pointerdown', {clientX: 220, clientY: 640});
assert.equal(opening.sandbox.daedongEarlyHomeInteraction, undefined,
  '카카오 채팅에서 링크를 연 첫 터치는 고객의 페이지 조작으로 처리하면 안 됩니다.');
assert.equal(opening.rootClasses.has('daedong-fresh-entry-settling'), true,
  '링크를 연 터치가 최초 화면 잠금을 조기에 풀면 안 됩니다.');

opening.sandbox.daedongReleaseFreshEntryTop();
assert.equal(opening.rootClasses.has('daedong-fresh-entry-settling'), true,
  '가게목록이 먼저 준비돼도 WebView 로드가 끝나기 전에는 상단 보호를 풀면 안 됩니다.');

// The actual Kakao WebView can restore its saved offset after the catalog has
// already rendered. This is the device-only race that the previous test missed.
opening.scrollingElement.scrollTop = 760;
opening.body.scrollTop = 760;
opening.dispatch('scroll');
assert.equal(opening.scrollingElement.scrollTop, 0,
  '가게목록 준비 뒤에 도착한 WebView 스크롤 복원도 즉시 최상단으로 되돌려야 합니다.');

opening.dispatch('load');
opening.scrollingElement.scrollTop = 920;
opening.body.scrollTop = 920;
opening.dispatch('scroll');
assert.equal(opening.scrollingElement.scrollTop, 0,
  'load 직후 늦게 도착한 WebView 스크롤 복원도 안정화 구간에서 막아야 합니다.');
opening.runTimersThrough(5000);
assert.equal(opening.rootClasses.has('daedong-fresh-entry-settling'), false,
  'load와 가게목록 준비 뒤 안정화 구간이 끝나면 잠금을 해제해야 합니다.');
assert.equal(opening.scrollingElement.scrollTop, 0,
  '잠금을 해제한 마지막 화면도 홈 최상단이어야 합니다.');

opening.scrollingElement.scrollTop = 430;
opening.body.scrollTop = 430;
opening.dispatch('scroll');
assert.equal(opening.scrollingElement.scrollTop, 0,
  '초기 잠금 해제 뒤 고객 동작 없이 도착한 카카오의 지연 복원은 최상단으로 되돌려야 합니다.');

opening.setClock(5000);
opening.dispatch('pointerdown', {clientX: 220, clientY: 640});
opening.scrollingElement.scrollTop = 430;
opening.body.scrollTop = 430;
opening.dispatch('scroll');
assert.equal(opening.scrollingElement.scrollTop, 430,
  '초기 안정화 뒤 실제 고객 터치가 확인되면 이동한 위치를 강제로 되돌리면 안 됩니다.');

const dragging = createFreshEntryRuntime();
dragging.sandbox.daedongArmFreshEntryTop();
dragging.setClock(400);
dragging.dispatch('pointerdown', {clientX: 220, clientY: 640});
dragging.dispatch('pointermove', {clientX: 220, clientY: 590});
assert.equal(dragging.sandbox.daedongEarlyHomeInteraction, true,
  '고객이 실제로 드래그하면 즉시 최초 화면 잠금을 해제해야 합니다.');
assert.equal(dragging.rootClasses.has('daedong-fresh-entry-settling'), false,
  '고객의 실제 조작 이후에는 페이지 스크롤을 막으면 안 됩니다.');

console.log('kakao link tap-through regression: PASS');
