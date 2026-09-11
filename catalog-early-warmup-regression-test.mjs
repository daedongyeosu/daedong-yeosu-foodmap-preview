import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const source = fs.readFileSync('data-api.js', 'utf8');
const region = html.indexOf('<script src="region-config.js');
const api = html.indexOf('<script src="data-api.js');
assert.ok(region > 0 && region < api && api < html.indexOf('</head>'),
  'Region and cached catalog bootstrap must precede the large deferred UI scripts.');
assert.match(html, /data-api\.js[^>]*catalog-before-css-1[^>]*fetchpriority="high"/);
for (const name of ['region-config', 'data-api']) {
  const tag = html.match(new RegExp('<script src="' + name + '\\.js[^>]*>'))?.[0];
  assert.ok(tag, name + ' bootstrap must be present');
  assert.doesNotMatch(tag, /\b(?:async|defer)\b/, 'Catalog startup must not wait for DOM/CSS or race region config');
}
assert.ok(api < html.search(/<link\b[^>]*rel="stylesheet"|<style\b/), 'Catalog starts before render-blocking styles');
assert.equal((html.match(/<script src="data-api\.js/g) || []).length, 1);
assert.match(html, /data-api\.js[^>]*data-catalog-warmup/);

function boot(regionCode = 'yeosu') {
  const calls = [];
  const pending = [];
  const sandbox = {
    window: {DAEDONG_REGION: {code: regionCode}, setTimeout, clearTimeout},
    document: {currentScript: {hasAttribute: name => name === 'data-catalog-warmup'}},
    console: {warn() {}}, URL, AbortController,
    fetch(url, init) {
      calls.push({url, init});
      return new Promise((resolve, reject) => pending.push({url, resolve, reject}));
    }
  };
  vm.runInNewContext(source, sandbox);
  return {api: sandbox.window.daedongDataApi, calls, pending};
}
const plain = value => JSON.parse(JSON.stringify(value));
const respond = (pending, payload) => pending.resolve({ok: true, json: async () => payload});
const flush = () => new Promise(resolve => setImmediate(resolve));

const a = boot();
assert.equal(a.calls.length, 2, 'Both source and published catalog requests start before initialize().');
assert.equal(a.calls.find(call => /workers.dev/.test(call.url)).init.priority, 'high', 'Catalog gets network priority over decorative resources');
let resolved = false;
const joined = a.api.catalog().then(value => {resolved = true; return value;});
assert.equal(a.calls.length, 2, 'The app joins in-flight network requests, never duplicates them.');
const id = 'a'.repeat(16);
respond(a.pending.find(p => /workers.dev/.test(p.url)), [{id, name: 'before', channelKeys: ['phone']}]);
await flush();
assert.equal(resolved, false, 'Published overrides must settle before any catalog becomes visible.');
respond(a.pending.find(p => /native/.test(p.url)), {
  items: [{id, fields: {name: 'after'}, routeStates: {phone: false, mukkebi: true}}]
});
const merged = plain(await joined);
assert.equal(merged[0].name, 'after');
assert.deepEqual(merged[0].channelKeys, ['mukkebi']);
await a.api.catalog();
assert.equal(a.calls.length, 2, 'Successful warmup remains in-memory only and is reused.');
assert.equal(a.calls[0].init.cache, 'no-store');

const retry = boot();
retry.pending[0].reject(new Error('temporary network failure'));
respond(retry.pending[1], {items: []});
await flush();
const retried = retry.api.catalog();
assert.equal(retry.calls.length, 3, 'Warmup failures must not poison a later normal request.');
respond(retry.pending[2], [{id, name: 'recovered'}]);
assert.equal((await retried)[0].name, 'recovered');

const goheung = boot('goheung');
assert.equal(goheung.calls.length, 1);
assert.match(goheung.calls[0].url, /^data\/goheung-catalog.json/);
respond(goheung.pending[0], {regionCode: 'goheung', stores: [{id, name: '고흥'}]});
assert.equal((await goheung.api.catalog())[0].name, '고흥');
assert.equal(goheung.calls.length, 1, 'Goheung warmup must never request Yeosu or native catalogs.');
console.log('catalog early warmup regression: PASS');
