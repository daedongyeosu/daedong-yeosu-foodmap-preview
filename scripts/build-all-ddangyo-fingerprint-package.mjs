import fs from 'node:fs/promises';
import path from 'node:path';

const inputPath = process.argv[2] || 'ddangyo-final-classification-output/final-stores.json';
const reportDir = path.resolve('ddangyo-package-output');
await fs.rm(reportDir, {recursive: true, force: true});
await fs.mkdir(reportDir, {recursive: true});

const rows = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const unresolved = rows.filter(row => row?.error || row?.match?.status !== 'existing' || !row?.match?.storeId);
if (unresolved.length) throw new Error(`unresolved Ddangyo stores remain: ${unresolved.length}`);
const targetIds = rows.map(row => String(row.match.storeId));
if (new Set(targetleft, right] = raw.split(/\s*~\s*/);
  const open = parseClock(left), close = parseClock(right);
  return open && close ? {open, close} : null;
}
function dayKeys(label) {
  const raw = clean(label).replace(/^브레이크\s*타임\s*/, '');
  if (raw === '매일') return DAYS;
  if (raw === '평일') return ['mon', 'tue', 'wed', 'thu', 'fri'];
  if (raw === '주말') return ['sat', 'sun'];
  const found = [];
  for (const [ko, key] of Object.entries(DAY_NAMES)) if (new RegExp(`${ko}(?:요일)?`).test(raw)) found.push(key);
  return [...new Set(found)];
}
function parseHours(row) {
  const weekly = Object.fromEntries(DAYS.map(day => [day, []]));
  const displayLines = [];
  const breakLines = [];
  for (const item of row?.hours?.weeklyRaw || []) {
    const dayLabel = clean(item?.dow_div_nm || item?.biz_day_nm);
    const timeLabel = clean(item?.biz_tm_nm || item?.biz_time);
    if (!dayLabel || !timeLabel) continue;
    const line = `${dayLabel} ${timeLabel}`;
    if (/브레이크\s*타임/.test(dayLabel)) {
      breakLines.push(line);
      continue;
    }
    const range = parseRange(timeLabel);
    if (!range) continue;
    for (const day of dayKeys(dayLabel)) weekly[day].push(range);
    displayLines.push(line);
  }
  for (const day of DAYS) {
    const seen = new Set();
    weekly[day] = weekly[day].filter(period => {
      const key = `${period.open}-${period.close}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  const closureTexts = unique([
    ...(row?.hours?.closedRulesRaw || []).map(item => item?.clsd_cont || item?.biz_clsd_day_gude_cont || item?.biz_clsd_day),
    row?.hours?.closedGuide
  ]).filter(value => value && !/연중무휴/.test(value));
  const closures = [];
  for (const closureText of closureTexts) {
    displayLines.push(`휴무 ${closureText}`);
    for (const match of closureText.matchAll(/매주\s*(월|화|수|목|금|토|일)요일/g)) {
      weekly[DAY_NAMES[match[1]]] = [];
    }
    for (const match of closureText.matchAll(/매월\s*(첫째|둘째|셋째|넷째|다섯째)\s*(월|화|수|목|금|토|일)요일/g)) {
      closures.push({type: 'monthly-weekday', weekday: DAY_NAMES[match[2]], nth: ORDINALS[match[1]], label: match[0]});
    }
  }
  return {weekly, closures, displayLines: unique([...displayLines, ...breakLines])};
}
function closureKey(rule) { return `${rule?.type || ''}|${rule?.weekday || ''}|${rule?.nth || ''}|${rule?.label || ''}`; }
function mergeHours(existingHours, ddangyoHours) {
  if (!existingHours?.weekly) return ddangyoHours;
  const merged = structuredClone(existingHours);
  merged.weekly ||= {};
  for (const day of DAYS) {
    if (!Object.prototype.hasOwnProperty.call(merged.weekly, day)) merged.weekly[day] = ddangyoHours.weekly[day] || [];
  }
  const closureMap = new Map((merged.closures || []).map(rule => [closureKey(rule), rule]));
  for (const rule of ddangyoHours.closures || []) if (!closureMap.has(closureKey(rule))) closureMap.set(closureKey(rule), rule);
  merged.closures = [...closureMap.values()];
  merged.displayLines = unique([...(merged.displayLines || []), ...(ddangyoHours.displayLines || [])]);
  return merged;
}
function appLabel(keys) { return unique(keys).map(key => APP_LABELS[key] || key).join('·'); }
function upsertScoped(list, key, status, apps, extra = {}) {
  const target = Array.isArray(list) ? list : [];
  let entry = target.find(item => item?.key === key);
  if (!entry) {
    entry = {key, status, appKeys: unique(apps), appLabel: appLabel(apps), ...extra};
    target.push(entry);
    return target;
  }
  entry.appKeys = unique([...(entry.appKeys || []), ...apps]);
  entry.appLabel = appLabel(entry.appKeys);
  if (!entry.status || entry.status === 'unknown') entry.status = status;
  for (const [field, value] of Object.entries(extra)) if (entry[field] == null || entry[field] === '') entry[field] = value;
  return target;
}
function couponActive(coupon) {
  const start = String(coupon?.vld_term_sta_dt || coupon?.exps_sta_dt || '');
  const end = String(coupon?.vld_term_end_dt || coupon?.exps_end_dt || '');
  if (start && todayDigits < start) return false;
  if (end && todayDigits > end) return false;
  if (String(coupon?.coup_qty_posb_yn || '1') === '0') return false;
  return true;
}
function couponRecord(coupon) {
  return {
    id: clean(coupon?.coup_id),
    label: clean(coupon?.coup_nm) || '할인쿠폰',
    benefitAmount: Number(coupon?.coup_bnft_amt || 0),
    benefitRate: Number(coupon?.coup_bnft_rt || 0),
    minimumOrderAmount: Number(coupon?.min_ord_amt || 0),
    startsAt: String(coupon?.vld_term_sta_dt || coupon?.exps_sta_dt || ''),
    endsAt: String(coupon?.vld_term_end_dt || coupon?.exps_end_dt || ''),
    appKeys: ['ddangyo'], appLabel: '땡겨요', status: 'available'
  };
}
function sourceMenuId(item) {
  if (item?.sourceMenuId) return String(item.sourceMenuId);
  return String(item?.id || '').match(/^ddangyo-[^-]+-(.+)$/)?.[1] || '';
}
async function readJsonIfExists(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return null; }
}
function mergeMenu(existingMenu, sourceRow) {
  const menu = existingMenu || {
    storeId: sourceRow.match.storeId,
    storeName: sourceRow.name,
    displayName: sourceRow.name,
    mainImage: sourceRow.mainImage || '',
    categories: ['전체'],
    items: []
  };
  menu.storeId ||= sourceRow.match.storeId;
  menu.storeName ||= sourceRow.name;
  menu.displayName ||= menu.storeName;
  if (!menu.mainImage && sourceRow.mainImage) menu.mainImage = sourceRow.mainImage;
  menu.items = Array.isArray(menu.items) ? menu.items : [];

  const bySource = new Map();
  const byName = new Map();
  for (const item of menu.items) {
    const sourceId = sourceMenuId(item);
    if (sourceId) bySource.set(sourceId, item);
    const key = normalizeName(item?.name);
    if (key) {
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(item);
    }
  }
  let added = 0, descriptions = 0, images = 0;
  for (const source of sourceRow.items || []) {
    const sourceId = String(source?.sourceMenuId || '');
    let target = sourceId ? bySource.get(sourceId) : null;
    if (!target) {
      const candidates = byName.get(normalizeName(source?.name)) || [];
      if (candidates.length === 1) target = candidates[0];
    }
    if (target) {
      if (!clean(target.description) && clean(source.description)) { target.description = clean(source.description); descriptions += 1; }
      if (!clean(target.image) && clean(source.image)) { target.image = clean(source.image); images += 1; }
      if ((!target.category || ['전체', '대표메뉴', '기타'].includes(target.category)) && source.category) target.category = source.category;
      if (!target.sourceMenuId && sourceId) target.sourceMenuId = sourceId;
      continue;
    }
    const next = {
      id: source.id,
      sourceMenuId: sourceId,
      name: clean(source.name),
      description: clean(source.description),
      category: clean(source.category) || '기타',
      image: clean(source.image),
      ...(source.alcohol ? {adultOnly: true} : {})
    };
    menu.items.push(next);
    if (sourceId) bySource.set(sourceId, next);
    const key = normalizeName(next.name);
    if (key) {
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(next);
    }
    added += 1;
  }
  menu.categories = unique(['전체', ...(menu.categories || []), ...menu.items.map(item => item.category)]);
  menu.sources = unique([...(menu.sources || []), 'ddangyo']);
  return {menu, added, descriptions, images};
}

serviceInfo.programs ||= [];
for (const program of [
  {key: 'ddangyo-coupon', label: '쿠폰', appKeys: ['ddangyo'], appLabel: '땡겨요'},
  {key: 'ddangyo-timesale', label: '타임세일', appKeys: ['ddangyo'], appLabel: '땡겨요'}
]) if (!serviceInfo.programs.some(item => item.key === program.key)) serviceInfo.programs.push(program);
serviceInfo.stores ||= {};
serviceInfo.version = Math.max(Number(serviceInfo.version || 0), 4);
serviceInfo.updatedAt = today;

const enrichmentByPatsto = new Map((currentEnrichment.stores || []).map(row => [String(row.patstoNo || ''), row]));
const enrichmentByStore = new Map((currentEnrichment.stores || []).map(row => [String(row.targetStoreId || ''), row]));
const nextEnrichment = [...(currentEnrichment.stores || [])];
const menuMap = {...currentMenuMap};
const packageStats = {
  stores: rows.length,
  hoursCreated: 0, hoursSupplemented: 0,
  seomseomAdded: 0, onnuriAdded: 0, freeDeliveryAdded: 0, couponStoresAdded: 0, timeSaleAdded: 0,
  activeCoupons: 0,
  menuFiles: 0, menuItemsAdded: 0, menuDescriptionsFilled: 0, menuImagesFilled: 0,
  enrichmentCreated: 0, enrichmentUpdated: 0
};
const couponDetails = {};

for (const row of rows) {
  const storeId = String(row.match.storeId);
  const info = serviceInfo.stores[storeId] ||= {};
  const hadHours = Boolean(info.hours?.weekly);
  const parsedHours = parseHours(row);
  info.hours = mergeHours(info.hours, parsedHours);
  if (hadHours) packageStats.hoursSupplemented += 1;
  else packageStats.hoursCreated += 1;
  info.verifiedAt ||= today;
  if (!info.sourceLabel) info.sourceLabel = '땡겨요 화면 확인';
  else if (!info.sourceLabel.includes('땡겨요')) info.sourceLabel = `${info.sourceLabel}·땡겨요 화면 확인`;

  info.payments = Array.isArray(info.payments) ? info.payments : [];
  info.delivery = Array.isArray(info.delivery) ? info.delivery : [];
  if (row.benefits?.seomseomPay) {
    const before = info.payments.some(item => item.key === 'yeosu-seomseom-pay' && item.status === 'accepted');
    info.payments = upsertScoped(info.payments, 'yeosu-seomseom-pay', 'accepted', ['ddangyo']);
    if (!before) packageStats.seomseomAdded += 1;
  }
  if (row.benefits?.onnuri) {
    const before = info.payments.some(item => item.key === 'onnuri-gift-certificate' && item.status === 'accepted');
    info.payments = upsertScoped(info.payments, 'onnuri-gift-certificate', 'accepted', ['ddangyo']);
    if (!before) packageStats.onnuriAdded += 1;
  }
  if (row.benefits?.freeDelivery) {
    const before = info.delivery.some(item => item.key === 'free-delivery' && item.status === 'available');
    info.delivery = upsertScoped(info.delivery, 'free-delivery', 'available', ['ddangyo'], {note: '땡겨요 표시 기준 · 거리·주문금액·시간에 따라 달라질 수 있음'});
    if (!before) packageStats.freeDeliveryAdded += 1;
  }
  const activeCoupons = (row.benefits?.coupons || []).filter(couponActive).map(couponRecord);
  if (activeCoupons.length) {
    const before = info.payments.some(item => item.key === 'ddangyo-coupon' && item.status === 'accepted');
    info.payments = upsertScoped(info.payments, 'ddangyo-coupon', 'accepted', ['ddangyo']);
    info.coupons = unique([...(info.coupons || []).map(item => JSON.stringify(item)), ...activeCoupons.map(item => JSON.stringify(item))]).map(item => JSON.parse(item));
    couponDetails[storeId] = info.coupons;
    packageStats.activeCoupons += activeCoupons.length;
    if (!before) packageStats.couponStoresAdded += 1;
  }
  if (row.benefits?.timeSale) {
    const before = info.payments.some(item => item.key === 'ddangyo-timesale' && item.status === 'accepted');
    info.payments = upsertScoped(info.payments, 'ddangyo-timesale', 'accepted', ['ddangyo']);
    if (!before) packageStats.timeSaleAdded += 1;
  }

  let enrichment = enrichmentByPatsto.get(String(row.patstoNo)) || enrichmentByStore.get(storeId);
  if (!enrichment) {
    enrichment = {targetStoreId: storeId, isNew: false, patstoNo: String(row.patstoNo), name: row.name};
    nextEnrichment.push(enrichment);
    packageStats.enrichmentCreated += 1;
  } else packageStats.enrichmentUpdated += 1;
  enrichment.targetStoreId ||= storeId;
  enrichment.patstoNo ||= String(row.patstoNo);
  enrichment.name ||= row.name;
  enrichment.address ||= row.address;
  enrichment.latitude ||= row.latitude;
  enrichment.longitude ||= row.longitude;
  enrichment.category ||= row.category;
  enrichment.mainImage ||= row.mainImage;
  enrichment.shopImages = unique([...(enrichment.shopImages || []), ...(row.shopImages || [])]).slice(0, 8);
  enrichment.ddangyoUrl ||= row.sourceUrls?.[0] || '';
  enrichment.sourceUrls = unique([...(enrichment.sourceUrls || []), ...(row.sourceUrls || [])]);
  if (!enrichment.phone && row.phoneSource === 'ddangyo') {
    enrichment.phone = row.phone;
    enrichment.phoneSource = 'ddangyo';
  }
  enrichment.sourceMatch = row.match;
  enrichment.hoursSource = 'ddangyo-common-store-hours';
  enrichment.benefitsSource = 'ddangyo-app-scoped';
  enrichmentByPatsto.set(String(row.patstoNo), enrichment);
  enrichmentByStore.set(storeId, enrichment);

  const existingPath = path.join('store-menu-content', storeId, 'menu.json');
  const existingMenu = await readJsonIfExists(existingPath);
  const merged = mergeMenu(existingMenu, row);
  const destination = path.join(outputDir, 'store-menu-content', storeId);
  await fs.mkdir(destination, {recursive: true});
  await fs.writeFile(path.join(destination, 'menu.json'), JSON.stringify(merged.menu, null, 2));
  menuMap[storeId] = {
    path: `store-menu-content/${storeId}/menu.json`,
    entryImage: merged.menu.mainImage || row.mainImage || '',
    itemCount: merged.menu.items.length
  };
  packageStats.menuFiles += 1;
  packageStats.menuItemsAdded += merged.added;
  packageStats.menuDescriptionsFilled += merged.descriptions;
  packageStats.menuImagesFilled += merged.images;
}

const dedupedEnrichment = [];
const enrichmentKeys = new Set();
for (const row of nextEnrichment) {
  const key = String(row.patstoNo || '') || `${row.targetStoreId}|${row.name}`;
  if (enrichmentKeys.has(key)) continue;
  enrichmentKeys.add(key);
  dedupedEnrichment.push(row);
}
currentEnrichment.schemaVersion = Math.max(Number(currentEnrichment.schemaVersion || 0), 2);
currentEnrichment.batchId = 'all-historical-ddangyo-fingerprint';
currentEnrichment.generatedAt = new Date().toISOString();
currentEnrichment.stores = dedupedEnrichment;
currentEnrichment.policy = {
  ...(currentEnrichment.policy || {}),
  mode: 'add-missing-only',
  businessHours: 'ddangyo-hours-apply-as-common-store-hours',
  benefits: 'app-scoped',
  pricesVisible: false
};
currentEnrichment.completeFingerprintStats = packageStats;

await fs.mkdir(path.join(outputDir, 'data'), {recursive: true});
await fs.writeFile(path.join(outputDir, 'store-service-info.json'), JSON.stringify(serviceInfo, null, 2));
await fs.writeFile(path.join(outputDir, 'data', 'ddangyo-store-enrichment.json'), JSON.stringify(currentEnrichment, null, 2));
await fs.writeFile(path.join(outputDir, 'data', 'ddangyo-coupon-details.json'), JSON.stringify({generatedAt: new Date().toISOString(), sourceApp: 'ddangyo', stores: couponDetails}, null, 2));
await fs.mkdir(path.join(outputDir, 'store-menu-content'), {recursive: true});
await fs.writeFile(path.join(outputDir, 'store-menu-content', 'ddangyo-menu-map.js'), `'use strict';\nwindow.DAEDONG_DDANGYO_MENU_STORES = Object.freeze(${JSON.stringify(menuMap, null, 2)});\n`);
await fs.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify({generatedAt: new Date().toISOString(), ...packageStats, enrichmentRecords: dedupedEnrichment.length, serviceStoreRecords: Object.keys(serviceInfo.stores || {}).length, menuMapRecords: Object.keys(menuMap).length}, null, 2));
console.log(JSON.stringify({generatedAt: new Date().toISOString(), ...packageStats, enrichmentRecords: dedupedEnrichment.length, serviceStoreRecords: Object.keys(serviceInfo.stores || {}).length, menuMapRecords: Object.keys(menuMap).length}, null, 2));
