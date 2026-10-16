import assert from 'node:assert/strict';
import fs from 'node:fs';

const partnerHtml=fs.readFileSync('freight-partner/index.html','utf8');
const html=fs.readFileSync('freight-driver/index.html','utf8');
const js=fs.readFileSync('freight-driver/app.js','utf8');
const store=fs.readFileSync('freight-order-store.js','utf8');
const css=fs.readFileSync('freight-driver/styles.css','utf8');

assert.match(partnerHtml,/href="\.\.\/freight-driver\/"/);
for(const text of ['오늘 오더 받기','받을 오더','수행 중','정산','받을 확정금액','자격·영업용 차량·허가·보험'])assert.match(html,new RegExp(text));
assert.match(store,/verified:true/);
assert.match(store,/driver\.payload>=Number\(order\.weight/);
assert.match(store,/every\(feature=>driver\.features\.includes/);
assert.match(js,/받을 금액/);
assert.match(store,/acceptOrder/);
assert.match(js,/ASSIGNED/);
assert.match(js,/ARRIVED/);
assert.match(js,/PICKED_UP/);
assert.match(js,/SETTLEMENT_PENDING/);
assert.match(js,/proofCheck[^\n]*\.checked/);
assert.match(html,/freight-order-store\.js/);
assert.doesNotMatch(js,/fetch\s*\(/);
assert.match(css,/@media\(max-width:430px\)/);

console.log('freight driver order flow regression checks passed');
