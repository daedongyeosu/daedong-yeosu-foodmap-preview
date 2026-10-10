import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('freight-admin/index.html','utf8');
const js=fs.readFileSync('freight-admin/app.js','utf8');
const css=fs.readFileSync('freight-admin/styles.css','utf8');
const errand=fs.readFileSync('errand/index.html','utf8');

for(const text of ['맛지도 화물관제','실전송 잠금','요청·배차','정산원장','기사현황','고객 총액과 기사 지급액을 분리'])assert.match(html,new RegExp(text));
for(const text of ['QUOTING','PAID','OFFERED','ASSIGNED','SETTLEMENT_PENDING','customerTotal','driverPayout','platformFee','pgFee','expenses'])assert.match(js,new RegExp(text));
assert.match(js,/driver\.payload>=order\.weight/);
assert.match(js,/order\.required\.every/);
assert.match(js,/first|원자적으로/);
assert.doesNotMatch(js,/fetch\s*\(/);
assert.doesNotMatch(errand,/freight-admin/);
assert.match(css,/@media\(max-width:520px\)/);

console.log('freight admin control regression checks passed');
