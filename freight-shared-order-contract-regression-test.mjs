import assert from 'node:assert/strict';
import fs from 'node:fs';

const store=fs.readFileSync('freight-order-store.js','utf8');
const requestHtml=fs.readFileSync('freight-request/index.html','utf8');
const requestJs=fs.readFileSync('freight-request/app.js','utf8');
const adminHtml=fs.readFileSync('freight-admin/index.html','utf8');
const driverHtml=fs.readFileSync('freight-driver/index.html','utf8');
const driverJs=fs.readFileSync('freight-driver/app.js','utf8');
const errandHtml=fs.readFileSync('errand/index.html','utf8');

for(const html of [requestHtml,adminHtml,driverHtml])assert.match(html,/freight-order-store\.js/);
for(const status of ['QUOTING','PAID','OFFERED','ASSIGNED','ARRIVED','PICKED_UP','SETTLEMENT_PENDING'])assert.match(`${store}\n${driverJs}`,new RegExp(status));
for(const method of ['createRequest','transition','markNoAcceptance','offerSecondsRemaining','expireUnacceptedOffers','addCustomerBoost','acceptOrder','eligibleDrivers','subscribe'])assert.match(store,new RegExp(method));
assert.match(store,/navigator\.locks/);
assert.match(store,/assignedDriverId/);
assert.match(requestHtml,/실제 주문·결제·기사 호출은 발생하지 않습니다/);
assert.match(requestJs,/MatjidoFreightStore\.createRequest/);
assert.match(errandHtml,/href="\.\.\/freight-request\/"/);
assert.doesNotMatch(store,/fetch\s*\(/);
assert.match(requestJs,/fetch\(FREIGHT_ROUTE_QUOTE_ENDPOINT/);
assert.doesNotMatch(requestJs,/fetch\([^\n]*freight\/orders/);

console.log('freight shared order contract regression checks passed');
