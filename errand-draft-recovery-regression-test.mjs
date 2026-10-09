import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./errand/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('./errand/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./errand/styles.css', import.meta.url), 'utf8');

assert.match(html, /id="draftResume"[^>]*hidden/, 'home exposes a hidden draft recovery card');
assert.match(html, /id="draftContinue"/, 'draft can be resumed');
assert.match(html, /id="draftDelete"/, 'draft can be deleted by the customer');
assert.match(html, /물품 사진과 약관 동의는 저장하지 않아요/, 'sensitive exclusions are explained');

assert.match(app, /const ERRAND_DRAFT_TTL_MS = 24 \* 60 \* 60 \* 1000/, 'draft expires after 24 hours');
assert.match(app, /localStorage\.setItem\(ERRAND_DRAFT_KEY/, 'meaningful drafts are saved locally');
assert.match(app, /localStorage\.removeItem\(ERRAND_DRAFT_KEY\)/, 'expired or deleted drafts are removed');
assert.match(app, /addresses:\{pickup:selectedAddresses\.pickup,dropoff:selectedAddresses\.dropoff\}/, 'verified addresses are preserved');
assert.doesNotMatch(app, /itemPhoto(?:Url)?[^\n]*localStorage\.setItem/, 'photo data is not written to local storage');
assert.doesNotMatch(app, /policyChecks[^\n]*localStorage\.setItem/, 'policy consent is never restored automatically');
assert.match(css, /\.draft-resume/, 'draft recovery card has customer-visible styling');

console.log('errand draft recovery regression checks passed');
