import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const rc3 = fs.readFileSync('rc3-fixes.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');

assert.match(app, /const FEEDBACK_ENDPOINT = 'https:\/\/daedong-yeosu-admin\.sisakim\.chatgpt\.site\/api\/feedback'/);
assert.doesNotMatch(app, /FEEDBACK_FORM_URL|notion\.so\/8ae3728176e344fdaee3475a97d03740/);
assert.doesNotMatch(rc3, /FEEDBACK_FORM_URL|비공개 접수폼 열기/);

assert.match(app, /textarea name="details"[^>]*maxlength="1200"[^>]*required/);
assert.match(rc3, /textarea name="details"[^>]*maxlength="1200"[^>]*required/);
assert.match(rc3, /관리자에게 수정 요청 보내기/);
assert.match(rc3, /서버에서 접수번호를 받은 경우에만 접수가 완료됩니다/);

assert.match(app, /transport:\s*'direct-admin-v1'/);
assert.match(app, /function queueFeedback\(/);
assert.match(app, /async function deliverFeedbackReport\(/);
assert.match(app, /payload\.accepted !== true \|\| payload\.requestId !== report\.reportId/);
assert.match(app, /function retryQueuedFeedbackReports\(/);
assert.match(app, /window\.addEventListener\('online',[\s\S]*retryQueuedFeedbackReports/);
assert.match(app, /data-feedback-retry/);
assert.match(app, /수정 요청이 접수되었습니다/);
assert.match(app, /아직 접수되지 않았습니다/);

assert.match(rc3, /queueFeedback\(report\)/);
assert.match(rc3, /await deliverFeedbackReport\(report\)/);
assert.match(rc3, /feedbackSuccessModal\(report\)/);
assert.match(rc3, /feedbackFailureModal\(report/);
assert.doesNotMatch(rc3, /navigator\.clipboard\?\.writeText\(rc3FeedbackText\(report\)\)/);

assert.match(html, /app\.js\?v=[^"\n]*direct-feedback-admin-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*direct-feedback-admin-1/);
assert.match(finalExperience, /rc3-fixes\.js\?v=[^'\n]*direct-feedback-admin-1/);

console.log('direct feedback admin regression: PASS');
