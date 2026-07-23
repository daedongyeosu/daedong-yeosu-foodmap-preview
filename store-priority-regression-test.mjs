import {readFile} from 'node:fs/promises';

const stores=JSON.parse(await readFile(new URL('./data/stores.json',import.meta.url)));
const priority=JSON.parse(await readFile(new URL('./data/store-priority.json',import.meta.url)));
const banners=JSON.parse(await readFile(new URL('./data/banner-targets.json',import.meta.url)));
const source=await readFile(new URL('./rc6-fixes.js',import.meta.url),'utf8');
const ids=new Set(stores.map(store=>String(store.store_id||store.id||'')));
const managed=(priority.managedStoreIds||[]).map(String),shared=(priority.sharedManagedStoreIds||[]).map(String);

if(new Set(managed).size!==managed.length)throw new Error('duplicate managed store id');
if(new Set(shared).size!==shared.length)throw new Error('duplicate shared-managed store id');
if(managed.some(id=>!ids.has(id)))throw new Error('managed store id missing from canonical data');
if(shared.some(id=>!ids.has(id)||managed.includes(id)))throw new Error('invalid or overlapping shared-managed store id');
if(managed.length!==priority.stats?.managedCanonicalStores)throw new Error('managed store count mismatch');
if(priority.matchingPolicy?.toLowerCase().includes('phone')&&!priority.matchingPolicy?.toLowerCase().includes('ignored'))throw new Error('phone must not be a match key');

const mappedBannerIds=Object.values(banners).filter(row=>row.status==='mapped'&&row.storeId).map(row=>String(row.storeId));
const managedBannerCount=mappedBannerIds.filter(id=>managed.includes(id)).length;
if(!managedBannerCount)throw new Error('no managed-store banner is mapped');

for(const required of [
  'a.bucket-b.bucket||a.ownershipTier-b.ownershipTier',
  'appRegisteredStores=function rc6LocationAppStores',
  'fxPhoneStores=function rc6LocationPhoneStores',
  'fxDirectBrands=function rc6LocationDirectBrands',
  "fetchJson('data/store-priority.json',{})",
])if(!source.includes(required))throw new Error(`priority wiring missing: ${required}`);

console.log(JSON.stringify({
  operatingExcelRows:priority.stats?.operatingExcelRows,
  matchedExcelRows:priority.stats?.matchedExcelRows,
  managedCanonicalStores:managed.length,
  sharedManagedCanonicalStores:shared.length,
  managedMappedBanners:managedBannerCount,
  phoneUsedAsMatchKey:false,
  status:'PASS',
},null,2));
