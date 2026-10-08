import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('errand/index.html','utf8');
const js=fs.readFileSync('errand/app.js','utf8');
const css=fs.readFileSync('errand/styles.css','utf8');

assert.match(html,/data-address-open="pickup"/);
assert.match(html,/data-address-open="dropoff"/);
assert.match(html,/도로명주소 검색 결과에서 선택한 주소만/);
assert.match(html,/id="addressNext"[^>]*disabled/);
assert.match(js,/postcode\.v2\.js/);
assert.match(js,/roadAddress\|\|data\.jibunAddress\|\|data\.address/);
assert.match(js,/전라남도\|전남/);
assert.match(js,/여수시 주소만 접수/);
assert.match(js,/addressNext\.disabled=!ready/);
assert.match(css,/\.postcode-frame\{[^}]*height:560px/);
assert.match(html,/verified-address/);

console.log('errand verified address regression checks passed');
