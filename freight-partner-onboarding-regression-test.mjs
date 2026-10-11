import assert from 'node:assert/strict';
import fs from 'node:fs';

const errandHtml=fs.readFileSync('errand/index.html','utf8');
const html=fs.readFileSync('freight-partner/index.html','utf8');
const js=fs.readFileSync('freight-partner/app.js','utf8');
const css=fs.readFileSync('freight-partner/styles.css','utf8');
const scheduleCss=fs.readFileSync('freight-partner/schedule.css','utf8');

assert.match(errandHtml,/href="\.\.\/freight-partner\/"/);
assert.match(errandHtml,/내 트럭으로<br>여수 배송 일 받기/);
for(const text of ['개인배송기사','운송업체','오토바이','짐받이 오토바이','승용차','다마스','라보','1톤','등록증상 최대적재량','차종별 자격·보험','유상운송','서류 검증 전 · 배차 불가'])assert.match(html,new RegExp(text));
for(const text of ['평일 주간','평일 야간','심야·새벽','주말·공휴일','24시간 긴급호출이 가능한가요','24시간 가능','사전 협의 가능','24시간 불가'])assert.match(html,new RegExp(text));
assert.match(html,/id="reviewApplication"[^>]*disabled/);
assert.match(html,/신분증·등록증 사진은 안전한 보안 업로드 서버가 연결된 뒤에만 받습니다/);
assert.doesNotMatch(js,/fetch\s*\(/);
assert.match(js,/hasQualification[^\n]*\.checked/);
assert.match(js,/hasCommercialVehicle[^\n]*\.checked/);
assert.match(js,/hasPermit[^\n]*\.checked/);
assert.match(js,/hasInsurance[^\n]*\.checked/);
assert.match(js,/submitButton\.disabled=!ready/);
assert.match(js,/localStorage\.setItem\(DRAFT_KEY/);
assert.match(js,/\[name="serviceWindow"\]:checked/);
assert.match(js,/\[name="allDayAvailability"\]:checked/);
assert.match(js,/allDayAvailability/);
assert.match(css,/@media\(max-width:430px\)/);
assert.match(scheduleCss,/\.choice-grid\.three/);
assert.match(scheduleCss,/@media\(max-width:430px\)/);
assert.match(html,/sisakim@naver\.com/);

console.log('freight partner onboarding regression checks passed');
