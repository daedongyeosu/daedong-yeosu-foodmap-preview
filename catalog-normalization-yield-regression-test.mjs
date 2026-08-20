import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');

assert.match(app, /async function normalizeStoresInBatches\(rawStores, batchSize = 100\)/);
assert.match(app, /\(index \+ 1\) % batchSize === 0[\s\S]{0,160}await yieldToMainThread\(\)/);
assert.match(app, /allStores = await normalizeStoresInBatches\(safeRawStores\)/);
assert.doesNotMatch(app, /allStores = safeRawStores\.map\(/);

console.log('catalog normalization yield regression: PASS');
