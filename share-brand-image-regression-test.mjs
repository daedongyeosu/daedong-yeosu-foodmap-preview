import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const asset = 'assets/brand/daedongmap-share-1200x630.png';
const url = `https://daedongmap.com/${asset}`;
const image = fs.readFileSync(asset);
assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
assert.equal(image.readUInt32BE(16), 1200);
assert.equal(image.readUInt32BE(20), 630);
// Verified raster of the approved integrated logo, on white.
assert.equal(createHash('sha256').update(image).digest('hex'),
  'c12de4d5f3735e7214c06833e8b22a31e458be3d8fcc5315b849ecfa6c9b64ca',
  'Sharing must use the visually verified integrated Daedongmap logo.');

for (const page of ['index.html']) {
  const html = fs.readFileSync(page, 'utf8');
  assert.ok(html.includes(`<meta property="og:image" content="${url}">`), page);
  assert.ok(html.includes(`<meta name="twitter:image" content="${url}">`), page);
  assert.ok(html.includes('<meta property="og:image:width" content="1200">'), page);
  assert.ok(html.includes('<meta property="og:image:height" content="630">'), page);
  assert.ok(html.includes('<meta property="og:image:type" content="image/png">'), page);
  assert.doesNotMatch(html, /og:image[^\n]*daedong-app-icon-512/);
}
const shareUi = fs.readFileSync('final-experience.js', 'utf8');
assert.equal(shareUi.split(`src="${asset}"`).length - 1, 2,
  'Home sharing and the store-sharing fallback must use the same new logo.');
assert.doesNotMatch(shareUi, /assets\/app-icons\/daedong-app-icon-512/);
assert.ok(fs.readFileSync('sw.js', 'utf8').includes(`'/${asset}'`));
assert.match(fs.readFileSync('index.html', 'utf8'), /final-experience\.js\?v=[^"]*share-brand-20260909-1/);
console.log('Share brand image regression: PASS (root, store fallback, PNG content; /s is intentionally text-only)');
