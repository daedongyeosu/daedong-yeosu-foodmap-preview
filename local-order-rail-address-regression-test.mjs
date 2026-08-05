import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const locationSource = fs.readFileSync(new URL('./rc6-fixes.js', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(source, /if\s*\(result\.length\s*<\s*limit\)\s*fillGroups\(groups,\s*true\)/,
  'Every recommendation rail must refill with candidates already used by an earlier rail.');
assert.doesNotMatch(source, /allowReuse[\s\S]{0,180}?useCount\s*>=/,
  'Later recommendation rails must not be emptied by a global reuse-count cap.');
assert.match(html, /rail-local-repeat-fallback-3/,
  'The deployed page must invalidate the recommendation script cache.');
assert.match(experience, /rc2-fixes\.js\?v=[^'\n]*rail-local-repeat-fallback-3/,
  'The RC2 recommendation layer itself must bypass the old browser cache.');
assert.match(locationSource, /spec\.kind\s*===\s*'local'[\s\S]*?storeHasChannel\(store,key\)/,
  'Local-order candidates must use the public channel marker before secure route details load.');
assert.doesNotMatch(locationSource, /spec\.kind\s*===\s*'local'[\s\S]{0,180}?routeFor\(store,key\)/,
  'Local-order candidates must not disappear while secure route details are still loading.');
assert.match(experience, /rc6-fixes\.js\?v=[^'\n]*local-channel-marker-1/,
  'The corrected location layer must bypass the old browser cache.');

function extractFunction(text, name) {
  const start = text.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} must exist`);
  const bodyStart = text.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    if (text[index] === '}' && --depth === 0) return text.slice(start, index + 1);
  }
  throw new Error(`Could not extract ${name}`);
}

const candidateFunction = extractFunction(source, 'rc2RailCandidates');
const stores = Array.from({length: 8}, (_, index) => ({
  id: String(index + 1),
  rc6LocationBucket: 0,
  photo: `photo-${index + 1}`
}));
const context = {
  fxRankStores: () => stores,
  storeBusinessStatusPriority: () => 0,
  sortStoresByBusinessStatus: list => [...list],
  rc2RandomizedRailStores: list => [...list],
  rc6OwnershipTier: () => 0,
  rc2BrandKey: store => `brand-${store.id}`,
  fxPhoto: store => store.photo
};
vm.createContext(context);
vm.runInContext(`${candidateFunction};this.pick=rc2RailCandidates;`, context);
const globallyUsed = new Set();
const useCounts = new Map();
for (const spec of [
  {id: 'near', kind: 'near'},
  {id: 'local', kind: 'local'},
  {id: 'appetite', pattern: /menu/},
  {id: 'new', kind: 'new'}
]) {
  const cards = context.pick(spec, globallyUsed, 8, useCounts);
  assert.equal(cards.length, 8, `${spec.id} must remain populated after earlier rails use the same stores`);
  assert.equal(new Set(cards.map(store => store.id)).size, 8, `${spec.id} must not duplicate a store inside its own rail`);
}

console.log('local order rail address regression: ok');
