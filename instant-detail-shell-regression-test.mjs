import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('./app.css', import.meta.url), 'utf8');
const serviceWorker = readFileSync(new URL('./sw.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

const openStoreStart = app.indexOf('async function openStore(store)');
const openStoreEnd = app.indexOf('\nasync function fetchJson', openStoreStart);
assert.ok(openStoreStart >= 0 && openStoreEnd > openStoreStart, 'openStore implementation must exist');
const openStore = app.slice(openStoreStart, openStoreEnd);
const shellPaint = openStore.indexOf('store-detail-loading');
const detailAwait = openStore.indexOf('await secureDetail.enrich');
assert.ok(shellPaint >= 0, 'store detail loading shell must be rendered');
assert.ok(detailAwait >= 0, 'secure detail must still be loaded');
assert.ok(shellPaint < detailAwait, 'loading shell must paint before secure detail awaits');
assert.match(openStore, /loading="eager"[^>]*fetchpriority="high"/, 'loading shell must prioritize its hero photo');
assert.match(openStore, /activeStoreId !== store\.id/, 'stale detail responses must not reopen another store');

assert.match(app, /사진 1" loading="eager" decoding="async" fetchpriority="high"/, 'single detail photos must be eager');
assert.match(app, /index === 0 \? 'eager' : 'lazy'/, 'only the first carousel photo must be eager');
assert.match(css, /\.store-detail-skeleton/, 'loading shell styles must exist');
assert.match(css, /prefers-reduced-motion:reduce/, 'loading animation must respect reduced motion');

assert.match(serviceWorker, /CACHEABLE_DESTINATIONS/, 'runtime caching must classify static assets');
assert.match(serviceWorker, /RUNTIME_CACHE/, 'runtime cache must exist');
assert.match(serviceWorker, /fetch\(event\.request, \{cache: 'default'\}\)/, 'static assets must use normal cache semantics');
assert.match(html, /app\.js\?v=[^"]*instant-detail-shell-1/, 'app cache key must be bumped');
assert.match(html, /pwa-register\.js\?v=[^"]*runtime-static-cache-1/, 'service-worker registration cache key must be bumped');

console.log(JSON.stringify({ok:true, instantDetailShell:true, prioritizedHero:true, runtimeStaticCache:true}));