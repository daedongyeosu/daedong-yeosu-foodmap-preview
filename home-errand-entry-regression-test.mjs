import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const homeCss = fs.readFileSync(new URL('./final-experience.css', import.meta.url), 'utf8');
const serviceCss = fs.readFileSync(new URL('./store-service-info.css', import.meta.url), 'utf8');
const serviceJs = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const errandHtml = fs.readFileSync(new URL('./errand/index.html', import.meta.url), 'utf8');

assert.match(html, /class="matjido-errand-home-entry glass-action" href="errand\/"/);
assert.ok(html.indexOf('matjido-errand-home-entry-wrap') > html.indexOf('main-search-row'));
assert.ok(html.indexOf('matjido-errand-home-entry-wrap') < html.indexOf('yeosu-gage-home-entry-wrap'));
assert.match(homeCss, /\.matjido-errand-home-entry\{[^}]*background:rgba\(255,255,255,\.1\)/);
assert.match(homeCss, /\.matjido-errand-home-copy strong\{[^}]*font-size:22px/);
assert.match(serviceCss, /@media \(max-width: 520px\)[\s\S]*?\.store-finder-quick nav button \{[\s\S]*?min-height: 48px;[\s\S]*?font-size: 15px;/);
assert.match(serviceCss, /@media \(max-width: 360px\)[\s\S]*?font-size: 14px;/);
assert.match(serviceJs, /entry\.before\(errandEntry\)/);
assert.match(errandHtml, /<h1>24시간<br><strong>심부름<\/strong><\/h1>/);
console.log('home errand entry regression checks passed');
