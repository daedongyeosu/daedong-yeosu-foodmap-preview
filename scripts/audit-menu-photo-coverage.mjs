import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DEFAULT_API_BASE = 'https://daedong-yeosu-data-api-preview.sisakim.workers.dev';
const DEFAULT_ORIGIN = 'https://preview.daedongmap.com';
const CLIENT_HEADER = 'daedong-preview-web-v1-20260804';
const STORE_ID = /^[a-f0-9]{16}$/;

const text = value => String(value ?? '').normalize('NFKC').trim();
const unique = values => [...new Set(values.filter(Boolean))];
const sleep = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

export function menuNameHash(value) {
  let hash = 2166136261;
  for (const char of text(value)) hash = Math.imul(hash ^ char.codePointAt(0), 16777619);
  return (hash >>> 0).toString(16);
}

export function exactMenuKey(value) {
  return text(value).toLowerCase().replace(/[^0-9a-z가-힣]/gu, '');
}

export function comparableMenuKey(value) {
  const withoutMarketingTags = text(value)
    .replace(/^(?:\s*[\[【][^\]】]{1,40}[\]】]\s*)+/u, '')
    .replace(/^(?:베스트|인기|추천|신메뉴|시즌)\s*[:：·-]?\s*/u, '');
  return exactMenuKey(withoutMarketingTags);
}

export function menuImage(item) {
  return text(item?.image || item?.photo || item?.img || item?.menuImage || item?.imageUrl);
}

function storeKey(value) {
  return text(value).toLowerCase().replace(/[^0-9a-z가-힣]/gu, '');
}

function plausibleBrand(value) {
  const key = storeKey(value);
  return key.length >= 3 && !/^(여수|여천|본점|직영점|배달|포장)$/u.test(key) ? key : '';
}

function inferredStoreBrand(store) {
  let name = text(store?.name || store?.displayName || store?.storeName);
  const branchName = text(store?.branchName);
  if (branchName && name.endsWith(branchName)) name = name.slice(0, -branchName.length);
  name = name
    .replace(/\s*[\[(【][^\])】]{1,30}[\])】]\s*$/u, '')
    .replace(/\s+(?:여수|여천)?[0-9a-z가-힣]{1,10}(?:점|지점|직영점)$/iu, '')
    .replace(/(?:여수|여천)?[0-9a-z가-힣]{1,8}(?:점|지점|직영점)$/iu, '');
  return plausibleBrand(name);
}

export function storeBrandKeys(store) {
  const result = [];
  const add = (value, evidence) => {
    const key = plausibleBrand(value);
    if (key && !result.some(item => item.key === key)) result.push({key, evidence});
  };
  const inferred = inferredStoreBrand(store);
  add(store?.brandName, 'brandName');
  // Search aliases can also describe a shop-in-shop sharing the same kitchen.
  // Only accept aliases that still identify the store's own inferred brand.
  for (const alias of Array.isArray(store?.searchAliases) ? store.searchAliases : []) {
    const aliasBrand = inferredStoreBrand({name: alias, branchName: store?.branchName});
    if (inferred && aliasBrand && (aliasBrand.startsWith(inferred) || inferred.startsWith(aliasBrand))) {
      add(aliasBrand, 'searchAlias');
    }
  }
  if (inferred) add(inferred, 'storeName');
  return result;
}

export function applyReviewedPhotos(storeId, menu, inventory) {
  const reviewed = inventory?.stores?.[storeId]?.items || {};
  if (!menu || !Array.isArray(menu.items) || !Object.keys(reviewed).length) return menu;
  return {
    ...menu,
    items: menu.items.map(item => {
      if (menuImage(item)) return item;
      const patch = reviewed[item.id];
      if (!patch || patch.nameHash !== menuNameHash(item.name)) return item;
      if (patch.descriptionHash && patch.descriptionHash !== menuNameHash(item.description)) return item;
      return {...item, image: patch.image, __reviewedPhoto: true};
    })
  };
}

export function duplicateMenuGroups(items) {
  const groups = new Map();
  for (const item of Array.isArray(items) ? items : []) {
    const key = exactMenuKey(item?.name);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(item);
  }
  return [...groups.entries()].filter(([, values]) => values.length > 1).map(([key, values]) => ({
    key,
    names: unique(values.map(item => text(item.name))),
    itemIds: values.map(item => text(item.id)).filter(Boolean),
    count: values.length
  }));
}

