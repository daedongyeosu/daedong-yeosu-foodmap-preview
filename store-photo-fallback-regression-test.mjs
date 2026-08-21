import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const menu = readFileSync(new URL('./store-menu-preview.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(app, /const menuPhotoFallbackCache = new Map\(\)/);
assert.match(app, /async function loadMenuPhotoFallbacks\(store\)/);
assert.match(app, /source: 'verified-menu-fallback'/);
assert.match(app, /store\.__failedPhotoPaths\.add\(photoUrlKey\(image\.currentSrc \|\| image\.src\)\)/);
assert.match(app, /delete image\.dataset\.photoSrc/);
assert.match(app, /data-photo-store-id="\$\{escapeHtml\(store\.id\)\}"/);
assert.match(menu, /data-menu-image-src="\$\{escapeMenuHtml\(item\.image\)\}"[^>]+data-photo-kind="card"/);
assert.match(menu, /data-photo-kind="detail" data-photo-store-id="\$\{escapeMenuHtml\(store\.id\)\}"/);
assert.match(menu, /data-photo-kind="menu-entry" data-photo-store-id="\$\{escapeMenuHtml\(storeId\)\}"/);
assert.match(index, /broken-photo-menu-fallback-1/);
assert.match(index, /broken-photo-fallback-1/);

console.log('store photo fallback regression checks passed');
