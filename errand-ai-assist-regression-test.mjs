import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('./errand/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('./errand/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('./errand/styles.css',import.meta.url),'utf8');

assert.match(html,/id="aiAssist"[^>]*disabled>✨ AI에게 도움받기/);
assert.match(html,/id="aiSuggestion"[^>]*hidden/);
assert.match(html,/이 문장 사용하기/);
assert.match(html,/원문은 고객이 승인하기 전까지 바뀌지 않습니다/);
assert.match(app,/ERRAND_AI_ENDPOINT = 'https:\/\/daedong-yeosu-data-api-preview\.sisakim\.workers\.dev\/api\/errand\/assist'/);
assert.match(app,/body:JSON\.stringify\(\{text:original\}\)/);
assert.match(app,/errandContent\.value=suggestion/);
assert.match(app,/원문은 그대로 보존되었습니다/);
assert.match(css,/\.ai-suggestion-text/);
assert.match(html,/4-ai-assist/);

console.log('errand AI assist UI regression checks passed');
