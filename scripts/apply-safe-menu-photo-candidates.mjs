import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {menuNameHash} from './audit-menu-photo-coverage.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STORE_ID = /^[a-f0-9]{16}$/;

function parseOptions(argv) {
  const options = {};
  for (let index = 2; index < argv.length; index += 2) options[argv[index]] = argv[index + 1];
  return options;
}

function insideRepo(filename) {
  const relative = path.relative(REPO, path.resolve(filename));
  return relative && !relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative);
}

async function main() {
  const options = parseOptions(process.argv);
  if (!options['--report']) throw new Error('Usage: node scripts/apply-safe-menu-photo-candidates.mjs --report <private-report.json> [--apply yes]');
  const reportPath = path.resolve(options['--report']);
  if (insideRepo(reportPath)) throw new Error('The raw audit report must stay outside the public repository');
  const report = JSON.parse(await fs.readFile(reportPath, 'utf8'));
  if (report.schemaVersion !== 1 || !Array.isArray(report.candidates)) throw new Error('Unsupported menu photo audit report');
  if (report.failures?.length) throw new Error('A report with menu fetch failures cannot be applied');
  const age = Date.now() - Date.parse(report.createdAt);
  if (!Number.isFinite(age) || age < 0 || age > 12 * 60 * 60 * 1000) throw new Error('The audit report is stale; run a fresh audit');
  const combinedPath = path.join(REPO, 'data', 'reviewed-menu-photo-links.json');
  const combined = JSON.parse(await fs.readFile(combinedPath, 'utf8'));
  combined.sharedAssets ||= {};
  const candidates = report.candidates.filter(candidate => candidate.safeToAutoFill);
  const additions = [];
  const skipped = [];
  const migratedStoreIds = new Set();
  for (const [storeId, store] of Object.entries(combined.stores || {})) {
    for (const photo of Object.values(store.items || {})) {
      if (photo.matchMethod !== 'same-brand-exact-menu') continue;
      const sourceStoreId = String(photo.sharedFromStoreId || '');
      if (!STORE_ID.test(sourceStoreId) || !photo.sharedMenuItemId) throw new Error(`Invalid existing shared photo provenance: ${storeId}`);
      combined.sharedAssets[photo.image] = {
        sourceStoreId,
        sourceMenuItemId: photo.sharedMenuItemId,
        matchMethod: photo.matchMethod
      };
      delete photo.sharedFromStoreId;
      delete photo.sharedMenuItemId;
      delete photo.matchMethod;
      migratedStoreIds.add(storeId);
    }
  }
  for (const candidate of candidates) {
    const storeId = String(candidate.storeId || '').toLowerCase();
    const itemId = String(candidate.itemId || '');
    const image = Array.isArray(candidate.candidateImages) && candidate.candidateImages.length === 1
      ? String(candidate.candidateImages[0]) : '';
    const source = (candidate.sources || []).find(value => value.image === image && STORE_ID.test(String(value.storeId || '')));
    if (!STORE_ID.test(storeId) || !itemId || !source || !image.startsWith(`assets/reviewed-menu-photos/${source.storeId}/`)) {
      skipped.push({storeId, itemId, reason: 'invalid-provenance'});
      continue;
    }
    const sourceEntry = combined.stores?.[source.storeId];
    const sourceOwnsImage = Object.values(sourceEntry?.items || {}).some(photo => photo.image === image);
    if (!sourceOwnsImage || !(await fs.stat(path.join(REPO, image)).catch(() => null))?.isFile()) {
      skipped.push({storeId, itemId, reason: 'source-evidence-missing'});
      continue;
    }
    combined.stores[storeId] ||= {items: {}};
    combined.stores[storeId].items ||= {};
    if (combined.stores[storeId].items[itemId]) {
      skipped.push({storeId, itemId, reason: 'existing-reviewed-photo-preserved'});
      continue;
    }
    combined.sharedAssets[image] ||= {
      sourceStoreId: source.storeId,
      sourceMenuItemId: source.itemId,
      matchMethod: 'same-brand-exact-menu'
    };
    const patch = {
      nameHash: menuNameHash(candidate.itemName),
      descriptionHash: String(candidate.descriptionHash || menuNameHash(candidate.description)),
      image
    };
    combined.stores[storeId].items[itemId] = patch;
    additions.push({storeId, storeName: candidate.storeName, itemId, itemName: candidate.itemName, ...patch});
  }
  if (skipped.some(item => item.reason !== 'existing-reviewed-photo-preserved')) {
    throw new Error(`Unsafe candidates were rejected: ${JSON.stringify(skipped)}`);
  }
  if (options['--apply'] !== 'yes') {
    console.log(JSON.stringify({event: 'safe-menu-photo-candidates-dry-run', candidates: candidates.length, additions: additions.length, skipped: skipped.length}));
    return;
  }
  await fs.writeFile(combinedPath, `${JSON.stringify(combined, null, 2)}\n`);
  const touchedBuckets = new Set([...additions.map(item => item.storeId[0]), ...[...migratedStoreIds].map(storeId => storeId[0])]);
  for (const bucket of touchedBuckets) {
    const stores = Object.fromEntries(Object.entries(combined.stores).filter(([storeId]) => storeId[0] === bucket));
    const usedImages = new Set(Object.values(stores).flatMap(store => Object.values(store.items || {}).map(photo => photo.image)));
    const sharedAssets = Object.fromEntries(Object.entries(combined.sharedAssets).filter(([image]) => usedImages.has(image)));
    const shard = {version: combined.version, ...(Object.keys(sharedAssets).length ? {sharedAssets} : {}), stores};
    // Runtime shards stay compact so a safe-fill batch does not create a huge
    // formatting-only diff or make every customer's first menu request heavier.
    await fs.writeFile(path.join(REPO, 'data', 'reviewed-menu-photo-links', `${bucket}.json`), `${JSON.stringify(shard)}\n`);
  }
  console.log(JSON.stringify({event: 'safe-menu-photo-candidates-applied', candidates: candidates.length, additions: additions.length, migratedMappings: migratedStoreIds.size, skipped: skipped.length, targetStores: new Set([...additions.map(item => item.storeId), ...migratedStoreIds]).size, touchedBuckets: [...touchedBuckets].sort()}));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