export function buildPhotoCoverageAudit(stores, menusByStore) {
  const storeRows = [];
  const sourcePools = new Map();
  const brandsByStore = new Map();
  for (const store of stores) {
    const storeId = text(store?.id || store?.store_id).toLowerCase();
    const menu = menusByStore.get(storeId);
    if (!menu || !Array.isArray(menu.items)) continue;
    const brands = storeBrandKeys(store);
    brandsByStore.set(storeId, brands);
    for (const item of menu.items) {
      const image = menuImage(item);
      const exactKey = exactMenuKey(item?.name);
      const comparableKey = comparableMenuKey(item?.name);
      if (!image || !comparableKey) continue;
      for (const brand of brands) {
        const poolKey = `${brand.key}\u0000${comparableKey}`;
        if (!sourcePools.has(poolKey)) sourcePools.set(poolKey, []);
        sourcePools.get(poolKey).push({
          storeId,
          storeName: text(store.name),
          itemId: text(item.id),
          itemName: text(item.name),
          image,
          exactKey,
          brandEvidence: brand.evidence,
          reviewed: Boolean(item.__reviewedPhoto || image.startsWith('assets/'))
        });
      }
    }
  }

  const candidates = [];
  for (const store of stores) {
    const storeId = text(store?.id || store?.store_id).toLowerCase();
    const menu = menusByStore.get(storeId);
    if (!menu || !Array.isArray(menu.items)) continue;
    const brands = brandsByStore.get(storeId) || [];
    const missing = menu.items.filter(item => !menuImage(item));
    const duplicates = duplicateMenuGroups(menu.items);
    const storeCandidates = [];
    for (const item of missing) {
      const comparableKey = comparableMenuKey(item?.name);
      const exactKey = exactMenuKey(item?.name);
      if (!comparableKey) continue;
      const matches = [];
      for (const brand of brands) {
        for (const source of sourcePools.get(`${brand.key}\u0000${comparableKey}`) || []) {
          if (source.storeId === storeId) continue;
          matches.push({...source, targetBrandEvidence: brand.evidence, brandKey: brand.key});
        }
      }
      const deduped = [...new Map(matches.map(match => [`${match.storeId}\u0000${match.image}`, match])).values()];
      if (!deduped.length) continue;
      const images = unique(deduped.map(match => match.image));
      const exactMatches = deduped.filter(match => match.exactKey === exactKey);
      const trustedBrand = deduped.some(match => match.brandEvidence !== 'storeName' && match.targetBrandEvidence !== 'storeName');
      const localReviewed = images.length === 1 && deduped.every(match => match.reviewed && match.image.startsWith('assets/'));
      const confidence = exactMatches.length && images.length === 1 && trustedBrand ? 'high'
        : exactMatches.length && images.length === 1 ? 'medium' : 'review';
      const candidate = {
        storeId,
        storeName: text(store.name),
        itemId: text(item.id),
        itemName: text(item.name),
        description: text(item.description),
        descriptionHash: menuNameHash(item.description),
        category: text(item.category),
        confidence,
        safeToAutoFill: confidence === 'high' && localReviewed,
        candidateImages: images,
        sources: deduped.slice(0, 12)
      };
      candidates.push(candidate);
      storeCandidates.push(candidate);
    }
    const total = menu.items.length;
    const withPhotos = total - missing.length;
    const channels = new Set(Array.isArray(store.channelKeys) ? store.channelKeys : []);
    const managedPriority = Number(channels.has('mukkebi')) + Number(channels.has('ddangyo')) + Number(channels.has('direct'));
    storeRows.push({
      storeId,
      storeName: text(store.name),
      district: text(store.district),
      totalMenus: total,
      withPhotos,
      missingPhotos: missing.length,
      coveragePercent: total ? Number((withPhotos * 100 / total).toFixed(1)) : 0,
      duplicateGroups: duplicates,
      candidateCount: storeCandidates.length,
      highConfidenceCandidates: storeCandidates.filter(item => item.confidence === 'high').length,
      safeAutoFillCandidates: storeCandidates.filter(item => item.safeToAutoFill).length,
      managedPriority,
      channelKeys: [...channels]
    });
  }

  storeRows.sort((a, b) => (b.managedPriority - a.managedPriority)
    || (b.missingPhotos - a.missingPhotos)
    || (a.coveragePercent - b.coveragePercent)
    || a.storeName.localeCompare(b.storeName, 'ko'));
  const totalMenus = storeRows.reduce((sum, row) => sum + row.totalMenus, 0);
  const withPhotos = storeRows.reduce((sum, row) => sum + row.withPhotos, 0);
  const duplicateGroups = storeRows.reduce((sum, row) => sum + row.duplicateGroups.length, 0);
  return {
    summary: {
      auditedStores: storeRows.length,
      totalMenus,
      withPhotos,
      missingPhotos: totalMenus - withPhotos,
      coveragePercent: totalMenus ? Number((withPhotos * 100 / totalMenus).toFixed(1)) : 0,
      storesWithoutAnyPhoto: storeRows.filter(row => row.totalMenus && row.withPhotos === 0).length,
      storesBelowHalfCoverage: storeRows.filter(row => row.totalMenus && row.coveragePercent < 50).length,
      duplicateGroups,
      photoCandidates: candidates.length,
      highConfidenceCandidates: candidates.filter(item => item.confidence === 'high').length,
      safeAutoFillCandidates: candidates.filter(item => item.safeToAutoFill).length
    },
    stores: storeRows,
    candidates
  };
}

