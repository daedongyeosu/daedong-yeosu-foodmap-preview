import fs from 'node:fs';

const stores = JSON.parse(fs.readFileSync(new URL('./data/stores.json', import.meta.url), 'utf8'));
const sharedChannels = new Set(['CHAK 지역상품권', '지역상품권앱', '브랜드앱', '해피오더']);

function normalizeText(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[^0-9a-z가-힣]/g, '')
    .replace(/여수/g, '');
}

function normalizeUrl(value) {
  let decoded = String(value || '');
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // Keep the original text so malformed URLs remain visible to the audit.
  }
  return decoded.replace(/^http:\/\//, 'https://').replace(/\/$/, '');
}

const routeUses = new Map();
for (const store of stores) {
  for (const route of store.routes || []) {
    if (!route.url || sharedChannels.has(route.name)) continue;
    const url = normalizeUrl(route.url);
    if (!routeUses.has(url)) routeUses.set(url, []);
    routeUses.get(url).push({
      storeId: String(store.store_id || store.id),
      storeName: store.name,
      channel: route.name
    });
  }
}

const duplicateDestinations = [...routeUses.entries()]
  .filter(([, uses]) => uses.length > 1)
  .map(([url, uses]) => ({ url, uses }));

const namedAliases = [];
for (const store of stores) {
  const ownNames = new Set([
    store.name,
    store.realBusinessName,
    ...(store.aliases || []),
    ...(store.shopInShopNames || [])
  ].map(normalizeText).filter(Boolean));

  for (const route of store.routes || []) {
    const decoded = normalizeUrl(route.url);
    const match = decoded.match(/bit\.ly\/(?:auto|mk|tk|yo|cu|bm|전화)-(.+)$/i);
    if (!match) continue;
    const slug = normalizeText(match[1]);
    if ([...ownNames].some(name => name.includes(slug) || slug.includes(name))) continue;

    const foreignStores = stores.filter(candidate => {
      if (String(candidate.store_id || candidate.id) === String(store.store_id || store.id)) return false;
      return [
        candidate.name,
        candidate.realBusinessName,
        ...(candidate.aliases || []),
        ...(candidate.shopInShopNames || [])
      ].map(normalizeText).filter(name => name.length >= 4)
        .some(name => name.includes(slug) || slug.includes(name));
    });

    if (foreignStores.length) {
      namedAliases.push({
        storeId: String(store.store_id || store.id),
        storeName: store.name,
        channel: route.name,
        url: route.url,
        foreignStores: foreignStores.map(candidate => candidate.name)
      });
    }
  }
}

if (duplicateDestinations.length) {
  throw new Error(`cross-store duplicate destinations: ${JSON.stringify(duplicateDestinations, null, 2)}`);
}
if (namedAliases.length) {
  throw new Error(`foreign store names in route aliases: ${JSON.stringify(namedAliases, null, 2)}`);
}

console.log(JSON.stringify({
  totalStores: stores.length,
  auditedRoutes: [...routeUses.values()].reduce((total, uses) => total + uses.length, 0),
  duplicateDestinations: duplicateDestinations.length,
  foreignNamedAliases: namedAliases.length,
  status: 'PASS'
}, null, 2));
