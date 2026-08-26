import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const source = html.match(/<script data-daedong-fresh-entry-boot>\s*([\s\S]*?)<\/script>/)?.[1] || '';
assert.ok(source, '카카오 첫 진입 최상단 보호 코드를 찾을 수 있어야 합니다.');

let clock = 0;
const listeners = new Map();
const timers = [];
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
    visibilityState: 'visible',
    addEventListener
  },
  addEventListener,
  setTimeout: listener => { timers.push(listener); return timers.length; },
  clearTimeout: () => {},
  scrollTo: (_x, y) => { scrollingElement.scrollTop = y; body.scrollTop = y; }
};
sandbox.window = sandbox;
vm.runInNewContext(source, sandbox, {filename: 'fresh-entry-boot.js'});
sandbox.daedongArmFreshEntryTop();

clock = 200;
scrollingElement.scrollTop = 760;
body.scrollTop = 760;
dispatch('pointerdown', {clientX: 220, clientY: 640});
timers.shift()?.();
assert.equal(sandbox.daedongEarlyHomeInteraction, undefined,
  '카카오 채팅에서 링크를 연 첫 터치는 고객의 페이지 조작으로 처리하면 안 됩니다.');
assert.equal(scrollingElement.scrollTop, 0,
  '첫 링크 터치 뒤 카카오가 복원한 중간 위치를 다시 최상단으로 되돌려야 합니다.');

clock = 400;
dispatch('pointerdown', {clientX: 220, clientY: 640});
dispatch('pointermove', {clientX: 220, clientY: 590});
assert.equal(sandbox.daedongEarlyHomeInteraction, true,
  '고객이 실제로 드래그하면 즉시 최상단 보호를 해제해야 합니다.');

console.log('kakao link tap-through regression: PASS');
