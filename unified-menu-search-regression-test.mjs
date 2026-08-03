import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const json = file => JSON.parse(read(file));
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

const stores = json('data/stores.json');
const manifest = json('data/store-menu-search-index.json');
const index = {
  ...manifest,
  stores: Object.assign({}, ...manifest.chunks.map(file => json(file).stores))
};
const serviceScript = read('store-service-info.js');
const serviceStyle = read('store-service-info.css');
const menuScript = read('store-menu-preview.js');
const finalScript = read('final-experience.js');
const html = read('index.html');

assert.equal(stores.length, 710, '기존 710개 가게를 변경하면 안 됩니다.');
assert.equal(stores.flatMap(store => store.routes || []).length, 4981, '기존 주문경로를 변경하면 안 됩니다.');
assert.equal(sha256('data/stores.json'), '2b976a0e05ad494e6723bc191962e1d8c66e8e1d93f98e6f0750baf25bdc6630');

assert.equal(index.version, 2);
assert.equal(index.chunks.length, 40, '웹 업로드와 병렬 로딩을 위해 검색색인을 40개로 나눕니다.');
assert.equal(index.storeCount, 715, '음식보기 가능한 가게가 모두 검색색인에 있어야 합니다.');
assert.equal(Object.keys(index.stores).length, 715);
assert.equal(index.itemCount, 47056, '현재 노출 메뉴가 모두 검색색인에 있어야 합니다.');
assert.equal(
  Object.values(index.stores).reduce((sum, store) => sum + store.i.length, 0),
  index.itemCount
);
assert.ok(Object.values(index.stores).every(store => fs.existsSync(store.p)), '검색 메뉴의 원본 메뉴판이 모두 존재해야 합니다.');

const matching = query => Object.entries(index.stores).map(([storeId, store]) => ({
  storeId,
  menus: store.i.filter(item => `${item[1]} ${item[2]}`.replace(/\s/g, '').includes(query))
})).filter(result => result.menus.length);
const bingsu = matching('빙수');
const redBeanBingsu = matching('팥빙수');
assert.ok(bingsu.length >= 30, '빙수 검색 가게 범위가 지나치게 좁습니다.');
assert.ok(bingsu.flatMap(result => result.menus).length >= 300, '빙수 메뉴가 충분히 검색되지 않습니다.');
assert.ok(redBeanBingsu.length < bingsu.length, '팥빙수를 빙수 가족검색으로 넓힐 근거가 없습니다.');

assert.match(serviceScript, /MENU_SEARCH_URL/);
assert.match(serviceScript, /MENU_FAMILIES/);
assert.match(serviceScript, /value\.includes\('빙수'\)/);
assert.match(serviceScript, /menuMatchesForStore/);
assert.match(serviceScript, /data-store-service-menu-open/);
assert.match(serviceScript, /가게의 \$\{escapeHtml\(menuSpec\?\.label/);
assert.match(serviceScript, /data-store-service-quick-status="open"/);
assert.match(serviceScript, /data-store-service-quick-benefit/);
assert.match(serviceScript, /data-store-service-quick-location="all"/);
assert.match(serviceScript, /label && label\.textContent !== nextLabel/);
assert.match(serviceScript, /countNode && countNode\.textContent !== nextCount/);
assert.match(serviceScript, /메뉴·가게·혜택 한 번에 찾기/);
assert.match(serviceScript, /지금 영업 중 \$\{entries\.length\}곳/);
assert.doesNotMatch(serviceScript, /\$\{entries\.length\}개 가게/);

assert.match(finalScript, /daedongStoreServiceInfo\?\.showOverview/);
assert.match(menuScript, /window\.daedongMenuPreview = Object\.freeze/);
assert.match(menuScript, /open: \(storeId, options = \{\}\) => openMenuPreview/);
assert.match(serviceStyle, /\.store-finder-quick/);
assert.match(serviceStyle, /\.store-service-menu-matches/);
assert.match(html, /store-service-16-yeseo-complete/);
assert.match(html, /store-menu-17-direct-coming-soon-1-unified-menu-search-1/);
assert.match(html, /unified-menu-search-1/);

console.log(JSON.stringify({
  stores: index.storeCount,
  menus: index.itemCount,
  bingsuStores: bingsu.length,
  bingsuMenus: bingsu.flatMap(result => result.menus).length,
  redBeanBingsuStores: redBeanBingsu.length,
  status: 'PASS'
}, null, 2));
