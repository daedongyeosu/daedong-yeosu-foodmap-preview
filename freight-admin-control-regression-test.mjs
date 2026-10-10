import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('freight-admin/index.html','utf8');
const js=fs.readFileSync('freight-admin/app.js','utf8');
const store=fs.readFileSync('freight-order-store.js','utf8');
const css=fs.readFileSync('freight-admin/styles.css','utf8');
const errand=fs.readFileSync('errand/index.html','utf8');

for(const text of ['맛지도 화물관제','실전송 잠금','요청·배차','정산원장','기사현황','고객 총액과 기사 지급액을 분리'])assert.match(html,new RegExp(text));
for(const text of ['QUOTING','PAID','OFFERED','ASSIGNED','SETTLEMENT_PENDING','customerTotal','driverPayout','platformFee','pgFee','expenses'])assert.match(`${js}\n${store}`,new RegExp(text));
assert.match(store,/driver\.payload>=Number\(order\.weight/);
assert.match(store,/every\(feature=>driver\.features\.includes/);
assert.match(html,/한 명만 수락되는 원자적 배차 잠금/);
assert.doesNotMatch(js,/기사 수락 시뮬레이션/);
assert.doesNotMatch(js,/fetch\s*\(/);
assert.match(html,/freight-order-store\.js/);
assert.doesNotMatch(errand,/freight-admin/);
assert.match(css,/@media\(max-width:520px\)/);

console.log('freight admin control regression checks passed');
