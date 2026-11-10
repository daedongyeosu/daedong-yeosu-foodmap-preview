import assert from 'node:assert/strict';
import fs from 'node:fs';

// Kakao Postcode's documented SDK entry point migrates independently from
// Kakao Maps' private resources, which must never be hardcoded.
const sdk = 'https://t1.kakaocdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
const loaders = ['rc4-fixes.js', 'errand/app.js', 'online-store/app.js', 'store-partner/app.js'];
for (const file of loaders) {
  const source = fs.readFileSync(file, 'utf8');
  assert.ok(source.includes(sdk), `${file}: use the supported postcode SDK entry point`);
  assert.doesNotMatch(source, /https?:\/\/[^\s'"`]*daumcdn\.net\/mapjsapi/,
    `${file}: the retired postcode host must not return`);
}
const errand = fs.readFileSync('errand/app.js', 'utf8');
assert.match(errand, /https:\/\/dapi\.kakao\.com\/v2\/maps\/sdk\.js\?/,
  'Keep the official Kakao Maps SDK loader');
assert.doesNotMatch(errand, /(?:daumcdn|kakaocdn)\.net\/[^\s'"`]*(?:tile|roadview|maps\/sdk)/,
  'Do not replace the official loader with private map resources');
assert.ok(fs.readFileSync('scripts/serve-store-commerce-qa.mjs', 'utf8').includes(sdk),
  'The loopback QA server must intercept the migrated SDK without remote calls');
for (const [file, prefix] of [['final-experience.js', 'rc4-fixes.js'], ['index.html', 'final-experience.js'], ['errand/index.html', 'app.js'], ['online-store/index.html', 'app.js'], ['store-partner/index.html', 'app.js']]) {
  assert.match(fs.readFileSync(file, 'utf8'), new RegExp(prefix.replaceAll('.', '\\.') + '\\?v=[^"\'\\n]*postcode-cdn-20261110'),
    `${file}: refresh the changed loader URL for cached clients`);
}
console.log('PASS official Kakao Maps loader and four migrated Postcode SDK loaders, QA interception, cache refresh');
