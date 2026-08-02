import fs from 'node:fs/promises';

const enrichmentPath = 'data/ddangyo-store-enrichment.json';
const servicePath = 'data/ddangyo-new-store-services.json';

const enrichment = JSON.parse(await fs.readFile(enrichmentPath, 'utf8'));
const services = JSON.parse(await fs.readFile(servicePath, 'utf8'));
const byId = new Map((services.stores || []).map(row => [String(row.targetStoreId), row]));

let updated = 0;
let naverVerified = 0;
for (const row of enrichment.stores || []) {
  if (row.isNew !== true) continue;
  const service = byId.get(String(row.targetStoreId));
  if (!service) throw new Error(`service row missing: ${row.targetStoreId}`);
  row.chakUrl = service.chakUrl;
  row.naverMap = service.naverStatus === 'verified' ? service.naverMap : '';
  row.naverStatus = service.naverStatus;
  row.naverEvidence = service.naverEvidence || null;
  updated += 1;
  if (row.naverMap) naverVerified += 1;
}

if (updated !== 27) throw new Error(`expected 27 updated new stores, got ${updated}`);
enrichment.generatedAt = new Date().toISOString();
enrichment.serviceStats = {
  newStores: updated,
  chakRoutes: updated,
  naverVerified,
  naverOmitted: updated - naverVerified
};
await fs.writeFile(enrichmentPath, JSON.stringify(enrichment, null, 2));
console.log(JSON.stringify(enrichment.serviceStats, null, 2));
