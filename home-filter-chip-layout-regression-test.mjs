import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('store-service-info.css', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const browserCheck = fs.readFileSync('scripts/browser-home-filter-chips.mjs', 'utf8');
const workflow = fs.readFileSync('.github/workflows/preview-api-client-checks.yml', 'utf8');

assert.match(css, /@media \(max-width: 520px\) \{[\s\S]*?\.store-finder-quick nav \{[\s\S]*?display: grid;[\s\S]*?grid-template-columns: minmax\(0, 1\.5fr\) minmax\(0, 1fr\) minmax\(0, \.8fr\);[\s\S]*?overflow-x: visible;/, '모바일 빠른 조건은 카드 내부 3열이어야 합니다.');
assert.match(css, /\.store-finder-quick nav button \{[\s\S]*?width: 100%;[\s\S]*?min-width: 0;[\s\S]*?padding: 0 6px;[\s\S]*?font-size: 11px;/, '모바일 버튼은 축소 가능한 폭과 패딩을 사용해야 합니다.');
assert.match(css, /\.store-finder-quick nav button:first-child \{[\s\S]*?padding-right: 4px;[\s\S]*?padding-left: 4px;/, '영업 중 숫자가 붙어도 첫 버튼 글자가 잘리지 않아야 합니다.');
assert.match(css, /@media \(max-width: 360px\) \{[\s\S]*?\.store-finder-quick nav button \{[\s\S]*?padding: 0 4px;[\s\S]*?font-size: 10px;/, '좁은 휴대폰에서도 세 글자가 잘리지 않아야 합니다.');
assert.match(html, /store-service-info\.css\?v=[^"\n]*mobile-quick-filters-fit-1/);
assert.match(html, /store-service-info\.css\?v=[^"\n]*home-open-count-1/);
assert.match(browserCheck, /for \(const width of \[390, 360\]\)/);
assert.match(browserCheck, /button\.right <= metrics\.nav\.right/);
assert.match(browserCheck, /button\.scrollWidth <= button\.clientWidth/);
assert.match(workflow, /Verify home quick filters fit in current PR[\s\S]*?browser-home-filter-chips\.mjs/);

console.log('home-filter-chip-layout-regression-test: pass');

