import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';

const asset = 'assets/app-icons/daedong-share-lightning-20260909.png';
const url = `https://daedongmap.com/${asset}`;
const image = fs.readFileSync(asset);
assert.equal(image.subarray(0, 8).toString('hex'), '89504e470d0a1a0a');
assert.equal(image.readUInt32BE(16), 512);
assert.equal(image.readUInt32BE(20), 512);
// Verified raster of app-icon.svg, on white. Filenames alone missed the old logo.
assert.equal(createHash('sha256').update(image).digest('hex'),
  'ce56d5321f831bb609d54b9bd514ce9612fd9c5c1d5f4d760f86fdac128bebb0',
  'Sharing must use the visually verified lightning/fork PNG, not the old Korea-map logo.');

for (const page of ['index.html', 's/index.html']) {
  const html = fs.readFileSync(page, 'utf8');
  assert.ok(html.includes(`<meta property="og:image" content="${url}">`), page);
  assert.ok(html.includes(`<meta name="twitter:image" content="${url}">`), page);
  assert.ok(html.includes('<meta property="og:image:width" content="512">'), page);
  assert.ok(html.includes('<meta property="og:image:height" content="512">'), page);
  assert.ok(html.includes('<meta property="og:image:type" content="image/png">'), page);
  assert.doesNotMatch(html, /og:image[^\n]*daedong-app-icon-512/);
}
const shareUi = fs.readFileSync('final-experience.js', 'utf8');
assert.equal(shareUi.split(`src="${asset}"`).length - 1, 2,
  'Home sharing and the store-sharing fallback must use the same new logo.');
assert.doesNotMatch(shareUi, /assets\/app-icons\/daedong-app-icon-512/);
assert.ok(fs.readFileSync('sw.js', 'utf8').includes(`'/${asset}'`));
assert.match(fs.readFileSync('index.html', 'utf8'), /final-experience\.js\?v=[^"]*share-brand-20260909-1/);
console.log('Share brand image regression: PASS (root, /s, store fallback, PNG content)');
