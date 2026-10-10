import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync('errand/index.html','utf8');
const js=fs.readFileSync('errand/app.js','utf8');
const css=fs.readFileSync('errand/styles.css','utf8');

for(const text of ['이용 주의사항','접수 불가 물품·행위','요금 산정 방식','수행 중 취소·환불','기사 배정 전','기사 이동 후','기사·플랫폼 귀책'])assert.match(html,new RegExp(text));
assert.match(html,/기사가 개인 돈으로 대신 내는 구매대행은 현재 하지 않습니다/);
assert.match(html,/담배 구매대행은 접수하지 않습니다/);
assert.match(html,/신분증 확인과 19세 미만 전달 거부/);
assert.match(html,/엘리베이터 없는 고층/);
assert.match(html,/고산지대·도서·회피구역/);
assert.match(html,/data-policy-check="prohibited"/);
assert.match(html,/data-policy-check="fees"/);
assert.match(html,/id="policyContinue"[^>]*disabled/);
assert.match(js,/policyChecks\.every\(input=>input\.checked\)/);
assert.match(js,/showErrandStep\('request'\);\s*pushErrandStep\('request'\)/);
assert.match(css,/\.policy-checks/);
assert.match(html,/20261011-16-long-distance/);

console.log('errand policy gate regression checks passed');
