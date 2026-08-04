import fs from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const AUDIT_PATH = process.env.DDANGYO_AUDIT_PATH || '/tmp/ddangyo-missing-menu-audit.json';
const CONCURRENCY = 8;
const REQUEST_TIMEOUT_MS = 30_000;
const STORE_IDS = new Set(String(process.env.DDANGYO_STORE_IDS || '').split(',').map(value => value.trim()).filter(Boolean));
const API_HEADERS = Object.freeze({
  'content-type': 'application/json',
  app_name: 'O2O',
  app_os: 'WEB',
  uuid_token: 'GTY0000000',
  app_token: 'GTY0000000'
});

const readJson = async path => JSON.parse(await fs.readFile(new URL(path, ROOT), 'utf8'));

async function readMenuMap() {
  const source = await fs.readFile(new URL('store-menu-content/ddangyo-menu-map.js', ROOT), 'utf8');
  const context = {window: {}};
  vm.createContext(context);
  vm.runInContext(source, context);
  return context.window.DAEDONG_DDANGYO_MENU_STORES || {};
}

function storeId(store) {
  return String(store?.id || store?.store_id || '');
}

function ddangyoRoute(store) {
  return (store?.routes || []).find(route => (
    String(route?.key || '').toLowerCase() === 'ddangyo'
    || String(route?.name || '').includes('땡겨요')
  ));
}

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/네네치킨&피자/g, '네네치킨')
    .replace(/여수/g, '')
    .replace(/둔덕미평/g, '둔덕')
    .replace(/미평둔덕/g, '둔덕')
    .replace(/안산,소호/g, '안산')
    .replace(/안산소호/g, '안산')
    .replace(/무선지구/g, '무선')
    .replace(/본점|직영점|대표점|샵인점/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^0-9a-z가-힣]/g, '');
}

function identityStatus(store, officialName, officialAddress) {
  const expected = normalize(store.name);
  const actual = normalize(officialName);
  const address = String(officialAddress || '');
  const storedAddress = String(store.address || '');
  if (!actual) return {status: 'unresolved', reason: 'official-name-missing'};
  if (expected === actual) return {status: 'verified', reason: 'normalized-name-exact'};
  if (expected.length >= 4 && actual.length >= 4 && (expected.includes(actual) || actual.includes(expected))) {
    return {status: 'verified', reason: 'normalized-name-contained'};
  }
  if (storedAddress && address && normalize(storedAddress) === normalize(address)) {
    return {status: 'verified', reason: 'address-exact'};
  }
  return {status: 'review', reason: 'name-address-mismatch'};
}

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {...options, signal: controller.signal});
  } finally {
    clearTimeout(timer);
  }
}

async function fetchWithRetry(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, options);
      if (response.status >= 500 && attempt < 3) {
        await response.text();
        await new Promise(resolve => setTimeout(resolve, attempt * 700));
        continue;
      }
      return response;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 700));
    }
  }
  throw lastError;
}

async function fetchJson(url, options = {}) {
  const response = await fetchWithRetry(url, options);
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`invalid-json:${response.status}:${url}`);
  }
  if (!response.ok) throw new Error(`http-${response.status}:${url}`);
  return data;
}

async function gatewayCode(routeUrl) {
  const response = await fetchWithRetry(routeUrl, {redirect: 'follow'});
  const resolvedUrl = response.url;
  const parsed = new URL(resolvedUrl);
  if (!parsed.hostname.endsWith('ddangyo.com') || !parsed.pathname.endsWith('/gateway1.html')) {
    throw new Error(`not-ddangyo-gateway:${resolvedUrl}`);
  }
  const code = [...parsed.searchParams.keys()][0] || '';
  if (!code) throw new Error(`gateway-code-missing:${resolvedUrl}`);
  return {resolvedUrl, code};
}

