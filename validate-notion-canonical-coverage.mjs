import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const fail = message => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };
const normalize = value => String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/[\s·&()\-_/.,]/g, '');
const proposedStoreId = pageId => createHash('sha256').update(`notion-page:${pageId}`).digest('hex').slice(0, 16);
const sha256File = path => createHash('sha256').update(readFileSync(path)).digest('hex');

function parseCsv(text) {
  const rows = [];
  let row = [], field = '', quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') { field += '"'; index += 1; }
      else if (char === '"') quoted = false;
      else field += char;
    } else if (char === '"') quoted = true;
    else if (char === ',') { row.push(field); field = ''; }
    else if (char === '\n') { row.push(field.replace(/\r$/, '')); rows.push(row); row = []; field = ''; }
    else field += char;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const [header, ...records] = rows.filter(item => item.some(Boolean));
  return records.map(values => Object.fromEntries(header.map((key, index) => [key, values[index] ?? ''])));
}

export function extractNotionPageRefs(markup) {
  const refs = [];
  const pattern = /<(page|mention-page)\b[^>]*url="([^"]+)"[^>]*>(?:([^<]*)<\/page>)?/g;
  let match;
  while ((match = pattern.exec(markup))) {
    const pageId = (match[2].match(/\/p\/([0-9a-f]{32})/i) || [])[1]?.toLowerCase() || '';
    if (pageId) refs.push({type: match[1], pageId, notionUrl: match[2], inlineTitle: String(match[3] || '').trim()});
  }
  return refs;
}

const fixture = '<page url="https://app.notion.com/p/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa">가게 A</page>\n<mention-page url="https://app.notion.com/p/bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"/>';
const fixtureRefs = extractNotionPageRefs(fixture);
assert(fixtureRefs.length === 2 && fixtureRefs.some(ref => ref.type === 'page') && fixtureRefs.some(ref => ref.type === 'mention-page'), 'Notion page/mention-page parser self-test failed');

const stores = readJson('data/stores.json');
const photos = readJson('data/photo-manifest.json').entries || [];
const coordinates = readJson('data/store-coordinates.json');
const banners = readJson('data/banner-targets.json');
const candidates = parseCsv(readFileSync('canonical-recovery-candidates-182.csv', 'utf8'));
const canonicalOnly = parseCsv(readFileSync('canonical-only-22-review.csv', 'utf8'));
const photoRecovery = parseCsv(readFileSync('canonical-photo-recovery-audit-180.csv', 'utf8'));

const untitled = stores.filter(store => store.name === '제목 없음');
const canonicalStores = stores.filter(store => (store.store_id || store.id) && store.name && store.name.trim() && store.name !== '제목 없음');
const ids = canonicalStores.map(store => String(store.store_id || store.id));
const pageIds = canonicalStores.map(store => store.notionPageId).filter(Boolean);
assert(stores.length === 650, `Expected 650 total rows, received ${stores.length}`);
assert(canonicalStores.length === 649, `Expected 649 searchable canonical stores, received ${canonicalStores.length}`);
assert(untitled.length === 1, `Expected exactly one 제목 없음 row, received ${untitled.length}`);
assert(new Set(ids).size === ids.length, 'Duplicate store_id detected');
assert(new Set(pageIds).size === pageIds.length, 'One Notion page is connected to multiple store_id values');
assert(candidates.length === 182, `Expected 182 recovery candidates, received ${candidates.length}`);
assert(new Set(candidates.map(row => row.notion_page_id)).size === candidates.length, 'Duplicate Notion page in recovery candidates');
assert(new Set(candidates.map(row => row.proposed_store_id)).size === candidates.length, 'Duplicate proposed store_id in recovery candidates');
assert(canonicalOnly.length === 22, `Expected 22 canonical-only rows, received ${canonicalOnly.length}`);

const canonicalByNotion = new Map(canonicalStores.filter(store => store.notionPageId).map(store => [store.notionPageId, store]));
for (const row of candidates) {
  assert(row.proposed_store_id === proposedStoreId(row.notion_page_id), `Unstable proposed store_id for ${row.notion_store_name}`);
  if (row.review_status === '신규 정상 가게') {
    const store = canonicalByNotion.get(row.notion_page_id);
    assert(store, `Reviewed normal Notion store missing from canonical: ${row.notion_store_name}`);
    assert(String(store.store_id || store.id) === row.proposed_store_id, `Notion/store_id mismatch: ${row.notion_store_name}`);
  }
}
assert(photoRecovery.length === 180, `Expected 180 photo recovery audit rows, received ${photoRecovery.length}`);
for (const row of photoRecovery) {
  const store = canonicalByNotion.get(row.notion_page_id);
  if (row.recovery_decision === 'restore-approved' || row.recovery_decision === 'link-existing-canonical') {
    assert(store, `Approved photo recovery missing from canonical: ${row.notion_store_name}`);
    assert(String(store.store_id || store.id) === row.proposed_store_id, `Approved recovery store_id mismatch: ${row.notion_store_name}`);
  } else {
    assert(!store, `Held recovery candidate unexpectedly entered canonical: ${row.notion_store_name}`);
  }
}

