import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./store-menu-preview.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const serviceWorker = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

assert.doesNotMatch(source, /OFFICIAL_MENU_PLACEHOLDER_IMAGE/, '사진이 없는 메뉴에 앱 아이콘을 음식 사진처럼 강제 표시하면 안 됩니다.');
assert.ok(source.includes('logo\\.png|app-icons\\/daedong-app-icon-512\\.png'), '로고와 앱 아이콘을 음식 사진으로 사용하지 않아야 합니다.');
assert.match(source, /const heroImage = menuHeroImage\(menu\)/);
assert.match(source, /escapeMenuHtml\(heroImage\)/);
assert.doesNotMatch(source, /escapeMenuHtml\(menu\.mainImage\)/);
assert.match(index, /store-menu-preview\.js\?v=[^"']*coupang-photo-quarantine-1/);
assert.match(serviceWorker, /CACHE_NAME = 'daedong-yeosu-app-shell-v30-coupang-photo-quarantine'/);

console.log('menu preview official placeholder logo regression passed');
