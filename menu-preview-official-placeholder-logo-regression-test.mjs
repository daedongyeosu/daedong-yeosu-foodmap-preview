import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./store-menu-preview.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const serviceWorker = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

assert.match(source, /OFFICIAL_MENU_PLACEHOLDER_IMAGE = 'assets\/app-icons\/daedong-app-icon-512\.png\?v=official-brand-20260830-1'/);
assert.match(source, /assets\\\/logo\\\.png/);
assert.match(source, /const heroImage = menuHeroImage\(menu\)/);
assert.match(source, /escapeMenuHtml\(heroImage\)/);
assert.doesNotMatch(source, /escapeMenuHtml\(menu\.mainImage\)/);
assert.match(index, /store-menu-preview\.js\?v=[^"']*official-placeholder-logo-1/);
assert.match(serviceWorker, /CACHE_NAME = 'daedong-yeosu-app-shell-v29-menu-placeholder-logo'/);

console.log('menu preview official placeholder logo regression passed');
