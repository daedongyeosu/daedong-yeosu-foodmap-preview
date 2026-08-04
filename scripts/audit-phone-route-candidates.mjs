import fs from 'node:fs/promises';

const stores = JSON.parse(await fs.readFile(new URL('../data/stores.json', import.meta.url), 'utf8'));
const runtime = JSON.parse(await fs.readFile(new URL('../data/phone-order-runtime.json', import.meta.url), 'utf8'));
const mapped = new Set((runtime.storeMappings || []).map(item => String(item.store_id)));

function phoneRoute(store) {
  return (store.routes || []).find(route => /전화/.test(String(route.name || '')) || /^tel:/i.test(String(route.url || '')));
}

function notionPageId(url) {
  const match = String(url || '').match(/(?:notion\.so\/|notion\.com\/p\/)([0-9a-f]{32})/i);
  return match ? match[1].toLowerCase() : '';
}

async function resolveRoute(url) {
  if (!url) return {destination: '', notion_phone_page_id: ''};
  if (/notion\.(?:so|com)/i.test(url)) return {destination: url, notion_phone_page_id: notionPageId(url)};
  try {
    const response = await fetch(url, {redirect: 'manual', signal: AbortSignal.timeout(15000)});
    const destination = response.headers.get('location') || url;
    return {destination, notion_phone_page_id: notionPageId(destination)};
  } catch (error) {
    return {destination: '', notion_phone_page_id: '', error: String(error?.message || error)};
  }
}

const candidates = stores
  .filter(store => String(store.name || '').trim() && String(store.name).trim() !== '제목없음')
  .map(store => ({store, route: phoneRoute(store)}))
  .filter(({store, route}) => route && !mapped.has(String(store.id)));

const results = new Array(candidates.length);
let cursor = 0;
async function worker() {
  while (cursor < candidates.length) {
    const index = cursor++;
    const {store, route} = candidates[index];
    results[index] = {
      store_id: String(store.id),
      store_name: store.name,
      canonical_page_id: store.notionPageId || store.source?.notionPageId || '',
      phone_route: route.url,
      ...(await resolveRoute(route.url))
    };
  }
}

await Promise.all(Array.from({length: 10}, () => worker()));
await fs.writeFile(new URL('../phone-route-candidate-audit.json', import.meta.url), `${JSON.stringify(results, null, 2)}\n`);

const escaped = value => `"${String(value ?? '').replaceAll('"', '""')}"`;
const columns = ['store_id', 'store_name', 'canonical_page_id', 'phone_route', 'destination', 'notion_phone_page_id', 'error'];
const csv = [columns.join(','), ...results.map(row => columns.map(column => escaped(row[column])).join(','))].join('\n');
await fs.writeFile(new URL('../phone-route-candidate-audit.csv', import.meta.url), `${csv}\n`);

console.log(JSON.stringify({
  candidates: results.length,
  resolved: results.filter(item => item.destination).length,
  notionPhonePages: results.filter(item => item.notion_phone_page_id).length,
  unresolved: results.filter(item => !item.notion_phone_page_id).length
}, null, 2));
