import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const stores = JSON.parse(await readFile(new URL('./data/stores.json', import.meta.url)));
const appSource = await readFile(new URL('./app.js', import.meta.url), 'utf8');
const rc6Source = await readFile(new URL('./rc6-fixes.js', import.meta.url), 'utf8');
const indexSource = await readFile(new URL('./index.html', import.meta.url), 'utf8');

const CATEGORY = '피자';
const TARGET_NEIGHBORHOODS = ['여서동', '문수동', '오림동'];
const ORDERED_IDS = ['dc638b23f8cf3c5b', 'a089d1d54720b48e', 'abb76aa470e26f7a'];
const EXPECTED_NAMES = ['도미노피자 문수점', '외계인피자 여수점', '피자스쿨 여문점'];
const idOf = store => String(store.store_id || store.id || '');
const byId = new Map(stores.map(store => [idOf(store), store]));
const configMatch = appSource.match(/const LOCATION_CATEGORY_PRIORITY_OVERRIDES = (\{[\s\S]*?\n\});\n/);
assert(configMatch, 'location category priority configuration is missing');
const rule = JSON.parse(configMatch[1])?.[CATEGORY];

assert(rule, 'pizza priority rule is missing');
assert.equal(rule.scope, 'selected-neighborhoods', 'pizza priority must remain neighborhood-scoped');
assert.deepEqual(rule.neighborhoods, TARGET_NEIGHBORHOODS, 'pizza target neighborhoods changed');
assert.deepEqual(rule.orderedStoreIds, ORDERED_IDS, 'pizza rotation members changed');
assert.equal(rule.rotation, 'time-cycle', 'pizza priority must rotate by time');
assert.equal(rule.rotationIntervalMs, 60000, 'pizza priority rotation interval changed');

ORDERED_IDS.forEach((id, index) => {
  const store = byId.get(id);
  assert(store, `${EXPECTED_NAMES[index]}: canonical store missing`);
  assert.equal(store.name, EXPECTED_NAMES[index], `${id}: wrong pizza store connected`);
  assert(store.categories?.includes(CATEGORY), `${store.name}: pizza category membership missing`);
});

const pizzas = stores.filter(store => store.categories?.includes(CATEGORY));
function rotatedIds(current, phase) {
  const ids = (current?.orderedStoreIds || []).map(String);
  if (current?.rotation !== 'time-cycle' || ids.length < 2) return ids;
  const offset = phase % ids.length;
  return [...ids.slice(offset), ...ids.slice(0, offset)];
}
function applyRule(list, category, neighborhood, phase = 0) {
  const current = category === CATEGORY ? rule : null;
  if (!current || (current.neighborhoods?.length && !current.neighborhoods.includes(neighborhood))) return list;
  const order = new Map(rotatedIds(current, phase).map((id, index) => [id, index]));
  return list.map((store, index) => ({
    store,
    index,
    tier: order.has(idOf(store)) ? order.get(idOf(store)) : order.size + 1
  })).sort((a, b) => a.tier - b.tier || a.index - b.index).map(row => row.store);
}

const EXPECTED_CYCLES = EXPECTED_NAMES.map((_, offset) => [
  ...EXPECTED_NAMES.slice(offset),
  ...EXPECTED_NAMES.slice(0, offset)
]);
for (const neighborhood of TARGET_NEIGHBORHOODS) {
  const baseline = [...pizzas].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  const firstPlaceStores = [];
  for (const [phase, expectedCycle] of EXPECTED_CYCLES.entries()) {
    const ranked = applyRule(baseline, CATEGORY, neighborhood, phase);
    assert.deepEqual(
      ranked.slice(0, 3).map(store => store.name),
      expectedCycle,
      `${neighborhood}: pizza rotation phase ${phase} is wrong`
    );
    assert.deepEqual(
      ranked.slice(3).map(idOf),
      baseline.map(idOf).filter(id => !ORDERED_IDS.includes(id)),
      `${neighborhood}: ordinary pizza order changed at phase ${phase}`
    );
    firstPlaceStores.push(ranked[0].name);
  }
  assert.deepEqual(
    firstPlaceStores,
    EXPECTED_NAMES,
    `${neighborhood}: all three pizza stores must take first place once per cycle`
  );
}

for (const neighborhood of ['미평동', '학동', '웅천동']) {
  const baseline = [...pizzas].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
  assert.deepEqual(
    applyRule(baseline, CATEGORY, neighborhood).map(idOf),
    baseline.map(idOf),
    `${neighborhood}: out-of-scope pizza order changed`
  );
}

const chickenSample = stores.filter(store => store.categories?.includes('치킨')).slice(0, 20);
assert.deepEqual(
  applyRule(chickenSample, '치킨', '여서동').map(idOf),
  chickenSample.map(idOf),
  'non-pizza category order changed'
);

for (const required of [
  'function customerNeighborhoodForPriority()',
  'function categoryPriorityRule(category)',
  'function categoryPriorityOrderedIdsForRule(rule, now = Date.now())',
  'function categoryPriorityOrderedStoreIds(category)',
  "rule?.rotation !== 'time-cycle'",
  'const ordered = new Map(categoryPriorityOrderedIdsForRule(rule)',
]) assert(appSource.includes(required), `app pizza priority wiring missing: ${required}`);

for (const required of [
  'categoryPriorityOverrides={...LOCATION_CATEGORY_PRIORITY_OVERRIDES',
  'categoryPriorityOrderedStoreIds(state.category)',
  'stores.find(store=>String(store.id)===id)',
]) assert(rc6Source.includes(required), `runtime pizza priority wiring missing: ${required}`);

assert.match(indexSource, /app\.js\?v=[^"']*pizza-priority-2/, 'app cache version missing');
assert.match(indexSource, /final-experience\.js\?v=[^"']*pizza-priority-2/, 'final-experience cache version missing');

const routeCount = stores.reduce((sum, store) => sum + (store.routes || []).length, 0);
assert.equal(stores.length, 710, 'store count changed');
assert.equal(routeCount, 4981, 'order-route count changed');

console.log(JSON.stringify({
  category: CATEGORY,
  neighborhoods: TARGET_NEIGHBORHOODS,
  rotatingStores: EXPECTED_NAMES,
  firstPlaceCycle: EXPECTED_NAMES,
  rotationIntervalMs: rule.rotationIntervalMs,
  stores: stores.length,
  routes: routeCount,
  otherNeighborhoodsUnchanged: true,
  otherCategoriesUnchanged: true,
  status: 'PASS'
}, null, 2));
