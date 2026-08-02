import fs from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const MAIN_AUDIT = '/tmp/ddangyo-missing-menu-audit.json';
const RETRY_AUDIT = '/tmp/ddangyo-missing-menu-retry.json';
const CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS = 30_000;
const API_HEADERS = Object.freeze({
  'content-type': 'application/json',
  app_name: 'O2O',
  app_os: 'WEB',
  uuid_token: 'GTY0000000',
  app_token: 'GTY0000000'
});
const PROTECTED_LEGACY_IDS = new Set([
  'a089d1d54720b48e', // 외계인피자
  '2f4c3cfb0866c4a4', // 도미노피자 여천점
  'dc638b23f8cf3c5b', // 도미노피자 문수점
  '7bc7239e6b509c44' // 수라상궁
]);
const REJECTED_CROSS_STORE_IDS = new Set([
  'fa0bccb2d190a7c0', // 카페인 -> 노랑통닭 여수봉산점
  '8d9df0fbb77ce9eb', // 콩불 여수중앙점 -> 두찜 여수국동점
  '9f89e6d7784cf4a2' // 피자프렌드 미평점 -> 외계인피자 여수점
]);

const readJsonPath = async path => JSON.parse(await fs.readFile(path, 'utf8'));
const readJson = async path => JSON.parse(await fs.readFile(new URL(path, ROOT), 'utf8'));

async function readMenuMap() {
  const source = await fs.readFile(new URL('store-menu-content/ddangyo-menu-map.js', ROOT), 'utf8');
  const context = {window: {}};
  vm.createContext(context);
  vm.runInContext(source, context);
  return JSON.parse(JSON.stringify(context.window.DAEDONG_DDANGYO_MENU_STORES || {}));
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

async function fetchJsonWithRetry(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, options);
      const text = await response.text();
      if (response.status >= 500 && attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, attempt * 700));
        continue;
      }
      if (!response.ok) throw new Error(`http-${response.status}:${url}`);
      const data = JSON.parse(text);
      if (data.result_code !== '0000') throw new Error(`${data.message || data.result_code}:${url}`);
      return data.result || {};
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 700));
    }
  }
  throw lastError;
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
  return fetchJsonWithRetry(`https://fdofd.ddangyo.com/shop/${endpoint}`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify(shopRequest(patstoNo))
  });
}

function menuDocument(row, home, rawMenu) {
  const groups = new Map((rawMenu.menu_grp_list || []).map(group => [String(group.menu_grp_id), group]));
  const visible = (rawMenu.menu_list || []).filter(item => (
    String(item.hide_yn || '0') !== '1'
    && String(item.meal_tckt_menu_yn || '0') !== '1'
  ));
  const byMenuId = new Map();
  for (const item of visible) {
    const menuId = String(item.menu_id || '');
    if (!menuId) continue;
    const category = groups.get(String(item.menu_grp_id || ''))?.menu_grp_nm || '메뉴';
    const candidate = {item, category};
    const existing = byMenuId.get(menuId);
    if (!existing || (existing.category === '대표메뉴' && category !== '대표메뉴')) {
      byMenuId.set(menuId, candidate);
    }
  }
  const items = [...byMenuId.entries()].map(([menuId, {item, category}]) => ({
    id: `ddangyo-${row.patstoNo}-${menuId}`,
    name: String(item.menu_nm || '').trim(),
    description: String(item.menu_cmps_cont || '').trim(),
    category,
    image: String(item.menu_img_file || '').trim(),
    adultOnly: String(item.alc_menu_yn || item.adlt_sell_yn || '0') === '1'
      || String(groups.get(String(item.menu_grp_id || ''))?.alc_menu_grp_yn || '0') === '1',
    sourceMenuId: menuId
  })).filter(item => item.name);
  const categories = ['전체', ...new Set(items.map(item => item.category).filter(Boolean))];
  const shopImages = (home.shop_img_list || []).map(item => String(item.rpsnt_img_file_nm || '').trim()).filter(Boolean);
  const mainImage = shopImages[0] || items.find(item => item.image)?.image || '';
  return {
    storeId: row.storeId,
    storeName: row.storeName,
    displayName: row.storeName,
    mainImage,
    categories,
    items,
    source: {
      type: 'ddangyo',
      patstoNo: row.patstoNo,
      sourceUrls: [...new Set([row.routeUrl, row.resolvedUrl].filter(Boolean))],
      rawItemCount: visible.length,
      duplicateItemsRemoved: visible.length - items.length
    },
    sources: ['ddangyo']
  };
}

