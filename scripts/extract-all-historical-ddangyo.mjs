import fs from 'node:fs/promises';
import https from 'node:https';
import path from 'node:path';
import {URLSearchParams} from 'node:url';

const inputPath = process.argv[2] || '../ddangyo-historical-links-output/all-historical-ddangyo-links.json';
const outDir = path.resolve('ddangyo-all-extraction-output');
await fs.rm(outDir, {recursive: true, force: true});
await fs.mkdir(outDir, {recursive: true});

const inventory = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const tokens = [...new Set((inventory.links || []).map(row => String(row.token || '').trim()).filter(Boolean))];
const agent = new https.Agent({keepAlive: true, maxSockets: 8});
const userAgent = 'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0 Mobile Safari/537.36';
const apiHeaders = {
  accept: 'application/json, text/plain, */*',
  'content-type': 'application/json;charset=UTF-8',
  origin: 'https://fdofd.ddangyo.com', authorization: '',
  'uuid-token': 'GTY0000000', 'app-token': 'GTY0000000', 'app-name': 'O2O', 'app-os': 'WEB',
  'x-requested-with': 'XMLHttpRequest'
};

function request(requestPath, {method = 'GET', cookie = '', referer = '', body = '', headers = {}} = {}) {
  return new Promise((resolve, reject) => {
    const req = https.request({hostname: 'fdofd.ddangyo.com', port: 443, path: requestPath, method, agent,
      headers: {'user-agent': userAgent, 'accept-language': 'ko-KR,ko;q=0.9,en;q=0.5', ...(cookie ? {cookie} : {}), ...(referer ? {referer} : {}), ...headers}, timeout: 30000}, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks).toString('utf8')}));
    });
    req.on('timeout', () => req.destroy(new Error(`timeout ${requestPath}`)));
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
const parse = text => { try { return JSON.parse(text); } catch (error) { return {parseError: String(error), raw: text}; } };
const cookieHeader = values => (values || []).map(value => String(value).split(';', 1)[0]).join('; ');
async function postApi(api, payload, {cookie = '', referer = ''} = {}) {
  const body = JSON.stringify(payload);
  return request(api, {method: 'POST', cookie, referer, body, headers: {...apiHeaders, 'content-length': Buffer.byteLength(body)}});
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
async function pool(items, concurrency, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      try { results[index] = await worker(items[index], index); }
      catch (error) { results[index] = {error: String(error?.stack || error)}; }
    }
  }
  await Promise.all(Array.from({length: Math.min(concurrency, items.length)}, run));
  return results;
}

