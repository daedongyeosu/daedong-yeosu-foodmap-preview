import {createHash, randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {exactMenuKey, menuImage, menuNameHash} from './audit-menu-photo-coverage.mjs';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_API_BASE = 'https://daedong-yeosu-data-api-preview.sisakim.workers.dev';
const DEFAULT_ORIGIN = 'https://preview.daedongmap.com';
const CLIENT_HEADER = 'daedong-preview-web-v1-20260804';
const COUPANG_ENDPOINT = 'https://api.coupangeats.com/endpoint/store.get_store_with_menu';
const COUPANG_APP_VERSION = '1.16.2';
const STORE_ID = /^[a-f0-9]{16}$/;

const text = value => String(value ?? '').normalize('NFKC').trim();
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function parseOptions(argv) {
  const options = {};
  for (let index = 2; index < argv.length; index += 2) options[argv[index]] = argv[index + 1];
  return options;
}

function outsideRepo(filename) {
  const relative = path.relative(REPO, path.resolve(filename));
  return relative.startsWith(`..${path.sep}`) || relative === '..' || path.isAbsolute(relative);
}

function coupangStoreId(routes) {
  const route = (Array.isArray(routes) ? routes : []).find(value => value?.key === 'coupang' && value?.enabled !== false);
  if (!route?.url) return '';
  try {
    const id = new URL(route.url).searchParams.get('storeId') || '';
    return /^\d+$/.test(id) ? id : '';
  } catch {
    return '';
  }
}

function buildCoupangHeaders(latitude, longitude) {
  const anonymousDeviceId = randomUUID();
  const location = JSON.stringify({
    customerAddressId: 0,
    zipCode: '',
    latitude,
    longitude,
    regionId: 0,
    siDo: encodeURIComponent('전라남도'),
    siGunGu: encodeURIComponent('여수시')
  });
  return {
    'user-agent': `Android-Coupang-Eats-Customer/${COUPANG_APP_VERSION}`,
    'x-eats-os-type': 'ANDROID',
    'x-eats-os-version': '16',
    'x-eats-app-version': COUPANG_APP_VERSION,
    'x-eats-device-model': 'SM-S938N',
    'x-eats-is-emulator': 'false',
    'x-eats-device-id': anonymousDeviceId,
    'x-eats-pcid': anonymousDeviceId,
    'x-coupang-global-device-uuid': anonymousDeviceId,
    'x-eats-resolution-type': 'XXHDPI',
    'x-eats-time-zone': 'Asia/Seoul',
    'accept-language': 'ko-KR',
    'x-eats-locale': 'ko-KR',
    'x-eats-app-source': 'customerApp',
    'x-eats-network-type': 'WIFI',
    'x-eats-device-density': '3.0',
    'x-eats-location': location,
    cookie: `X-EATS-UUID=${anonymousDeviceId}`
  };
}

async function requestJson(url, headers, attempts = 4) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, {headers, signal: AbortSignal.timeout(30000)});
      if (response.status === 404) return null;
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Math.max(1, Number(response.headers.get('retry-after') || 0));
        await sleep(Math.max(retryAfter * 1000, 750 * 2 ** attempt));
        continue;
      }
      if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
      return response.json();
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await sleep(750 * 2 ** attempt);
    }
  }
  throw lastError || new Error(`Failed to load ${url}`);
}

function coupangItems(data) {
  const unique = new Map();
  const groups = [...(Array.isArray(data?.menus) ? data.menus : [])]
    .sort((a, b) => Number(Boolean(b.realMenu)) - Number(Boolean(a.realMenu)));
  for (const group of groups) {
    const dishes = Array.isArray(group.dishes) ? group.dishes
      : Array.isArray(group.dishHorizontal?.dishes) ? group.dishHorizontal.dishes : [];
    for (const dish of dishes) {
      const id = text(dish.id || `${group.id}:${dish.name}`);
      if (!id || unique.has(id)) continue;
      const image = (Array.isArray(dish.imagePaths) ? dish.imagePaths : [])
        .map(text)
        .find(value => value && !value.includes('/icon/dish_default_image.')) || '';
      unique.set(id, {
        id,
        name: text(dish.name),
        description: text(dish.description),
        image
      });
    }
  }
  return [...unique.values()];
}

