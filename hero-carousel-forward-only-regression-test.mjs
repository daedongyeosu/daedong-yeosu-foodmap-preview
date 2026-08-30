import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';

const source = await readFile(new URL('./app.js', import.meta.url), 'utf8');
const indexSource = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const rc6Source = await readFile(new URL('./rc6-fixes.js', import.meta.url), 'utf8');
const classStart = source.indexOf('class InfiniteCarousel');
const classEnd = source.indexOf('\nfunction renderHero()', classStart);

assert(classStart >= 0 && classEnd > classStart, 'InfiniteCarousel source was not found');
assert.match(source, /constructor\(root, \{interval = 0, onChange = null\} = \{\}\)/, 'carousels must be still by default');
assert.match(source, /Math\.abs\(deltaX\) > Math\.abs\(deltaY\) \* 1\.15/, 'vertical scrolling must not become a slide swipe');
assert.match(source, /removeEventListener\(type, handler, options\)/, 'destroy must detach all carousel listeners');
assert.match(indexSource, /app\.js\?v=[^"]*hero-forward-only-1/, 'app.js cache version must expose the fix');
assert.match(indexSource, /app\.js\?v=[^"]*manual-carousels-1/, 'customers must receive the manual-only carousel build');
assert.match(rc6Source, /interval:0/, 'main slides must move only after customer input');
assert.doesNotMatch(source, /new InfiniteCarousel\([^\n]+interval:\s*3500/, 'app carousel autoplay remained');
assert.match(rc6Source, /neighborhoodFor\(state\.location\)\|\|neighborhoodFor\(state\.addressLabel\)/, 'customer neighborhood priority must remain connected');
assert.match(rc6Source, /RC6_DAILY_STORE_HERO_LIMIT=12/, 'the 12 location-ranked store banners must remain unchanged');

class FakeClassList {
  constructor() { this.values = new Set(); }
  add(...values) { values.forEach(value => this.values.add(value)); }
  remove(...values) { values.forEach(value => this.values.delete(value)); }
  toggle(value, force) {
    if (force === undefined) force = !this.values.has(value);
    if (force) this.values.add(value);
    else this.values.delete(value);
    return force;
  }
  contains(value) { return this.values.has(value); }
}

class FakeTarget {
  constructor(name) {
    this.name = name;
    this.listeners = new Map();
  }
  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type).add(handler);
  }
  removeEventListener(type, handler) {
    this.listeners.get(type)?.delete(handler);
  }
  emit(type, event = {}) {
    const payload = {
      target: this,
      preventDefault() {},
      stopPropagation() {},
      ...event
    };
    [...(this.listeners.get(type) || [])].forEach(handler => handler(payload));
  }
  listenerCount() {
    return [...this.listeners.values()].reduce((sum, handlers) => sum + handlers.size, 0);
  }
}

class FakeElement extends FakeTarget {
  constructor(name) {
    super(name);
    this.children = [];
    this.classList = new FakeClassList();
    this.style = {};
    this.dataset = {};
    this.mapping = {};
    this._innerHTML = '';
  }
  querySelector(selector) { return this.mapping[selector] || null; }
  cloneNode() { return new FakeElement(`${this.name}-clone`); }
  prepend(child) { this.children.unshift(child); }
  append(child) { this.children.push(child); }
  setPointerCapture() {}
  closest(selector) {
    return selector === '[data-slide]' && this.dataset.slide !== undefined ? this : null;
  }
  set innerHTML(value) {
    this._innerHTML = value;
    if (this.name !== 'dots') return;
    const indexes = [...value.matchAll(/data-slide="(\d+)"/g)].map(match => match[1]);
    this.children = indexes.map(index => {
      const button = new FakeElement(`dot-${index}`);
      button.dataset.slide = index;
      return button;
    });
  }
  get innerHTML() { return this._innerHTML; }
}

function makeRoot(slideCount = 4) {
  const root = new FakeElement('root');
  const shell = new FakeElement('shell');
  const track = new FakeElement('track');
  const dots = new FakeElement('dots');
  const prev = new FakeElement('prev');
  const next = new FakeElement('next');
  track.children = Array.from({length: slideCount}, (_, index) => new FakeElement(`slide-${index}`));
  root.mapping = {
    '.carousel-shell': shell,
    '.carousel-track': track,
    '.carousel-dots': dots,
    '[data-carousel-prev]': prev,
    '[data-carousel-next]': next
  };
  return {root, shell, track, dots, prev, next};
}

const fakeWindow = new FakeTarget('window');
fakeWindow.PointerEvent = class {};
let timerId = 0;
const intervals = new Map();
const timeouts = new Map();
const context = vm.createContext({
  window: fakeWindow,
  Number,
  Math,
  setInterval(callback, delay) {
    const id = ++timerId;
    intervals.set(id, {callback, delay});
    return id;
  },
  clearInterval(id) { intervals.delete(id); },
  setTimeout(callback, delay) {
    const id = ++timerId;
    timeouts.set(id, {callback, delay});
    return id;
  },
  clearTimeout(id) { timeouts.delete(id); }
});
vm.runInContext(`${source.slice(classStart, classEnd)}\nglobalThis.InfiniteCarousel = InfiniteCarousel;`, context);
const InfiniteCarousel = context.InfiniteCarousel;

const still = makeRoot();
const stillCarousel = new InfiniteCarousel(still.root);
const stillIndex = stillCarousel.logicalIndex();
assert.equal(intervals.size, 0, 'a carousel started moving without customer input');
assert.equal(stillCarousel.logicalIndex(), stillIndex, 'a still carousel changed slides');
stillCarousel.destroy();
assert.equal(still.shell.listenerCount(), 0, 'destroy left shell listeners behind');
assert.equal(still.track.listenerCount(), 0, 'destroy left track listeners behind');
assert.equal(still.root.listenerCount(), 0, 'destroy left root listeners behind');

const gestures = makeRoot();
const gestureCarousel = new InfiniteCarousel(gestures.root, {interval: 0});
gestures.shell.emit('pointerdown', {clientX: 200, clientY: 100, pointerId: 1});
gestures.shell.emit('pointerup', {clientX: 145, clientY: 250, pointerId: 1});
assert.equal(gestureCarousel.logicalIndex(), 0, 'vertical scrolling moved the slide');
gestures.shell.emit('pointerdown', {clientX: 200, clientY: 100, pointerId: 2});
gestures.shell.emit('pointerup', {clientX: 130, clientY: 105, pointerId: 2});
assert.equal(gestureCarousel.logicalIndex(), 1, 'horizontal swipe did not move exactly one slide forward');
gestureCarousel.destroy();
const stoppedIndex = gestureCarousel.logicalIndex();
gestures.shell.emit('pointerdown', {clientX: 200, clientY: 100, pointerId: 3});
gestures.shell.emit('pointerup', {clientX: 130, clientY: 105, pointerId: 3});
assert.equal(gestureCarousel.logicalIndex(), stoppedIndex, 'destroyed carousel still reacted to gestures');

console.log(JSON.stringify({
  staysStillWithoutInput: true,
  intervalMs: 0,
  verticalScrollIgnored: true,
  oldListenersRemoved: true,
  neighborhoodRankingUntouched: true,
  status: 'PASS'
}, null, 2));
