import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./store-menu-preview.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
assert.match(app, /async function handleImageError\(image\)\s*\{[^]*?if \(image\.dataset\.menuImageManaged === '1'\) return;/);
const section = (start, end) => source.slice(source.indexOf(`  function ${start}(`), source.indexOf(`  function ${end}(`));
const timers = new Map();
let clock = 0, serial = 0;
class ImageFixture extends EventTarget {
  constructor() {
    super(); this.dataset = {menuImageSrc: 'https://example.invalid/menu.jpg'};
    this.style = {}; this.isConnected = true; this.src = ''; this.alt = '프라이드치킨';
    this.hidden = false; this.parentElement = {classList: {add() {}, remove() {}}};
  }
  removeAttribute(name) { if (name === 'src') this.src = ''; }
  after(button) { this.button = button; }
}
const context = {window: {
  setTimeout(fn, delay) {const id = ++serial; timers.set(id, {fn, at: clock + delay}); return id;},
  clearTimeout(id) {timers.delete(id);}
}, document: {
  querySelectorAll() {return [];},
  createElement() {return {setAttribute() {}, addEventListener(name, fn) {this[name] = fn;}, remove() {this.removed = true;}};}
}};
vm.runInNewContext(`
  let menuImageQueue = [], activeMenuImageLoads = 0, menuImageLoadRun = 0, menuImageObserver = null;
  const MAX_CONCURRENT_MENU_IMAGE_LOADS = 2, MENU_IMAGE_RETRY_DELAYS = [500, 1500], menuImageTasks = new Map();
  ${section('loadMenuImage', 'menuVariantsMarkup')}
  ${section('drainMenuImageQueue', 'observeMenuImages')}
  Object.assign(globalThis, {queueMenuImage, resetMenuImageLoading, active: () => activeMenuImageLoads});
`, context);
function tick() {const [id, task] = [...timers].sort((a,b) => a[1].at-b[1].at)[0]; timers.delete(id); clock = task.at; task.fn();}
const first = new ImageFixture();
context.queueMenuImage(first);
assert.equal(context.active(), 1);
first.dispatchEvent(new Event('error'));
assert.equal(context.active(), 0);
assert.equal(first.src, '');
assert.equal(first.style.visibility, 'hidden', 'broken image icon must remain hidden');
tick();
assert.equal(context.active(), 1);
first.dispatchEvent(new Event('load'));
assert.equal(first.style.visibility, '');
assert.equal(first.dataset.menuImageSrc, undefined);
assert.equal(context.active(), 0);
first.dispatchEvent(new Event('error'));
assert.equal(timers.size, 0, 'old error listener cannot retry after a successful load');

const failed = new ImageFixture(); context.queueMenuImage(failed);
for (let attempt = 0; attempt < 3; attempt++) {
  failed.dispatchEvent(new Event('error'));
  if (attempt < 2) tick();
}
assert.equal(context.active(), 0);
assert.equal(timers.size, 0, 'automatic retries are bounded');
assert.equal(failed.hidden, true);
assert.equal(failed.button.textContent, '사진 다시 불러오기');
failed.button.click({preventDefault() {}, stopPropagation() {}});
assert.equal(context.active(), 1);
assert.equal(failed.hidden, false);
failed.dispatchEvent(new Event('load'));
assert.equal(failed.style.visibility, '');

const timeout = new ImageFixture(); context.queueMenuImage(timeout);
tick(); // A hung request must release the two-slot queue too.
assert.equal(context.active(), 0);
assert.equal(timeout.src, '');
context.resetMenuImageLoading({cancelActive: true});
assert.equal(timers.size, 0, 'closing/replacing the menu cancels pending retries');
assert.equal(timeout.dataset.menuImageQueued, undefined);
assert.equal(context.active(), 0);
console.log('PASS menu photo transient failure, bounded retry, manual recovery and cancellation');
