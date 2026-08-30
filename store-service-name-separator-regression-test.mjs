import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(source, /const formatStoreDisplayName = value =>/);
assert.match(source, /\.replace\(\/\(\[가-힣\]\)\\s\*\[-–—\]\+\\s\*\(\?=\[가-힣\]\)\/g, '\$1 '\)/);
assert.match(source, /\.replace\(\/\\s\+\[-–—\]\\s\+\/g, ' '\)/);
assert.match(source, /escapeHtml\(formatStoreDisplayName\(entry\.store\?\.name\)\)/);
assert.match(source, /aria-label="\$\{escapeHtml\(formatStoreDisplayName\(entry\.store\?\.name \|\| '가게'\)\)\} 일치 메뉴"/);
assert.match(html, /store-service-info\.js\?v=[^"\s]*clean-name-separator-1/);

console.log('store service name separator regression: PASS');
