import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const menu = fs.readFileSync(new URL('./store-menu-preview.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

assert.match(app, /function isOfficialStorePlaceholderImage\(path\)/);
assert.match(app, /!isOfficialStorePlaceholderImage\(value\)/);
assert.match(app, /const entryImage = photoResolver\?\.resolve\?\.\(store\)\?\.src \|\| '';/);
assert.match(app, /menuEntry\.insertAdjacentHTML\('afterbegin',[\s\S]*?data-photo-source/);

assert.match(menu, /const candidates = \[menu\?\.mainImage,[\s\S]*?menu\.items\.map\(item => item\?\.image\)/);
assert.match(menu, /assets\\\/app-icons\\\/daedong-app-icon/);
assert.match(menu, /\|\| OFFICIAL_MENU_PLACEHOLDER_IMAGE/);
assert.match(menu, /const entryImage = photoResolver\?\.resolve\?\.\(store\)\?\.src \|\| '';/);

assert.match(service, /const matchedMenuImage = String\(menuMatches\.find\(item => item\.image\)\?\.image \|\| ''\)\.trim\(\)/);
assert.match(service, /rawIsOfficialPlaceholder \? matchedMenuImage/);
assert.match(index, /food-photo-promotion-1/);
assert.match(sw, /app-shell-v30-food-photo-promotion/);

console.log('food photo promotion regression passed');
