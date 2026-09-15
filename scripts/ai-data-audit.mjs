import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_MODEL = 'gpt-5.6-luna';
const DEFAULT_MAX_RECORDS = 25;
const DEFAULT_MAX_API_CALLS = 1;

const text = value => String(value ?? '').trim();
const normalized = value => text(value).toLowerCase().replace(/[\s·ㆍ.,()\-_/]/g, '');
const sha256 = value => crypto.createHash('sha256').update(text(value)).digest('hex');

export function routeKeys(store) {
  const direct = Array.isArray(store?.routes) ? store.routes : [];
  const catalog = Array.isArray(store?.channelKeys) ? store.channelKeys : [];
  return [...new Set([
    ...direct.filter(route => route && route.enabled !== false && text(route.url)).map(route => text(route.key || route.type)),
    ...catalog.map(text)
  ].filter(Boolean))].sort();
}

export function publicAuditView(store, index = 0) {
  const id = text(store?.id || store?.store_id || `input-${index}`);
  const name = text(store?.name || store?.displayName || store?.storeName);
  const address = text(store?.address || store?.roadAddress || store?.jibunAddress);
  const phone = text(store?.phone || store?.tel || store?.telephone);
  const images = [store?.image, store?.photo, store?.mainImage, ...(Array.isArray(store?.images) ? store.images : [])]
    .map(text).filter(Boolean);
  const routes = routeKeys(store);
  return {
    id,
    name,
    normalizedName: normalized(name),
    addressHint: address ? normalized(address).slice(0, 32) : '',
    phoneFingerprint: phone ? sha256(phone.replace(/\D/g, '')).slice(0, 12) : '',
    imageCount: new Set(images).size,
    routeKeys: routes,
    flags: [
      !name && 'missing-name',
      !address && 'missing-address',
      !phone && 'missing-phone',
      images.length === 0 && 'missing-photo',
      routes.length === 0 && 'missing-order-route'
    ].filter(Boolean)
  };
}

export function buildReviewCandidates(stores) {
  if (!Array.isArray(stores)) throw new Error('Input JSON must contain a store array');
  const views = stores.map(publicAuditView);
  const duplicateGroups = new Map();
  for (const view of views) {
    const keys = [
      view.normalizedName && view.addressHint && `name-address:${view.normalizedName}:${view.addressHint}`,
      view.normalizedName && view.phoneFingerprint && `name-phone:${view.normalizedName}:${view.phoneFingerprint}`
    ].filter(Boolean);
    for (const key of keys) {
      if (!duplicateGroups.has(key)) duplicateGroups.set(key, []);
      duplicateGroups.get(key).push(view.id);
    }
  }
  const duplicateById = new Map();
  for (const [key, ids] of duplicateGroups) {
    if (new Set(ids).size < 2) continue;
    for (const id of ids) {
      if (!duplicateById.has(id)) duplicateById.set(id, []);
      duplicateById.get(id).push({key, ids: [...new Set(ids)]});
    }
  }
  return views.map(view => ({...view, possibleDuplicates: duplicateById.get(view.id) || []}))
    .filter(view => view.flags.length || view.possibleDuplicates.length)
    .sort((a, b) => (b.possibleDuplicates.length - a.possibleDuplicates.length) || (b.flags.length - a.flags.length) || a.name.localeCompare(b.name, 'ko'));
}

export function extractOutputText(response) {
  if (typeof response?.output_text === 'string') return response.output_text;
  return (response?.output || []).flatMap(item => item?.content || []).filter(item => item?.type === 'output_text').map(item => item.text || '').join('');
}

export function parseAiJson(value) {
  const source = text(value).replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(source);
  if (!parsed || !Array.isArray(parsed.reviews)) throw new Error('AI response did not contain a reviews array');
  return parsed;
}

function parseOptions(argv) {
  const options = {};
  for (let index = 2; index < argv.length; index += 2) options[argv[index]] = argv[index + 1];
  return options;
}

async function privatePath(target, {create = false} = {}) {
  const resolved = path.resolve(target);
  const relative = path.relative(REPO, resolved);
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Raw inputs and audit outputs must stay outside the public repository');
  }
  if (create) await fs.mkdir(path.dirname(resolved), {recursive: true});
  return resolved;
}

async function callOpenAi(candidates, {model, maxApiCalls}) {
  if (maxApiCalls !== 1) throw new Error('This first version permits exactly one API call per run');
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured');
  const payload = {
    model,
    store: false,
    max_output_tokens: 1200,
    instructions: [
      'You audit Korean restaurant catalog records.',
      'Return JSON only: {"reviews":[{"storeId":"...","severity":"low|medium|high","reasons":["..."],"recommendedAction":"..."}]}.',
      'Never invent a phone, address, image, order URL, business identity, or merge decision.',
      'Treat duplicate matches as suggestions for human review, never as approval to merge or delete.',
      'Keep explanations concise and in Korean.'
    ].join(' '),
    input: JSON.stringify({candidates})
  };
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json'},
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(60000)
  });
  if (!response.ok) throw new Error(`OpenAI API failed: ${response.status} ${await response.text()}`);
  return parseAiJson(extractOutputText(await response.json()));
}

async function main() {
  const options = parseOptions(process.argv);
  if (!options['--input'] || !options['--output']) {
    throw new Error('Usage: node scripts/ai-data-audit.mjs --input <private.json> --output <private.json> [--allow-api-call yes] [--model gpt-5.6-luna] [--max-records 25] [--max-api-calls 1]');
  }
  const inputPath = await privatePath(options['--input']);
  const outputPath = await privatePath(options['--output'], {create: true});
  const raw = JSON.parse(await fs.readFile(inputPath, 'utf8'));
  const stores = Array.isArray(raw) ? raw : (raw.stores || raw.catalog);
  const maxRecords = Math.max(1, Math.min(Number(options['--max-records'] || DEFAULT_MAX_RECORDS), 25));
  const maxApiCalls = Number(options['--max-api-calls'] || DEFAULT_MAX_API_CALLS);
  const candidates = buildReviewCandidates(stores).slice(0, maxRecords);
  const apiEnabled = options['--allow-api-call'] === 'yes';
  const report = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    sourceRecords: stores.length,
    reviewCandidates: candidates.length,
    apiCalled: apiEnabled,
    model: apiEnabled ? (options['--model'] || process.env.OPENAI_MODEL || DEFAULT_MODEL) : null,
    limits: {maxRecords, maxApiCalls: apiEnabled ? maxApiCalls : 0},
    candidates,
    ai: null,
    sourceModified: false,
    automaticChangesApplied: 0
  };
  if (apiEnabled && candidates.length) report.ai = await callOpenAi(candidates, {model: report.model, maxApiCalls});
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, {flag: 'wx'});
  console.log(JSON.stringify({event: 'ai-data-audit-complete', apiCalled: report.apiCalled, sourceRecords: report.sourceRecords, reviewCandidates: report.reviewCandidates, output: outputPath}));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
