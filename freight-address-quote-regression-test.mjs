import assert from 'node:assert/strict';
import fs from 'node:fs';

const requestHtml=fs.readFileSync('freight-request/index.html','utf8');
const requestJs=fs.readFileSync('freight-request/app.js','utf8');
const adminJs=fs.readFileSync('freight-admin/app.js','utf8');
const driverJs=fs.readFileSync('freight-driver/app.js','utf8');

for(const text of ['출발지는 여수, 도착지는 전국','공식 도로명주소 찾기','data-place-search="pickup"','data-place-search="dropoff"','postcodePanel'])assert.match(requestHtml,new RegExp(text));
for(const text of ['postcode.v2.js','libraries=services','kakao_places','daum_postcode','pickupLocation','dropoffLocation','latitude','longitude'])assert.match(requestJs,new RegExp(text.replace(/[.]/g,'\\.')));
assert.match(requestJs,/kind==='pickup'&&!isYeosu/);
assert.doesNotMatch(requestJs,/kind==='dropoff'&&!isYeosu/);
assert.match(requestHtml,/type="submit" disabled/);
for(const field of ['driverPayout','platformFee','pgFee','expenses'])assert.match(adminJs,new RegExp(`data-quote=\\"${field}\\"`));
assert.match(adminJs,/customerTotal:values\.driverPayout\+values\.platformFee\+values\.pgFee\+values\.expenses/);
assert.match(adminJs,/const safe=/);
assert.match(driverJs,/const safe=/);
assert.match(requestJs,/FREIGHT_ROUTE_QUOTE_ENDPOINT/);
assert.match(requestJs,/X-Daedong-Client/);
assert.match(requestJs,/route_provider_not_configured/);
assert.doesNotMatch(requestJs,/KAKAO_REST_API_KEY/);
assert.match(adminJs,/load-suggestion/);
assert.match(adminJs,/관리자 최종확정/);
assert.doesNotMatch(`${adminJs}\n${driverJs}`,/fetch\s*\(/);

console.log('freight address and quote regression checks passed');
