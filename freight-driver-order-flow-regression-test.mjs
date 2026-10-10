import assert from 'node:assert/strict';
import fs from 'node:fs';

const partnerHtml=fs.readFileSync('freight-partner/index.html','utf8');
const html=fs.readFileSync('freight-driver/index.html','utf8');
const js=fs.readFileSync('freight-driver/app.js','utf8');
const css=fs.readFileSync('freight-driver/styles.css','utf8');

assert.match(partnerHtml,/href="\.\.\/freight-driver\/"/);
for(const text of ['오늘 오더 받기','받을 오더','수행 중','정산','받을 확정금액','자격·영업용 차량·허가·보험'])assert.match(html,new RegExp(text));
assert.match(js,/status:'VERIFIED'/);
assert.match(js,/order\.weightKg<=DRIVER\.payloadKg/);
assert.match(js,/order\.features\.every/);
assert.match(js,/받을 금액/);
assert.match(js,/if\(state\.activeOrderId\)return/);
assert.match(js,/state\.stage='accepted'/);
assert.match(js,/state\.stage='arrived'/);
assert.match(js,/state\.stage='picked_up'/);
assert.match(js,/state\.stage='delivered'/);
assert.match(js,/proofCheck[^\n]*\.checked/);
assert.match(js,/status:'정산대기'/);
assert.doesNotMatch(js,/fetch\s*\(/);
assert.match(css,/@media\(max-width:430px\)/);

console.log('freight driver order flow regression checks passed');
