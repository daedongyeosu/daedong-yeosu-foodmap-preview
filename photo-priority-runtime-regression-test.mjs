import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
function fn(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0);
  let depth = 0;
  for (let i = source.indexOf('{', source.indexOf(')', start)); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw Error(name);
}
let resolves = 0;
const microtasks = [];
const context = vm.createContext({
  queueMicrotask: callback => microtasks.push(callback),
  fxBrandPhotoPool: {assignments: {}}, FX_APPROVED_BRAND_PHOTO_ASSIGNMENTS: {},
  photoResolver: {resolve: store => {
    resolves++;
    return {src: store.__failedPhotoPaths?.size ? '' : store.legacyImages?.[0] || '', classification: 'food'};
  }},
  isOfficialStorePlaceholderImage: src => src === 'placeholder.jpg',
  isQuarantinedCollectedPhoto: src => src.includes('quarantine'),
  storeHasChannel: (store, key) => store.channelKeys?.includes(key)
});
vm.runInContext(fn(read('final-experience.js'), 'fxPhoto') + '\n' + fn(read('rc6-fixes.js'), 'rc6DiscoveryTier'), context);
const store = {id: 'one', name: 'One', legacyImages: ['food.jpg'], channelKeys: ['mukkebi','ddangyo']};
for (let i = 0; i < 10000; i++) assert.equal(context.rc6DiscoveryTier({...store, distance:i}), 0);
assert.equal(resolves, 1, 'ten thousand comparator visits resolve the gallery once, not twice per visit');
assert.equal(microtasks.length, 1, 'only one microtask per synchronous ranking task');
assert.equal(context.rc6DiscoveryTier({...store, routes:[{key:'ddangyo',customerUsable:false}]}), 1);
assert.equal(context.rc6DiscoveryTier({...store, legacyImages:['placeholder.jpg']}), 3);
assert.equal(context.rc6DiscoveryTier({...store, legacyImages:['quarantine.jpg']}), 3);
assert.equal(context.rc6DiscoveryTier({...store, id:'other', legacyImages:[]}), 3);
assert.equal(context.rc6DiscoveryTier(store), 0);
store.__failedPhotoPaths = new Set();
assert.equal(context.rc6DiscoveryTier(store), 0);
store.__failedPhotoPaths.add('food.jpg');
assert.equal(context.rc6DiscoveryTier(store), 3, 'failure set mutation invalidates even within the same task');
store.__failedPhotoPaths.clear();
assert.equal(context.rc6DiscoveryTier(store), 0);
context.fxBrandPhotoPool.assignments.one = 'placeholder.jpg';
assert.equal(context.rc6DiscoveryTier(store), 3, 'brand override changes invalidate');
delete context.fxBrandPhotoPool.assignments.one;
assert.equal(context.rc6DiscoveryTier(store), 0);
microtasks.shift()();
assert.equal(context.rc6DiscoveryTier.taskCache, null, 'no retained catalog after synchronous task');
context.photoResolver.resolve = () => {resolves++; return {src:'food.jpg',classification:'store_logo'};};
assert.equal(context.rc6DiscoveryTier(store), 3, 'next task observes changed photo policy, not cached approval');
microtasks.shift()();
context.photoResolver.resolve = () => {resolves++; return {src:'food.jpg',classification:'food'};};
const before = resolves;
assert.equal(context.fxPhoto(store), 'food.jpg', 'normal callers still resolve photos');
assert.equal(resolves, before + 1);
assert.equal(context.fxPhoto(store, null), '', 'explicit empty resolution must not resolve twice');
assert.equal(resolves, before + 1);
const browser = read('scripts/browser-store-list-interruption.mjs');
assert.match(browser, /await page\.mouse\.wheel\(0, 300\)/);
assert.match(browser, /await page\.touchscreen\.tap\(rc3RailTouch\.x, rc3RailTouch\.y\)/, 'real coordinate touch assertion is retained');
console.log('PASS photo ranking task-local memoization, single resolve, live invalidation and real rail gesture');
