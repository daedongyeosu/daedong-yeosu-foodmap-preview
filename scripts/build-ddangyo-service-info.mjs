import fs from 'node:fs/promises';
import path from 'node:path';
import {clean, today, parseDdangyoHours, mergeHours, upsertScoped, couponActive, couponRecord, readJsonIfExists} from './ddangyo-package-utils.mjs';

const inputPath = process.argv[2] || 'ddangyo-final-ready-output/final-stores.json';
const outputDir = path.resolve('ddangyo-package-output');
await fs.mkdir(outputDir, {recursive: true});
const rows = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const unresolved = rows.filter(row => row?.error || !['existing', 'new'].includes(row?.match?.status) || !row?.match?.storeId);
if (unresolved.length) throw new Error(`unresolved stores: ${unresolved.length}`);

const service = await readJsonIfExists('store-service-info.json', {version: 4, programs: [], deliveryBenefits: [], stores: {}});
service.programs ||= [];
service.deliveryBenefits ||= [];
service.stores ||= {};
for (const program of [
  {key: 'ddangyo-coupon', label: '쿠폰', appKeys: ['ddangyo'], appLabel: '땡겨요'},
  {key: 'ddangyo-timesale', label: '타임세일', appKeys: ['ddangyo'], appLabel: '땡겨요'}
]) if (!service.programs.some(item => item.key === program.key)) service.programs.push(program);
service.version = Math.max(Number(service.version || 0), 4);
service.updatedAt = today;

const stats = {
  stores: rows.length,
  existingStores: rows.filter(row => row.match.status === 'existing').length,
  newStores: rows.filter(row => row.match.status === 'new').length,
  hoursCreated: 0,
  hoursSupplemented: 0,
  seomseomAdded: 0,
  onnuriAdded: 0,
  freeDeliveryAdded: 0,
  couponStoresAdded: 0,
  activeCoupons: 0,
  timeSaleAdded: 0
};
const couponDetails = {};

for (const row of rows) {
  const storeId = String(row.match.storeId);
  const info = service.stores[storeId] ||= {};
  const hadHours = Boolean(info.hours?.weekly);
  info.hours = mergeHours(info.hours, parseDdangyoHours(row));
  if (hadHours) stats.hoursSupplemented += 1;
  else stats.hoursCreated += 1;

  info.verifiedAt = today;
  if (!info.sourceLabel) info.sourceLabel = '땡겨요 화면 확인';
  else if (!info.sourceLabel.includes('땡겨요')) info.sourceLabel = `${info.sourceLabel}·땡겨요 화면 확인`;
  info.payments = Array.isArray(info.payments) ? info.payments : [];
  info.delivery = Array.isArray(info.delivery) ? info.delivery : [];

  if (row.benefits?.seomseomPay) {
    const before = info.payments.some(item => item.key === 'yeosu-seomseom-pay' && item.status === 'accepted');
    info.payments = upsertScoped(info.payments, 'yeosu-seomseom-pay', 'accepted', ['ddangyo']);
    if (!before) stats.seomseomAdded += 1;
  }
  if (row.benefits?.onnuri) {
    const before = info.payments.some(item => item.key === 'onnuri-gift-certificate' && item.status === 'accepted');
    info.payments = upsertScoped(info.payments, 'onnuri-gift-certificate', 'accepted', ['ddangyo']);
    if (!before) stats.onnuriAdded += 1;
  }
  if (row.benefits?.freeDelivery) {
    const before = info.delivery.some(item => item.key === 'free-delivery' && item.status === 'available');
    info.delivery = upsertScoped(info.delivery, 'free-delivery', 'available', ['ddangyo'], {
      note: '땡겨요 표시 기준 · 거리·주문금액·시간에 따라 달라질 수 있음'
    });
    if (!before) stats.freeDeliveryAdded += 1;
  }

  const activeCoupons = (row.benefits?.coupons || []).filter(couponActive).map(couponRecord);
  if (activeCoupons.length) {
    const before = info.payments.some(item => item.key === 'ddangyo-coupon' && item.status === 'accepted');
    info.payments = upsertScoped(info.payments, 'ddangyo-coupon', 'accepted', ['ddangyo']);
    const records = new Map((info.coupons || []).map(item => [item.id || JSON.stringify(item), item]));
    for (const coupon of activeCoupons) records.set(coupon.id || JSON.stringify(coupon), coupon);
    info.coupons = [...records.values()];
    couponDetails[storeId] = info.coupons;
    stats.activeCoupons += activeCoupons.length;
    if (!before) stats.couponStoresAdded += 1;
  }
  if (row.benefits?.timeSale) {
    const before = info.payments.some(item => item.key === 'ddangyo-timesale' && item.status === 'accepted');
    info.payments = upsertScoped(info.payments, 'ddangyo-timesale', 'accepted', ['ddangyo']);
    if (!before) stats.timeSaleAdded += 1;
  }

  info.ddangyo = {
    ...(info.ddangyo || {}),
    patstoNo: String(row.patstoNo),
    businessHoursAppliedAsCommonStoreHours: true,
    currentStatus: clean(row.hours?.currentStatus),
    currentEndTime: clean(row.hours?.currentEndTime),
    verifiedAt: today
  };
}

await fs.writeFile(path.join(outputDir, 'store-service-info.json'), JSON.stringify(service, null, 2));
await fs.mkdir(path.join(outputDir, 'data'), {recursive: true});
await fs.writeFile(path.join(outputDir, 'data', 'ddangyo-coupon-details.json'), JSON.stringify({
  generatedAt: new Date().toISOString(),
  sourceApp: 'ddangyo',
  stores: couponDetails
}, null, 2));
await fs.writeFile(path.join(outputDir, 'service-summary.json'), JSON.stringify({
  ...stats,
  totalServiceStores: Object.keys(service.stores).length,
  couponDetailStores: Object.keys(couponDetails).length
}, null, 2));
console.log(JSON.stringify(stats, null, 2));