export function exactUniquePhotoMatches(menuItems, sourceItems) {
  const targetsByKey = new Map();
  const sourcesByKey = new Map();
  for (const item of Array.isArray(menuItems) ? menuItems : []) {
    if (menuImage(item)) continue;
    const key = exactMenuKey(item?.name);
    if (!key) continue;
    if (!targetsByKey.has(key)) targetsByKey.set(key, []);
    targetsByKey.get(key).push(item);
  }
  for (const item of Array.isArray(sourceItems) ? sourceItems : []) {
    if (!item?.image) continue;
    const key = exactMenuKey(item?.name);
    if (!key) continue;
    if (!sourcesByKey.has(key)) sourcesByKey.set(key, []);
    sourcesByKey.get(key).push(item);
  }
  const matches = [];
  for (const [key, targets] of targetsByKey) {
    const sources = sourcesByKey.get(key) || [];
    if (targets.length !== 1 || sources.length !== 1) continue;
    matches.push({target: targets[0], source: sources[0]});
  }
  return matches;
}

async function mapConcurrent(values, concurrency, worker) {
  const results = new Array(values.length);
  let cursor = 0;
  await Promise.all(Array.from({length: Math.min(concurrency, values.length)}, async () => {
    while (cursor < values.length) {
      const index = cursor++;
      results[index] = await worker(values[index], index);
    }
  }));
  return results;
}

function imageExtension(contentType, url) {
  const type = text(contentType).toLowerCase();
  if (type.includes('jpeg')) return 'jpg';
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  const extension = path.extname(new URL(url).pathname).toLowerCase().replace('.', '');
  return extension === 'jpeg' ? 'jpg' : ['jpg', 'png', 'webp'].includes(extension) ? extension : '';
}

function validImage(bytes, extension) {
  if (!bytes.length) return false;
  if (extension === 'jpg') return bytes[0] === 0xff && bytes[1] === 0xd8;
  if (extension === 'png') return bytes.subarray(1, 4).toString('ascii') === 'PNG';
  if (extension === 'webp') return bytes.subarray(0, 4).toString('ascii') === 'RIFF'
    && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  return false;
}

