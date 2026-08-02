import fs from 'node:fs/promises';
import path from 'node:path';

const inputPath = process.argv[2] || 'ddangyo-reclassification-output/reclassified-stores.json';
const outputDir = path.resolve('ddangyo-final-classification-output');
await fs.rm(outputDir, {recursive: true, force: true});
await fs.mkdir(outputDir, {recursive: true});

const input = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const overrides = JSON.parse(await fs.readFile('data/ddangyo-manual-existing-overrides.json', 'utf8'));
const storesValue = JSON.parse(await fs.readFile('data/stores.json', 'utf8'));
const stores = Array.isArray(storesValue) ? storesValue : (storesValue.stores || storesValue.data || []);
let coordinates = {};
try { coordinates = JSON.parse(await fs.readFile('data/store-coordinates.json', 'utf8')); } catch {}
let enrichment = {stores: []};
try { enrichment = JSON.parse(await fs.readFile('data/ddangyo-store-enrichment.json', 'utf8')); } catch {}

const text = value => String(value ?? '').trim().replace(/\s+/g, ' ');
function compact(value) {
  return text(value).normalize('NFKC').toLocaleLowerCase('ko-KR')
    .replace(/피나치공/g, '피자나라치킨공주').replace(/only/g, '온리').replace(/bbq/g, '비비큐').replace(/&/g, '앤')
    .replace(/[\s·()\-_/.,'"\[\]]/g, '');
}
function loose(value) { return compact(text(value).replace(/\([^)]*\)/g, '').replace(/여수/g, '').replace(/샵인샵|샵인점/g, '')); }
const generic = new Set(['', '점', '본점', '여수', '여수점', '치킨', '피자', '카페', '식당', '분식']);
const meaningful = value => value.length >= 4 && !generic.has(value);
function compatible(left, right) {
  const a = compact(left), b = compact(right);
  if (!a || !b) return false;
  if (a === b || (meaningful(a) && meaningful(b) && (a.includes(b) || b.includes(a)))) return true;
  const la = loose(left), lb = loose(right);
  return Boolean(meaningful(la) && meaningful(lb) && (la === lb || la.includes(lb) || lb.includes(la)));
}
function addressBase(value) {
  return text(value).replace(/^대한민국\s*/, '').replace(/^전라남도\s*/, '전남 ').replace(/전남광주통합특별시/g, '전남')
    .replace(/\s*\([^)]*\)\s*/g, ' ').replace(/\s+(?:지하\s*)?\d+층(?:\s+.*)?$/i, '').replace(/\s+\d+(?:호|동)(?:\s+.*)?$/i, '').trim();
}
function addressKey(value) { return addressBase(value).toLocaleLowerCase('ko-KR').replace(/^(전남|전라남도)\s*/, '').replace(/^여수시\s*/, '').replace(/[\s,·]/g, ''); }
function roadSignature(value) {
  const matches = [...addressBase(value).matchAll(/([가-힣A-Za-z0-9]+(?:대로|로|길))\s*(\d+(?:-\d+)?)/g)];
  return matches.length ? compact(`${matches.at(-1)[1]}${matches.at(-1)[2]}`) : '';
}
function phone(value) { const digits = String(value || '').replace(/\D/g, ''); return /^0\d{8,10}$/.test(digits) ? digits : ''; }
function storeId(row) { return text(row?.id || row?.store_id || row?.storeId); }
function flatten(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(flatten);
  if (typeof value === 'object') return Object.values(value).flatMap(flatten);
  return [text(value)].filter(Boolean);
}
function names(row) {
  const result = [row?.name, row?.realBusinessName, row?.brandName, row?.branchName,
    ...flatten(row?.searchAliases), ...flatten(row?.aliases), ...flatten(row?.shopInShopNames), ...flatten(row?.storeAliases)];
  if (row?.brandName && row?.branchName) result.push(`${row.brandName} ${row.branchName}`);
  return [...new Set(result.map(text).filter(Boolean))];
}
function coordinateRecord(id) {
  if (Array.isArray(coordinates)) return coordinates.find(row => storeId(row) === id) || {};
  if (Array.isArray(coordinates?.stores || coordinates?.data)) return (coordinates.stores || coordinates.data).find(row => storeId(row) === id) || {};
  return coordinates?.[id] || {};
}
function routePhone(row) {
  for (const route of row?.routes || []) if (/^tel:/i.test(String(route?.url || ''))) {
    const value = phone(route.url); if (value) return value;
  }
  return '';
}
function summarize(row) { return {storeId: row.id, storeName: row.name, address: row.address, phone: row.phone, virtual: row.virtual}; }

const indexed = stores.map(row => {
  const id = storeId(row), coord = coordinateRecord(id);
  return {id, name: text(row?.name || row?.realBusinessName), names: names(row),
    address: text(row?.address || coord?.matchedAddress || coord?.inputAddress || ''), phone: phone(row?.phone) || routePhone(row), virtual: false};
}).filter(row => row.id);
const ids = new Set(indexed.map(row => row.id));
for (const row of enrichment.stores || []) {
  const id = text(row?.targetStoreId);
  if (!id || ids.has(id)) continue;
  indexed.push({id, name: text(row?.name), names: [text(row?.name)].filter(Boolean), address: text(row?.address), phone: phone(row?.phone), virtual: true});
  ids.add(id);
}
const byId = new Map(indexed.map(row => [row.id, row]));
const knownPatsto = new Map((enrichment.stores || []).map(row => [text(row?.patstoNo), text(row?.targetStoreId)]).filter(([a,b]) => a && b));

