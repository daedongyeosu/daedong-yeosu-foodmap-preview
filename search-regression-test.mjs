import {readFileSync} from 'node:fs';

const stores = JSON.parse(readFileSync('data/stores.json', 'utf8'));
const normalize = value => String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/[\s·&()\-_/.,]/g, '');
const aliasGroups = [['BBQ', '비비큐', 'BBQ치킨', '비비큐치킨']];
const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

const canonicalStores = stores
  .filter(store => (store.store_id || store.id) && store.name && store.name.trim() && store.name !== '제목 없음')
  .map(store => {
    const identity = normalize([store.name, store.realBusinessName, store.brandName].filter(Boolean).join(' '));
    const aliases = [...new Set([
      ...(store.searchAliases || []),
      ...aliasGroups.flatMap(group => group.some(alias => identity.includes(normalize(alias))) ? group : [])
    ])];
    return {
      ...store,
      store_id: String(store.store_id || store.id),
      searchIndex: normalize([
        store.name, store.realBusinessName, store.brandName, store.branchName,
        store.district, store.category, ...aliases, ...(store.shopInShopNames || [])
      ].filter(Boolean).join(' '))
    };
  });
const searchableStores = canonicalStores;
const coordinateIds = new Set(Object.entries(JSON.parse(readFileSync('data/store-coordinates.json', 'utf8'))).filter(([, row]) => row.status === 'verified').map(([id]) => id));
const coordinateStores = canonicalStores.filter(store => coordinateIds.has(store.store_id));

function relevance(store, query) {
  const q = normalize(query);
  if (!q) return 1;
  const name = normalize(store.name);
  if (name === q) return 100;
  if (name.startsWith(q)) return 90;
  if (name.includes(q)) return 80;
  if (normalize(store.category).includes(q)) return 70;
  if (normalize(store.district).includes(q)) return 60;
  return store.searchIndex.includes(q) ? 50 : 0;
}

function search(query) {
  return searchableStores
    .map(store => ({store, score: relevance(store, query)}))
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score || a.store.name.localeCompare(b.store.name, 'ko'))
    .map(item => item.store);
}

const cases = [
  ['비비큐', '비비큐 미평둔덕점'],
  ['BBQ', '비비큐 미평둔덕점'],
  ['BBQ치킨', '비비큐 미평둔덕점'],
  ['비비큐 미평둔덕점', '비비큐 미평둔덕점'],
  ['미평둔덕', '비비큐 미평둔덕점'],
  ['조선밀면', '조선밀면&냉면 여수여서점'],
  ['조선 밀면', '조선밀면&냉면 여수여서점'],
  ['조선밀면&냉면', '조선밀면&냉면 여수여서점'],
  ['밀면', '조선밀면&냉면 여수여서점'],
  ['60계', '60계치킨 여수여서문수점'],
  ['60계치킨', '60계치킨 여수여서문수점'],
  ['더벤티', '더벤티 여수국동항점'],
  ['보드람치킨', '보드람치킨 여서점'],
  ['청하대 영빈관', '청하대 영빈관 여서점'],
  ['바삭한 휴게소', '바삭한 휴게소 여서점']
];

const report = cases.map(([query, expected]) => {
  const results = search(query);
  const selected = results.find(store => store.name === expected);
  assert(selected, `${query}: expected store missing`);
  assert(Array.isArray(selected.routes), `${query}: selected store routes field missing`);
  return {
    query,
    resultCount: results.length,
    firstResult: results[0]?.name || '',
    expectedIncluded: true,
    clickedStoreId: selected.store_id,
    openedStoreName: selected.name,
    routeCount: selected.routes.length
  };
});

assert(searchableStores.length === 649, `Searchable canonical count changed: ${searchableStores.length}`);
assert(coordinateStores.length === 326, `Coordinate search separation failed: ${coordinateStores.length}`);
assert(!search('BBQ').some(store => store.name === 'BHC 여수미평점'), 'BBQ search incorrectly includes BHC');
assert(!search('조선밀면').some(store => store.name === '1980밀면회관&냉면 문수점'), 'Chosun alias incorrectly includes 1980 store');

console.log(JSON.stringify({searchableStoreCount: searchableStores.length, coordinateStoreCount: coordinateStores.length, report, status: 'PASS'}, null, 2));
