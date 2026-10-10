import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('./errand/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('./errand/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('./errand/styles.css',import.meta.url),'utf8');

assert.match(html,/id="itemValue"[^>]*type="number"/,'declared value is recorded');
assert.match(html,/name="packingStatus" value="밀봉·완충 포장 완료"/,'packing status is required');
assert.match(html,/data-risk-question="fragile"/,'fragile-item questions exist');
assert.match(html,/data-risk-question="liquid"/,'liquid questions exist');
assert.match(html,/data-risk-question="electronics"/,'electronics questions exist');
assert.match(html,/data-risk-question="temperature"/,'temperature questions exist');
assert.match(html,/data-risk-question="deadline"/,'time-critical questions exist');
assert.match(html,/id="riskDecision"[^>]*data-level="waiting"/,'risk decision is visible before checkout');
assert.match(html,/id="paymentRisk"/,'risk decision is repeated in review');

assert.match(app,/const ERRAND_BLOCKED_RULES = \[/,'blocked goods use structured rules');
assert.match(app,/function currentRiskAssessment\(\)/,'risk assessment is centralized');
assert.match(app,/level:'blocked'/,'blocked requests cannot continue');
assert.match(app,/level:'review'/,'complex requests route to review');
assert.match(app,/level:'special'/,'special handling is distinct from standard delivery');
assert.match(app,/assessment\.requiresPhoto&&!itemPhoto\.files\?\.\[0\]/,'photo is required for high-risk items');
assert.match(app,/packingStatus:document\.querySelector\('\[name="packingStatus"\]:checked'\)/,'packing status is included in order data');
assert.match(app,/declaredValue:itemValueUnknown\.checked\?null:Number\(itemValue\.value\)/,'declared value is included in order data');
assert.match(app,/riskFlags:assessment\.flags/,'risk flags are included in order data');
assert.match(app,/safetyConfirmations:/,'customer confirmations are included in order data');
assert.match(app,/policyVersion:'preview-2026-10-11-risk-v1'/,'risk policy version is auditable');

assert.match(css,/\.risk-decision\[data-level="blocked"\]/,'blocked decision has distinct styling');
assert.match(css,/@media\(max-width:430px\).*\.transport-check-head small/s,'mobile text remains legible');

console.log('errand risk intake regression checks passed');
