import fs from 'node:fs/promises';
import path from 'node:path';

const extractionPath = process.argv[2] || 'ddangyo-all-extraction-output/all-stores-normalized.json';
const outputDir = path.resolve('ddangyo-reclassification-output');
await fs.rm(outputDir, {recursive: true, force: true});
await fs.mkdir(outputDir, {recursive: true});

const extracted = JSON.parse(await fs.readFile(extractionPath, 'utf8'));
const storesValue = JSON.parse(await fs.readFile('data/stores.json', 'utf8'));
const stores = Array.isArray(storesValue) ? storesValue : (storesValue.stores || storesValue.data || []);
let coordinatesValue = {};
try { coordinatesValue = JSON.parse(await fs.readFile('data/store-coordinates.json', 'utf8')); } catch {}
let existingEnrichment = {stores: []};
try { existingEnrichment = JSON.parse(await fs.readFile('data/ddangyo-store-enrichment.json', 'utf8')); } catch {}

function text(value) { return String(value ?? '').trim().replace(/\s+/g, ' '); }
function compact(value) {
  return text(value).normalize('NFKC').toLocaleLowerCase('ko-KR')
    .replace(/피나치공/g, '피자나라치킨공주')
    .replace(/only/g, '온리')
    .replace(/bbq/g, '비비큐')
    .replace(/&/g, '앤')
    .replace(/[\s·()\-_/.,'"\[\]]/g, '');
}
function looseName(value) {
  return compact(text(value)
    .replace(/\([^)]*\)/g, ' ')
    .replace(/샵인샵|샵인점/g, '')
    .replace(/치킨&피자/g, '치킨피자'))
    .replace(/여수/g, '');
}
const GENERIC_NAME_KEYS = new Set(['', '점', '본점', '여수', '여수점', '치킨', '피자', '카페', '식당', '분식']);
function meaningful(key) { return key.length >= 4 && !GENERIC_NAME_KEYS.has(key); }
function containsMeaningful(left, right) {
  if (!meaningful(left) || !meaningful(right)) return false;
  const shorter = left.length <= right.length ? left : right;
  const longer = left.length <= right.length ? right : left;
  return shorter.length >= 4 && longer.includes(shorter);
}
function compatibleName(left, right) {
  const a = compact(left), b = compact(right);
  if (!a || !b) return false;
  if (a === b || containsMeaningful(a, b)) return true;
  const la = looseName(left), lb = looseName(right);
  return Boolean(meaningful(la) && meaningful(lb) && (la === lb || containsMeaningful(la, lb)));
}
function exactName(left, right) {
  const a = compact(left), b = compact(right);
  return Boolean(a && b && a === b);
}
function cleanAddress(value) {
  return text(value)
    .replace(/^대한민국\s*/, '')
    .replace(/^전라남도\s*/, '전남 ')
    .replace(/전남광주통합특별시/g, '전남')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+/g, ' ').trim();
}
function addressBase(value) {
  return cleanAddress(value)
    .replace(/\s+(?:지하\s*)?\d+층(?:\s+.*)?$/i, '')
    .replace(/\s+\d+(?:호|동)(?:\s+.*)?$/i, '')
    .trim();
}
function addressKey(value) {
  return addressBase(value).toLocaleLowerCase('ko-KR')
    .replace(/^(전남|전라남도)\s*/, '')
    .replace(/^여수시\s*/, '')
    .replace(/[\s,·]/g, '');
}
function roadSignature(value) {
  const matches = [...addressBase(value).matchAll(/([가-힣A-Za-z0-9]+(?:대로|로|길))\s*(\d+(?:-\d+)?)/g)];
  if (!matches.length) return '';
  const last = matches.at(-1);
  return compact(`${last[1]}${last[2]}`);
}
function storeId(row) { return text(row?.id || row?.store_id || row?.storeId); }
function validPhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return /^0\d{8,10}$/.test(digits) ? digits : '';
}
function routePhone(row) {
  for (const route of row?.routes || []) {
    if (/^tel:/i.test(String(route?.url || ''))) {
      const phone = validPhone(route.url);
      if (phone) return phone;
    }
  }
  return '';
}
function tokenFromUrl(value) {
  return String(value || '').match(/fdofd\.ddangyo\.com\/gateway1\.html\?([A-Za-z0-9]+)/)?.[1] || '';
}
function routeTokens(row) {
  return (row?.routes || []).map(route => tokenFromUrl(route?.url)).filter(Boolean);
}
function arrayValues(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap(arrayValues);
  if (typeof value === 'object') return Object.values(value).flatMap(arrayValues);
  return [text(value)].filter(Boolean);
}
function namesOf(row) {
  const values = [
    row?.name, row?.realBusinessName, row?.brandName, row?.branchName,
    ...arrayValues(row?.searchAliases), ...arrayValues(row?.aliases),
    ...arrayValues(row?.shopInShopNames), ...arrayValues(row?.storeAliases)
  ];
  if (row?.brandName && row?.branchName) values.push(`${row.brandName} ${row.branchName}`);
  return [...new Set(values.map(text).filter(Boolean))];
}
function coordinatesRecord(id) {
  if (Array.isArray(coordinatesValue)) return coordinatesValue.find(row => storeId(row) === id) || {};
  if (Array.isArray(coordinatesValue?.stores || coordinatesValue?.data)) {
    return (coordinatesValue.stores || coordinatesValue.data).find(row => storeId(row) === id) || {};
  }
  return coordinatesValue?.[id] || {};
}
function numberOrNull(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : null;
}
function coordinateOf(row, coordinate = {}) {
  const lat = numberOrNull(row?.lat ?? row?.latitude ?? coordinate?.lat ?? coordinate?.latitude);
  const lng = numberOrNull(row?.lng ?? row?.longitude ?? coordinate?.lng ?? coordinate?.longitude);
  return lat !== null && lng !== null ? {lat, lng} : null;
}
function distanceMeters(a, b) {
  if (!a || !b) return Number.POSITIVE_INFINITY;
  const R = 6371000;
  const rad = value => value * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
}
function anyCompatible(existing, incoming) {
  return existing.names.some(name => compatibleName(name, incoming.name));
}
function summarize(row) {
  return {storeId: row.id, storeName: row.primaryName, address: row.address, phone: row.phone, virtual: Boolean(row.virtual), names: row.names.slice(0, 12)};
}

