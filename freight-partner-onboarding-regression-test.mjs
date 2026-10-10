import assert from 'node:assert/strict';
import fs from 'node:fs';

const errandHtml=fs.readFileSync('errand/index.html','utf8');
const html=fs.readFileSync('freight-partner/index.html','utf8');
const js=fs.readFileSync('freight-partner/app.js','utf8');
const css=fs.readFileSync('freight-partner/styles.css','utf8');

assert.match(errandHtml,/href="\.\.\/freight-partner\/"/);
assert.match(errandHtml,/내 트럭으로<br>여수 배송 일 받기/);
for(const text of ['개인화물기사','운송업체','등록증상 최대적재량','화물운송종사자격증','영업용','화물운송사업 허가','사업용 자동차보험','서류 검증 전 · 배차 불가'])assert.match(html,new RegExp(text));
assert.match(html,/id="reviewApplication"[^>]*disabled/);
assert.match(html,/신분증·등록증 사진은 안전한 보안 업로드 서버가 연결된 뒤에만 받습니다/);
assert.doesNotMatch(js,/fetch\s*\(/);
assert.match(js,/hasQualification[^\n]*\.checked/);
assert.match(js,/hasCommercialVehicle[^\n]*\.checked/);
assert.match(js,/hasPermit[^\n]*\.checked/);
assert.match(js,/hasInsurance[^\n]*\.checked/);
assert.match(js,/submitButton\.disabled=!ready/);
assert.match(js,/localStorage\.setItem\(DRAFT_KEY/);
assert.match(css,/@media\(max-width:430px\)/);
assert.match(html,/sisakim@naver\.com/);

console.log('freight partner onboarding regression checks passed');
