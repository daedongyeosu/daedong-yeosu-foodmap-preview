import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const app = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
const finalExperience = fs.readFileSync(path.join(root, 'final-experience.js'), 'utf8');
const rc2 = fs.readFileSync(path.join(root, 'rc2-fixes.js'), 'utf8');
const rc3 = fs.readFileSync(path.join(root, 'rc3-fixes.js'), 'utf8');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'data', 'photo-manifest.json'), 'utf8'));
const brandPool = JSON.parse(fs.readFileSync(path.join(root, 'data', 'brand-photo-pools.json'), 'utf8'));
const brandMapping = JSON.parse(fs.readFileSync(path.join(root, 'data', 'brand-app-mapping.json'), 'utf8'));
const brandSupplement = JSON.parse(fs.readFileSync(path.join(root, 'data', 'brand-app-missing-nine-supplement.json'), 'utf8'));
const happyOrder = JSON.parse(fs.readFileSync(path.join(root, 'data', 'happyorder-channel-research.json'), 'utf8'));

assert.match(app, /MOBILE_PHOTO_SUFFIX\s*=\s*'\.mobile\.webp'/, 'mobile WebP delivery must stay enabled');
assert.match(app, /function deferBrandFont\(\)[\s\S]*60000/, 'large decorative font must not contend with the initial interaction window');
assert.match(app, /IntersectionObserver[\s\S]*rootMargin:\s*'420px 0px'/, 'offscreen store photos must remain observer-driven');
assert.match(finalExperience, /photoSourceAttributes\(src,options\)/, 'experience cards must use deferred mobile photo sources');
assert.match(finalExperience, /mobilePhotoPath\(brand\.icon\)/, 'brand tiles must use mobile icon derivatives');
assert.match(finalExperience, /mobilePhotoPath\(brand\.brandSelectionImage\)/, 'Happy Order tiles must use mobile icon derivatives');
assert.match(finalExperience, /mobilePhotoPath\(item\.icon\)/, 'store brand actions must use mobile icon derivatives');
assert.match(rc2, /mobilePhotoPath\(brand\.icon\)/, 'final direct-brand override must use mobile icon derivatives');
assert.match(rc2, /mobilePhotoPath\(brand\.brandSelectionImage\)/, 'final Happy Order override must use mobile icon derivatives');
assert.match(rc3, /mobilePhotoPath\(channel\.icon\)/, 'rail and detail channel icons must use mobile derivatives');

const values = [];
for (const entry of manifest.entries || []) values.push(entry.src, ...(entry.additionalSrcs || []), ...(entry.gallery || []));
values.push(...Object.values(brandPool.assignments || {}));
const collectIcons = value => {
  if (Array.isArray(value)) value.forEach(collectIcons);
  else if (value && typeof value === 'object') Object.entries(value).forEach(([key, item]) => {
    if (['icon', 'brandSelectionImage'].includes(key) && typeof item === 'string') values.push(item);
    collectIcons(item);
  });
};
collectIcons(brandMapping);
collectIcons(brandSupplement);
collectIcons(happyOrder);
values.push('images/momstouch.jpg', 'images/ajukeo.jpg', 'images/burgerking.png', 'images/lotteria.jpg', 'images/mcdonalds.jpg', 'images/nobrandburger.png', 'images/frankburger.png', 'images/gyedong.jpg', 'images/doozzim.jpg', 'assets/ondongne.png', 'assets/mukkebi-v7.png', 'assets/ddangyo-v7.png');
for (const file of fs.readdirSync(path.join(root, 'images', 'notion-stores'))) {
  if (/\.(?:png|jpe?g|gif)$/i.test(file)) values.push(path.posix.join('images', 'notion-stores', file));
}
const originals = [...new Set(values
  .map(value => String(value || '').trim())
  .filter(value => value && !/^(?:data:|https?:)/i.test(value))
  .filter(value => /\.(?:png|jpe?g|gif)$/i.test(value)))];

let originalBytes = 0;
let derivativeBytes = 0;
let largestDerivative = 0;
for (const relative of originals) {
  const source = path.join(root, relative);
  const derivative = path.join(root, relative.replace(/\.(?:png|jpe?g|gif)$/i, '.mobile.webp'));
  assert.ok(fs.existsSync(source), `missing source photo: ${relative}`);
  assert.ok(fs.existsSync(derivative), `missing mobile derivative: ${path.relative(root, derivative)}`);
  originalBytes += fs.statSync(source).size;
  const bytes = fs.statSync(derivative).size;
  derivativeBytes += bytes;
  largestDerivative = Math.max(largestDerivative, bytes);
  assert.ok(bytes <= 260 * 1024, `mobile derivative exceeds 260 KB: ${path.relative(root, derivative)} (${bytes})`);
}

assert.ok(derivativeBytes <= originalBytes * 0.35, `mobile derivatives must reduce aggregate bytes by at least 65% (${derivativeBytes}/${originalBytes})`);
console.log(JSON.stringify({photos: originals.length, originalBytes, derivativeBytes, largestDerivative}, null, 2));
