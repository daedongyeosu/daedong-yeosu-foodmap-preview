import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('./errand/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('./errand/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('./errand/styles.css',import.meta.url),'utf8');

assert.match(html,/가게 대량·특수배송/);
assert.match(html,/id="itemName"/);
assert.match(html,/name="itemScale" value="오토바이 1대 적재 가능"/);
assert.match(html,/name="itemScale" value="큰 짐·여러 박스"/);
assert.match(html,/냉장·냉동 유지/);
assert.match(html,/엘리베이터 없는 계단/);
assert.match(html,/id="itemPhoto" type="file" accept="image\/\*"/);
assert.match(html,/id="paymentItem"/);
assert.match(html,/id="paymentConditions"/);
assert.match(html,/id="paymentRequest"/);
assert.match(app,/const itemReady=Boolean\(selectedItemKind&&itemName\.value\.trim\(\)&&document\.querySelector\('\[name="itemScale"\]:checked'\)\)/);
assert.match(app,/file\.size>10\*1024\*1024/);
assert.match(app,/URL\.revokeObjectURL/);
assert.match(app,/추가 조건: \$\{conditions\.join\(' · '\)\}/);
assert.match(css,/\.item-kind-grid button\[aria-pressed="true"\]/);
assert.match(css,/@media\(max-width:430px\).*\.item-kind-grid,\.extra-conditions>div\{grid-template-columns:1fr\}/s);
assert.match(html,/7-item-details/);

console.log('errand item details regression checks passed');
