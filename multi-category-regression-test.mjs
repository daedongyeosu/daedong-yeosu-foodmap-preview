import {createHash} from 'node:crypto';
import {readFile} from 'node:fs/promises';

const stores = JSON.parse(await readFile(new URL('./data/stores.json', import.meta.url)));
const audit = JSON.parse(await readFile(new URL('./data/store-category-classification-audit.json', import.meta.url)));
const appSource = await readFile(new URL('./app.js', import.meta.url), 'utf8');
const indexSource = await readFile(new URL('./index.html', import.meta.url), 'utf8');
const finalSource = await readFile(new URL('./final-experience.js', import.meta.url), 'utf8');
const rc2Source = await readFile(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const rc3Source = await readFile(new URL('./rc3-fixes.js', import.meta.url), 'utf8');
const rc6Source = await readFile(new URL('./rc6-fixes.js', import.meta.url), 'utf8');

const EXPECTED_PROTECTED_HASH = '25a0320825ef44a579cc589dc793212b18374a8070dbd88a413fe2101751dd6b';
const EXPECTED_ROUTE_COUNT = 4558;
const CATEGORY_ALIASES = new Map([
  ['돈까스', '돈까스/일식'],
  ['분식', '분식/도시락'],
  ['회/해산물', '회/초밥/선어/해산물'],
  ['카페/디저트', '카페/디저트/베이커리/아이스크림/빙수']
]);
const canonical = new Set(audit.canonicalCategories || []);
const storeId = store => String(store.store_id || store.id || '');
const primaryCategory = store => CATEGORY_ALIASES.get(store.category) || store.category || '기타';
const byName = new Map(stores.map(store => [store.name, store]));

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function categoriesFor(name) {
  const store = byName.get(name);
  assert(store, `${name}: store missing`);
  return store.categories || [];
}

function expectCategories(name, expected) {
  const actual = categoriesFor(name);
  for (const category of expected) assert(actual.includes(category), `${name}: ${category} membership missing`);
}

const ids = stores.map(storeId);
const protectedView = stores.map(store => {
  const copy = structuredClone(store);
  delete copy.categories;
  return copy;
});
const protectedHash = createHash('sha256').update(JSON.stringify(protectedView)).digest('hex');
const routeCount = stores.reduce((sum, store) => sum + (store.routes || []).length, 0);
const searchable = stores.filter(store => storeId(store) && store.name && store.name !== '제목 없음');

assert(stores.length === 650, `store count changed: ${stores.length}`);
assert(searchable.length === 649, `searchable store count changed: ${searchable.length}`);
assert(new Set(ids).size === 650 && ids.every(Boolean), 'store IDs missing or duplicated');
assert(routeCount === EXPECTED_ROUTE_COUNT, `route count changed: ${routeCount}`);
assert(protectedHash === EXPECTED_PROTECTED_HASH, `non-category store data changed: ${protectedHash}`);
assert(stores.every(store => Array.isArray(store.categories) && store.categories.length), 'one or more stores have no categories');
assert(stores.every(store => store.categories.includes(primaryCategory(store))), 'primary category was not preserved');
assert(stores.every(store => store.categories.every(category => canonical.has(category))), 'unknown category membership found');
assert(stores.some(store => store.categories.length > 1), 'multi-category classification is empty');

expectCategories('미평햄버거 본점', ['한식', '분식/도시락', '햄버거/샌드위치/토스트/핫도그']);
expectCategories('두찜 여수 봉계점', ['한식', '국밥/찜/탕/찌개/조림']);
expectCategories('두찜 여수국동점', ['한식', '국밥/찜/탕/찌개/조림']);
expectCategories('서울깍두기 미평직영점', ['한식', '국밥/찜/탕/찌개/조림']);
expectCategories('양지골수육', ['한식', '국밥/찜/탕/찌개/조림']);
expectCategories('등뼈감자탕 미평점', ['한식', '국밥/찜/탕/찌개/조림']);
expectCategories('손수김밥 양지점', ['한식', '분식/도시락']);
expectCategories('아구찜&장어탕명가 조롱박 교동점', ['한식', '회/초밥/선어/해산물', '국밥/찜/탕/찌개/조림']);
expectCategories('서희국밥&족발 국동본점', ['한식', '족발/보쌈', '국밥/찜/탕/찌개/조림']);
expectCategories('굽네치킨&피자 문수점', ['치킨', '피자']);

assert(!categoriesFor('몬스터탕수육 여수학동점').includes('국밥/찜/탕/찌개/조림'), '탕수육 false-positive in stew category');
assert(!categoriesFor('더벤티 여수수산시장점(교동)').includes('회/초밥/선어/해산물'), '수산시장 branch-name false-positive in seafood category');
assert(!categoriesFor('봉구스밥버거 문수점').includes('햄버거/샌드위치/토스트/핫도그'), 'rice burger false-positive in hamburger category');
assert(!categoriesFor('1989마라탕 봉강점').includes('한식'), 'mala-tang false-positive in Korean category');

const ddangyoStewNames = stores
  .filter(store => (store.routes || []).some(route => route.enabled !== false && String(route.name).includes('땡겨요')))
  .filter(store => store.categories.includes('국밥/찜/탕/찌개/조림'))
  .map(store => store.name);
for (const name of [
  '두찜 여수 봉계점',
  '서울깍두기 미평직영점',
  '양지골수육',
  '등뼈감자탕 미평점'
]) assert(ddangyoStewNames.includes(name), `${name}: missing from Ddangyo stew candidates`);

for (const required of [
  'function storeCategories(store)',
  'function storeMatchesCategory(store, category)',
  'function categoriesFromStores(list)',
  'stores.flatMap(storeCategories)'
]) assert(appSource.includes(required), `app multi-category wiring missing: ${required}`);
for (const [name, source] of [
  ['final-experience.js', finalSource],
  ['rc2-fixes.js', rc2Source],
  ['rc3-fixes.js', rc3Source],
  ['rc6-fixes.js', rc6Source]
]) assert(source.includes('storeMatchesCategory'), `${name}: multi-category filtering missing`);
assert(/app\.js\?v=[^"']*multi-category-1/.test(indexSource), 'app.js cache version was not bumped');
assert(/final-experience\.js\?v=[^"']*multi-category-1/.test(indexSource), 'final-experience.js cache version was not bumped');
assert(/rc2-fixes\.js\?v=[^"']*multi-category-1/.test(finalSource), 'rc2-fixes.js cache version was not bumped');
assert(/rc3-fixes\.js\?v=[^"']*multi-category-1/.test(finalSource), 'rc3-fixes.js cache version was not bumped');
assert(/rc6-fixes\.js\?v=[^"']*multi-category-1/.test(finalSource), 'rc6-fixes.js cache version was not bumped');

const strictSingleCategoryPatterns = [
  /store\.cat\s*===\s*state\.category/,
  /store\.cat\s*===\s*selectedCategory/,
  /item\.store\.cat\s*===\s*category/
];
for (const [name, source] of [
  ['app.js', appSource],
  ['final-experience.js', finalSource],
  ['rc2-fixes.js', rc2Source],
  ['rc3-fixes.js', rc3Source],
  ['rc6-fixes.js', rc6Source]
]) for (const pattern of strictSingleCategoryPatterns) {
  assert(!pattern.test(source), `${name}: legacy single-category equality remains`);
}

assert(audit.stats?.stores === 650, 'audit store count mismatch');
assert(audit.stats?.multiCategoryStores === stores.filter(store => store.categories.length > 1).length, 'audit multi-category count mismatch');

console.log(JSON.stringify({
  stores: stores.length,
  searchableStores: searchable.length,
  routes: routeCount,
  multiCategoryStores: stores.filter(store => store.categories.length > 1).length,
  primaryOnlyStores: stores.filter(store => store.categories.length === 1).length,
  ddangyoStewCandidates: ddangyoStewNames.length,
  protectedStoreDataSha256: protectedHash,
  status: 'PASS'
}, null, 2));
