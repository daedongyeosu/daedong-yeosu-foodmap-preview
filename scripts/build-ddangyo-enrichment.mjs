import fs from 'node:fs/promises';
import path from 'node:path';
import {clean, unique, readJsonIfExists} from './ddangyo-package-utils.mjs';

const inputPath = process.argv[2] || 'ddangyo-final-ready-output/final-stores.json';
const outputDir = path.resolve('ddangyo-package-output');
await fs.mkdir(path.join(outputDir, 'data'), {recursive: true});
const rows = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const unresolved = rows.filter(row => row?.error || !['existing', 'new'].includes(row?.match?.status) || !row?.match?.storeId);
if (unresolved.length) throw new Error(`unresolved stores: ${unresolved.length}`);

const data = await readJsonIfExists('data/ddangyo-store-enrichment.json', {schemaVersion: 2, stores: []});
data.stores = Array.isArray(data.stores) ? data.stores : [];
const byPatsto = new Map(data.stores.map(row => [String(row.patstoNo || ''), row]).filter(([key]) => key));
const byStore = new Map(data.stores.map(row => [String(row.targetStoreId || ''), row]).filter(([key]) => key));
let created = 0;
let updated = 0;
let newStoreRecords = 0;

for (const row of rows) {
  const storeId = String(row.match.storeId);
  const patstoNo = String(row.patstoNo);
  const isNew = row.match.status === 'new';
  let target = byPatsto.get(patstoNo) || byStore.get(storeId);
  if (!target) {
    target = {
      targetStoreId: storeId,
      isNew,
      patstoNo,
      name: row.name
    };
    if (isNew) {
      target.chakUrl = 'https://bit.ly/chak-yeosu';
      target.naverMap = '';
      target.naverStatus = 'pending-exact-name-address-match';
      newStoreRecords += 1;
    }
    data.stores.push(target);
    created += 1;
  } else updated += 1;

  target.targetStoreId ||= storeId;
  target.isNew = target.isNew === true || isNew;
  target.patstoNo ||= patstoNo;
  target.name ||= row.name;
  target.address ||= row.address;
  target.latitude ||= row.latitude;
  target.longitude ||= row.longitude;
  target.category ||= row.category;
  target.mainImage ||= row.mainImage;
  target.shopImages = unique([...(target.shopImages || []), ...(row.shopImages || [])]).slice(0, 8);
  target.sourceUrls = unique([...(target.sourceUrls || []), ...(row.sourceUrls || [])]);
  const verifiedUrl = target.sourceUrls[0] || '';
  if (!target.ddangyoUrl || !target.sourceUrls.includes(target.ddangyoUrl)) target.ddangyoUrl = verifiedUrl;
  if (!target.phone && row.phoneSource === 'ddangyo') {
    target.phone = row.phone;
    target.phoneSource = 'ddangyo';
  }
  target.sourceMatch = row.match;
  target.hoursSource = 'ddangyo-common-store-hours';
  target.benefitsSource = 'ddangyo-app-scoped';
  target.completeFingerprint = {
    address: Boolean(row.address),
    phone: Boolean(row.phone),
    images: (row.shopImages || []).length,
    menus: (row.items || []).length,
    weeklyHours: (row.hours?.weeklyRaw || []).length,
    closures: (row.hours?.closedRulesRaw || []).length,
    coupons: (row.benefits?.coupons || []).length,
    seomseomPay: Boolean(row.benefits?.seomseomPay),
    onnuri: Boolean(row.benefits?.onnuri),
    freeDelivery: Boolean(row.benefits?.freeDelivery)
  };
  byPatsto.set(patstoNo, target);
  byStore.set(storeId, target);
}

const deduped = [];
const seen = new Set();
for (const row of data.stores) {
  const key = String(row.patstoNo || '') || `${row.targetStoreId}|${clean(row.name)}`;
  if (seen.has(key)) continue;
  seen.add(key);
  deduped.push(row);
}
data.schemaVersion = Math.max(Number(data.schemaVersion || 0), 2);
data.batchId = 'all-historical-ddangyo-fingerprint';
data.generatedAt = new Date().toISOString();
data.policy = {
  ...(data.policy || {}),
  mode: 'add-missing-only',
  businessHours: 'ddangyo-hours-apply-as-common-store-hours',
  benefits: 'app-scoped',
  pricesVisible: false
};
data.stores = deduped;
data.completeFingerprintStats = {
  extractedStores: rows.length,
  existingStores: rows.filter(row => row.match.status === 'existing').length,
  newStores: rows.filter(row => row.match.status === 'new').length,
  createdRecords: created,
  updatedRecords: updated,
  newStoreRecords,
  totalRecords: deduped.length
};

await fs.writeFile(path.join(outputDir, 'data', 'ddangyo-store-enrichment.json'), JSON.stringify(data, null, 2));
await fs.writeFile(path.join(outputDir, 'enrichment-summary.json'), JSON.stringify(data.completeFingerprintStats, null, 2));
console.log(JSON.stringify(data.completeFingerprintStats, null, 2));
