import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const menuRoot = path.join(root, 'store-menu-content');
const outputPath = path.join(root, 'data', 'store-menu-search-index.json');
const outputDir = path.join(root, 'data', 'store-menu-search-index');
const chunkCount = 40;

const stores = {};
const mapContext = {window: {}};
vm.runInNewContext(
  fs.readFileSync(path.join(menuRoot, 'ddangyo-menu-map.js'), 'utf8'),
  mapContext
);
const menuSources = {
  ...(mapContext.window.DAEDONG_DDANGYO_MENU_STORES || {}),
  a089d1d54720b48e: {path: 'store-menu-content/a089d1d54720b48e/menu.json'},
  '2f4c3cfb0866c4a4': {path: 'store-menu-content/domino/menu.json'},
  dc638b23f8cf3c5b: {path: 'store-menu-content/domino/menu.json'},
  '7bc7239e6b509c44': {path: 'store-menu-content/surasanggung/menu.json'}
};

for (const [storeId, source] of Object.entries(menuSources)) {
  const relativePath = source.path;
  const sourcePath = path.join(root, relativePath);
  if (!fs.existsSync(sourcePath)) throw new Error(`menu source missing: ${relativePath}`);
  const menu = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
  if (!Array.isArray(menu.items)) throw new Error(`menu items missing: ${relativePath}`);
  stores[String(storeId)] = {
    n: String(menu.storeName || menu.displayName || ''),
    p: relativePath,
    i: menu.items.map(item => [
      String(item.id || ''),
      String(item.name || ''),
      String(item.category || ''),
      String(item.image || '')
    ])
  };
}

const itemCount = Object.values(stores).reduce((sum, store) => sum + store.i.length, 0);

const bins = Array.from({length: chunkCount}, () => ({bytes: 0, stores: {}}));
Object.entries(stores)
  .map(([storeId, store]) => ({storeId, store, bytes: Buffer.byteLength(JSON.stringify(store))}))
  .sort((a, b) => b.bytes - a.bytes || a.storeId.localeCompare(b.storeId))
  .forEach(entry => {
    const bin = bins.reduce((smallest, candidate) => candidate.bytes < smallest.bytes ? candidate : smallest);
    bin.stores[entry.storeId] = entry.store;
    bin.bytes += entry.bytes;
  });

fs.mkdirSync(outputDir, {recursive: true});
const chunks = bins.map((bin, index) => {
  const fileName = `part-${String(index + 1).padStart(2, '0')}.json`;
  fs.writeFileSync(path.join(outputDir, fileName), `${JSON.stringify({stores: bin.stores})}\n`);
  return `data/store-menu-search-index/${fileName}`;
});

const payload = {
  version: 2,
  generatedAt: '2026-08-02',
  storeCount: Object.keys(stores).length,
  itemCount,
  chunks
};

fs.writeFileSync(outputPath, `${JSON.stringify(payload)}\n`);
console.log(JSON.stringify({
  outputPath,
  storeCount: payload.storeCount,
  itemCount,
  chunks: chunks.length,
  maxChunkBytes: Math.max(...chunks.map(file => fs.statSync(path.join(root, file)).size))
}));