async function resolveToken(token) {
  const sourceUrl = `https://fdofd.ddangyo.com/gateway1.html?${token}`;
  const referer = sourceUrl;
  const payload = {dma_request: {short_url: token}};
  let response = await postApi('/shorturl/view', payload, {referer});
  let value = parse(response.body);
  let info = value?.result?.dma_short_url_info;
  if (!info?.origin_url) {
    const landing = await request(`/gateway1.html?${token}`, {headers: {accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'}});
    const cookie = cookieHeader(landing.headers['set-cookie']);
    response = await postApi('/shorturl/view', payload, {cookie, referer});
    value = parse(response.body);
    info = value?.result?.dma_short_url_info;
  }
  if (!info?.origin_url) return {token, sourceUrl, status: 'unresolved', message: value?.message || ''};
  const params = new URLSearchParams(info.origin_url);
  return {
    token, sourceUrl, status: 'resolved', originUrl: info.origin_url,
    patstoNo: params.get('patsto_no') || '',
    patstoName: params.get('patsto_nm') || '',
    menuUrl: params.get('menuUrl') || ''
  };
}

console.log(`Resolving ${tokens.length} historical tokens...`);
const resolved = await pool(tokens, 6, async (token, index) => {
  const row = await resolveToken(token);
  if ((index + 1) % 25 === 0 || index + 1 === tokens.length) console.log(`resolved ${index + 1}/${tokens.length}`);
  await sleep(50);
  return row;
});

const byPatsto = new Map();
for (const row of resolved.filter(row => row?.status === 'resolved' && row.patstoNo)) {
  if (!byPatsto.has(row.patstoNo)) byPatsto.set(row.patstoNo, {patstoNo: row.patstoNo, patstoName: row.patstoName, tokens: [], sourceUrls: []});
  const item = byPatsto.get(row.patstoNo);
  item.tokens.push(row.token);
  item.sourceUrls.push(row.sourceUrl);
}
const uniqueStores = [...byPatsto.values()];
console.log(`Unique Ddangyo stores: ${uniqueStores.length}`);

function clean(value) { return String(value || '').trim().replace(/\s+/g, ' '); }
function cleanAddress(value) {
  return clean(value).replace(/전남광주통합특별시/g, '전남').replace(/전라남도/g, '전남').replace(/\s*\([^)]*\)\s*/g, ' ');
}
function addressBase(value) {
  return cleanAddress(value).replace(/\s+(?:지하\s*)?\d+층(?:\s+.*)?$/i, '').replace(/\s+\d+(?:호|동)(?:\s+.*)?$/i, '').trim();
}
function addressKey(value) { return addressBase(value).toLocaleLowerCase('ko-KR').replace(/^(전남|전라남도)\s*/, '').replace(/[\s,·]/g, ''); }
function nameKey(value) { return clean(value).toLocaleLowerCase('ko-KR').replace(/\([^)]*\)/g, '').replace(/여수/g, '').replace(/[\s·&()\-_/.,]/g, ''); }
function compatibleName(a, b) {
  const x = nameKey(a), y = nameKey(b);
  return Boolean(x && y && (x === y || x.includes(y) || y.includes(x)));
}
function unique(values) { return [...new Set((values || []).map(clean).filter(Boolean))]; }
function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return /^0\d{8,10}$/.test(digits) ? digits : '';
}
function menuItems(menuResult, patstoNo) {
  const groups = new Map((menuResult.menu_grp_list || []).map(row => [String(row.menu_grp_id || ''), clean(row.menu_grp_nm || '기타')]));
  const byId = new Map();
  for (const row of menuResult.menu_list || []) {
    if (row.hide_yn === '1') continue;
    const sourceMenuId = String(row.menu_id || '');
    if (!sourceMenuId) continue;
    const category = groups.get(String(row.menu_grp_id || '')) || '기타';
    const next = {
      id: `ddangyo-${patstoNo}-${sourceMenuId}`,
      sourceMenuId,
      name: clean(row.menu_nm),
      description: clean(row.menu_cmps_cont),
      category,
      image: String(row.menu_img_file || '').trim(),
      alcohol: row.alc_menu_yn === '1' || row.adlt_sell_yn === '1'
    };
    const current = byId.get(sourceMenuId);
    if (!current || (current.category === '대표메뉴' || current.category === '전체' || current.category === '기타') && !['대표메뉴', '전체', '기타'].includes(next.category)) byId.set(sourceMenuId, next);
  }
  return [...byId.values()];
}
function couponArrays(result) {
  const arrays = [];
  for (const [key, value] of Object.entries(result || {})) {
    if (Array.isArray(value) && /coupon|coup/i.test(key)) arrays.push(...value);
  }
  return arrays;
}

