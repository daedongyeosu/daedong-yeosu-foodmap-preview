import fs from 'node:fs/promises';
import vm from 'node:vm';

const ROOT = new URL('../', import.meta.url);
const CONCURRENCY = 6;
const REQUEST_TIMEOUT_MS = 30_000;
const VERIFIED_AT = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date());
const API_HEADERS = Object.freeze({
  accept: 'application/json, text/plain, */*',
  'content-type': 'application/json',
  app_name: 'O2O',
  app_os: 'WEB',
  uuid_token: 'GTY0000000',
  app_token: 'GTY0000000'
});
const SEARCH_BASE = Object.freeze({
  login_mbr_id: '',
  admtn_dong_cd: '4613078000',
  map_latt: '34.7600000',
  map_lngt: '127.6600000',
  patsto_tab_div_cd: '01',
  exps_chan: '01',
  rest_patsto_yn: 'N'
});
const LEGACY_SERVICE_IDS = new Set([
  'a089d1d54720b48e', // 외계인피자 여수점: 보호 중인 자체 메뉴판
  'dc638b23f8cf3c5b' // 도미노피자 문수점: 보호 중인 브랜드 메뉴판
]);
const REJECTED_CROSS_STORE_IDS = new Set([
  'fa0bccb2d190a7c0', // 카페인 -> 노랑통닭 여수봉산점
  '8d9df0fbb77ce9eb', // 콩불 여수중앙점 -> 두찜 여수국동점
  '9f89e6d7784cf4a2' // 피자프렌드 미평점 -> 외계인피자 여수점
]);
const WEEK_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_LABELS = Object.freeze({
  일: 'sun',
  월: 'mon',
  화: 'tue',
  수: 'wed',
  목: 'thu',
  금: 'fri',
  토: 'sat'
});

const readJson = async path => JSON.parse(await fs.readFile(new URL(path, ROOT), 'utf8'));
const writeJson = async (path, value) => fs.writeFile(new URL(path, ROOT), `${JSON.stringify(value, null, 2)}\n`);
const storeId = store => String(store?.id || store?.store_id || '');

async function readMenuMap() {
  const source = await fs.readFile(new URL('store-menu-content/ddangyo-menu-map.js', ROOT), 'utf8');
  const context = {window: {}};
  vm.createContext(context);
  vm.runInContext(source, context);
  return JSON.parse(JSON.stringify(context.window.DAEDONG_DDANGYO_MENU_STORES || {}));
}

function ddangyoRoute(store) {
  return (store?.routes || []).find(route => (
    String(route?.key || '').toLowerCase() === 'ddangyo'
    || String(route?.name || '').includes('땡겨요')
  ));
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

async function fetchJson(url, options = {}) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const response = await fetchWithTimeout(url, options);
      const text = await response.text();
      const data = JSON.parse(text);
      if (!response.ok || data.result_code !== '0000') {
        throw new Error(`${data.message || `http-${response.status}`}:${url}`);
      }
      return data.result || {};
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise(resolve => setTimeout(resolve, attempt * 700));
    }
  }
  throw lastError;
}

function shopSearch(patstoNo) {
  return {...SEARCH_BASE, patsto_no: String(patstoNo)};
}

async function shopData(endpoint, key, patstoNo) {
  return fetchJson(`https://fdofd.ddangyo.com/${endpoint}`, {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify({[key]: shopSearch(patstoNo)})
  });
}

async function patstoFromRoute(routeUrl) {
  const landing = await fetchWithTimeout(routeUrl, {redirect: 'follow'});
  await landing.text();
  const resolved = new URL(landing.url);
  if (!resolved.hostname.endsWith('ddangyo.com') || !resolved.pathname.endsWith('/gateway1.html')) {
    throw new Error(`not-ddangyo-gateway:${landing.url}`);
  }
  const code = [...resolved.searchParams.keys()][0] || '';
  if (!code) throw new Error(`gateway-code-missing:${landing.url}`);
  const result = await fetchJson('https://fdofd.ddangyo.com/shorturl/view', {
    method: 'POST',
    headers: API_HEADERS,
    body: JSON.stringify({dma_request: {short_url: code}})
  });
  const params = new URLSearchParams(result?.dma_short_url_info?.origin_url || '');
  const patstoNo = params.get('patsto_no') || '';
  if (!patstoNo) throw new Error(`patsto-missing:${routeUrl}`);
  return patstoNo;
}

function normalize(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/여수/g, '')
    .replace(/본점|직영점|대표점|샵인점/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/[^0-9a-z가-힣]/g, '');
}

