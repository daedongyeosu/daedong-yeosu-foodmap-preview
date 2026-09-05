import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PRICE_FIELDS = new Set(['price', 'menu_unitprc', 'menuPrice', 'salePrice', 'discountPrice', 'originalPrice', 'unitPrice', 'basePrice']);
const PRICE_TEXT = /(?:[₩$]\s*\d|\b(?:krw|usd)\s*\d|\d[\d,.]*\s*(?:원|₩|krw|usd)(?![가-힣a-z]))/iu;
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const stable = value => JSON.stringify(value);

export function sourceIds(item, index) {
  const values = [item?.id, item?.itemId, ...(Array.isArray(item?.__sourceIds) ? item.__sourceIds : [])];
  const ids = [...new Set(values.filter(value => value !== undefined && value !== null && String(value).trim()).map(String))];
  return ids.length ? ids : [`menu-family-input-${index}`];
}

function mediaValues(value) {
  const found = new Set();
  function visit(node, media = false) {
    if (typeof node === 'string') { if (media && node.trim()) found.add(node); return; }
    if (Array.isArray(node)) { node.forEach(item => visit(item, media)); return; }
    if (!node || typeof node !== 'object') return;
    Object.entries(node).forEach(([key, item]) => visit(item, media || /image|photo/i.test(key)));
  }
  visit(value);
  return found;
}

export function publicPriceIssues(value) {
  const found = [];
  function visit(node, location = '$') {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) { node.forEach((item, index) => visit(item, `${location}[${index}]`)); return; }
    for (const [key, item] of Object.entries(node)) {
      const at = `${location}.${key}`;
      if (PRICE_FIELDS.has(key)) found.push({code: 'public-price-field', path: at});
      if (typeof item === 'string' && ['name', 'description', 'displayName', 'category', '__searchText'].includes(key) && PRICE_TEXT.test(item)) found.push({code: 'public-price-text', path: at});
      if (item && typeof item === 'object') visit(item, at);
    }
  }
  visit(value);
  return found;
}