async function patstoFromCode(code) {
  const data = await fetchJson('https://fdofd.ddangyo.com/shorturl/view', {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify({dma_request: {short_url: code}})
  });
  if (data.result_code !== '0000') throw new Error(`shorturl:${data.message || data.result_code}`);
  const originUrl = data.result?.dma_short_url_info?.origin_url || '';
  const params = new URLSearchParams(originUrl);
  const patstoNo = params.get('patsto_no') || '';
  if (!patstoNo) throw new Error(`patsto-missing:${originUrl}`);
  return {originUrl, patstoNo, sharedName: params.get('patsto_nm') || ''};
}

function shopRequest(patstoNo) {
  return {
    dma_shop_search: {
      login_mbr_id: '',
      patsto_no: patstoNo,
      admtn_dong_cd: '1',
      map_latt: '34.7604',
      map_lngt: '127.7040',
      patsto_tab_div_cd: '01',
      exps_chan: '',
      rest_patsto_yn: ''
    }
  };
}

async function shopData(endpoint, patstoNo) {
  const data = await fetchJson(`https://fdofd.ddangyo.com/shop/${endpoint}`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify(shopRequest(patstoNo))
  });
  if (data.result_code !== '0000') throw new Error(`${endpoint}:${data.message || data.result_code}`);
  return data.result || {};
}

async function auditOne(store) {
  const route = ddangyoRoute(store);
  const base = {storeId: storeId(store), storeName: store.name, storeAddress: store.address || '', routeUrl: route?.url || ''};
  try {
    const gateway = await gatewayCode(route.url);
    const resolved = await patstoFromCode(gateway.code);
    const [home, menu] = await Promise.all([
      shopData('home', resolved.patstoNo),
      shopData('homemenu', resolved.patstoNo)
    ]);
    const shop = home.dma_shop_home_info || {};
    const identity = identityStatus(store, shop.patsto_nm || resolved.sharedName, shop.bas_addr);
    return {
      ...base,
      ...gateway,
      ...resolved,
      officialName: shop.patsto_nm || resolved.sharedName || '',
      officialAddress: shop.bas_addr || '',
      identity,
      menuCount: Array.isArray(menu.menu_list) ? menu.menu_list.length : 0,
      groupCount: Array.isArray(menu.menu_grp_list) ? menu.menu_grp_list.length : 0,
      imageCount: Array.isArray(home.shop_img_list) ? home.shop_img_list.length : 0,
      ok: true
    };
  } catch (error) {
    return {...base, ok: false, error: String(error?.message || error)};
  }
}

async function mapConcurrent(items, worker, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
      if ((index + 1) % 10 === 0 || index + 1 === items.length) {
        console.log(`audited ${index + 1}/${items.length}`);
      }
    }
  }
  await Promise.all(Array.from({length: Math.min(concurrency, items.length)}, run));
  return results;
}

const stores = await readJson('data/stores.json');
const enrichment = await readJson('data/ddangyo-store-enrichment.json');
const menuMap = await readMenuMap();
const newStores = enrichment.stores.filter(row => row.isNew).map(row => ({
  id: row.targetStoreId,
  store_id: row.targetStoreId,
  name: row.name,
  address: row.address,
  routes: [{name: '땡겨요', key: 'ddangyo', url: row.ddangyoUrl}]
}));
const allStores = [...stores, ...newStores];
const missing = allStores.filter(store => (
  ddangyoRoute(store)
  && !menuMap[storeId(store)]
  && (!STORE_IDS.size || STORE_IDS.has(storeId(store)))
));
const rows = await mapConcurrent(missing, auditOne, CONCURRENCY);
const summary = rows.reduce((result, row) => {
  result.total += 1;
  if (!row.ok) result.failed += 1;
  else if (!row.menuCount) result.noMenu += 1;
  else if (row.identity.status === 'verified') result.verified += 1;
  else result.review += 1;
  return result;
}, {total: 0, verified: 0, review: 0, noMenu: 0, failed: 0});
await fs.writeFile(AUDIT_PATH, `${JSON.stringify({generatedAt: new Date().toISOString(), summary, rows}, null, 2)}\n`);
console.log(JSON.stringify({auditPath: AUDIT_PATH, summary}, null, 2));
