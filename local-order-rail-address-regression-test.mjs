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
assert.match(html, /rail-adjacent-visual-dedupe-1/,
  'The deployed page must invalidate the adjacent recommendation dedupe cache.');
assert.match(experience, /rc2-fixes\.js\?v=[^'\n]*rail-adjacent-visual-dedupe-1/,
  'The RC2 recommendation layer must load the adjacent recommendation dedupe fix.');
assert.doesNotMatch(source, /spec\.kind\s*!==\s*'new'[\s\S]{0,120}?globallyUsed/,
  'New-store rails must prefer stores not already shown before reusing earlier cards.');
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
const diversifyFunction = extractFunction(source, 'rc2DiversifyRailLead');
const stores = Array.from({length: 8}, (_, index) => ({
  id: String(index + 1),
  rc6LocationBucket: 0,
  photo: `photo-${index + 1}`
}));
const context = {
  fxRankStores: () => stores,
  storeBusinessStatusPriority: store => store.statusRank ?? 0,
  sortStoresByBusinessStatus: list => [...list],
  rc2RandomizedRailStores: list => [...list],
  rc6OwnershipTier: store => store.tier ?? 0,
  rc2BrandKey: store => `brand-${store.id}`,
  fxPhoto: store => store.photo
};
vm.createContext(context);
vm.runInContext(`${candidateFunction};${diversifyFunction};this.pick=rc2RailCandidates;this.diversify=rc2DiversifyRailLead;`, context);
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

const broadStores = Array.from({length: 16}, (_, index) => ({
  id: `broad-${index + 1}`,
  rc6LocationBucket: 0,
  photo: `broad-photo-${index + 1}`
}));
context.fxRankStores = () => broadStores;
const broadUsed = new Set();
const broadCounts = new Map();
const firstRail = context.pick({id: 'today'}, broadUsed, 8, broadCounts);
const newRail = context.pick({id: 'new', kind: 'new'}, broadUsed, 8, broadCounts);
assert.equal(firstRail.length, 8);
assert.equal(newRail.length, 8);
assert.equal(newRail.filter(store => firstRail.some(previous => previous.id === store.id)).length, 0,
  'The new-store rail must use unseen candidates before repeating an earlier card.');

const repeatedLead = {id: 'repeat', photo: 'same-photo.jpg', statusRank: 0};
const freshLead = {id: 'fresh', photo: 'fresh-photo.jpg', statusRank: 0};
const closingStore = {id: 'closing', photo: 'closing-photo.jpg', statusRank: 1};
const diversified = context.diversify([repeatedLead, freshLead, closingStore], [repeatedLead]);
assert.deepEqual(Array.from(diversified, store => store.id), ['fresh', 'repeat', 'closing'],
  'Adjacent rails must not lead with the same store when another store with the same business status is available.');
const statusProtected = context.diversify([repeatedLead, closingStore], [repeatedLead]);
assert.deepEqual(Array.from(statusProtected, store => store.id), ['repeat', 'closing'],
  'Visual dedupe must never move a closing store ahead of an open store.');
const unmanagedFresh = {id: 'unmanaged-fresh', photo: 'unmanaged-photo.jpg', statusRank: 0, tier: 2};
const managedRepeat = {...repeatedLead, tier: 0};
const ownershipProtected = context.diversify([managedRepeat, unmanagedFresh], [managedRepeat]);
assert.deepEqual(Array.from(ownershipProtected, store => store.id), ['repeat', 'unmanaged-fresh'],
  'Visual dedupe must not move an unmanaged store ahead of a managed store.');
const fartherFresh = {id: 'farther-fresh', photo: 'farther-photo.jpg', statusRank: 0, tier: 0, rc6LocationBucket: 1};
const localRepeat = {...managedRepeat, rc6LocationBucket: 0};
const locationProtected = context.diversify([localRepeat, fartherFresh], [localRepeat]);
assert.deepEqual(Array.from(locationProtected, store => store.id), ['repeat', 'farther-fresh'],
  'Visual dedupe must not move another neighborhood ahead of the selected neighborhood.');

console.log('local order rail address regression: ok');