function identityMatches(store, officialName) {
  const expected = normalize(store?.name);
  const actual = normalize(officialName);
  return Boolean(expected && actual && (
    expected === actual
    || (actual.length >= 4 && expected.includes(actual))
    || (expected.length >= 4 && actual.includes(expected))
  ));
}

function dayKeys(label) {
  const value = String(label || '').replace(/\s+/g, '');
  if (!value || value.includes('매일') || value.includes('연중무휴')) return WEEK_KEYS;
  if (value.includes('평일')) return ['mon', 'tue', 'wed', 'thu', 'fri'];
  if (value.includes('주말')) return ['sun', 'sat'];
  const range = value.match(/([일월화수목금토])(?:요일)?[~\-～]([일월화수목금토])/);
  if (range) {
    const start = WEEK_KEYS.indexOf(DAY_LABELS[range[1]]);
    const end = WEEK_KEYS.indexOf(DAY_LABELS[range[2]]);
    const keys = [];
    for (let offset = 0; offset < WEEK_KEYS.length; offset += 1) {
      const index = (start + offset) % WEEK_KEYS.length;
      keys.push(WEEK_KEYS[index]);
      if (index === end) break;
    }
    return keys;
  }
  return [...new Set([...value].map(char => DAY_LABELS[char]).filter(Boolean))];
}

