import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('errand/index.html','utf8');
const js=fs.readFileSync('errand/app.js','utf8');
const css=fs.readFileSync('errand/styles.css','utf8');

assert.match(html,/data-address-open="pickup"/);
assert.match(html,/data-address-open="dropoff"/);
assert.match(html,/가게가 안 나오면 도로명주소로 찾기/);
assert.match(html,/공식 주소 찾기/);
assert.match(html,/id="addressNext"[^>]*disabled/);
assert.match(js,/postcode\.v2\.js/);
assert.match(js,/roadAddress\|\|data\.jibunAddress\|\|data\.address/);
assert.match(js,/전라남도\|전남/);
assert.match(js,/여수시 주소만 접수/);
assert.match(js,/const addressesReady=Boolean\(selectedAddresses\.pickup&&selectedAddresses\.dropoff\)/);
assert.match(js,/addressNext\.disabled=!\(addressesReady&&itemReady&&contentReady\)/);
assert.match(js,/심부름 내용을 4글자 이상 적어주세요/);
assert.match(css,/\.postcode-frame\{[^}]*height:560px/);
assert.match(js,/카카오 공식 장소검색에서 선택한 주소입니다/);
assert.match(js,/addressSource:'kakao_places'/);
assert.match(js,/addressSource:'daum_postcode'/);
assert.match(html,/20261011-15-risk-intake/);

console.log('errand verified address regression checks passed');
