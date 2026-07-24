import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const stores = JSON.parse(await readFile(new URL('./data/stores.json', import.meta.url)));
const priority = JSON.parse(await readFile(new URL('./data/store-priority.json', import.meta.url)));
const neighborhoodData = JSON.parse(await readFile(new URL('./data/yeosu-neighborhoods.json', import.meta.url)));
const appSource = await readFile(new URL('./app.js', import.meta.url), 'utf8');
const finalSource = await readFile(new URL('./final-experience.js', import.meta.url), 'utf8');
const rc2Source = await readFile(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const rc3Source = await readFile(new URL('./rc3-fixes.js', import.meta.url), 'utf8');
const rc6Source = await readFile(new URL('./rc6-fixes.js', import.meta.url), 'utf8');
const indexSource = await readFile(new URL('./index.html', import.meta.url), 'utf8');

const CATEGORY = '햄버거/샌드위치/토스트/핫도그';
const TOP_IDS = ['10db3b0db6ebf8c5', 'f8a71a5a2344ee7f'];
const BOTTOM_IDS = ['6092aabddf5f7194', 'e0c6949efb48f4b2'];
const EXPECTED_NAMES = new Map([
  ['10db3b0db6ebf8c5', '맘스터치 문수점'],
  ['f8a71a5a2344ee7f', '프랭크버거 미평점'],
  ['6092aabddf5f7194', '롯데리아 중앙점'],
  ['e0c6949efb48f4b2', '롯데리아 이마트점']
]);
const idOf = store => String(store.store_id || store.id || '');
const byId = new Map(stores.map(store => [idOf(store), store]));
const rule = priority.categoryPriorityOverrides?.[CATEGORY];

assert.equal(priority.schemaVersion, 2, 'store-priority schema version must include category overrides');
assert(rule, 'hamburger category priority override is missing');
assert.equal(rule.scope, 'all-neighborhoods', 'hamburger override must apply in every neighborhood');
assert.deepEqual(rule.topStoreIds, TOP_IDS, 'hamburger top-store IDs changed');
assert.deepEqual(rule.bottomStoreIds, BOTTOM_IDS, 'hamburger bottom-store IDs changed');
assert.equal(new Set([...TOP_IDS, ...BOTTOM_IDS]).size, 4, 'category priority IDs overlap');
assert.equal(Object.keys(priority.categoryPriorityOverrides).length, 1, 'an unrelated category override was added');

for (const [id, name] of EXPECTED_NAMES) {
  const store = byId.get(id);
  assert(store, `${name}: canonical store missing`);
  assert.equal(store.name, name, `${id}: wrong store connected to category priority`);
  assert(store.categories?.includes(CATEGORY), `${name}: hamburger category membership missing`);
}
assert.match(rule.labels?.['10db3b0db6ebf8c5'] || '', /여서·문수 권역/, 'user-called Yeoseo Mom’s Touch must map to the canonical Munsu store');

const managed = new Set((priority.managedStoreIds || []).map(String));
assert.equal(managed.size, 149, 'managed-store count changed');
assert(TOP_IDS.every(id => managed.has(id)), 'top hamburger stores must remain managed stores');

const normalize = value => String(value || '').toLowerCase().replace(/[\s,\/·&()\-_.]/g, '');
const neighborhoods = neighborhoodData.neighborhoods || [];
const neighborhoodNames = value => {
  const text = normalize(value);
  return neighborhoods
    .filter(item => [item.name, ...(item.aliases || [])].some(alias => text.includes(normalize(alias))))
    .map(item => item.name);
};
const storeNeighborhoods = store => neighborhoodNames([store.district, store.address, store.branchName, store.name].filter(Boolean).join(' '));
const burgers = stores.filter(store => store.categories?.includes(CATEGORY));

function applyOverride(list, category) {
  const current = priority.categoryPriorityOverrides?.[category];
  if (!current) return list;
  const top = new Set(current.topStoreIds.map(String));
  const bottom = new Set(current.bottomStoreIds.map(String));
  return list.map((store, index) => ({
    store,
    index,
    tier: top.has(idOf(store)) ? 0 : bottom.has(idOf(store)) ? 2 : 1
  })).sort((a, b) => a.tier - b.tier || a.index - b.index).map(row => row.store);
}

const locations = ['여서동', '문수동', '오림동', '미평동', '둔덕동', '봉계동', '웅천동', '학동'];
const locationResults = [];
for (const location of locations) {
  const baseline = [...burgers].sort((a, b) => {
    const sameA = storeNeighborhoods(a).includes(location);
    const sameB = storeNeighborhoods(b).includes(location);
    return Number(sameB) - Number(sameA)
      || Number(managed.has(idOf(b))) - Number(managed.has(idOf(a)))
      || a.name.localeCompare(b.name, 'ko');
  });
  const ranked = applyOverride(baseline, CATEGORY);
  assert(TOP_IDS.includes(idOf(ranked[0])) && TOP_IDS.includes(idOf(ranked[1])), `${location}: top hamburger group is not first`);
  assert(BOTTOM_IDS.includes(idOf(ranked.at(-2))) && BOTTOM_IDS.includes(idOf(ranked.at(-1))), `${location}: bottom hamburger group is not last`);
  const ordinaryBefore = baseline.map(idOf).filter(id => !TOP_IDS.includes(id) && !BOTTOM_IDS.includes(id));
  const ordinaryAfter = ranked.map(idOf).filter(id => !TOP_IDS.includes(id) && !BOTTOM_IDS.includes(id));
  assert.deepEqual(ordinaryAfter, ordinaryBefore, `${location}: ordinary hamburger order changed`);
  locationResults.push({
    location,
    top: ranked.slice(0, 2).map(store => store.name),
    bottom: ranked.slice(-2).map(store => store.name)
  });
}

const chickenSample = stores.filter(store => store.categories?.includes('치킨')).slice(0, 20);
assert.deepEqual(applyOverride(chickenSample, '치킨').map(idOf), chickenSample.map(idOf), 'non-hamburger category order changed');

for (const [name, source, required] of [
  ['app.js', appSource, 'function applyCategoryPriorityOverrides(list, category)'],
  ['rc2-fixes.js', rc2Source, 'applyCategoryPriorityOverrides(filtered, selectedCategory)'],
  ['rc3-fixes.js', rc3Source, 'applyCategoryPriorityOverrides(list.sort'],
  ['rc6-fixes.js', rc6Source, 'categoryPriorityOverrides=rc6StorePriority.categoryPriorityOverrides||{}'],
  ['rc6-fixes.js', rc6Source, 'applyCategoryPriorityOverrides(rc6DiversifyStoresByTier'],
  ['rc6-fixes.js', rc6Source, 'filteredStores=()=>applyCategoryPriorityOverrides'],
  ['rc6-fixes.js', rc6Source, 'applyCategoryPriorityOverrides(rc6RankCandidatesByCustomerLocation']
]) assert(source.includes(required), `${name}: hamburger priority wiring missing: ${required}`);
assert(finalSource.includes('applyCategoryPriorityOverrides(filtered,selectedCategory)'), 'final app browser priority wiring missing');
assert.match(indexSource, /app\.js\?v=[^"']*hamburger-priority-1/, 'app cache version missing');
assert.match(indexSource, /final-experience\.js\?v=[^"']*hamburger-priority-1/, 'final-experience cache version missing');
assert.match(finalSource, /rc2-fixes\.js\?v=[^"']*hamburger-priority-1/, 'rc2 cache version missing');
assert.match(finalSource, /rc3-fixes\.js\?v=[^"']*hamburger-priority-1/, 'rc3 cache version missing');
assert.match(finalSource, /rc6-fixes\.js\?v=[^"']*hamburger-priority-1/, 'rc6 cache version missing');

const routeCount = stores.reduce((sum, store) => sum + (store.routes || []).length, 0);
assert.equal(stores.length, 650, 'store count changed');
assert.equal(routeCount, 4558, 'order-route count changed');

console.log(JSON.stringify({
  category: CATEGORY,
  scope: rule.scope,
  stores: stores.length,
  routes: routeCount,
  hamburgerStores: burgers.length,
  topStores: TOP_IDS.map(id => EXPECTED_NAMES.get(id)),
  bottomStores: BOTTOM_IDS.map(id => EXPECTED_NAMES.get(id)),
  locations: locationResults,
  ordinaryStoreOrderPreserved: true,
  otherCategoriesUnchanged: true,
  status: 'PASS'
}, null, 2));
