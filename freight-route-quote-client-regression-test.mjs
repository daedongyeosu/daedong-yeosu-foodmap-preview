import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('freight-request/index.html','utf8');
const request=fs.readFileSync('freight-request/app.js','utf8');
const admin=fs.readFileSync('freight-admin/app.js','utf8');

assert.match(request,/https:\/\/daedong-yeosu-admin\.sisakim\.chatgpt\.site\/api\/errand\/quote/);
assert.match(request,/'X-Daedong-Client':PUBLIC_CLIENT_HEADER/);
assert.match(request,/pickupAddress:selected\.pickup\.address/);
assert.match(request,/dropoffAddress:selected\.dropoff\.address/);
assert.match(request,/payload\.outbound\.distance/);
assert.match(request,/payload\.inbound\.distance/);
assert.match(request,/route_provider_not_configured/);
assert.match(request,/관리자가 실제 내비거리와 통행료를 확인/);
assert.doesNotMatch(request,/KAKAO_REST_API_KEY|KakaoAK/);
assert.doesNotMatch(request,/직선거리/);
assert.match(html,/왕복 도로거리·예상견적 계산/);
assert.match(html,/관리자가 차량·물품·상하차 조건을 확인한 뒤 최종 확정/);
assert.match(admin,/빈차 회송거리/);
assert.match(admin,/참고견적은 자동 확정되지 않습니다/);
assert.match(admin,/고객 승인, PG 결제 성공/);

console.log('freight route quote client regression checks passed');
