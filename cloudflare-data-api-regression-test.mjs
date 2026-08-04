import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const calls = [];
const responses = new Map([
  ['/api/catalog', [{id: 'a'.repeat(16), name: '검증가게'}]],
  [`/api/store/${'a'.repeat(16)}`, {id: 'a'.repeat(16), routes: []}],
  [`/api/store/${'a'.repeat(16)}/menu`, {storeId: 'a'.repeat(16), items: []}],
  ['/api/services', {programs: [], stores: {}}],
  ['/api/menu-search?q=%EC%A1%B1%EB%B0%9C', {stores: {}}]
]);
const context = {
  window: {},
  fetch: async (url, init) => {
    const parsed = new URL(url);
    calls.push({url, path: `${parsed.pathname}${parsed.search}`, init});
    const body = responses.get(`${parsed.pathname}${parsed.search}`);
    return {ok: body !== undefined, status: body === undefined ? 404 : 200, json: async () => body};
  },
  URL,
  console,
  Promise,
  Object,
  Map,
  Set,
  String,
  Error
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('data-api.js', 'utf8'), context);

const api = context.window.daedongDataApi;
const plain = value => JSON.parse(JSON.stringify(value));
assert.equal(api.baseUrl, 'https://daedong-yeosu-data-api-preview.sisakim.workers.dev');
assert.deepEqual(plain(await api.catalog()), [{id: 'a'.repeat(16), name: '검증가게'}]);
await api.catalog();
assert.equal(calls.filter(call => call.path === '/api/catalog').length, 1, 'catalog request must be cached in memory');
assert.equal(calls[0].init.headers['X-Daedong-Client'], 'daedong-preview-web-v1-20260804');
assert.equal(calls[0].init.credentials, 'omit');
assert.equal(calls[0].init.cache, 'no-store');
assert.deepEqual(plain(await api.detail('A'.repeat(16))), {id: 'a'.repeat(16), routes: []});
assert.deepEqual(plain(await api.menu('a'.repeat(16))), {storeId: 'a'.repeat(16), items: []});
assert.deepEqual(plain(await api.services()), {programs: [], stores: {}});
assert.deepEqual(plain(await api.menuSearch('족발')), {stores: {}});
const beforeInvalid = calls.length;
assert.deepEqual(plain(await api.menuSearch('%')), {stores: {}});
assert.equal(calls.length, beforeInvalid, 'wildcard search must not leave the browser');
assert.throws(() => api.detail('../private'), /식별자/);

const index = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const services = fs.readFileSync('store-service-info.js', 'utf8');
const menus = fs.readFileSync('store-menu-preview.js', 'utf8');
assert(index.indexOf('data-api.js') < index.indexOf('app.js'), 'API client must load before the application');
assert(index.indexOf('data-api-runtime.js') > index.indexOf('store-menu-preview.js'), 'detail wrapper must load after experience layers');
assert(!index.includes('ddangyo-menu-map.js'));
assert(!index.includes('ddangyo-preview-runtime.js'));
assert(!app.includes('data/stores.json'));
assert(!services.includes('store-service-info.json'));
assert(!services.includes('store-menu-search-index'));
assert(!menus.includes('store-menu-content/'));
assert(menus.includes('window.daedongDataApi.menu(storeId)'));
assert(app.includes('window.daedongDataApi?.catalog?.()'));
assert(services.includes('window.daedongDataApi.services()'));

const openedStores = [];
const runtimeContext = {
  window: {
    daedongDataApi: {
      detail: async storeId => ({
        id: storeId,
        address: '여수시 검증로 1',
        routes: [{key: 'direct', name: '전화주문', url: 'tel:0610000000'}]
      })
    }
  },
  openStore: store => openedStores.push(store),
  normalizedStore: raw => ({...raw, detailNormalized: true}),
  console,
  Map,
  Object,
  String,
  Boolean,
  Number,
  Promise,
  Error
};
vm.createContext(runtimeContext);
vm.runInContext(fs.readFileSync('data-api-runtime.js', 'utf8'), runtimeContext);
const lazyStore = {id: 'a'.repeat(16), name: '검증가게', hasMenu: true, channelKeys: ['direct']};
await runtimeContext.openStore(lazyStore);
assert.equal(openedStores.length, 1, 'detail view must open after lazy API enrichment');
assert.equal(openedStores[0].address, '여수시 검증로 1');
assert.equal(openedStores[0].detailNormalized, true);
assert.equal(openedStores[0].hasMenu, true, 'catalog menu availability must survive detail normalization');
assert.equal(openedStores[0].__secureDetailReady, true);

console.log('PASS Cloudflare preview API client contract');
