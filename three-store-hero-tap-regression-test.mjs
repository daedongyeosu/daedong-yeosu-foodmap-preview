import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const app = read('./app.js');
const rc6 = read('./rc6-fixes.js');
const rc2 = read('./rc2-fixes.js');
const suite = read('./scripts/run-regression-suite.mjs');

function section(source, start, end) {
  const from = source.indexOf(start);
  const to = source.indexOf(end, from + start.length);
  assert.ok(from >= 0 && to > from, `Actual runtime section is missing: ${start}`);
  return source.slice(from, to);
}

// Run the actual shared capture guard, hero handler and delegated share action.
// The small event surface models ordering/retargeting, not browser hit testing;
// the mobile touch E2E remains the end-to-end proof.
const ghostSource = section(app, 'const DAEDONG_TAP_MOVE_TOLERANCE', 'function installDaedongTapAction');
const heroSource = section(rc6, 'function rc6HeroEvents(){', 'function rc6UseCurrentLocation');
const shareSource = section(rc2, "    const share = event.target.closest('[data-share-store]');", '    const favorite =');
let checks = 0;
function check(name, run) {
  run();
  checks += 1;
  console.log(`PASS ${name}`);
}

function createRuntime({hero = heroSource, withoutHelper = false, withoutTrack = false} = {}) {
  const listeners = new Map();
  const timers = [];
  const log = [];
  const store = {id: 'fixture-store', name: 'Fixture store'};
  let now = 1000;
  let hit = null;
  let context;
  const register = surface => (type, callback, options) => {
    const key = `${surface}:${type}`;
    const rows = listeners.get(key) || [];
    rows.push({callback, capture: options === true || options?.capture === true});
    listeners.set(key, rows);
  };
  const shell = {addEventListener: register('shell')};
  const track = {addEventListener: register('track'), closest: () => shell};
  const document = {
    addEventListener: register('document'),
    querySelector: selector => selector === '#heroTrack' && !withoutTrack ? track : null,
    elementFromPoint: () => hit
  };
  const sandbox = {
    document, URL, console, rc6Pointer: null,
    performance: {now: () => now},
    location: {
      href: 'https://example.test/?hero=fixture-store',
      assign: href => log.push({type: 'navigate', href})
    },
    rc6CampaignStoreById: id => id === store.id ? store : null,
    fxStoreById: id => id === store.id ? store : null,
    openStore: value => log.push({type: 'open', id: value.id, guard: guard()}),
    fxShare: value => log.push({type: 'share', id: value.id}),
    rc6RememberNotionHeroReturn: slide => log.push({type: 'notion-return', href: slide.dataset.rc6BannerNotion}),
    setTimeout: (callback, delay) => {
      log.push({type: 'schedule', delay, guard: guard()});
      timers.push(callback);
      return timers.length;
    }
  };
  context = vm.createContext(sandbox, {codeGeneration: {strings: false, wasm: false}});
  vm.runInContext(ghostSource, context, {timeout: 1000});
  if (withoutHelper) vm.runInContext('rememberDaedongGhostClick = undefined;', context);
  vm.runInContext(`${hero}\nrc6HeroEvents();`, context, {timeout: 1000});
  vm.runInContext(`document.addEventListener('click', event => {\n${shareSource}\n}, true);`, context, {timeout: 1000});
  function guard() {
    return vm.runInContext('daedongGhostClick && ({...daedongGhostClick})', context);
  }
  function dispatch(surface, type, fields = {}) {
    const event = {
      type, pointerId: 1, button: 0, clientX: 190, clientY: 350,
      target: {closest: () => null}, defaultPrevented: false, stopped: false,
      preventDefault() { this.defaultPrevented = true; },
      stopImmediatePropagation() { this.stopped = true; },
      ...fields
    };
    for (const row of listeners.get(`${surface}:${type}`) || []) {
      row.callback(event);
      if (event.stopped) break;
    }
    return event;
  }
  const media = slide => ({closest: selector => selector.includes('data-rc6-banner-') ? slide : null});
  const shareTarget = {
    dataset: {shareStore: store.id},
    closest: selector => selector === '[data-share-store]' ? shareTarget : null
  };
  function down(slide, fields = {}) {
    const target = media(slide);
    dispatch('document', 'pointerdown', {target, ...fields});
    return dispatch('track', 'pointerdown', {target, ...fields});
  }
  function up(slide, fields = {}) {
    hit = media(slide);
    return dispatch('shell', 'pointerup', {target: media(slide), ...fields});
  }
  return {
    store, log, listeners, shareTarget, guard, dispatch, down, up,
    count: type => log.filter(row => row.type === type).length,
    runTimers() { while (timers.length) timers.shift()(); },
    setNow(value) { now = value; },
    shareClick(fields = {}) { return dispatch('document', 'click', {target: shareTarget, ...fields}); }
  };
}

