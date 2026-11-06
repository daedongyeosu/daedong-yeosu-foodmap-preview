import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const start = source.lastIndexOf('  window.setInterval(() => {');
assert.ok(start > 0, '시간 갱신과 홈 영업 중 숫자는 같은 갱신 경로를 사용해야 합니다.');
const tail = source.slice(start).replace(/\}\)\(\);\s*$/, '');
const intervals = [], documentEvents = new Map(), windowEvents = new Map();
let currentCount = 689, displayedCount = 689, renderedCount = 689, refreshes = 0, state = 'ready';
const document = {
  visibilityState: 'visible',
  addEventListener: (name, handler) => documentEvents.set(name, handler),
  querySelectorAll: () => [],
  querySelector: () => null
};
const context = {
  document,
  window: {
    setInterval: (handler, delay) => intervals.push({handler, delay}),
    addEventListener: (name, handler) => windowEvents.set(name, handler)
  },
  get serviceLoadState() { return state; },
  renderStores: () => { renderedCount = currentCount; },
  ensureOverviewButtons: () => { displayedCount = currentCount; refreshes++; },
  decorateStoreCards() {}, decorateStoreDetails() {}, renderOverview() {}
};
vm.runInNewContext(tail, context);
assert.equal(intervals.length, 1);
assert.equal(intervals[0].delay, 60000);
currentCount = 1494;
intervals[0].handler();
assert.equal(renderedCount, 1494);
assert.equal(displayedCount, 1494, '가게 목록만 갱신하고 홈 숫자를 이전 값으로 남기면 안 됩니다.');
currentCount = 51;
document.visibilityState = 'hidden';
const beforeHidden = refreshes;
documentEvents.get('visibilitychange')();
assert.equal(refreshes, beforeHidden, '숨겨진 화면에서는 복귀 갱신을 실행하지 않습니다.');
document.visibilityState = 'visible';
documentEvents.get('visibilitychange')();
assert.equal(renderedCount, 1494, '주문앱 복귀 시 가게 목록과 스크롤을 다시 구성하지 않습니다.');
assert.equal(displayedCount, 51, '앱에서 복귀하면 다음 분을 기다리지 않고 현재 숫자를 표시해야 합니다.');
currentCount = 53;
windowEvents.get('pageshow')({persisted: true});
assert.equal(displayedCount, 53, '뒤로가기 캐시 복원 후에도 현재 숫자를 표시해야 합니다.');
state = 'loading';
windowEvents.get('pageshow')({persisted: false});
assert.equal(renderedCount, 1494, '영업정보 준비 전에는 가게 목록을 재구성하지 않습니다.');
console.log('PASS: 분 단위·화면 복귀·페이지 캐시 복원 시 홈 영업 중 숫자도 갱신합니다.');