export function auditMenu(menu, model, {store = {}} = {}) {
  const storeId = String(store.id || store.store_id || menu.storeId || menu.store_id || '');
  const original = stable(menu);
  const originalStore = stable(store);
  const source = Array.isArray(menu?.items) ? menu.items : [];
  const failures = [];
  const warnings = [];
  let projected;
  try { projected = model.project(menu, {store}); }
  catch (error) { return {storeId, passed: false, failures: [{code: 'projection-threw', message: error.message}], inputCount: source.length}; }
  if (stable(menu) !== original) failures.push({code: 'input-mutated'});
  if (stable(store) !== originalStore) failures.push({code: 'store-mutated'});
  try {
    if (stable(model.project(JSON.parse(original), {store: JSON.parse(originalStore)})) !== stable(projected)) failures.push({code: 'not-deterministic'});
    if (stable(model.project(projected, {store})) !== stable(projected)) failures.push({code: 'not-idempotent'});
  } catch (error) { failures.push({code: 'repeat-projection-threw', message: error.message}); }
  const cards = Array.isArray(projected?.items) ? projected.items : [];
  const excluded = Array.isArray(projected?.__audit?.excluded) ? projected.__audit.excluded : [];
  const variants = cards.flatMap(card => (Array.isArray(card.__variants) ? card.__variants : []).map(variant => ({card, variant})));
  const byIndex = new Map();
  const record = (index, value) => {
    if (!Number.isInteger(index) || index < 0 || index >= source.length) { failures.push({code: 'invalid-input-index', inputIndex: index}); return; }
    if (!byIndex.has(index)) byIndex.set(index, []);
    byIndex.get(index).push(value);
  };
  variants.forEach(({card, variant}) => record(variant.__inputIndex, {kind: 'variant', value: variant, card}));
  excluded.forEach(value => record(value.__inputIndex, {kind: 'excluded', value}));
  let excludedCount = 0;
  let photoChecks = 0;
  let descriptionChecks = 0;
  let sanitizedPriceDescriptions = 0;
  source.forEach((item, index) => {
    const origins = byIndex.get(index) || [];
    if (origins.length !== 1) { failures.push({code: 'source-occurrence-conservation', inputIndex: index, occurrences: origins.length, sourceIds: sourceIds(item, index)}); return; }
    const origin = origins[0];
    const actualIds = new Set([...(origin.value.__sourceIds || origin.value.sourceIds || []), origin.value.id, origin.value.itemId].filter(value => value !== undefined && value !== null).map(String));
    const missing = sourceIds(item, index).filter(id => !actualIds.has(id));
    if (missing.length) failures.push({code: 'source-id-lost', inputIndex: index, sourceIds: missing});
    if (origin.kind === 'excluded') {
      excludedCount++;
      const classification = model.classify(item, store);
      if (!['notice', 'membership'].includes(classification)) failures.push({code: 'food-excluded', inputIndex: index, classification, reason: origin.value.reason});
      if (!origin.value.reason) failures.push({code: 'exclusion-reason-missing', inputIndex: index});
      return;
    }
    const cardIds = new Set((origin.card.__sourceIds || []).map(String));
    const cardMissing = sourceIds(item, index).filter(id => !cardIds.has(id));
    if (cardMissing.length) failures.push({code: 'card-source-id-lost', inputIndex: index, sourceIds: cardMissing});
    const expectedMedia = mediaValues(item);
    const retainedMedia = mediaValues(origin.value);
    for (const media of expectedMedia) {
      photoChecks++;
      if (!retainedMedia.has(media)) failures.push({code: 'variant-photo-lost', inputIndex: index, sourceIds: sourceIds(item, index), media});
    }
    if (typeof item?.description === 'string' && item.description) {
      if (PRICE_TEXT.test(item.description)) sanitizedPriceDescriptions++;
      else {
        descriptionChecks++;
        if (origin.value.description !== item.description) failures.push({code: 'variant-description-changed', inputIndex: index, sourceIds: sourceIds(item, index)});
      }
    }
  });
  const expectedAll = new Set(source.flatMap(sourceIds));
  const actualAll = new Set([...variants.flatMap(({variant}) => variant.__sourceIds || []), ...excluded.flatMap(item => item.sourceIds || item.__sourceIds || [])].map(String));
  for (const id of actualAll) if (!expectedAll.has(id)) failures.push({code: 'foreign-source-id', sourceId: id});
  for (const card of cards) {
    if (!card.__familyKey) failures.push({code: 'family-key-missing', cardId: card.id});
    const kinds = new Set((card.__variants || []).map(item => model.classify(item, store)));
    // The same dish can be labelled "side" by one app and "food" by another.
    // Keep this visible for human review; it alone does not prove an unsafe merge.
    if (kinds.size > 1) warnings.push({code: 'mixed-family-kinds', familyKey: card.__familyKey, kinds: [...kinds], sourceIds: card.__sourceIds});
  }
  if (new Set(cards.map(card => card.__familyKey)).size !== cards.length) failures.push({code: 'duplicate-family-key'});
  failures.push(...publicPriceIssues(projected));
  const audit = projected?.__audit || {};
  if (audit.inputCount !== source.length) failures.push({code: 'audit-input-count', expected: source.length, actual: audit.inputCount});
  if (audit.familyCount !== cards.length) failures.push({code: 'audit-family-count', expected: cards.length, actual: audit.familyCount});
  if (audit.variantCount !== variants.length) failures.push({code: 'audit-variant-count', expected: variants.length, actual: audit.variantCount});
  if (audit.mappedCount !== variants.length) failures.push({code: 'audit-mapped-count', expected: variants.length, actual: audit.mappedCount});
  if (variants.length + excluded.length !== source.length) failures.push({code: 'total-occurrence-count', input: source.length, variants: variants.length, excluded: excluded.length});
  if (stable(menu) !== original || stable(store) !== originalStore) failures.push({code: 'repeat-input-mutated'});
  const additionalReview = warnings.filter(warning => !(audit.review || []).some(item => item.familyKey === warning.familyKey && item.reason === 'kind-variation'));
  return {
    storeId, storeName: String(store.name || menu.displayName || menu.storeName || ''), passed: failures.length === 0,
    inputCount: source.length, familyCount: cards.length, variantCount: variants.length, excludedCount,
    sourceIdCount: expectedAll.size, photoChecks, descriptionChecks, sanitizedPriceDescriptions,
    failures, warnings, excluded, review: [...(audit.review || []), ...additionalReview.map(({code, ...warning}) => ({...warning, reason: code}))],
    families: cards.filter(card => (card.__variants || []).length > 1).map(card => ({storeId, familyKey: card.__familyKey, name: card.name, kind: card.__kind, sourceIds: card.__sourceIds, variants: card.__variants.map(item => ({inputIndex: item.__inputIndex, id: item.id, name: item.name, quantity: item.__quantity, hasImage: mediaValues(item).size > 0, hasDescription: Boolean(item.description)}))}))
  };
}

