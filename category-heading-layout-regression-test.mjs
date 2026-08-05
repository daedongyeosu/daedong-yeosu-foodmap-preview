import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('store-service-info.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const selector = '#recommendSection > .section-head:has(#resetCategoryBtn:not([hidden]))';
assert.ok(css.includes(selector), '선택 카테고리 제목 전용 모바일 배치를 유지해야 합니다.');
assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s+auto/);
assert.match(css, /> h2 \{[\s\S]*?grid-column:\s*1 \/ -1;[\s\S]*?min-width:\s*max-content;[\s\S]*?white-space:\s*nowrap;[\s\S]*?word-break:\s*keep-all;/);
assert.match(css, /> #resetCategoryBtn \{[\s\S]*?grid-column:\s*1;/);
assert.match(css, /> \.store-service-overview-button \{[\s\S]*?grid-column:\s*2;/);
assert.match(html, /store-service-info\.css\?v=store-service-13-search-status-order-1-card-status-1-search-store-boundary-1-category-heading-wrap-1/);

console.log('category heading mobile layout regression: PASS');