const storeSlide = (extra = {}) => ({dataset: {rc6BannerStore: 'fixture-store', heroIndex: '0'}, ...extra});
function validTap(runtime, slide = storeSlide(), fields = {}) {
  runtime.down(slide, fields);
  return runtime.up(slide, fields);
}

check('valid hero tap arms the existing guard before scheduling and opening detail', () => {
  const r = createRuntime();
  const event = validTap(r);
  assert.equal(event.defaultPrevented, true);
  assert.equal(r.count('open'), 0);
  assert.equal(r.count('schedule'), 1);
  assert.equal(r.log[0].delay, 0, 'Do not replace the guard with a new opening delay.');
  assert.equal(r.log[0].guard?.x, 190);
  assert.equal(r.log[0].guard?.y, 350);
  r.runTimers();
  assert.equal(r.count('open'), 1);
  assert.ok(r.log.find(row => row.type === 'open').guard);
});

check('retargeted compatibility click cannot open detail share', () => {
  const r = createRuntime();
  validTap(r);
  r.runTimers();
  const click = r.shareClick();
  assert.equal(click.defaultPrevented, true);
  assert.equal(click.stopped, true);
  assert.equal(r.count('share'), 0);
  assert.equal(r.guard(), null, 'Only the matching follow-up click consumes this guard.');
  assert.equal(r.listeners.get('document:click')[0].capture, true);
});

check('a compatibility click arriving before the timer is also consumed', () => {
  const r = createRuntime();
  validTap(r);
  assert.equal(r.count('open'), 0);
  assert.equal(r.shareClick().stopped, true);
  r.runTimers();
  assert.equal(r.count('open'), 1);
  assert.equal(r.count('share'), 0);
});

for (const pressType of ['pointerdown', 'touchstart']) {
  check(`a genuine new ${pressType} permits same-position share immediately`, () => {
    const r = createRuntime();
    validTap(r);
    r.runTimers();
    r.dispatch('document', pressType, {target: r.shareTarget});
    assert.equal(r.guard(), null);
    r.shareClick();
    assert.equal(r.count('share'), 1, 'Do not suppress an intentional second tap within 700 ms.');
  });
}

check('repeated hero reopen arms a fresh guard without blocking the next intended action', () => {
  const r = createRuntime();
  for (let index = 0; index < 3; index += 1) {
    validTap(r);
    r.runTimers();
    r.shareClick();
    assert.equal(r.count('share'), 0);
  }
  assert.equal(r.count('open'), 3);
  r.dispatch('document', 'pointerdown', {target: r.shareTarget});
  r.shareClick();
  assert.equal(r.count('share'), 1);
});

for (const [name, run] of [
  ['drag beyond the existing tolerance', (r, slide) => { r.down(slide); r.up(slide, {clientX: 199}); }],
  ['release on another slide', (r, slide) => { r.down(slide); r.up(storeSlide()); }],
  ['pointer cancellation', (r, slide) => { r.down(slide); r.dispatch('shell', 'pointercancel'); r.up(slide); }],
  ['unmatched pointer ID', (r, slide) => { r.down(slide); r.up(slide, {pointerId: 2}); }],
  ['pointer release without a start', (r, slide) => r.up(slide)],
  ['unknown or hidden store', (r) => validTap(r, {dataset: {rc6BannerStore: 'missing-store', heroIndex: '0'}})],
  ['non-target content', (r) => validTap(r, null)]
]) {
  check(`${name} neither opens a store nor arms a ghost guard`, () => {
    const r = createRuntime();
    run(r, storeSlide());
    r.runTimers();
    assert.equal(r.guard(), null);
    assert.equal(r.count('schedule'), 0);
    assert.equal(r.count('open'), 0);
    r.shareClick();
    assert.equal(r.count('share'), 1);
  });
}