async function mapConcurrent(items, worker, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
      if ((index + 1) % 10 === 0 || index + 1 === items.length) console.log(`generated ${index + 1}/${items.length}`);
    }
  }
  await Promise.all(Array.from({length: Math.min(concurrency, items.length)}, run));
  return results;
}

const [mainAudit, retryAudit, stores, menuMap] = await Promise.all([
  readJsonPath(MAIN_AUDIT),
  readJsonPath(RETRY_AUDIT),
  readJson('data/stores.json'),
  readMenuMap()
]);
const byStoreId = new Map(mainAudit.rows.map(row => [row.storeId, row]));
for (const row of retryAudit.rows) if (row.ok || !byStoreId.get(row.storeId)?.ok) byStoreId.set(row.storeId, row);
const storeById = new Map(stores.map(store => [String(store.id || store.store_id), store]));
const candidates = [...byStoreId.values()].filter(row => (
  row.ok
  && row.menuCount > 0
  && row.patstoNo
  && !menuMap[row.storeId]
  && !PROTECTED_LEGACY_IDS.has(row.storeId)
  && !REJECTED_CROSS_STORE_IDS.has(row.storeId)
));

const generated = await mapConcurrent(candidates, async row => {
  const [home, rawMenu] = await Promise.all([
    shopData('home', row.patstoNo),
    shopData('homemenu', row.patstoNo)
  ]);
  const menu = menuDocument(row, home, rawMenu);
  if (!menu.items.length) throw new Error(`menu-empty:${row.storeId}:${row.storeName}`);
  const directory = new URL(`store-menu-content/${row.storeId}/`, ROOT);
  await fs.mkdir(directory, {recursive: true});
  await fs.writeFile(new URL('menu.json', directory), `${JSON.stringify(menu, null, 2)}\n`);
  const store = storeById.get(row.storeId);
  const fallbackImage = String(store?.image || store?.img || '').trim();
  menuMap[row.storeId] = {
    path: `store-menu-content/${row.storeId}/menu.json`,
    entryImage: menu.mainImage || fallbackImage,
    itemCount: menu.items.length
  };
  return {storeId: row.storeId, storeName: row.storeName, itemCount: menu.items.length, patstoNo: row.patstoNo};
}, CONCURRENCY);

const mapSource = `'use strict';\nwindow.DAEDONG_DDANGYO_MENU_STORES = Object.freeze(${JSON.stringify(menuMap, null, 2)});\n`;
await fs.writeFile(new URL('store-menu-content/ddangyo-menu-map.js', ROOT), mapSource);
const report = {
  generatedAt: new Date().toISOString(),
  previousMapCount: Object.keys(menuMap).length - generated.length,
  generatedCount: generated.length,
  finalMapCount: Object.keys(menuMap).length,
  protectedLegacyIds: [...PROTECTED_LEGACY_IDS],
  rejectedCrossStoreIds: [...REJECTED_CROSS_STORE_IDS],
  unresolved: [...byStoreId.values()].filter(row => !row.ok).map(row => ({storeId: row.storeId, storeName: row.storeName, error: row.error})),
  generated
};
await fs.writeFile(new URL('data/ddangyo-menu-expansion-report.json', ROOT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({generatedCount: generated.length, finalMapCount: Object.keys(menuMap).length, unresolved: report.unresolved}, null, 2));
