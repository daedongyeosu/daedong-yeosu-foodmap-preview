import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root = path.dirname(fileURLToPath(import.meta.url));
const source = await fs.readFile(path.join(root, 'data-api.js'), 'utf8');
const exportMarker = '  window.daedongDataApi = Object.freeze({';
assert.equal(source.split(exportMarker).length, 2);
const instrumented = source.replace(exportMarker, '  window.__curatedTest = {roots: CURATED_MENU_IMAGE_ROOTS, ids: CURATED_MENU_IMAGE_IDS, image: curatedMenuImage};\n' + exportMarker);

function harness(menuPayload, searchPayload = {stores: {}}) {
  const requests = [];
  const window = {DAEDONG_REGION: {code: 'yeosu'}, setTimeout, clearTimeout};
  vm.runInNewContext(instrumented, {
    window, AbortController, URL, console,
    fetch: async url => {
      requests.push(String(url));
      const payload = String(url).includes('/api/menu-search?') ? searchPayload : menuPayload;
      return {ok: true, status: 200, json: async () => structuredClone(payload)};
    }
  }, {filename: 'data-api.js'});
  return {window, api: window.daedongDataApi, hooks: window.__curatedTest, requests};
}

const baseline = harness({items: []});
const configuredStores = Object.keys(baseline.hooks.roots).sort();
assert.deepEqual(Object.keys(baseline.hooks.ids).sort(), configuredStores, 'Every curated root must have an explicit inventory');
let assetCount = 0;
for (const storeId of configuredStores) {
  const relativeRoot = baseline.hooks.roots[storeId];
  const filenames = (await fs.readdir(path.join(root, relativeRoot), {withFileTypes: true}))
    .filter(entry => entry.isFile() && /\.jpg$/i.test(entry.name)).map(entry => entry.name).sort();
  const permitted = [...baseline.hooks.ids[storeId]].map(id => `${id}.jpg`).sort();
  assert.deepEqual(permitted, filenames, `Allowlist must exactly match shipped JPG filenames: ${storeId}`);
  assert.ok(filenames.includes('main.jpg'), 'The existing main fallback must exist');
  assert.equal(baseline.hooks.image(storeId), `${relativeRoot}/main.jpg`);
  for (const id of baseline.hooks.ids[storeId]) {
    assert.equal(baseline.hooks.image(storeId, id), `${relativeRoot}/${id}.jpg`);
  }
  for (const id of ['coupang-new-unlisted-999', 'unknown-menu', '../main', 'main.jpg', 'PEPPERONI']) {
    assert.equal(baseline.hooks.image(storeId, id), '', `Unknown/case-mismatched IDs cannot invent images: ${id}`);
  }
  assetCount += filenames.length;
}
assert.equal(baseline.hooks.image('ffffffffffffffff', 'pepperoni'), '', 'Do not borrow another store\'s fallback');

const storeId = configuredStores[0];
const imageRoot = baseline.hooks.roots[storeId];
const knownIds = [...baseline.hooks.ids[storeId]];
const unknownId = 'coupang-new-unlisted-999';
const providedImage = 'https://example.invalid/api-provided.jpg';
const input = {storeId, mainImage: '', items: [
  ...knownIds.map(id => ({id, name: '시험 메뉴', description: '', category: '메뉴', image: ''})),
  {id: unknownId, name: '신규 수집 메뉴', image: ''},
  {id: `${unknownId}-provided`, name: 'API 사진 메뉴', image: providedImage}
]};
const inputBefore = JSON.stringify(input);
const search = {stores: {[storeId]: {i: [
  ...knownIds.map(id => [id, '시험 메뉴', '메뉴', '']),
  [unknownId, '신규 수집 메뉴', '메뉴', ''],
  [knownIds[0], 'API 사진 메뉴', '메뉴', providedImage]
]}}};
const searchBefore = JSON.stringify(search);
const fixture = harness(input, search);
const menu = await fixture.api.menu(storeId);
assert.ok(fixture.requests[0].endsWith(`/api/store/${storeId}/menu`), 'Exercise the actual menu API restoration path');
assert.equal(menu.mainImage, `${imageRoot}/main.jpg`);
for (const id of knownIds) assert.equal(menu.items.find(item => item.id === id).image, `${imageRoot}/${id}.jpg`);
assert.equal(menu.items.find(item => item.id === unknownId).image, '', 'A new collector ID without a file stays empty');
assert.equal(menu.items.find(item => item.id === `${unknownId}-provided`).image, providedImage);
assert.equal(JSON.stringify(input), inputBefore);

const restoredSearch = await fixture.api.menuSearch('시험');
const rows = restoredSearch.stores[storeId].i;
for (let index = 0; index < knownIds.length; index++) assert.equal(rows[index][3], menu.items[index].image, 'Search and detail must use the same inventory rule');
assert.equal(rows[knownIds.length][3], '');
assert.equal(rows[knownIds.length + 1][3], providedImage);
assert.equal(JSON.stringify(search), searchBefore);

const provided = harness({storeId, mainImage: providedImage, items: [{id: knownIds[0], image: providedImage}]});
const providedMenu = await provided.api.menu(storeId);
assert.equal(providedMenu.mainImage, providedImage, 'Do not replace an API main image');
assert.equal(providedMenu.items[0].image, providedImage, 'Do not replace a known item\'s API image');

// Optional private fixture: exercise a saved real API response without committing
// its IDs, menu records, image URLs or local location to the public repository.
const inputFlag = process.argv.indexOf('--menu-input');
if (inputFlag >= 0) {
  assert.ok(process.argv[inputFlag + 1], '--menu-input needs a private JSON file');
  const actual = JSON.parse(await fs.readFile(process.argv[inputFlag + 1], 'utf8'));
  const actualStoreId = String(actual.storeId || actual.store_id || '').toLowerCase();
  assert.ok(baseline.hooks.ids[actualStoreId], 'The supplied API menu must belong to a configured curated root');
  const actualBefore = JSON.stringify(actual);
  const actualSearch = {stores: {[actualStoreId]: {i: actual.items.map(item => [item.id, item.name, item.category, item.image])}}};
  const liveFixture = harness(actual, actualSearch);
  const restored = await liveFixture.api.menu(actualStoreId);
  const restoredRows = (await liveFixture.api.menuSearch('fixture')).stores[actualStoreId].i;
  let unknownCollectorItems = 0;
  actual.items.forEach((item, index) => {
    const supplied = String(item.image || '').trim();
    const fallback = baseline.hooks.image(actualStoreId, item.id);
    const expected = supplied ? item.image : fallback || item.image;
    assert.equal(restored.items[index].image, expected);
    assert.equal(restoredRows[index][3], expected);
    if (/^coupang-/i.test(String(item.id)) && !fallback) {
      unknownCollectorItems++;
      assert.equal(restored.items[index].image, item.image, 'Real unknown collector IDs must not acquire nonexistent local JPGs');
    }
  });
  assert.ok(unknownCollectorItems > 0, 'The private fixture must exercise an unknown collector ID');
  assert.equal(JSON.stringify(actual), actualBefore);
  console.log(`Private API fixture: PASS (${unknownCollectorItems} unknown collector items preserved)`);
}
console.log(`Curated menu photo inventory regression: PASS (${assetCount} existing JPG files)`);