function to24Hour(period, hourText, minuteText) {
  let hour = Number(hourText);
  const minute = Number(minuteText || 0);
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return '';
  if (/오전|새벽/.test(period)) hour = hour === 12 ? 0 : hour;
  else if (/오후|낮|저녁/.test(period)) hour = hour === 12 ? 12 : hour + 12;
  else if (/밤/.test(period)) hour = hour === 12 ? 0 : hour + 12;
  if (hour > 23 || minute > 59) return '';
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function parseClock(value) {
  const match = String(value || '').trim().match(/(익일\s*)?(오전|오후|낮|밤|새벽|저녁)?\s*(\d{1,2})(?::(\d{2}))?/);
  return match ? to24Hour(match[2] || '', match[3], match[4]) : '';
}

function parsePeriod(label) {
  const value = String(label || '').trim();
  if (/24\s*시간/.test(value)) return {open: '00:00', close: '00:00'};
  const parts = value.split(/\s*[~～]\s*/);
  if (parts.length < 2) return null;
  const open = parseClock(parts[0]);
  const close = parseClock(parts[1]);
  return open && close ? {open, close} : null;
}

function hoursFromInfo(info) {
  const weekly = Object.fromEntries(WEEK_KEYS.map(key => [key, []]));
  const rows = Array.isArray(info?.biz_time_info) ? info.biz_time_info : [];
  const unparsed = [];
  for (const row of rows) {
    const period = parsePeriod(row?.biz_tm_nm);
    const keys = dayKeys(row?.dow_div_nm);
    if (!period || !keys.length) {
      unparsed.push(`${row?.dow_div_nm || ''} ${row?.biz_tm_nm || ''}`.trim());
      continue;
    }
    for (const key of keys) weekly[key].push(period);
  }
  const displayLines = rows
    .map(row => `${row?.dow_div_nm || ''} ${row?.biz_tm_nm || ''}`.trim())
    .filter(Boolean);
  if (!Object.values(weekly).some(periods => periods.length)) return {hours: null, unparsed};
  return {
    hours: {weekly, closures: [], displayLines, sourceApp: 'ddangyo'},
    unparsed
  };
}

function payment(key, status) {
  return {
    key,
    status,
    appKeys: ['ddangyo'],
    appLabel: '땡겨요'
  };
}

function couponDetails(result) {
  const rows = [
    ...(Array.isArray(result?.dlt_couponList) ? result.dlt_couponList : []),
    ...(Array.isArray(result?.dlt_brandCouponList) ? result.dlt_brandCouponList : [])
  ];
  return rows.map(row => ({
    id: String(row.coup_id || row.coup_no || ''),
    label: String(row.coup_nm || `${row.brnd_nm || '할인'} 쿠폰`).trim(),
    benefitAmount: Number(row.coup_bnft_amt || 0),
    benefitRate: Number(row.coup_bnft_rt || 0),
    minimumOrderAmount: Number(row.min_ord_amt || 0),
    startsAt: String(row.vld_term_sta_dt || ''),
    endsAt: String(row.vld_term_end_dt || ''),
    appKeys: ['ddangyo'],
    appLabel: '땡겨요',
    status: ['03', '04'].includes(String(row.coupon_exps_cd || '')) ? 'unavailable' : 'available'
  })).filter(row => row.id);
}

function serviceEntry(patstoNo, home, info, menu, coupons) {
  const homeInfo = home?.dma_shop_home_info || {};
  const deliveryInfo = home?.dma_shop_home_vd_od_info || {};
  const labels = [homeInfo.lgv_lbl, homeInfo.lgv_lbl2, homeInfo.lgv_lbl_sup].filter(Boolean).join(' ');
  const details = couponDetails(coupons);
  const availableCoupons = details.filter(row => row.status === 'available');
  const timesale = String(menu?.time_sale_info?.timesale_yn || home?.time_sale_info?.timesale_yn || homeInfo.timesale_yn || '0') === '1';
  const hoursResult = hoursFromInfo(info);
  const freeDelivery = String(info?.real_agent_free_delv_yn || '0') === '1'
    || String(deliveryInfo.od_bnft_tgt_yn || '0') === '1';
  const entry = {
    verifiedAt: VERIFIED_AT,
    sourceLabel: '땡겨요 화면 재확인',
    payments: [
      payment('yeosu-seomseom-pay', /섬섬|여수페이/.test(labels) ? 'accepted' : 'unavailable'),
      payment('high-oil-support', /고유가\s*피해지원금/.test(labels) ? 'accepted' : 'unavailable'),
      payment('onnuri-gift-certificate', String(homeInfo.onnuri_yn || '0') === '1' || /온누리/.test(labels) ? 'accepted' : 'unavailable'),
      payment('ddangyo-coupon', availableCoupons.length ? 'accepted' : 'unavailable'),
      payment('ddangyo-timesale', timesale ? 'accepted' : 'unavailable')
    ],
    ...(hoursResult.hours ? {hours: hoursResult.hours} : {}),
    delivery: [{
      key: 'free-delivery',
      status: freeDelivery ? 'available' : 'unavailable',
      appKeys: ['ddangyo'],
      appLabel: '땡겨요',
      note: '땡겨요 표시 기준 · 거리·주문금액·시간 등에 따라 달라질 수 있음'
    }],
    ...(details.length ? {coupons: details} : {}),
    ddangyo: {
      patstoNo: String(patstoNo),
      businessHoursAppliedAsCommonStoreHours: Boolean(hoursResult.hours),
      currentStatus: String(homeInfo.biz_stat_msg_cont || ''),
      currentEndTime: String(homeInfo.end_tm || ''),
      verifiedAt: VERIFIED_AT
    }
  };
  return {entry, unparsedHours: hoursResult.unparsed, officialName: String(homeInfo.patsto_nm || '')};
}

function addExplicitUnavailable(entry, programs) {
  if (!entry?.ddangyo?.patstoNo || !/땡겨요/.test(String(entry.sourceLabel || ''))) return entry;
  const payments = new Map((entry.payments || []).map(item => [item.key, item]));
  for (const program of programs) {
    if (!payments.has(program.key)) payments.set(program.key, payment(program.key, 'unavailable'));
  }
  const delivery = new Map((entry.delivery || []).map(item => [item.key, item]));
  if (!delivery.has('free-delivery')) {
    delivery.set('free-delivery', {
      key: 'free-delivery',
      status: 'unavailable',
      appKeys: ['ddangyo'],
      appLabel: '땡겨요',
      note: '땡겨요 표시 기준 · 거리·주문금액·시간 등에 따라 달라질 수 있음'
    });
  }
  return {...entry, payments: [...payments.values()], delivery: [...delivery.values()]};
}

async function mapConcurrent(items, worker, concurrency) {
  const results = new Array(items.length);
  let next = 0;
  async function run() {
    while (true) {
      const index = next++;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
      if ((index + 1) % 10 === 0 || index + 1 === items.length) console.log(`확인 ${index + 1}/${items.length}`);
    }
  }
  await Promise.all(Array.from({length: Math.min(concurrency, items.length)}, run));
  return results;
}

const [stores, service, menuMap, couponFile] = await Promise.all([
  readJson('data/stores.json'),
  readJson('store-service-info.json'),
  readMenuMap(),
  readJson('data/ddangyo-coupon-details.json')
]);
const byId = new Map(stores.map(store => [storeId(store), store]));
const menuMissing = Object.keys(menuMap).filter(id => !service.stores[id] && byId.has(id));
const legacyMissing = [...LEGACY_SERVICE_IDS].filter(id => !service.stores[id] && byId.has(id));
const targetIds = [...new Set([...menuMissing, ...legacyMissing])];
const targets = await Promise.all(targetIds.map(async id => {
  const store = byId.get(id);
  let patstoNo = '';
  if (menuMap[id]) {
    const menu = await readJson(menuMap[id].path);
    patstoNo = String(menu?.source?.patstoNo || '');
  } else {
    patstoNo = await patstoFromRoute(ddangyoRoute(store)?.url || '');
  }
  if (!patstoNo) throw new Error(`patsto-missing:${id}:${store.name}`);
  return {id, store, patstoNo};
}));

const results = await mapConcurrent(targets, async target => {
  try {
    const [home, info, menu, coupons] = await Promise.all([
      shopData('shop/home', 'dma_shop_search', target.patstoNo),
      shopData('shop/info', 'dma_shop_info', target.patstoNo),
      shopData('shop/homemenu', 'dma_shop_search', target.patstoNo),
      shopData('coupon/possibleCouponList', 'dma_coupon', target.patstoNo)
    ]);
    const built = serviceEntry(target.patstoNo, home, info, menu, coupons);
    if (!menuMap[target.id] && !identityMatches(target.store, built.officialName)) {
      throw new Error(`identity-mismatch:${target.store.name}:${built.officialName}`);
    }
    return {...target, ...built, ok: true};
  } catch (error) {
    return {...target, ok: false, error: String(error?.message || error)};
  }
}, CONCURRENCY);

const failed = results.filter(row => !row.ok);
if (failed.length) {
  console.error(JSON.stringify(failed.map(row => ({id: row.id, name: row.store.name, error: row.error})), null, 2));
  throw new Error(`땡겨요 영업·혜택 확인 실패 ${failed.length}곳`);
}
const unparsed = results.filter(row => row.unparsedHours.length || !row.entry.hours);
if (unparsed.length) {
  console.error(JSON.stringify(unparsed.map(row => ({id: row.id, name: row.store.name, unparsed: row.unparsedHours})), null, 2));
  throw new Error(`영업시간 변환 실패 ${unparsed.length}곳`);
}

for (const row of results) {
  service.stores[row.id] = row.entry;
  if (row.entry.coupons?.length) couponFile.stores[row.id] = row.entry.coupons;
}
for (const [id, entry] of Object.entries(service.stores)) {
  service.stores[id] = addExplicitUnavailable(entry, service.programs || []);
}
service.version = Math.max(Number(service.version || 0), 5);
service.updatedAt = VERIFIED_AT;
couponFile.generatedAt = new Date().toISOString();

const ddangyoRouteStores = stores.filter(store => ddangyoRoute(store));
const routeMissing = ddangyoRouteStores.filter(store => !service.stores[storeId(store)]);
const menuMissingAfter = Object.keys(menuMap).filter(id => !service.stores[id]);
const ddangyoEntries = Object.values(service.stores).filter(entry => entry?.ddangyo?.patstoNo);
const explicitPrograms = ddangyoEntries.filter(entry => (
  (service.programs || []).every(program => (entry.payments || []).some(item => item.key === program.key && ['accepted', 'unavailable'].includes(item.status)))
  && (entry.delivery || []).some(item => item.key === 'free-delivery' && ['available', 'unavailable'].includes(item.status))
));
const report = {
  generatedAt: new Date().toISOString(),
  registeredStores: stores.length,
  menuPreviewStores: Object.keys(menuMap).length,
  serviceRecords: Object.keys(service.stores).length,
  ddangyoSourceRecords: ddangyoEntries.length,
  ddangyoRouteStores: ddangyoRouteStores.length,
  ddangyoRouteServiceCovered: ddangyoRouteStores.length - routeMissing.length,
  newlyVerifiedRecords: results.length,
  explicitBenefitStatusRecords: explicitPrograms.length,
  menuPreviewMissingService: menuMissingAfter,
  unresolvedDdangyoRoutes: routeMissing.map(store => ({
    storeId: storeId(store),
    storeName: store.name,
    reason: REJECTED_CROSS_STORE_IDS.has(storeId(store)) ? 'rejected-cross-store-link' : 'unresolved-source-link'
  }))
};
if (menuMissingAfter.length) throw new Error(`음식보기 영업·혜택 미연결 ${menuMissingAfter.length}곳`);

await Promise.all([
  writeJson('store-service-info.json', service),
  writeJson('data/ddangyo-coupon-details.json', couponFile),
  writeJson('data/ddangyo-service-coverage-report.json', report)
]);
console.log(JSON.stringify(report, null, 2));