export function auditCrossStore(rows, model) {
  const before = stable(rows);
  const issues = [];
  let cards;
  try { cards = model.groupSearchRows(rows); }
  catch (error) { return {passed: false, failures: [{code: 'cross-store-projection-threw', message: error.message}]}; }
  if (stable(rows) !== before) issues.push({code: 'search-input-mutated'});
  const allowed = new Set(rows.map(row => String(row.storeId)));
  for (const card of cards) {
    if (!allowed.has(String(card.storeId))) issues.push({code: 'search-store-id-lost', storeId: card.storeId});
    for (const variant of card.__variants || []) if (String(variant.storeId) !== String(card.storeId)) issues.push({code: 'cross-store-family', storeId: card.storeId, variantStoreId: variant.storeId, familyKey: card.__familyKey});
  }
  // Same item ID and name in separate stores must never collapse together.
  const canary = [{storeId: 'aaaaaaaaaaaaaaaa', itemId: 'same-id', name: '콜라 350ml', category: '음료'}, {storeId: 'bbbbbbbbbbbbbbbb', itemId: 'same-id', name: '콜라 350ml', category: '음료'}];
  const separate = model.groupSearchRows(canary);
  if (separate.length !== 2 || new Set(separate.map(card => String(card.storeId))).size !== 2) issues.push({code: 'cross-store-canary-failed'});
  return {passed: issues.length === 0, inputRows: rows.length, familyRows: cards.length, failures: issues};
}

async function ensurePrivate(directory) {
  const resolved = path.resolve(directory);
  const lexical = path.relative(REPO, resolved);
  if (!lexical || (!lexical.startsWith(`..${path.sep}`) && lexical !== '..' && !path.isAbsolute(lexical))) throw new Error('Raw inputs and audit outputs must be outside the public repository');
  await fs.mkdir(resolved, {recursive: true});
  const real = await fs.realpath(resolved);
  const relative = path.relative(await fs.realpath(REPO), real);
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) throw new Error('Raw inputs and audit outputs must be outside the public repository');
  return real;
}