function fallback(row) {
  const targetAddress = addressKey(row.address), targetRoad = roadSignature(row.address), targetPhone = phone(row.phone);
  if (targetPhone) {
    const found = indexed.filter(item => item.phone === targetPhone && item.names.some(name => compatible(name, row.name)));
    if (found.length === 1) return {status: 'existing', method: 'final-phone-compatible-name', storeId: found[0].id, candidate: summarize(found[0])};
  }
  if (targetAddress) {
    const sameAddress = indexed.filter(item => addressKey(item.address) === targetAddress);
    const named = sameAddress.filter(item => item.names.some(name => compatible(name, row.name)));
    if (named.length === 1) return {status: 'existing', method: 'final-exact-address-compatible-name', storeId: named[0].id, candidate: summarize(named[0])};
    if (named.length > 1) return {status: 'review', method: 'final-exact-address-multiple-compatible', candidates: named.map(summarize)};
    if (sameAddress.length) return {status: 'new', method: 'final-shared-address-distinct-shop-in-shop', naverEligible: false, candidates: sameAddress.map(summarize)};
  }
  if (targetRoad) {
    const named = indexed.filter(item => roadSignature(item.address) === targetRoad && item.names.some(name => compatible(name, row.name)));
    if (named.length === 1) return {status: 'existing', method: 'final-road-compatible-name', storeId: named[0].id, candidate: summarize(named[0])};
  }
  const exact = indexed.filter(item => item.names.some(name => compact(name) === compact(row.name)));
  if (exact.length === 1) return {status: 'existing', method: 'final-unique-exact-name', storeId: exact[0].id, candidate: summarize(exact[0])};
  const named = indexed.filter(item => item.names.some(name => compatible(name, row.name)));
  if (named.length === 1) return {status: 'review', method: 'final-compatible-name-address-unconfirmed', candidate: summarize(named[0]), ddangyoAddress: row.address};
  if (named.length > 1) return {status: 'review', method: 'final-multiple-compatible-name', candidates: named.slice(0, 20).map(summarize)};
  return {status: 'new', method: 'final-no-match', naverEligible: true};
}

const output = input.map(row => {
  if (row?.error) return row;
  const patstoNo = text(row.patstoNo);
  if (overrides[patstoNo]) {
    const id = text(overrides[patstoNo].storeId);
    return {...row, match: {status: 'existing', method: 'manual-verified-existing', storeId: id, reason: overrides[patstoNo].reason, candidate: byId.has(id) ? summarize(byId.get(id)) : {storeId: id}}};
  }
  const knownId = knownPatsto.get(patstoNo);
  if (knownId) return {...row, match: {status: 'existing', method: 'known-patsto-map', storeId: knownId, candidate: byId.has(knownId) ? summarize(byId.get(knownId)) : {storeId: knownId}}};

  const current = row.match || {};
  if (current.status === 'existing' && current.storeId) {
    const candidate = byId.get(String(current.storeId));
    const sameAddress = candidate && addressKey(candidate.address) && addressKey(candidate.address) === addressKey(row.address);
    const sameName = candidate && candidate.names.some(name => compatible(name, row.name));
    const samePhone = candidate && phone(candidate.phone) && phone(candidate.phone) === phone(row.phone) && sameName;
    if (sameAddress && sameName || sameName || samePhone) return row;
    const replacement = fallback(row);
    return {...row, rejectedMatch: current, match: replacement};
  }
  return {...row, match: fallback(row)};
});

const valid = output.filter(row => row && !row.error);
const targetCounts = valid.filter(row => row.match?.status === 'existing').reduce((map, row) => {
  const id = row.match.storeId;
  if (!map[id]) map[id] = [];
  map[id].push({patstoNo: row.patstoNo, name: row.name});
  return map;
}, {});
const duplicateTargets = Object.fromEntries(Object.entries(targetCounts).filter(([, rows]) => rows.length > 1));
const summary = {
  generatedAt: new Date().toISOString(), inputStores: output.length,
  existing: valid.filter(row => row.match?.status === 'existing').length,
  newStores: valid.filter(row => row.match?.status === 'new').length,
  review: valid.filter(row => row.match?.status === 'review').length,
  failures: output.filter(row => row?.error).length,
  duplicateTargetStoreIds: Object.keys(duplicateTargets).length,
  duplicateTargets,
  methods: valid.reduce((acc, row) => { const key = `${row.match?.status}:${row.match?.method}`; acc[key] = (acc[key] || 0) + 1; return acc; }, {})
};
await fs.writeFile(path.join(outputDir, 'final-stores.json'), JSON.stringify(output, null, 2));
await fs.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
await fs.writeFile(path.join(outputDir, 'review-stores.json'), JSON.stringify(valid.filter(row => row.match?.status === 'review'), null, 2));
await fs.writeFile(path.join(outputDir, 'new-stores.json'), JSON.stringify(valid.filter(row => row.match?.status === 'new'), null, 2));
console.log(JSON.stringify(summary, null, 2));