const imageRequestCache = new Map();
async function sourceImage(candidate) {
  if (!imageRequestCache.has(candidate.sourceImage)) imageRequestCache.set(candidate.sourceImage, (async () => {
    const response = await fetch(candidate.sourceImage, {signal: AbortSignal.timeout(30000), redirect: 'follow'});
    if (!response.ok) throw new Error(`image-http-${response.status}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    const extension = imageExtension(response.headers.get('content-type'), candidate.sourceImage);
    if (!extension || !validImage(bytes, extension)) throw new Error('invalid-image-payload');
    const sha256 = createHash('sha256').update(bytes).digest('hex');
    return {bytes, extension, sha256};
  })());
  return imageRequestCache.get(candidate.sourceImage);
}

async function downloadPhoto(candidate) {
  const {bytes, extension, sha256} = await sourceImage(candidate);
  const hash = sha256.slice(0, 24);
  const relative = `assets/reviewed-menu-photos/${candidate.storeId}/${hash}.${extension}`;
  const filename = path.join(REPO, relative);
  await fs.mkdir(path.dirname(filename), {recursive: true});
  try {
    await fs.writeFile(filename, bytes, {flag: 'wx'});
  } catch (error) {
    if (error.code !== 'EEXIST') throw error;
    const existing = await fs.readFile(filename);
    if (!existing.equals(bytes)) throw new Error('asset-hash-collision');
  }
  return {...candidate, image: relative, bytes: bytes.length, sha256};
}

async function writeInventory(additions) {
  const combinedPath = path.join(REPO, 'data', 'reviewed-menu-photo-links.json');
  const combined = JSON.parse(await fs.readFile(combinedPath, 'utf8'));
  const touchedBuckets = new Set();
  let added = 0;
  for (const value of additions) {
    combined.stores[value.storeId] ||= {items: {}};
    combined.stores[value.storeId].items ||= {};
    if (combined.stores[value.storeId].items[value.itemId]) continue;
    combined.stores[value.storeId].items[value.itemId] = {
      nameHash: menuNameHash(value.itemName),
      descriptionHash: menuNameHash(value.description),
      image: value.image
    };
    touchedBuckets.add(value.storeId[0]);
    added++;
  }
  await fs.writeFile(combinedPath, `${JSON.stringify(combined, null, 2)}\n`);
  for (const bucket of touchedBuckets) {
    const stores = Object.fromEntries(Object.entries(combined.stores).filter(([storeId]) => storeId[0] === bucket));
    const usedImages = new Set(Object.values(stores).flatMap(store => Object.values(store.items || {}).map(photo => photo.image)));
    const sharedAssets = Object.fromEntries(Object.entries(combined.sharedAssets || {}).filter(([image]) => usedImages.has(image)));
    const shard = {version: combined.version, ...(Object.keys(sharedAssets).length ? {sharedAssets} : {}), stores};
    await fs.writeFile(path.join(REPO, 'data', 'reviewed-menu-photo-links', `${bucket}.json`), `${JSON.stringify(shard)}\n`);
  }
  return {added, touchedBuckets: [...touchedBuckets].sort()};
}

async function main() {
  const options = parseOptions(process.argv);
  if (!options['--audit'] || !options['--output']) {
    throw new Error('Usage: node scripts/fill-coupang-menu-photos.mjs --audit <private-audit.json> --output <private-report.json> [--limit 0] [--concurrency 4] [--apply yes]');
  }
  const auditPath = path.resolve(options['--audit']);
  const outputPath = path.resolve(options['--output']);
  if (!outsideRepo(auditPath) || !outsideRepo(outputPath)) throw new Error('Audit and raw source report must stay outside the public repository');
  const audit = JSON.parse(await fs.readFile(auditPath, 'utf8'));
  if (!Array.isArray(audit.stores) || audit.failures?.length) throw new Error('A complete menu photo audit is required');
  const apiBase = text(options['--api-base'] || DEFAULT_API_BASE).replace(/\/$/, '');
  const origin = text(options['--origin'] || DEFAULT_ORIGIN);
  const concurrency = Math.max(1, Math.min(6, Number(options['--concurrency'] || 4)));
  const limit = Math.max(0, Number(options['--limit'] || 0));
  const headers = {Accept: 'application/json', Origin: origin, 'X-Daedong-Client': CLIENT_HEADER};
  const inventory = JSON.parse(await fs.readFile(path.join(REPO, 'data', 'reviewed-menu-photo-links.json'), 'utf8'));
  let targets = audit.stores.filter(store => store.missingPhotos > 0 && store.channelKeys?.includes('coupang'));
  if (limit) targets = targets.slice(0, limit);
  const failures = [];
  let completed = 0;
  const results = await mapConcurrent(targets, concurrency, async store => {
    try {
      const [detail, menu] = await Promise.all([
        requestJson(`${apiBase}/api/store/${store.storeId}`, headers),
        requestJson(`${apiBase}/api/store/${store.storeId}/menu`, headers)
      ]);
      const sourceStoreId = coupangStoreId(detail?.routes);
      if (!sourceStoreId || !Array.isArray(menu?.items)) return {store, status: 'no-usable-route'};
      const latitude = Number(detail.latitude) || 34.7604;
      const longitude = Number(detail.longitude) || 127.6622;
      const url = new URL(COUPANG_ENDPOINT);
      url.searchParams.set('storeId', sourceStoreId);
      url.searchParams.set('latitude', String(latitude));
      url.searchParams.set('longitude', String(longitude));
      const raw = await requestJson(url, buildCoupangHeaders(latitude, longitude));
      if (!raw?.data) return {store, status: 'source-unavailable', sourceStoreId};
      if (String(raw.data.id || '') !== sourceStoreId) throw new Error('coupang-store-id-mismatch');
      const sources = coupangItems(raw.data);
      const existing = inventory.stores?.[store.storeId]?.items || {};
      const eligibleItems = menu.items.map(item => existing[item.id] ? {...item, image: existing[item.id].image} : item);
      const matches = exactUniquePhotoMatches(eligibleItems, sources).map(({target, source}) => ({
        storeId: store.storeId,
        storeName: store.storeName,
        sourceStoreId,
        sourceStoreName: text(raw.data.name),
        itemId: text(target.id),
        itemName: text(target.name),
        description: text(target.description),
        sourceItemId: source.id,
        sourceItemName: source.name,
        sourceImage: source.image,
        matchMethod: 'same-store-exact-unique-menu-name'
      }));
      return {store, status: 'matched', sourceStoreId, sourceStoreName: text(raw.data.name), sourceItems: sources.length, matches};
    } catch (error) {
      failures.push({storeId: store.storeId, storeName: store.storeName, reason: text(error.message)});
      return {store, status: 'failed'};
    } finally {
      completed++;
      if (completed % 50 === 0 || completed === targets.length) console.log(JSON.stringify({event: 'coupang-photo-scan-progress', completed, total: targets.length, failures: failures.length}));
    }
  });
  const candidates = results.flatMap(result => result.matches || []);
  const report = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    source: {apiBase, origin, coupangEndpoint: COUPANG_ENDPOINT},
    summary: {
      targetStores: targets.length,
      storesWithMatches: results.filter(result => result.matches?.length).length,
      noUsableRoute: results.filter(result => result.status === 'no-usable-route').length,
      sourceUnavailable: results.filter(result => result.status === 'source-unavailable').length,
      failedStores: failures.length,
      candidates: candidates.length
    },
    candidates,
    failures
  };
  await fs.mkdir(path.dirname(outputPath), {recursive: true});
  await fs.writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  if (failures.length) {
    console.log(JSON.stringify({event: 'coupang-photo-scan-incomplete', ...report.summary, output: outputPath}));
    process.exitCode = 2;
    return;
  }
  if (options['--apply'] !== 'yes') {
    console.log(JSON.stringify({event: 'coupang-photo-scan-complete', ...report.summary, output: outputPath}));
    return;
  }
  let downloaded = 0;
  const downloadFailures = [];
  const additions = (await mapConcurrent(candidates, Math.min(8, concurrency * 2), async candidate => {
    try {
      const value = await downloadPhoto(candidate);
      downloaded++;
      if (downloaded % 100 === 0 || downloaded === candidates.length) console.log(JSON.stringify({event: 'coupang-photo-download-progress', downloaded, total: candidates.length, failures: downloadFailures.length}));
      return value;
    } catch (error) {
      downloadFailures.push({storeId: candidate.storeId, itemId: candidate.itemId, reason: text(error.message)});
      return null;
    }
  })).filter(Boolean);
  if (downloadFailures.length) {
    await fs.writeFile(outputPath, `${JSON.stringify({...report, downloadFailures}, null, 2)}\n`);
    throw new Error(`Photo download failures: ${downloadFailures.length}; inventory was not changed`);
  }
  const applied = await writeInventory(additions);
  await fs.writeFile(outputPath, `${JSON.stringify({...report, applied: {...applied, totalBytes: additions.reduce((sum, item) => sum + item.bytes, 0)}}, null, 2)}\n`);
  console.log(JSON.stringify({event: 'coupang-photo-fill-applied', candidates: candidates.length, ...applied, output: outputPath}));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
