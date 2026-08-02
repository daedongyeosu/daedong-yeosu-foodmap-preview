import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';

const read = file => fs.readFileSync(file, 'utf8');
const stores = JSON.parse(read('data/stores.json'));
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

assert.equal(stores.length, 710, '기존 710개 가게를 보존해야 합니다.');
assert.equal(stores.flatMap(store => store.routes || []).length, 4981, '기존 주문경로 수를 변경하면 안 됩니다.');
assert.equal(
  stores.filter(store => (store.routes || []).some(route => String(route.name).includes('가게바로'))).length,
  564,
  '기존 가게바로주문 주소 보유 가게 수를 변경하면 안 됩니다.'
);
assert.equal(sha256('data/stores.json'), '2b976a0e05ad494e6723bc191962e1d8c66e8e1d93f98e6f0750baf25bdc6630');

const app = read('app.js');
assert.match(app, /if \(route\.key === 'direct'\)/);
assert.match(app, /type="button" disabled data-route-key="direct" aria-label="가게바로주문 준비중"/);
assert.match(app, /<small>\(준비중\)<\/small>/);
assert.match(app, /return `<a class="detail-route \$\{extraClass\}" href="\$\{escapeHtml\(route\.url\)\}/, '다른 주문경로 링크는 유지해야 합니다.');

const menuPreview = read('store-menu-preview.js');
assert.match(menuPreview, /menu-order-card-coming-soon" type="button" disabled data-menu-order="direct"/);
assert.match(menuPreview, /class="is-direct\$\{compatibilityClass\} is-coming-soon" type="button" disabled data-menu-sticky-order="direct"/);

const index = read('index.html');
assert.match(index, /class="order-item first glass-action community-order direct-coming-soon"[^>]*disabled/);
assert.match(index, /가게바로주문<small>\(준비중\)<\/small>/);
assert.match(index, /app\.css\?v=[^"]*direct-coming-soon-1/);
assert.match(index, /app\.js\?v=[^"]*direct-coming-soon-1/);
assert.match(index, /store-menu-preview\.css\?v=store-menu-14-direct-coming-soon-1/);
assert.match(index, /store-menu-preview\.js\?v=store-menu-17-direct-coming-soon-1-unified-menu-search-1/);

console.log('PASS: 가게바로주문 주소 564곳 보존, 홈·가게상세·음식보기 준비중 비활성화 통일');