const indexed = stores.map(row => {
  const id = storeId(row);
  const coordinate = coordinatesRecord(id);
  const address = cleanAddress(row?.address || row?.roadAddress || coordinate?.matchedAddress || coordinate?.inputAddress || '');
  return {
    id, raw: row, virtual: false,
    primaryName: text(row?.name || row?.realBusinessName || ''),
    names: namesOf(row), address,
    addressKey: addressKey(address), roadSignature: roadSignature(address),
    phone: validPhone(row?.phone) || routePhone(row),
    tokens: routeTokens(row), coordinate: coordinateOf(row, coordinate)
  };
}).filter(row => row.id);

const preliminaryIds = new Set(indexed.map(row => row.id));
for (const row of existingEnrichment.stores || []) {
  const id = text(row?.targetStoreId);
  if (!id || preliminaryIds.has(id)) continue;
  const address = cleanAddress(row?.address || '');
  indexed.push({
    id, raw: row, virtual: true,
    primaryName: text(row?.name || ''),
    names: [text(row?.name || '')].filter(Boolean),
    address, addressKey: addressKey(address), roadSignature: roadSignature(address),
    phone: validPhone(row?.phone),
    tokens: [tokenFromUrl(row?.ddangyoUrl), ...(row?.sourceUrls || []).map(tokenFromUrl)].filter(Boolean),
    coordinate: coordinateOf(row)
  });
  preliminaryIds.add(id);
}

const byId = new Map(indexed.map(row => [row.id, row]));
const byToken = new Map();
for (const row of indexed) for (const token of row.tokens) {
  if (!byToken.has(token)) byToken.set(token, []);
  byToken.get(token).push(row);
}
const patstoMap = new Map();
for (const row of existingEnrichment.stores || []) {
  const patstoNo = text(row?.patstoNo);
  const id = text(row?.targetStoreId);
  if (patstoNo && id) patstoMap.set(patstoNo, id);
}

