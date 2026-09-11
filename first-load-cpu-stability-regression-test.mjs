import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app = fs.readFileSync('app.js', 'utf8');
const start = app.indexOf('let neighborhoodSearchSnapshot = null;');
const end = app.indexOf('function neighborhoodFor(', start);
assert.ok(start >= 0 && end > start);
const normal = value => String(value ?? '').trim().toLowerCase().replace(/[\s·&()\-_/.,]/g, '');
const rows = JSON.parse(fs.readFileSync('data/yeosu-neighborhoods.json', 'utf8')).neighborhoods;
let normalizations = 0;
const context = vm.createContext({yeosuNeighborhoods: rows, normalize: value => {normalizations++; return normal(value);}});
vm.runInContext(app.slice(start, end), context);
const original = value => {
  const text = normal(value); if (!text) return [];
  return context.yeosuNeighborhoods.filter(item => {
    if ([item.name, ...(item.aliases || [])].some(alias => text.includes(normal(alias)))) return true;
    const stem = normal(item.name).replace(/동$/, '');
    return stem.length >= 2 && text.includes(stem);
  }).map(item => item.name);
};
for (const value of ['', 'unknown', '여서·문수', '죽림지구', ...rows.flatMap(r=>[r.name, ...(r.aliases||[])])]) {
  assert.deepEqual(Array.from(context.neighborhoodsFor(value)), original(value), value);
}
const before = normalizations;
for(let i = 0; i < 5000; i++) context.neighborhoodsFor('여서 문수');
assert.equal(normalizations - before, 5000, 'Repeated lookups normalize only the input, not all unchanged district aliases.');
context.yeosuNeighborhoods = [{name:'고흥읍',aliases:['고흥']}];
assert.deepEqual(Array.from(context.neighborhoodsFor('고흥')), ['고흥읍'], 'A replacement regional snapshot recompiles the index.');
assert.deepEqual(Array.from(context.neighborhoodsFor('문수동')), [], 'No aliases from the previous region survive.');
const observer = fs.readFileSync('mobile-performance-observer.js', 'utf8').replace(/\r\n/g, '\n');
const inspect = observer.slice(observer.indexOf('  const inspectUi = () => {'), observer.indexOf("\n\n  document.addEventListener('pointerdown'"));
const actions = new Map();
let layoutReads = 0;
const finished = [];
const obs = vm.createContext({
  actionStarts: actions, startedAt: 0, performance: {now: () => 1},
  document: {querySelector: () => ({})}, markOnce() {},
  visible: () => {layoutReads++; return true;},
  finishAction: name => {finished.push(name); actions.delete(name);}
});
vm.runInContext(inspect+'\nthis.inspectUi=inspectUi;', obs);
for(let i=0;i<100;i++)obs.inspectUi();
assert.equal(layoutReads, 0, 'Unrelated DOM mutations must never force geometry reads.');
for(const name of ['detailSkeletonMs','detailReadyMs','menuSkeletonMs','menuReadyMs'])actions.set(name,0);
obs.inspectUi();
assert.equal(layoutReads, 4);
assert.equal(finished.length, 4, 'All actual user interaction timings remain recorded.');
obs.inspectUi();
assert.equal(layoutReads, 4, 'Completed actions do not trigger more layout work.');
console.log('first-load CPU stability regression: PASS');
