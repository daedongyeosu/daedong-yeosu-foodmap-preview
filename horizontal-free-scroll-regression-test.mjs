import assert from 'node:assert/strict';
import fs from 'node:fs';

const appCss = fs.readFileSync('app.css', 'utf8');
const finalCss = fs.readFileSync('final-experience.css', 'utf8');
const rc2 = fs.readFileSync('rc2-fixes.css', 'utf8');
const rc3 = fs.readFileSync('rc3-fixes.css', 'utf8');
const rc4 = fs.readFileSync('rc4-fixes.css', 'utf8');
const rc5 = fs.readFileSync('rc5-fixes.css', 'utf8');

assert.match(appCss, /\.store-grid\{[^}]*scroll-snap-type:none/);
assert.match(appCss, /\.store-grid>\.store-card\{[^}]*scroll-snap-align:none[^}]*scroll-snap-stop:normal/);
assert.match(finalCss, /\.recommend-track\{[^}]*scroll-snap-type:none/);
assert.match(finalCss, /\.rail-card\{[^}]*scroll-snap-align:none[^}]*scroll-snap-stop:normal/);
assert.match(rc2, /\.rail-card\s*\{[^}]*scroll-snap-align:\s*none;[^}]*scroll-snap-stop:\s*normal;/);
assert.match(rc3, /\.recommend-track\s*\{[^}]*scroll-snap-type:\s*none;/);
assert.match(rc4, /\.rc4-category-result-track\{[^}]*scroll-snap-type:none/);
assert.match(rc5, /\.rc5-category-result-track\{[^}]*scroll-snap-type:none/);

console.log('horizontal store rails remain exactly where the customer stops');
