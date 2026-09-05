import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

// SOURCE_REF=HEAD runs this regression against the immutable pre-fix source.
const read = name => process.env.SOURCE_REF
  ? execFileSync('git', ['show', `${process.env.SOURCE_REF}:${name}`], {encoding: 'utf8'})
  : fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const HIDDEN = ['732120ab53b3f457', '8d21bc80dd49679e', '19ebb8a649b24af5', '2da10529e7fb987c', '421ecef35a879687'];
const NORMAL = '67a9e4f14c8c7ea4', ALIAS = 'aaaaaaaaaaaaaaaa';
const plain = value => JSON.parse(JSON.stringify(value));
const calls = [];
const rows = [...HIDDEN.map(id => ({id, name: '탐나는피자 여수점'})), {id: NORMAL, name: '정상 가게'}, {id: ALIAS, name: '탐나는 이름의 다른 가게'}];
const original = JSON.stringify(rows);
const context = vm.createContext({
  console, URL, AbortController, setTimeout, clearTimeout,
  window: {setTimeout, clearTimeout},
  fetch: async (url, options) => {
    calls.push({url: String(url), method: options?.method || 'GET'});
    const pathname = new URL(url, 'https://fixture.invalid').pathname;
    const body = pathname === '/api/catalog' ? rows
      : pathname === '/api/services' ? Object.fromEntries(rows.map(row => [row.id, {phone: 'fixture'}]))
      : pathname === '/api/menu-search' ? {stores: Object.fromEntries(rows.map(row => [row.id, {i: [['menu', '피자']]}]))}
      : pathname.startsWith('/api/menu/') ? {storeId: NORMAL, items: [{id: 'normal-menu', name: '김밥'}]}
      : {id: NORMAL, name: '정상 가게', routes: [], url: 'https://example.test/'};
    return {ok: true, status: 200, json: async () => body};
  }
});
vm.runInContext(read('data-api.js'), context);
const api = context.window.daedongDataApi;
assert.equal(typeof api.isCustomerHiddenStoreId, 'function', 'Customer hiding must have a shared API policy');
for (const id of HIDDEN) {
  assert.equal(api.isCustomerHiddenStoreId(id), true);
  assert.equal(api.isCustomerHiddenStoreId(id.toUpperCase()), true);
}
for (const id of [NORMAL, ALIAS, '', null, undefined, 'invalid']) assert.equal(api.isCustomerHiddenStoreId(id), false);
assert.deepEqual(plain((await api.catalog()).map(row => row.id)), [NORMAL, ALIAS]);
assert.deepEqual(Object.keys(await api.services()), [NORMAL, ALIAS]);
assert.deepEqual(Object.keys((await api.menuSearch('피자')).stores), [NORMAL, ALIAS]);
assert.equal(JSON.stringify(rows), original, 'Filtering must not mutate source records');
for (const id of HIDDEN) {
  const before = calls.length;
  for (const operation of [() => api.detail(id), () => api.menu(id), () => api.yogiyoWebRoute(id, {lat: 34.7, lng: 127.7})]) {
    await assert.rejects(async () => operation(), /표시되지 않는/);
  }
  assert.equal(calls.length, before, 'Hidden detail/static menu/route must fail before a request');
}
await api.detail(NORMAL);
await api.menu(NORMAL);
await api.yogiyoWebRoute(NORMAL, {lat: 34.7, lng: 127.7});

vm.runInContext(read('data-api-runtime.js'), context);
for (const id of HIDDEN) {
  for (const trusted of [false, true]) {
    await assert.rejects(() => context.window.daedongSecureStoreDetail.enrich({id, __secureDetailReady: trusted}, raw => raw), /표시되지 않는/);
  }
}
const normalTrusted = {id: NORMAL, __secureDetailReady: true};
assert.equal(await context.window.daedongSecureStoreDetail.enrich(normalTrusted, raw => raw), normalTrusted);

