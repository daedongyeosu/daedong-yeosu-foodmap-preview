import fs from 'node:fs';
import assert from 'node:assert/strict';

const css = fs.readFileSync(new URL('./store-service-info.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const mobileStart = css.indexOf('@media (max-width: 720px)');
const mobileEnd = css.indexOf('@media (max-width: 380px)', mobileStart);
const mobile = css.slice(mobileStart, mobileEnd);

assert.match(mobile, /\.store-service-overview-card\s*\{[\s\S]*grid-template-columns:\s*58px minmax\(0, 1fr\) 18px;/);
assert.match(mobile, /\.store-service-overview-card > \.store-service-status\s*\{[\s\S]*grid-column:\s*2;[\s\S]*grid-row:\s*2;/);
assert.match(mobile, /\.store-service-overview-payments\s*\{[\s\S]*grid-column:\s*2;[\s\S]*grid-row:\s*3;/);
assert.match(mobile, /\.store-service-overview-card-image,[\s\S]*grid-row:\s*1 \/ 4;/);
assert.match(html, /store-service-info\.css\?v=[^"\s]*mobile-name-width-1/);

console.log('store service mobile name layout regression: PASS');
