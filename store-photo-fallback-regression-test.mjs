import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rc6 = readFileSync(new URL('./rc6-fixes.js', import.meta.url), 'utf8');
const finalExperience = readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const menu = readFileSync(new URL('./store-menu-preview.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const service = readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');

assert.match(app, /const menuPhotoFallbackCache = new Map\(\)/);
assert.match(app, /async function loadMenuPhotoFallbacks\(store\)/);
assert.match(app, /source: 'verified-menu-fallback'/);
assert.match(app, /function recoverVisibleDetailPhoto\(store\)/);
assert.match(app, /currentPhotoSurface\.replaceWith\(document\.createRange\(\)\.createContextualFragment\(markup\)\)/);
assert.match(app, /if \(!image\.isConnected\) \{\s*recoverVisibleDetailPhoto\(store\);\s*return;\s*\}/);
assert.match(app, /if \(!loadingPhoto && store\.hasMenu === true\) \{\s*void loadMenuPhotoFallbacks\(store\)\.then\(\(\) => recoverVisibleDetailPhoto\(store\)\);\s*\}/);
assert.match(app, /store\.__failedPhotoPaths\.add\(photoUrlKey\(image\.currentSrc \|\| image\.src\)\)/);
assert.match(app, /delete image\.dataset\.photoSrc/);
assert.match(app, /data-photo-store-id="\$\{escapeHtml\(store\.id\)\}"/);
assert.match(menu, /data-menu-image-src="\$\{escapeMenuHtml\(item\.image\)\}"[^>]+data-photo-kind="card"/);
assert.match(menu, /data-photo-kind="detail" data-photo-store-id="\$\{escapeMenuHtml\(store\.id\)\}"/);
assert.match(menu, /data-photo-kind="menu-entry" data-photo-store-id="\$\{escapeMenuHtml\(storeId\)\}"/);
assert.match(index, /detail-photo-menu-fallback-refresh-1/);
assert.match(index, /broken-photo-menu-fallback-1/);
assert.match(index, /broken-photo-fallback-1/);
assert.match(app, /return mobile !== path && failed\.has\(photoUrlKey\(mobile\)\) \? path : mobile;/);

assert.match(app, /const immediateNext = photoResolver\.resolveGallery\(store\)/,
  'known original photos must be selected before waiting for the menu API');
assert.ok(app.indexOf('const immediateNext = photoResolver.resolveGallery(store)') < app.indexOf('await loadMenuPhotoFallbacks(store)', app.indexOf('async function handleImageError')),
  'the immediate original-photo fallback must run before the optional menu request');
assert.match(rc6, /data-photo-kind="card" data-photo-store-id="\$\{escapeHtml\(store\.id\)\}" data-photo-source="hero"/,
  'managed hero photos must use the shared photo recovery path');
assert.match(app, /const DAEDONG_SHOULD_RESET_ENTRY_SCROLL = !globalThis\.daedongPendingExternalReturn;/,
  'fresh and reused visits must reset to the top while validated order-app returns preserve position');
assert.match(app, /window\.addEventListener\('pageshow', resetFreshEntryScroll, \{once: true\}\)/,
  'the top reset must run after browser scroll restoration settles');
assert.match(finalExperience, /pager-stable-refresh-1-hero-photo-recovery-1/);
assert.match(index, /fresh-entry-top-1/);
assert.match(index, /fresh-entry-explicit-return-1/);
assert.match(index, /hero-photo-recovery-1/);

assert.match(service, /const resolvedPhoto = typeof photoResolver !== 'undefined'[\s\S]*?photoResolver\.resolve\(entry\.store\)/,
  'the integrated store finder must use the shared photo manifest resolver');
assert.match(service, /const storeImage = String\(resolvedPhoto\?\.src \|\| rawImage\)\.trim\(\)/,
  'manifest photos must win while legacy photos remain a safe fallback');
assert.match(service, /data-photo-kind="card" data-photo-store-id="\$\{escapeHtml\(entry\.storeId\)\}" data-photo-source="\$\{escapeHtml\(storeImageSource\)\}"/,
  'finder photos must participate in the shared broken-image recovery path');
assert.match(index, /service-overview-manifest-photo-1/,
  'the finder script cache key must change with the manifest-photo fix');

console.log('store photo fallback regression checks passed');