check('the existing 8px boundary still accepts a tap', () => {
  const r = createRuntime();
  const slide = storeSlide();
  r.down(slide);
  r.up(slide, {clientX: 198});
  assert.equal(r.count('schedule'), 1);
  assert.equal(r.guard()?.x, 198);
});

check('general store ads keep their original store target', () => {
  const r = createRuntime();
  validTap(r, storeSlide({className: 'hero-slide rc6-hero-target'}));
  r.runTimers();
  assert.equal(r.count('open'), 1);
  assert.equal(r.log.find(row => row.type === 'open').id, r.store.id);
  assert.equal(r.count('navigate'), 0);
});

for (const index of [1, 2, 3]) {
  check(`common HTTPS Notion ad ${index} keeps return capture and navigation without store guard`, () => {
    const r = createRuntime();
    validTap(r);
    r.runTimers();
    assert.ok(r.guard(), 'Exercise an ad tap while a previous store guard is still live.');
    r.log.length = 0;
    const href = `https://example.test/notion-ad-${index}`;
    validTap(r, {dataset: {rc6BannerNotion: href, heroIndex: String(index)}});
    assert.deepEqual(r.log, [{type: 'notion-return', href}, {type: 'navigate', href}]);
    assert.equal(r.guard(), null);
    assert.equal(r.count('schedule'), 0);
  });
}

for (const action of ['drag', 'cancel', 'different-slide']) {
  check(`Notion ad ${action} cannot capture a return or navigate`, () => {
    const r = createRuntime();
    const ad = {dataset: {rc6BannerNotion: 'https://example.test/notion-ad', heroIndex: '18'}};
    r.down(ad);
    if (action === 'cancel') r.dispatch('shell', 'pointercancel');
    r.up(action === 'different-slide' ? {...ad} : ad, action === 'drag' ? {clientY: 359} : {});
    assert.equal(r.log.length, 0);
    assert.equal(r.guard(), null);
  });
}

for (const href of ['http://example.test/ad', 'javascript:alert(1)']) {
  check(`non-HTTPS ad protocol stays rejected: ${href.split(':')[0]}`, () => {
    const r = createRuntime();
    validTap(r, {dataset: {rc6BannerNotion: href, heroIndex: '1'}});
    assert.equal(r.log.length, 0);
    assert.equal(r.guard(), null);
  });
}

check('an absent optional helper preserves legacy opening instead of throwing', () => {
  const r = createRuntime({withoutHelper: true});
  validTap(r);
  r.runTimers();
  assert.equal(r.count('open'), 1);
});

check('a missing hero surface installs no hero listeners', () => {
  const r = createRuntime({withoutTrack: true});
  assert.equal(r.listeners.has('track:pointerdown'), false);
  assert.equal(r.listeners.has('shell:pointerup'), false);
});

check('the shared guard does not block distant or expired clicks', () => {
  const distant = createRuntime();
  validTap(distant);
  distant.shareClick({clientX: 250});
  assert.equal(distant.count('share'), 1);
  const expired = createRuntime();
  validTap(expired);
  expired.setNow(1701);
  expired.shareClick();
  assert.equal(expired.count('share'), 1);
});

check('negative control: omitting only the new helper call reproduces the share leak', () => {
  const broken = heroSource.replace(/if\s*\(typeof rememberDaedongGhostClick\s*===\s*['"]function['"]\)\s*rememberDaedongGhostClick\(e\);/, '');
  assert.notEqual(broken, heroSource, 'The negative control must remove the actual new call.');
  const r = createRuntime({hero: broken});
  validTap(r);
  r.runTimers();
  assert.equal(r.guard(), null);
  r.shareClick();
  assert.equal(r.count('share'), 1, 'This harness must detect the original missing guard.');
});

check('the standard suite discovers this root regression test automatically', () => {
  const filename = 'three-store-hero-tap-regression-test.mjs';
  const excluded = section(suite, 'const excludedTests', 'const discovered');
  assert.match(suite, /fs\.readdirSync\(repositoryRoot\)/);
  assert.match(suite, /file\.endsWith\('-regression-test\.mjs'\)/);
  assert.equal(excluded.includes(filename), false);
  assert.ok(fs.readdirSync(new URL('./', import.meta.url)).includes(filename));
});

console.log(`three-store hero tap regression: PASS (${checks} checks)`);
