import assert from 'node:assert/strict';
import fs from 'node:fs';

const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const css = fs.readFileSync('app.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(finalExperience, /function fxRegisteredAppCardMarkup\(store,key,isExternal=false\)/);
assert.match(finalExperience, /data-app-store-order=/);
assert.match(finalExperience, /data-app-store-info=/);
assert.match(finalExperience, /function fxOpenRegisteredAppOrder\(button\)[\s\S]*?daedongSecureStoreDetail[\s\S]*?routeFor\(store,key\)[\s\S]*?location\.assign\(href\)/);
assert.match(finalExperience, /surface:'app_store_list'/);
assert.match(finalExperience, /\['direct','mukkebi','ddangyo','ondongne','yogiyo','coupang','baemin'\]/);
assert.match(rc2, /fxRegisteredAppCardMarkup\(store, key, isExternal\)/);
assert.match(rc2, /data-app-store-info[\s\S]*?data-app-store-order/);
assert.match(css, /\.app-browser-direct-card/);
assert.match(css, /\.app-browser-info-button/);
assert.match(html, /app\.css\?v=[^"\n]*app-list-direct-order-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*app-list-direct-order-1/);

console.log('app-list-direct-order-regression-test: pass');
