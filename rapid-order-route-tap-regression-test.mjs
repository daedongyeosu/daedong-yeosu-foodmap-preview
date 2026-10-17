import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const from = source.indexOf('const DAEDONG_TAP_MOVE_TOLERANCE');
const to = source.indexOf("if (typeof window !== 'undefined') window.installDaedongTapAction", from);
assert.ok(from >= 0 && to > from);

function runtime() {
  const listeners = new Map();
  let now = 1000;
  let hit;
  const launches = [];
  const document = {
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    elementFromPoint: () => hit
  };
  const context = vm.createContext({document, performance: {now: () => now}, launches});
  vm.runInContext(source.slice(from, to), context);
  vm.runInContext("installDaedongTapAction({selector: '[data-route]', activate(target) { launches.push(target.key); return true; }});", context);
  const target = (key, y) => ({key, y, closest: () => hit});
  const baemin = target('baemin', 200);
  const coupang = target('coupang', 280);
  function dispatch(type, target, extra = {}) {
    hit = target;
    const event = {
      type, target, button: 0, pointerId: 1, clientX: 190, clientY: target.y,
      preventDefault() {}, stopImmediatePropagation() { this.stopped = true; }, ...extra
    };
    for (const handler of listeners.get(type) || []) {
      handler(event);
      if (event.stopped) break;
    }
  }
  return {baemin, coupang, launches, dispatch, advance(ms) { now += ms; }};
}

// The exact shared capture handler used before rc3: a different route selected
// 30ms after departure/resume must not be treated as the first route's echo.
const rapid = runtime();
rapid.dispatch('pointerdown', rapid.baemin);
rapid.dispatch('pointerup', rapid.baemin);
rapid.advance(30);
rapid.dispatch('click', rapid.coupang);
assert.deepEqual(rapid.launches, ['baemin', 'coupang'], '30ms 복귀 뒤 다른 주문앱의 click-only 입력을 삼키면 안 됩니다.');

// One physical tap can emit multiple event families. Keep same-button dedupe.
const duplicate = runtime();
duplicate.dispatch('pointerdown', duplicate.baemin);
duplicate.dispatch('pointerup', duplicate.baemin);
duplicate.advance(10);
duplicate.dispatch('touchstart', duplicate.baemin, {touches: [{identifier: 1, clientX: 190, clientY: 200}], changedTouches: [{identifier: 1, clientX: 190, clientY: 200}]});
duplicate.dispatch('touchend', duplicate.baemin, {changedTouches: [{identifier: 1, clientX: 190, clientY: 200}]});
duplicate.dispatch('click', duplicate.baemin);
assert.deepEqual(duplicate.launches, ['baemin']);
duplicate.advance(81);
duplicate.dispatch('pointerdown', duplicate.baemin);
duplicate.dispatch('pointerup', duplicate.baemin);
assert.deepEqual(duplicate.launches, ['baemin', 'baemin']);

const cancelled = runtime();
cancelled.dispatch('pointerdown', cancelled.baemin);
cancelled.dispatch('pointercancel', cancelled.baemin);
cancelled.dispatch('pointerup', cancelled.baemin);
cancelled.dispatch('pointerdown', cancelled.coupang);
cancelled.dispatch('pointermove', cancelled.coupang, {clientX: 220});
cancelled.dispatch('pointerup', cancelled.coupang);
assert.deepEqual(cancelled.launches, [], '스크롤·취소를 주문앱 실행으로 바꾸지 않습니다.');

console.log('PASS shared route taps: rapid different app, same-tap dedupe, later tap, drag/cancel');
