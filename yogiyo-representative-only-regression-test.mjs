import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const menu = fs.readFileSync(new URL('./store-menu-preview.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const sw = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

assert.match(app, /function isQuarantinedCollectedPhoto\(path\)/);
assert.match(app, /api\\\/media\\\/coupang-menu\\\/v1/);
assert.match(app, /!isQuarantinedCollectedPhoto\(value\)/);

assert.match(menu, /function menuWithoutQuarantinedImages\(menu\)/);
assert.match(menu, /mainImage: isQuarantinedMenuImage\(menu\.mainImage\) \? '' : menu\.mainImage/);
assert.match(menu, /if \(isQuarantinedMenuImage\(next\.image\)\) next\.image = ''/);

assert.match(service, /isQuarantinedCollectedPhoto\(item\.image\)/);
assert.match(service, /rawIsOfficialPlaceholder \|\| rawIsQuarantinedPhoto/);
assert.match(index, /yogiyo-representative-only-1/);
assert.match(sw, /app-shell-v31-yogiyo-representative-only/);

console.log('Yogiyo representative-only photo regression passed');
