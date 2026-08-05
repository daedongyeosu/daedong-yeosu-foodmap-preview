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
  window: {setTimeout, clearTimeout},
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
  Error,
  AbortController
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
assert.ok(calls[0].init.signal instanceof AbortSignal, 'API request must carry a bounded abort signal');
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
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const rc3 = fs.readFileSync('rc3-fixes.js', 'utf8');
const services = fs.readFileSync('store-service-info.js', 'utf8');
const menus = fs.readFileSync('store-menu-preview.js', 'utf8');
const phoneRuntime = JSON.parse(fs.readFileSync('data/phone-order-runtime.json', 'utf8'));
assert(index.indexOf('data-api.js') < index.indexOf('app.js'), 'API client must load before the application');
assert(index.indexOf('data-api-runtime.js') < index.indexOf('app.js'), 'secure detail loader must be ready before the application');
assert(!index.includes('ddangyo-menu-map.js'));
assert(!index.includes('ddangyo-preview-runtime.js'));
assert(!app.includes('data/stores.json'));
assert(!services.includes('store-service-info.json'));
assert(!services.includes('store-menu-search-index'));
assert(!menus.includes('store-menu-content/'));
assert(menus.includes('window.daedongDataApi.menu(storeId)'));
assert(app.includes('window.daedongDataApi?.catalog?.({timeoutMs: 20000})'));
assert(app.includes('await secureDetail.enrich(store, normalizedStore)'));
assert(finalExperience.includes('const opened=await fxOriginalOpenStore(store)'));
assert(rc2.includes('const opened = await fxOriginalOpenStore(store)'));
assert(rc3.includes('const opened = await rc3OpenStoreBase(store)'));
assert(services.includes('window.daedongDataApi.services({timeoutMs: 20000})'));

const expectedRoutes = [
  ['direct', '가게바로주문'],
  ['mukkebi', '먹깨비'],
  ['chak', 'CHAK 지역상품권'],
  ['phone', '전화주문'],
  ['yogiyo', '요기요'],
  ['coupang', '쿠팡이츠'],
  ['baemin', '배달의민족']
].map(([key, name]) => ({key, name, url: `https://example.test/${key}`, enabled: true}));
const runtimeContext = {
  window: {
    daedongDataApi: {
      detail: async storeId => storeId === 'b'.repeat(16) ? ({
        id: storeId,
        routes: expectedRoutes.slice(0, 1)
      }) : ({
        id: storeId,
        address: '여수시 검증로 1',
        routes: expectedRoutes
      })
    }
  },
  console,
  Array,
  Map,
  Set,
  Object,
  String,
  Boolean,
  Number,
  Promise,
  Error
};
vm.createContext(runtimeContext);
vm.runInContext(fs.readFileSync('data-api-runtime.js', 'utf8'), runtimeContext);
const normalizeDetail = raw => ({
  ...raw,
  detailNormalized: true,
  routes: raw.routes.map(route => ({...route}))
});
const lazyStore = {
  id: 'a'.repeat(16),
  name: '검증가게',
  hasMenu: true,
  channelKeys: expectedRoutes.map(route => route.key)
};
await runtimeContext.window.daedongSecureStoreDetail.enrich(lazyStore, normalizeDetail);
assert.equal(lazyStore.address, '여수시 검증로 1');
assert.equal(lazyStore.detailNormalized, true);
assert.equal(lazyStore.hasMenu, true, 'catalog menu availability must survive detail normalization');
assert.equal(lazyStore.__secureDetailReady, true);
assert.deepEqual(plain(lazyStore.routes.map(route => route.key)), plain(expectedRoutes.map(route => route.key)));

const incompleteStore = {
  id: 'b'.repeat(16),
  name: '누락검증가게',
  channelKeys: expectedRoutes.map(route => route.key)
};
await assert.rejects(
  runtimeContext.window.daedongSecureStoreDetail.enrich(incompleteStore, normalizeDetail),
  /주문경로가 일부 누락/
);
assert.notEqual(incompleteStore.__secureDetailReady, true, 'incomplete detail must never be marked ready');

