import fs from 'node:fs/promises';
import path from 'node:path';
import {clean, unique, normalizeName, readJsonIfExists} from './ddangyo-package-utils.mjs';

const inputPath = process.argv[2] || 'ddangyo-final-ready-output/final-stores.json';
const outputDir = path.resolve('ddangyo-package-output');
await fs.mkdir(path.join(outputDir, 'store-menu-content'), {recursive: true});
const rows = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const unresolved = rows.filter(row => row?.error || !['existing', 'new'].includes(row?.match?.status) || !row?.match?.storeId);
if (unresolved.length) throw new Error(`unresolved stores: ${unresolved.length}`);

function sourceMenuId(item) {
  if (item?.sourceMenuId) return String(item.sourceMenuId);
  return String(item?.id || '').match(/^ddangyo-[^-]+-(.+)$/)?.[1] || '';
}
function parseMenuMap(raw) {
  const marker = raw.indexOf('Object.freeze(');
  if (marker < 0) return {};
  const start = raw.indexOf('{', marker);
  const end = raw.lastIndexOf(');');
  if (start < 0 || end < start) return {};
  try { return JSON.parse(raw.slice(start, end)); } catch { return {}; }
}
async function existingMenu(storeId) {
  return readJsonIfExists(path.join('store-menu-content', storeId, 'menu.json'), null);
}
function mergeMenu(menu, row) {
  const result = menu || {
    storeId: String(row.match.storeId),
    storeName: row.name,
    displayName: row.name,
    mainImage: row.mainImage || '',
    categories: ['전체'],
    items: []
  };
  result.storeId ||= String(row.match.storeId);
  result.storeName ||= row.name;
  result.displayName ||= result.storeName;
  if (!result.mainImage && row.mainImage) result.mainImage = row.mainImage;
  result.items = Array.isArray(result.items) ? result.items : [];

  const bySource = new Map();
  const byName = new Map();
  for (const item of result.items) {
    const sourceId = sourceMenuId(item);
    if (sourceId) bySource.set(sourceId, item);
    const key = normalizeName(item?.name);
    if (key) {
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(item);
    }
  }

  let added = 0;
  let descriptions = 0;
  let images = 0;
  for (const source of row.items || []) {
    const sourceId = String(source?.sourceMenuId || '');
    let target = sourceId ? bySource.get(sourceId) : null;
    if (!target) {
      const candidates = byName.get(normalizeName(source?.name)) || [];
      if (candidates.length === 1) target = candidates[0];
    }
    if (target) {
      if (!clean(target.description) && clean(source.description)) {
        target.description = clean(source.description);
        descriptions += 1;
      }
      if (!clean(target.image) && clean(source.image)) {
        target.image = clean(source.image);
        images += 1;
      }
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
    result.items.push(next);
    if (sourceId) bySource.set(sourceId, next);
    const key = normalizeName(next.name);
    if (key) {
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(next);
    }
    added += 1;
  }
  result.categories = unique(['전체', ...(result.categories || []), ...result.items.map(item => item.category)]);
  result.sources = unique([...(result.sources || []), 'ddangyo']);
  return {menu: result, added, descriptions, images};
}

let currentMap = {};
try { currentMap = parseMenuMap(await fs.readFile('store-menu-content/ddangyo-menu-map.js', 'utf8')); } catch {}
const menuMap = {...currentMap};
const stats = {
  stores: rows.length,
  existingStores: rows.filter(row => row.match.status === 'existing').length,
  newStores: rows.filter(row => row.match.status === 'new').length,
  menuFiles: 0,
  sourceMenuItems: 0,
  itemsAdded: 0,
  descriptionsFilled: 0,
  imagesFilled: 0,
  finalMenuItems: 0,
  finalMenuImages: 0
};

for (const row of rows) {
  const storeId = String(row.match.storeId);
  const merged = mergeMenu(await existingMenu(storeId), row);
  const destination = path.join(outputDir, 'store-menu-content', storeId);
  await fs.mkdir(destination, {recursive: true});
  await fs.writeFile(path.join(destination, 'menu.json'), JSON.stringify(merged.menu, null, 2));
  menuMap[storeId] = {
    path: `store-menu-content/${storeId}/menu.json`,
    entryImage: merged.menu.mainImage || row.mainImage || '',
    itemCount: merged.menu.items.length
  };
  stats.menuFiles += 1;
  stats.sourceMenuItems += (row.items || []).length;
  stats.itemsAdded += merged.added;
  stats.descriptionsFilled += merged.descriptions;
  stats.imagesFilled += merged.images;
  stats.finalMenuItems += merged.menu.items.length;
  stats.finalMenuImages += merged.menu.items.filter(item => clean(item.image)).length;
}

await fs.writeFile(path.join(outputDir, 'store-menu-content', 'ddangyo-menu-map.js'), `'use strict';\nwindow.DAEDONG_DDANGYO_MENU_STORES = Object.freeze(${JSON.stringify(menuMap, null, 2)});\n`);
await fs.writeFile(path.join(outputDir, 'menu-summary.json'), JSON.stringify({...stats, menuMapRecords: Object.keys(menuMap).length}, null, 2));
console.log(JSON.stringify({...stats, menuMapRecords: Object.keys(menuMap).length}, null, 2));
