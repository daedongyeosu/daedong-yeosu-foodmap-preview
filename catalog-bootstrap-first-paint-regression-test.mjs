import assert from 'node:assert/strict';
import fs from 'node:fs';

const api = fs.readFileSync('data-api.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const menuSearchBrowser = fs.readFileSync('scripts/browser-alien-pizza-menu-search.mjs', 'utf8');

assert.match(api, /request\('\/api\/catalog\/bootstrap', \{cacheKey: 'catalog-bootstrap', timeoutMs: 8000\}\)/,
  'The small catalog must start before deferred UI scripts finish downloading.');
assert.match(api, /const catalogBootstrap = options =>[\s\S]*request\('\/api\/catalog\/bootstrap'/,
  'The API client must expose the protected first-paint catalog.');
assert.doesNotMatch(api.slice(api.indexOf('const warmCatalog')), /request\('\/api\/catalog', \{cacheKey: 'catalog'/,
  'The 2,000+ record catalog must not compete with first-paint data during head parsing.');

assert.match(app, /const \[bootstrapStores, manifest, policy, neighborhoodData\] = await Promise\.all/,
  'First-paint stores and supporting display data must settle together.');
assert.match(app, /applyNormalizedCatalog\(normalizedBootstrap, normalizedBootstrap\.length, false\)[\s\S]*bootstrapPainted = true/,
  'Real store cards must render before the full catalog is awaited.');
assert.ok(app.indexOf('applyNormalizedCatalog(normalizedBootstrap') < app.indexOf("window.daedongDataApi?.catalog?.({timeoutMs: 20000})"),
  'The complete catalog request must begin only after the small first-paint list is available.');
assert.match(app, /return safeBootstrapStores;[\s\S]*Promise\.resolve\(safeBootstrapStores\)/,
  'A temporary full-catalog failure must preserve already visible real stores.');
assert.match(html, /data-api\.js\?v=[^"\n]*catalog-bootstrap-first-paint-1/);
assert.match(html, /app\.js\?v=[^"\n]*catalog-bootstrap-first-paint-1/);
assert.match(menuSearchBrowser, /waitForFunction\(targetStoreId => Boolean\(fxStoreById\(targetStoreId\)\), storeId, \{timeout: 30000\}\)/,
  'A full-catalog integration test must wait for its non-bootstrap target before opening detail.');
assert.doesNotMatch(menuSearchBrowser, /openStore\(fxStoreById\('a089d1d54720b48e'\)\)/,
  'A full-catalog target must not be opened before the progressive catalog contains it.');

console.log('catalog bootstrap first paint regression: PASS');