function parseOptions(argv) {
  const options = {};
  for (let index = 2; index < argv.length; index += 2) options[argv[index]] = argv[index + 1];
  return options;
}

async function ensurePrivateOutput(target) {
  const resolved = path.resolve(target);
  const relative = path.relative(REPO, resolved);
  if (!relative || (!relative.startsWith(`..${path.sep}`) && relative !== '..' && !path.isAbsolute(relative))) {
    throw new Error('Menu photo audit output must stay outside the public repository');
  }
  await fs.mkdir(resolved, {recursive: true});
  return resolved;
}

async function requestJson(url, {origin, attempts = 5} = {}) {
  let lastError;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {Accept: 'application/json', Origin: origin, 'X-Daedong-Client': CLIENT_HEADER},
        signal: AbortSignal.timeout(25000)
      });
      if (response.status === 404) return {status: 404, data: null};
      if (response.status === 429 || response.status >= 500) {
        const retryAfter = Math.max(1, Number(response.headers.get('retry-after') || 0));
        await sleep(Math.max(retryAfter * 1000, 500 * 2 ** attempt));
        continue;
      }
      if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
      return {status: response.status, data: await response.json()};
    } catch (error) {
      lastError = error;
      if (attempt + 1 < attempts) await sleep(500 * 2 ** attempt);
    }
  }
  throw lastError || new Error(`Failed to load ${url}`);
}