async function extractStore(source, index) {
  const token = source.tokens[0];
  const sourceUrl = source.sourceUrls[0];
  const referer = sourceUrl;
  const landing = await request(`/gateway1.html?${token}`, {headers: {accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'}});
  const cookie = cookieHeader(landing.headers['set-cookie']);
  const common = {patsto_no: source.patstoNo, admtn_dong_cd: '4613078000', map_latt: '34.7600000', map_lngt: '127.6600000'};
  const homeSearch = {login_mbr_id: '', ...common, patsto_tab_div_cd: '01', exps_chan: '01', rest_patsto_yn: 'N'};
  const infoSearch = {...common, shop_detail_tp_cd: '01'};
  const couponSearch = {login_mbr_id: '', ...common, patsto_tab_div_cd: '01', exps_chan: '01', rest_patsto_yn: 'N'};
  const [homeRes, infoRes, couponRes, menuRes] = await Promise.all([
    postApi('/shop/home', {dma_shop_search: homeSearch}, {cookie, referer}),
    postApi('/shop/info', {dma_shop_info: infoSearch}, {cookie, referer}),
    postApi('/coupon/possibleCouponList', {dma_coupon: couponSearch}, {cookie, referer}),
    postApi('/shop/homemenu', {dma_shop_search: homeSearch}, {cookie, referer})
  ]);
  const home = parse(homeRes.body), info = parse(infoRes.body), coupons = parse(couponRes.body), menu = parse(menuRes.body);
  if (home.result_code !== '0000') throw new Error(`${source.patstoNo} home ${home.result_code} ${home.message || ''}`);
  const homeResult = home.result || {}, infoResult = info.result || {}, couponResult = coupons.result || {}, menuResult = menu.result || {};
  const homeInfo = homeResult.dma_shop_home_info || {};
  const deliveryInfo = homeResult.dma_shop_home_vd_od_info || {};
  const storeInfo = infoResult.shop_coo_info || {};
  const weeklyHours = Array.isArray(infoResult.biz_time_info) ? infoResult.biz_time_info : [];
  const closedRules = Array.isArray(infoResult.shop_clsd_list) ? infoResult.shop_clsd_list : [];
  const temporaryClosures = Array.isArray(infoResult.shop_tmp_clsd_list) ? infoResult.shop_tmp_clsd_list : [];
  const couponList = couponArrays(couponResult);
  const items = menu.result_code === '0000' ? menuItems(menuResult, source.patstoNo) : [];
  const shopImages = unique((homeResult.shop_img_list || []).map(row => row.rpsnt_img_file_nm));
  const phone = normalizePhone(storeInfo.rpsnt_tel_use_yn === '1' ? storeInfo.rpsnt_tel_no : storeInfo.conadr) || normalizePhone(storeInfo.conadr) || normalizePhone(storeInfo.rpsnt_tel_no);
  const seomseom = /섬섬|여수페이/i.test(`${homeInfo.lgv_lbl || ''} ${homeInfo.lgv_lbl2 || ''}`);
  const oilSupport = /고유가|피해지원/i.test(`${homeInfo.lgv_lbl_sup || ''}`);
  const onnuri = homeInfo.onnuri_yn === '1' || /온누리/i.test(`${homeInfo.onnuri_lbl || ''} ${homeInfo.onnuri_lbl2 || ''}`);
  const freeDelivery = deliveryInfo.zero_patsto_yn === '1' || infoResult.zero_patsto_info?.zero_patsto_yn === '1';
  const timeSale = homeInfo.timesale_yn === '1' || Boolean(homeResult.time_sale_info);
  const result = {
    patstoNo: source.patstoNo,
    name: clean(homeInfo.patsto_nm || storeInfo.patsto_nm || source.patstoName),
    address: cleanAddress(homeInfo.bas_addr || storeInfo.addr || storeInfo.biz_plc_addr),
    latitude: String(homeInfo.map_latt || storeInfo.map_latt || ''),
    longitude: String(homeInfo.map_lngt || storeInfo.map_lngt || ''),
    category: clean(homeInfo.rpsnt_cat_nm || ''),
    tokens: unique(source.tokens), sourceUrls: unique(source.sourceUrls),
    phone, phoneSource: phone ? 'ddangyo' : '',
    mainImage: shopImages[0] || items.find(item => item.image)?.image || '', shopImages,
    items,
    hours: {
      source: 'ddangyo', commonForStore: true,
      weeklyRaw: weeklyHours,
      closedRulesRaw: closedRules,
      temporaryClosuresRaw: temporaryClosures,
      closedGuide: clean(storeInfo.clsd_day_gude_cont),
      currentStatus: clean(homeInfo.biz_stat_msg_cont),
      currentEndTime: String(homeInfo.end_tm || ''),
      currentEndNextDay: homeInfo.end_tm_nxday_yn === '1'
    },
    benefits: {
      sourceApp: 'ddangyo',
      seomseomPay: seomseom,
      highOilSupport: oilSupport,
      onnuri,
      freeDelivery,
      timeSale,
      coupons: couponList
    },
    delivery: {
      displayedFee: clean(homeInfo.delv_fee),
      storeDeliveryFee: clean(deliveryInfo.vd_delv_fee),
      ddangDeliveryFee: clean(deliveryInfo.od_delv_fee),
      zeroPatsto: freeDelivery
    },
    extraction: {
      homeCode: home.result_code || '', infoCode: info.result_code || '', couponCode: coupons.result_code || '', menuCode: menu.result_code || ''
    }
  };
  if ((index + 1) % 20 === 0 || index + 1 === uniqueStores.length) console.log(`extracted ${index + 1}/${uniqueStores.length}`);
  await sleep(60);
  return result;
}

console.log(`Extracting ${uniqueStores.length} unique stores...`);
const extracted = await pool(uniqueStores, 4, extractStore);

const existingEnrichment = JSON.parse(await fs.readFile('data/ddangyo-store-enrichment.json', 'utf8').catch(() => '{"stores":[]}'));
const patstoToStoreId = new Map((existingEnrichment.stores || []).map(row => [String(row.patstoNo || ''), String(row.targetStoreId || '')]));
const storesValue = JSON.parse(await fs.readFile('data/stores.json', 'utf8'));
const currentStores = Array.isArray(storesValue) ? storesValue : (storesValue.stores || storesValue.data || []);
let coordinates = {};
try { coordinates = JSON.parse(await fs.readFile('data/store-coordinates.json', 'utf8')); } catch {}
const indexed = currentStores.map(row => {
  const id = String(row.id || row.store_id || '');
  const coordinate = !Array.isArray(coordinates) ? (coordinates[id] || {}) : {};
  return {id, name: clean(row.name || row.realBusinessName), address: cleanAddress(row.address || coordinate.matchedAddress || ''), row};
});
function matchStore(store) {
  const known = patstoToStoreId.get(String(store.patstoNo));
  if (known) return {status: 'existing', method: 'existing-ddangyo-patsto-map', storeId: known};
  const targetAddress = addressKey(store.address);
  const addressMatches = targetAddress ? indexed.filter(row => addressKey(row.address) === targetAddress) : [];
  if (addressMatches.length === 1) return {status: 'existing', method: 'exact-address', storeId: addressMatches[0].id, storeName: addressMatches[0].name};
  if (addressMatches.length > 1) {
    const named = addressMatches.filter(row => compatibleName(row.name, store.name));
    if (named.length === 1) return {status: 'existing', method: 'shared-address-compatible-name', storeId: named[0].id, storeName: named[0].name};
    return {status: 'review', method: 'shared-address-shop-in-shop', candidates: addressMatches.map(row => ({storeId: row.id, storeName: row.name, address: row.address}))};
  }
  const nameMatches = indexed.filter(row => nameKey(row.name) === nameKey(store.name));
  if (nameMatches.length === 1 && !nameMatches[0].address) return {status: 'review', method: 'unique-name-current-address-missing', storeId: nameMatches[0].id, storeName: nameMatches[0].name};
  return {status: 'new', method: 'no-exact-address-match'};
}
for (const row of extracted) if (row && !row.error) row.match = matchStore(row);

const valid = extracted.filter(row => row && !row.error);
const summary = {
  generatedAt: new Date().toISOString(),
  historicalTokenCount: tokens.length,
  resolvedTokenCount: resolved.filter(row => row?.status === 'resolved').length,
  unresolvedTokenCount: resolved.filter(row => row?.status !== 'resolved').length,
  uniqueStoreCount: uniqueStores.length,
  extractedStoreCount: valid.length,
  failedStoreCount: extracted.length - valid.length,
  existingMatches: valid.filter(row => row.match?.status === 'existing').length,
  reviewMatches: valid.filter(row => row.match?.status === 'review').length,
  newStores: valid.filter(row => row.match?.status === 'new').length,
  storesWithWeeklyHours: valid.filter(row => row.hours?.weeklyRaw?.length).length,
  storesWithClosedRules: valid.filter(row => row.hours?.closedRulesRaw?.length || row.hours?.closedGuide).length,
  storesWithCoupons: valid.filter(row => row.benefits?.coupons?.length).length,
  storesWithSeomseomPay: valid.filter(row => row.benefits?.seomseomPay).length,
  storesWithHighOilSupport: valid.filter(row => row.benefits?.highOilSupport).length,
  storesWithOnnuri: valid.filter(row => row.benefits?.onnuri).length,
  storesWithFreeDelivery: valid.filter(row => row.benefits?.freeDelivery).length,
  storesWithTimeSale: valid.filter(row => row.benefits?.timeSale).length,
  totalMenus: valid.reduce((sum, row) => sum + (row.items?.length || 0), 0),
  totalMenuImages: valid.reduce((sum, row) => sum + (row.items || []).filter(item => item.image).length, 0)
};

await fs.writeFile(path.join(outDir, 'resolved-tokens.json'), JSON.stringify(resolved, null, 2));
await fs.writeFile(path.join(outDir, 'all-stores-normalized.json'), JSON.stringify(extracted, null, 2));
await fs.writeFile(path.join(outDir, 'summary.json'), JSON.stringify(summary, null, 2));
await fs.writeFile(path.join(outDir, 'review-stores.json'), JSON.stringify(valid.filter(row => row.match?.status === 'review'), null, 2));
await fs.writeFile(path.join(outDir, 'new-stores.json'), JSON.stringify(valid.filter(row => row.match?.status === 'new'), null, 2));
console.log(JSON.stringify(summary, null, 2));
