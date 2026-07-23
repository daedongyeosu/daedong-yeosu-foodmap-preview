import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('./app.css', import.meta.url), 'utf8');
const source = readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const stores = JSON.parse(readFileSync(new URL('./data/stores.json', import.meta.url), 'utf8'));
const priorities = JSON.parse(readFileSync(new URL('./data/store-priority.json', import.meta.url), 'utf8'));

assert.match(html, /id="storePrevBtn"[^>]+data-store-page-direction="prev"[^>]*hidden>← 이전 가게<\/button>/);
assert.match(html, /id="loadMoreBtn"[^>]+data-store-page-direction="next"[^>]*hidden>다음 가게 보기 →<\/button>/);
assert.match(html, /app\.css\?v=selected-category-label-1-store-list-pager-1/);
assert.match(html, /final-experience\.js\?v=selected-category-label-2-store-share-deep-link-2-phone-route-restoration-1-store-list-pager-1/);

assert.match(css, /\.store-pager-controls\{display:grid;grid-template-columns:1fr/);
assert.match(css, /\.store-pager-controls\.both-directions\{grid-template-columns:1fr 1fr\}/);

assert.match(source, /const FX_STORE_PAGER_NEXT_LABEL='다음 가게 보기 →'/);
assert.match(source, /const FX_STORE_PAGER_PREV_LABEL='← 이전 가게'/);
assert.match(source, /targetIndex>=cards\.length&&cards\.length<total/);
assert.match(source, /grid\.scrollTo\(\{left,behavior:fxReduced\(\)\?'auto':'smooth'\}\)/);
assert.match(source, /event\.stopImmediatePropagation\(\)/);

const ids = stores.map(store => String(store.store_id || store.id));
assert.equal(stores.length, 650);
assert.equal(stores.flatMap(store => store.routes || []).length, 4558);
assert.equal(new Set(ids).size, 650);
assert.ok(ids.every(Boolean));
assert.equal((priorities.managedStoreIds || []).length, 149);

console.log('store-list-horizontal-pager-regression-test: pass');