const photoByStore = new Map(photos.map(entry => [String(entry.storeId), entry]));
const sharedRouteUrls = new Set(['https://bit.ly/chak-yeosu']);
const emergencyIds = new Set(['0abd7147b7d6b1dd', 'd86586aaef8454c9']);
for (const id of emergencyIds) {
  const store = canonicalStores.find(item => String(item.store_id || item.id) === id);
  assert(store, `Emergency store missing: ${id}`);
  assert(store.notionUrl && store.notionPageId, `Notion identity missing: ${store.name}`);
  assert(store.latitude === null && store.longitude === null && store.coordinateStatus === 'unverified', `Unverified coordinates must stay null: ${store.name}`);
  assert(store.routes?.length, `Routes missing: ${store.name}`);
  const photo = photoByStore.get(id);
  assert(photo && existsSync(photo.src), `Photo mapping or file missing: ${store.name}`);
  assert(photos.filter(entry => entry.src === photo.src).length === 1, `Emergency photo reused by another store: ${store.name}`);
  for (const route of store.routes) {
    if (sharedRouteUrls.has(route.url)) continue;
    const owners = canonicalStores.filter(item => item.routes?.some(candidate => candidate.url === route.url));
    assert(owners.length === 1 && String(owners[0].store_id || owners[0].id) === id, `Emergency route connected to another store: ${store.name} / ${route.url}`);
  }
}
for (const row of photoRecovery.filter(item => item.recovery_decision === 'restore-approved')) {
  const store = canonicalByNotion.get(row.notion_page_id);
  assert(store.latitude === null && store.longitude === null && store.coordinateStatus === 'unverified', `Recovered coordinates must stay null: ${store.name}`);
  const photo = photoByStore.get(String(store.store_id || store.id));
  assert(photo && existsSync(photo.src), `Recovered photo mapping or file missing: ${store.name}`);
  assert(Array.isArray(store.routes), `Recovered store routes field missing: ${store.name}`);
}

const coordinateStatuses = Object.values(coordinates).map(row => row.status);
assert(Object.keys(coordinates).length === 470, 'Frozen coordinate row count changed');
assert(coordinateStatuses.filter(status => status === 'verified').length === 326, 'Frozen verified coordinate count changed');
assert(coordinateStatuses.filter(status => status !== 'verified').length === 144, 'Frozen null coordinate count changed');
assert(!coordinates['0abd7147b7d6b1dd'] && !coordinates['d86586aaef8454c9'], 'Unverified emergency stores must not be added to frozen coordinates');
assert(banners['09']?.storeId === 'd86586aaef8454c9' && banners['09']?.status === 'mapped', 'Banner 09 is not connected to the Chosun store');
assert(sha256File('data/store-coordinates.json') === '22f21699710ccd27de9dc73d4521fb79fac13c2a209be73e8e34519f58f087f1', 'Frozen coordinate file changed');
assert(sha256File('data/brand-app-mapping.json') === 'af77b9096b500f795fb2989cb996037996637b4ef620466245093d8f5d5b9d80', 'Frozen brand-app mapping changed');
assert(sha256File('data/brand-app-missing-nine-supplement.json') === '465300a39ef32ecb806e748e7829e5340e990de000d71d12dd4fb199848f0e9c', 'Frozen brand-app supplement changed');
assert(sha256File('data/happyorder-channel-research.json') === 'aaeb25e35f86d53718d5d1ef5e7a8d177a7888731dc5146aa621d2be86c6bcf7', 'Frozen HappyOrder mapping changed');
assert(sha256File('assets/yeosu-rc6/dolsan-day-mobile.webp') === '5d0eec4d433d7287ba52182b4dbed7266abe734109926a737aebb976b9d4334c', 'Approved day background changed');

const appSource = readFileSync('app.js', 'utf8');
const finalSource = readFileSync('final-experience.js', 'utf8');
const rc6Source = readFileSync('rc6-fixes.js', 'utf8');
assert(appSource.includes('searchableStores = canonicalStores'), 'Searchable stores are not fixed to all canonical stores');
assert(finalSource.includes('searchableStores.map'), 'Search modal does not use searchableStores');
assert(rc6Source.includes('const rows=coordinateStores.map'), 'GPS distance calculation does not use coordinateStores');

const bbq = canonicalStores.find(store => store.store_id === '0abd7147b7d6b1dd');
const chosun = canonicalStores.find(store => store.store_id === 'd86586aaef8454c9');
assert(['BBQ', '비비큐', 'BBQ치킨', '비비큐치킨'].every(alias => bbq.searchAliases.includes(alias)), 'Required BBQ aliases missing');
assert(['조선밀면&냉면 여수여서점', '조선밀면&냉면 여서점', '조선밀면', '조선 밀면', '조선밀면냉면'].every(alias => chosun.searchAliases.includes(alias)), 'Required Chosun aliases missing');

console.log(JSON.stringify({
  totalRows: stores.length,
  searchableCanonicalStores: canonicalStores.length,
  untitledRows: untitled.length,
  recoveryCandidates: candidates.length,
  photoRecoveryAuditRows: photoRecovery.length,
  canonicalOnlyReviewRows: canonicalOnly.length,
  verifiedCoordinateStores: 326,
  frozenNullCoordinateRows: 144,
  status: 'PASS'
}, null, 2));