async function loadReviewedInventory() {
  const inventory = {stores: {}};
  for (const bucket of '0123456789abcdef') {
    const filename = path.join(REPO, 'data', 'reviewed-menu-photo-links', `${bucket}.json`);
    try {
      const value = JSON.parse(await fs.readFile(filename, 'utf8'));
      Object.assign(inventory.stores, value.stores || {});
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return inventory;
}

async function loadStaticMenus() {
  const result = new Map();
  const files = (await fs.readdir(path.join(REPO, 'data'))).filter(name => name.endsWith('-menu.json'));
  for (const name of files) {
    const value = JSON.parse(await fs.readFile(path.join(REPO, 'data', name), 'utf8'));
    const storeId = text(value.storeId || value.store_id).toLowerCase();
    if (STORE_ID.test(storeId) && Array.isArray(value.items)) result.set(storeId, value);
  }
  return result;
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

function markdownReport(report) {
  const s = report.summary;
  const lines = [
    '# 전체 메뉴사진 누락 자동점검', '',
    `- 점검 시각: ${report.createdAt}`,
    `- 메뉴가 있는 가게: ${s.auditedStores}곳`,
    `- 전체 메뉴: ${s.totalMenus}개`,
    `- 사진 있음: ${s.withPhotos}개`,
    `- 사진 누락: ${s.missingPhotos}개 (사진 보유율 ${s.coveragePercent}%)`,
    `- 사진이 한 장도 없는 가게: ${s.storesWithoutAnyPhoto}곳`,
    `- 사진 보유율 50% 미만 가게: ${s.storesBelowHalfCoverage}곳`,
    `- 중복 메뉴 묶음: ${s.duplicateGroups}개`,
    `- 동일 브랜드·메뉴 사진 후보: ${s.photoCandidates}개`,
    `- 높은 신뢰도 후보: ${s.highConfidenceCandidates}개`,
    `- 검수된 로컬사진으로 안전한 자동보완 후보: ${s.safeAutoFillCandidates}개`, '',
    '## 우선 확인할 가게', '',
    '|가게|메뉴|사진|누락|보유율|후보|중복|',
    '|---|---:|---:|---:|---:|---:|---:|'
  ];
  for (const row of report.stores.filter(row => row.missingPhotos).slice(0, 100)) {
    lines.push(`|${row.storeName.replaceAll('|', ' ')}|${row.totalMenus}|${row.withPhotos}|${row.missingPhotos}|${row.coveragePercent}%|${row.candidateCount}|${row.duplicateGroups.length}|`);
  }
  lines.push('', '자동점검은 기존 사진을 수정하거나 삭제하지 않습니다. 후보는 검수 전까지 고객 화면에 자동 적용하지 않습니다.', '');
  return lines.join('\n');
}

async function main() {
  const options = parseOptions(process.argv);
  if (!options['--output']) throw new Error('Usage: node scripts/audit-menu-photo-coverage.mjs --output <private-directory> [--concurrency 6] [--limit 0]');
  const output = await ensurePrivateOutput(options['--output']);
  const apiBase = text(options['--api-base'] || DEFAULT_API_BASE).replace(/\/$/, '');
  const origin = text(options['--origin'] || DEFAULT_ORIGIN);
  const concurrency = Math.max(1, Math.min(12, Number(options['--concurrency'] || 6)));
  const limit = Math.max(0, Number(options['--limit'] || 0));
  const catalogResponse = await requestJson(`${apiBase}/api/catalog`, {origin});
  const catalog = Array.isArray(catalogResponse.data) ? catalogResponse.data : [];
  const staticMenus = await loadStaticMenus();
  const inventory = await loadReviewedInventory();
  let targets = catalog.filter(store => store?.hasMenu || staticMenus.has(text(store?.id || store?.store_id).toLowerCase()));
  if (limit) targets = targets.slice(0, limit);
  const menusByStore = new Map();
  const failures = [];
  let completed = 0;
  await mapConcurrent(targets, concurrency, async store => {
    const storeId = text(store.id || store.store_id).toLowerCase();
    try {
      const staticMenu = staticMenus.get(storeId);
      const menu = staticMenu || (await requestJson(`${apiBase}/api/store/${storeId}/menu`, {origin})).data;
      if (menu?.items) menusByStore.set(storeId, applyReviewedPhotos(storeId, menu, inventory));
      else failures.push({storeId, storeName: text(store.name), reason: 'menu-not-found'});
    } catch (error) {
      failures.push({storeId, storeName: text(store.name), reason: text(error.message)});
    } finally {
      completed++;
      if (completed % 100 === 0 || completed === targets.length) console.log(JSON.stringify({event: 'menu-photo-audit-progress', completed, total: targets.length, failures: failures.length}));
    }
  });
  const audit = buildPhotoCoverageAudit(targets, menusByStore);
  const report = {
    schemaVersion: 1,
    createdAt: new Date().toISOString(),
    source: {apiBase, origin, catalogStores: catalog.length, requestedMenuStores: targets.length, failedMenuStores: failures.length},
    ...audit,
    failures,
    sourceModified: false,
    automaticChangesApplied: 0
  };
  await fs.writeFile(path.join(output, 'menu-photo-audit.json'), `${JSON.stringify(report, null, 2)}\n`);
  await fs.writeFile(path.join(output, 'menu-photo-audit.md'), markdownReport(report));
  await fs.writeFile(path.join(output, 'menu-photo-review-queue.json'), `${JSON.stringify(report.candidates, null, 2)}\n`);
  console.log(JSON.stringify({event: 'menu-photo-audit-complete', ...report.summary, failedMenuStores: failures.length, output}));
  if (failures.length) process.exitCode = 2;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.stack || error.message); process.exitCode = 1; });
}