function decide(incoming) {
  const patstoNo = text(incoming?.patstoNo);
  const knownId = patstoMap.get(patstoNo);
  if (knownId) {
    const candidate = byId.get(knownId);
    return {status: 'existing', method: 'known-patsto-map', storeId: knownId, candidate: candidate ? summarize(candidate) : {storeId: knownId, virtual: true}};
  }

  const tokenMatches = [...new Set((incoming?.tokens || []).flatMap(token => (byToken.get(token) || []).map(row => row.id)))].map(id => byId.get(id)).filter(Boolean);
  if (tokenMatches.length === 1) return {status: 'existing', method: 'existing-ddangyo-token', storeId: tokenMatches[0].id, candidate: summarize(tokenMatches[0])};
  if (tokenMatches.length > 1) {
    const named = tokenMatches.filter(row => anyCompatible(row, incoming));
    if (named.length === 1) return {status: 'existing', method: 'shared-token-compatible-name', storeId: named[0].id, candidate: summarize(named[0])};
    return {status: 'review', method: 'ambiguous-ddangyo-token', candidates: tokenMatches.map(summarize)};
  }

  const targetAddress = addressKey(incoming?.address);
  const targetRoad = roadSignature(incoming?.address);
  const targetPhone = validPhone(incoming?.phone);
  const targetCoordinate = coordinateOf(incoming);

  if (targetPhone) {
    const named = indexed.filter(row => row.phone === targetPhone && anyCompatible(row, incoming));
    if (named.length === 1) return {status: 'existing', method: 'same-phone-compatible-name', storeId: named[0].id, candidate: summarize(named[0])};
    if (named.length > 1) return {status: 'review', method: 'same-phone-multiple-compatible', candidates: named.map(summarize)};
  }

  if (targetAddress) {
    const addressMatches = indexed.filter(row => row.addressKey && row.addressKey === targetAddress);
    const named = addressMatches.filter(row => anyCompatible(row, incoming));
    if (named.length === 1) return {status: 'existing', method: 'exact-address-compatible-name', storeId: named[0].id, candidate: summarize(named[0])};
    if (named.length > 1) return {status: 'review', method: 'exact-address-multiple-compatible', candidates: named.map(summarize)};
    if (addressMatches.length) return {status: 'new', method: 'shared-address-distinct-shop-in-shop', naverEligible: false, sharedAddressCandidates: addressMatches.map(summarize)};
  }

  if (targetRoad) {
    const named = indexed.filter(row => row.roadSignature && row.roadSignature === targetRoad && anyCompatible(row, incoming));
    if (named.length === 1) return {status: 'existing', method: 'same-road-compatible-name', storeId: named[0].id, candidate: summarize(named[0])};
    if (named.length > 1) return {status: 'review', method: 'same-road-multiple-compatible', candidates: named.map(summarize)};
  }

  if (targetCoordinate) {
    const near = indexed.map(row => ({row, distance: distanceMeters(targetCoordinate, row.coordinate)}))
      .filter(item => item.distance <= 80 && anyCompatible(item.row, incoming))
      .sort((a, b) => a.distance - b.distance);
    if (near.length === 1 || (near.length > 1 && near[1].distance - near[0].distance > 30)) {
      return {status: 'existing', method: 'near-coordinate-compatible-name', storeId: near[0].row.id, distanceMeters: Math.round(near[0].distance), candidate: summarize(near[0].row)};
    }
    if (near.length > 1) return {status: 'review', method: 'near-coordinate-multiple-compatible', candidates: near.map(item => ({...summarize(item.row), distanceMeters: Math.round(item.distance)}))};
  }

  const exact = indexed.filter(row => row.names.some(name => exactName(name, incoming?.name)));
  if (exact.length === 1) {
    if (!exact[0].address) return {status: 'existing', method: 'unique-exact-name-current-address-missing', storeId: exact[0].id, candidate: summarize(exact[0])};
    return {status: 'review', method: 'unique-exact-name-address-different', candidate: summarize(exact[0]), ddangyoAddress: cleanAddress(incoming?.address)};
  }
  if (exact.length > 1) return {status: 'review', method: 'multiple-exact-name', candidates: exact.map(summarize)};

  const compatible = indexed.filter(row => anyCompatible(row, incoming));
  if (compatible.length === 1 && !compatible[0].address) return {status: 'existing', method: 'unique-compatible-name-current-address-missing', storeId: compatible[0].id, candidate: summarize(compatible[0])};
  if (compatible.length === 1) return {status: 'review', method: 'unique-compatible-name-address-unconfirmed', candidate: summarize(compatible[0]), ddangyoAddress: cleanAddress(incoming?.address)};
  if (compatible.length > 1) return {status: 'review', method: 'multiple-compatible-name', candidates: compatible.slice(0, 20).map(summarize)};

  return {status: 'new', method: 'no-existing-fingerprint-match', naverEligible: true};
}

const reclassified = extracted.map(row => row?.error ? row : ({...row, previousMatch: row.match || null, match: decide(row)}));
const valid = reclassified.filter(row => row && !row.error);
const summary = {
  generatedAt: new Date().toISOString(),
  inputStores: extracted.length,
  indexedCurrentStores: indexed.length,
  virtualPreviewStores: indexed.filter(row => row.virtual).length,
  existing: valid.filter(row => row.match?.status === 'existing').length,
  newStores: valid.filter(row => row.match?.status === 'new').length,
  review: valid.filter(row => row.match?.status === 'review').length,
  failures: reclassified.filter(row => row?.error).length,
  methods: valid.reduce((acc, row) => {
    const key = `${row.match?.status}:${row.match?.method}`;
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {})
};

await fs.writeFile(path.join(outputDir, 'reclassified-stores.json'), JSON.stringify(reclassified, null, 2));
await fs.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
await fs.writeFile(path.join(outputDir, 'existing-stores.json'), JSON.stringify(valid.filter(row => row.match?.status === 'existing'), null, 2));
await fs.writeFile(path.join(outputDir, 'new-stores.json'), JSON.stringify(valid.filter(row => row.match?.status === 'new'), null, 2));
await fs.writeFile(path.join(outputDir, 'review-stores.json'), JSON.stringify(valid.filter(row => row.match?.status === 'review'), null, 2));
console.log(JSON.stringify(summary, null, 2));
