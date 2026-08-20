import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');

assert.match(app, /async function normalizeStoresInBatches\(rawStores, batchSize = 100, startIndex = 0\)/);
assert.match(app, /\(index \+ 1\) % batchSize === 0[\s\S]{0,160}await yieldToMainThread\(\)/);
assert.match(app, /const firstPaintCount = Math\.min\(32, safeRawStores\.length\)/);
assert.match(app, /applyNormalizedCatalog\(firstStores, safeRawStores\.length, firstPaintCount === safeRawStores\.length\)/);
assert.match(app, /await yieldToMainThread\(\)[\s\S]{0,240}normalizeStoresInBatches\(safeRawStores\.slice\(firstPaintCount\), 48, firstPaintCount\)/);
assert.match(app, /applyNormalizedCatalog\(\[\.\.\.firstStores, \.\.\.remainingStores\], safeRawStores\.length, true, \{refresh: false\}\)/,
  '백그라운드 전체 목록 완료가 사용 중인 첫 화면 DOM을 다시 그려 터치를 막으면 안 됩니다.');
assert.doesNotMatch(app, /allStores = safeRawStores\.map\(/);

console.log('catalog normalization yield regression: PASS');