async function main() {
  const options = {};
  for (let i = 2; i < process.argv.length; i += 2) options[process.argv[i]] = process.argv[i + 1];
  if (!options['--input'] || !options['--output']) throw new Error('Usage: node scripts/audit-menu-families.mjs --input <private-snapshot-dir> --output <private-report-dir> [--model <model.js>]');
  const input = await fs.realpath(path.resolve(options['--input']));
  const inputRelative = path.relative(await fs.realpath(REPO), input);
  if (!inputRelative || (!inputRelative.startsWith(`..${path.sep}`) && inputRelative !== '..' && !path.isAbsolute(inputRelative))) throw new Error('Input snapshot must be outside the public repository');
  const output = await ensurePrivate(options['--output']);
  const modelPath = path.resolve(options['--model'] || path.join(REPO, 'menu-family-model.js'));
  const require = createRequire(import.meta.url);
  const model = require(modelPath);
  const modelSha256 = sha256(await fs.readFile(modelPath));
  for (const key of ['project', 'classify', 'groupSearchRows']) if (typeof model[key] !== 'function') throw new Error(`Model missing ${key}`);
  const startedAt = new Date().toISOString();
  const manifest = JSON.parse(await fs.readFile(path.join(input, 'snapshot-manifest.json'), 'utf8'));
  const catalogFile = path.join(input, 'catalog.json');
  const catalogBytes = await fs.readFile(catalogFile);
  if (sha256(catalogBytes) !== manifest.catalog.sha256) throw new Error('Catalog hash differs from acquisition manifest');
  const catalog = JSON.parse(catalogBytes.toString('utf8'));
  const byId = new Map(catalog.map(store => [String(store.id || store.store_id), store]));
  const reports = [];
  const globalFailures = [];
  const searchRows = [];
  const seen = new Set();
  for (const record of manifest.results) {
    if (seen.has(record.storeId)) globalFailures.push({code: 'duplicate-snapshot-store', storeId: record.storeId});
    seen.add(record.storeId);
    if (!byId.has(record.storeId)) globalFailures.push({code: 'snapshot-store-not-in-catalog', storeId: record.storeId});
    if (record.status === 404) continue;
    if (record.status !== 200) { globalFailures.push({code: 'snapshot-fetch-failed', storeId: record.storeId, status: record.status}); continue; }
    const filename = path.join(input, 'menus', `${record.storeId}.json`);
    const bytes = await fs.readFile(filename);
    const checksum = sha256(bytes);
    if (checksum !== record.sha256) globalFailures.push({code: 'input-hash-mismatch', storeId: record.storeId});
    const menu = JSON.parse(bytes.toString('utf8'));
    const report = auditMenu(menu, model, {store: byId.get(record.storeId)});
    reports.push(report);
    menu.items.forEach(item => searchRows.push({...item, storeId: record.storeId}));
    if (sha256(await fs.readFile(filename)) !== checksum) globalFailures.push({code: 'input-file-changed', storeId: record.storeId});
    if (reports.length % 100 === 0) console.log(JSON.stringify({event: 'audit-progress', stores: reports.length, failed: reports.filter(report => !report.passed).length}));
  }
  for (const storeId of byId.keys()) if (!seen.has(storeId)) globalFailures.push({code: 'catalog-store-not-requested', storeId});
  const crossStore = auditCrossStore(searchRows, model);
  if (!crossStore.passed) globalFailures.push(...crossStore.failures);
  if (sha256(await fs.readFile(catalogFile)) !== sha256(catalogBytes)) globalFailures.push({code: 'catalog-file-changed'});
  if (sha256(await fs.readFile(modelPath)) !== modelSha256) globalFailures.push({code: 'model-file-changed-during-audit'});
  const review = reports.flatMap(report => report.review.map(item => ({storeId: report.storeId, storeName: report.storeName, ...item})));
  const families = reports.flatMap(report => report.families || []);
  const summary = {
    schemaVersion: 1, modelVersion: model.VERSION, modelSha256, startedAt, completedAt: new Date().toISOString(),
    inputDirectory: input, sourceApi: manifest.sourceApi, snapshotStartedAt: manifest.startedAt, snapshotCompletedAt: manifest.completedAt,
    catalogStores: catalog.length, requestedStores: manifest.results.length, menuStores: reports.length, missingMenuStores: manifest.results.filter(record => record.status === 404).length,
    failedFetchStores: manifest.results.filter(record => ![200, 404].includes(record.status)).length,
    sourceItems: reports.reduce((sum, report) => sum + report.inputCount, 0), families: reports.reduce((sum, report) => sum + (report.familyCount || 0), 0),
    variants: reports.reduce((sum, report) => sum + (report.variantCount || 0), 0), excludedItems: reports.reduce((sum, report) => sum + (report.excludedCount || 0), 0),
    photoRetentionChecks: reports.reduce((sum, report) => sum + (report.photoChecks || 0), 0), descriptionRetentionChecks: reports.reduce((sum, report) => sum + (report.descriptionChecks || 0), 0),
    reviewCount: review.length, multiVariantFamilies: families.length, failedStores: reports.filter(report => !report.passed).length,
    globalFailures, crossStore, passed: globalFailures.length === 0 && reports.every(report => report.passed), publicRepositoryRawDataWrites: 0,
    stores: reports.map(({families, review, excluded, ...report}) => report)
  };
  const files = {'audit-summary.json': summary, 'review-queue.json': review, 'family-variants.json': families, 'excluded-source-items.json': reports.flatMap(report => (report.excluded || []).map(item => ({storeId: report.storeId, storeName: report.storeName, ...item})))};
  for (const [name, value] of Object.entries(files)) await fs.writeFile(path.join(output, name), `${JSON.stringify(value, null, 2)}\n`);
  const notes = [`# Menu family audit`, '', `Result: ${summary.passed ? 'PASS' : 'FAIL'}`, `Model: ${model.VERSION}`, '', `- Catalog stores: ${summary.catalogStores}`, `- Requested stores: ${summary.requestedStores}`, `- Menu responses: ${summary.menuStores}; missing: ${summary.missingMenuStores}; failed fetches: ${summary.failedFetchStores}`, `- Source items: ${summary.sourceItems}`, `- Public family cards: ${summary.families}`, `- Preserved variants: ${summary.variants}; classified exclusions: ${summary.excludedItems}`, `- Photo checks: ${summary.photoRetentionChecks}; description checks: ${summary.descriptionRetentionChecks}`, `- Review queue: ${summary.reviewCount}`, `- Failed stores: ${summary.failedStores}; global failures: ${summary.globalFailures.length}`, '', 'Raw API responses were read only. Reports remain outside the public repository.', '404 menu responses are recorded, not fabricated as empty source menus.', 'Counts are technical audit evidence, not a claim that every grouping has received human approval.', ''];
  await fs.writeFile(path.join(output, 'audit-summary.md'), notes.join('\n'));
  console.log(JSON.stringify({event: 'audit-complete', passed: summary.passed, menuStores: summary.menuStores, sourceItems: summary.sourceItems, families: summary.families, failedStores: summary.failedStores, globalFailures: summary.globalFailures.length, output}));
  if (!summary.passed) process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
