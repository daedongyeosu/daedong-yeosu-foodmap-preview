import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('./errand/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('./errand/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('./errand/styles.css',import.meta.url),'utf8');

assert.match(html,/id="aiAssist"[^>]*disabled>✨ AI에게 도움받기/);
assert.match(html,/id="aiSuggestion"[^>]*hidden/);
assert.match(html,/이 문장 적용하고 수정하기/);
assert.match(html,/원문은 고객이 승인하기 전까지 바뀌지 않으며/);
assert.match(html,/적용한 뒤에도 입력칸에서 자유롭게 고칠 수 있습니다/);
assert.match(app,/ERRAND_AI_ENDPOINT = 'https:\/\/daedong-yeosu-data-api-preview\.sisakim\.workers\.dev\/api\/errand\/assist'/);
assert.match(app,/body:JSON\.stringify\(\{text:original\}\)/);
assert.match(app,/errandContent\.value=suggestion/);
assert.match(app,/aiDraftApplied=true/);
assert.match(app,/AI 초안을 고객이 직접 수정하고 있습니다/);
assert.match(app,/\[고객 확인 필요\] 부분과 나머지 문장을 직접 수정할 수 있습니다/);
assert.match(app,/원문은 그대로 보존되었습니다/);
assert.match(css,/\.ai-suggestion-text/);
assert.match(html,/20261011-16-long-distance/);

console.log('errand AI assist UI regression checks passed');