const between = (source, start, end) => {
  const a = source.indexOf(start), b = source.indexOf(end, a + start.length);
  assert(a >= 0 && b > a, `Missing source boundary: ${start}`);
  return source.slice(a, b);
};
Object.assign(context, {
  FX_HIDDEN_STORE_IDS: new Set(['6092aabddf5f7194', 'e0c6949efb48f4b2']),
  FX_REGION: {code: 'yeosu'}, normalize: value => String(value || '').replace(/\s/g, '').toLowerCase(),
  fxOriginalNormalizedStore: raw => ({...raw, channelKeys: raw.channelKeys || ['phone']}),
  stores: [{id: NORMAL, name: '정상 가게', mergedStoreIds: [HIDDEN[3]]}, {id: HIDDEN[4], name: '숨김 가게', mergedStoreIds: [ALIAS]}]
});
const fx = read('final-experience.js');
vm.runInContext(
  between(fx, 'function fxVisible(', 'function fxSvg(') +
  between(fx, 'function fxStoreById(', 'function fxPhoto(') +
  between(fx, 'normalizedStore=function(', 'filteredStores=function('), context);
for (const id of HIDDEN) {
  assert.equal(context.fxVisible({id, name: 'stale visible record', customerVisible: true}), false);
  assert.equal(context.normalizedStore({id, name: 'stale record', channelKeys: ['phone']}, 0).customerVisible, false);
  assert.equal(context.fxStoreById(id), undefined, 'Hidden ID must not resolve through another canonical record');
}
assert.equal(context.fxStoreById(ALIAS), undefined, 'An alias must not resolve a hidden canonical record');
assert.equal(context.fxStoreById(NORMAL).id, NORMAL);
assert.equal(context.fxVisible({id: NORMAL, name: '정상 가게'}), true);
assert.equal(context.fxVisible({id: '6092aabddf5f7194', name: '기존 제외 가게'}), false);

Object.assign(context, {
  rc6CampaignVirtualStores: new Map(), rc6StoreByIdBase: null,
  rc6HeroCampaigns: {
    virtualStores: {[HIDDEN[4]]: {name: '탐나는피자', trustedDetail: true}, [NORMAL]: {name: '정상 가게', trustedDetail: true}},
    campaigns: {
      [HIDDEN[4]]: {storeId: HIDDEN[4], entryStoreIds: [HIDDEN[3], ALIAS]},
      [NORMAL]: {storeId: NORMAL, entryStoreIds: [NORMAL]}
    }
  }
});
const rc6 = read('rc6-fixes.js');
vm.runInContext(between(rc6, 'function rc6CampaignStoreById(', 'function rc6RequestedHeroCampaign('), context);
context.rc6PrepareCampaignStores();
assert.equal(context.rc6CampaignVirtualStores.has(HIDDEN[4]), false, 'trustedDetail must not recreate a hidden virtual store');
assert.equal(context.rc6CampaignVirtualStores.has(NORMAL), true);
for (const id of [...HIDDEN, ALIAS]) {
  assert.equal(context.rc6HeroCampaignForEntryStoreId(id), null);
  assert.equal(context.rc6ResolveHeroCampaignStoreId(id), '');
  assert.equal(context.fxStoreById(id), undefined);
}
assert.equal(context.rc6HeroCampaignForEntryStoreId(NORMAL).storeId, NORMAL);
assert.equal(context.rc6CampaignStoreById(NORMAL).id, NORMAL);
context.rc6CampaignVirtualStores.set(ALIAS, {id: HIDDEN[4], name: 'stale virtual alias'});
assert.equal(context.rc6CampaignStoreById(ALIAS), undefined, 'Lookup must reject a resolved hidden ID as well');
assert.equal(context.fxStoreById(ALIAS), undefined);
context.rc6HeroCampaigns.campaigns[ALIAS] = {storeId: HIDDEN[4]};
assert.equal(context.rc6HeroCampaignForEntryStoreId(ALIAS), null);

const preview = read('store-menu-preview.js');
Object.assign(context, {
  storeById: () => ({id: HIDDEN[4], hasMenu: true, __secureDetailReady: true}),
  document: new Proxy({}, {get() { throw new Error('Hidden menu touched the DOM/cache before its guard'); }})
});
vm.runInContext(between(preview, '  async function openMenuPreview(', '  function closeMenuPreview('), context);
for (const id of [...HIDDEN, ALIAS]) assert.equal(await context.openMenuPreview(id, null, {menuId: 'cached-menu'}), null);

console.log('PASS: shared hidden policy; API lists/detail/menu/route; trusted cache; visibility/aliases; virtual campaigns; menu early guard.');