const fallbackStart = rc3.indexOf('function rc3CardChannelFallback');
const primaryStart = rc3.indexOf('function rc3PrimaryCardChannels');
const primaryEnd = rc3.indexOf('function rc3PrimaryChannelIcon');
assert(fallbackStart >= 0 && primaryStart > fallbackStart && primaryEnd > primaryStart, 'card channel helpers must remain testable');
const cardContext = {
  RC3_CARD_PRIMARY_CHANNELS: [
    ['direct', 'directOrder'],
    ['brand', 'brandApp'],
    ['mukkebi', 'mukkebi'],
    ['ddangyo', 'ddangyo'],
    ['ondongne', 'ondongne'],
    ['phone', 'phoneOrder']
  ],
  RC3_BLOCKED_PHONE_ROUTE_STORES: new Set(['blocked-phone-store']),
  APP_META: {
    direct: {label: '가게바로주문'},
    mukkebi: {label: '먹깨비'},
    ddangyo: {label: '땡겨요'},
    phone: {label: '전화주문'}
  },
  storeHasChannel: (store, key) => store.channelKeys?.includes(key),
  resolveStoreChannels: () => ({primaryOrder: {}}),
  routeFor: () => null,
  String,
  Boolean,
  Object
};
vm.createContext(cardContext);
vm.runInContext(`${rc3.slice(fallbackStart, primaryStart)}\n${rc3.slice(primaryStart, primaryEnd)}`, cardContext);
const catalogCardKeys = vm.runInContext(
  `rc3PrimaryCardChannels({id: 'catalog-store', channelKeys: ['direct', 'mukkebi', 'ddangyo', 'phone']}).map(item => item.key)`,
  cardContext
);
assert.deepEqual(plain(catalogCardKeys), ['direct', 'mukkebi', 'ddangyo', 'phone'], 'catalog channelKeys must restore card icons without exposing URLs');
const blockedPhoneKeys = vm.runInContext(
  `rc3PrimaryCardChannels({id: 'blocked-phone-store', channelKeys: ['mukkebi', 'phone']}).map(item => item.key)`,
  cardContext
);
assert.deepEqual(plain(blockedPhoneKeys), ['mukkebi'], 'blocked placeholder phones must stay hidden on cards');

const resolveStart = rc3.indexOf('function resolveStoreChannels');
const resolveEnd = rc3.indexOf('globalThis.resolveStoreChannels', resolveStart);
const resolveSource = rc3.slice(resolveStart, resolveEnd);
assert.match(resolveSource, /phone && !RC3_BLOCKED_PHONE_ROUTE_STORES\.has/, 'secure detail phone must not depend on the stale catalog phone index');
assert.doesNotMatch(resolveSource, /phone && fxPhoneByStore/, 'valid detail phones must not disappear when store ids change');
assert.match(resolveSource, /naverMap: rc3VerifiedPhysicalMap\(safeStore\)/, 'map links must use the verified physical-place resolver');

const phoneConfirmStart = rc3.indexOf('fxOpenPhoneConfirm = async function rc3OpenPhoneConfirm');
const phoneConfirmEnd = rc3.indexOf('function rc3RouteButton', phoneConfirmStart);
const phoneConfirmSource = rc3.slice(phoneConfirmStart, phoneConfirmEnd);
assert.doesNotMatch(phoneConfirmSource, /fxPhoneByStore\.get/, 'phone confirmation must accept a valid secure detail phone');
assert.match(phoneConfirmSource, /RC3_BLOCKED_PHONE_ROUTE_STORES\.has/, 'known placeholder phone records must remain blocked');
assert.match(phoneConfirmSource, /daedongSecureStoreDetail/, 'card-only phone markers must load the secure phone before confirmation');

const physicalMapStart = rc3.indexOf('async function rc3RecoverVerifiedPhysicalMap');
const physicalMapEnd = rc3.indexOf('fxPhoneStores =', physicalMapStart);
const physicalMapSource = rc3.slice(physicalMapStart, physicalMapEnd);
assert.match(physicalMapSource, /rc3InternalPhoneByStore/, 'physical map recovery must require the same verified phone');
assert.match(physicalMapSource, /status === 'verified'/, 'physical map recovery must require a verified Naver map source');
assert.match(physicalMapSource, /rc3SamePhysicalPlace\(store, candidate\)/, 'physical map recovery must require the same address or nearby coordinates');
assert.doesNotMatch(physicalMapSource, /store\.routes|routes\.push/, 'shop-in-shop order routes must never be copied from a parent store');
assert.match(rc3, /rc3EnhanceStoreDetail\(store\);\s*void rc3RecoverVerifiedPhysicalMap\(store\);/, 'detail rendering must recover shared physical utilities after secure detail loads');
assert.match(rc3, /rc3InternalPhoneByStore = new Map[\s\S]*?activeStoreId[\s\S]*?void rc3RecoverVerifiedPhysicalMap\(activeStore\)/, 'a shared-store deep link must retry map recovery after the phone index finishes loading');
assert.match(rc3, /fxPhoneByStore\.has\(id\)[\s\S]*?store\.channelKeys[\s\S]*?'phone'/, 'verified phone markers must hydrate card channel keys');
assert.equal(new Set(phoneRuntime.storeMappings.map(item => String(item.store_id))).size, phoneRuntime.storeMappings.length, 'phone card markers must stay unique');
assert(phoneRuntime.storeMappings.some(item => item.store_id === 'cddefac029bc4e71' && item.clickableTel === true), '폭탄치밥 card must expose the verified phone marker');
assert.match(services, /rail-card\[data-rail-card-store\]/, 'recommendation rail cards must show opening status');
assert.match(services, /rc5-category-card\[data-rc5-store\]/, 'category cards must show opening status');
assert.match(services, /data-store-service-card-status-only/, 'compact customer cards must receive a status badge');

console.log('PASS Cloudflare preview API client contract');
