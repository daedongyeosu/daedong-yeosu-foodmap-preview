import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('./errand/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('./errand/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('./errand/styles.css',import.meta.url),'utf8');

assert.match(html,/id="customerName"[^>]*autocomplete="name"/,'customer name is collected before intake');
assert.match(html,/id="customerPhone"[^>]*inputmode="numeric"/,'mobile number uses a mobile-friendly input');
assert.match(html,/id="previewAgreement"/,'final customer confirmation is explicit');
assert.match(html,/id="previewSubmit"[^>]*disabled/,'preview intake is gated until required fields are ready');
assert.match(html,/id="trackingPreview"[^>]*hidden/,'tracking is a separate hidden screen');
assert.match(html,/신청 내용 저장[\s\S]*결제 승인 대기[\s\S]*젠딜리에 기사 요청[\s\S]*기사 배정[\s\S]*픽업·배송 중[\s\S]*전달 완료/,'all planned order states are shown in sequence');
assert.match(html,/실제 주문·결제·기사 호출은 절대 발생하지 않습니다/,'preview cannot be mistaken for a live order');
assert.match(html,/젠딜리 관리자와 기사 앱에는 아무 주문도 생성되지 않았습니다/,'tracking repeats the no-dispatch warning');

assert.match(app,/const ERRAND_PREVIEW_ORDER_KEY = 'matjidoErrandPreviewOrderV1'/,'preview receipt has a dedicated local key');
assert.match(app,/expiresAt:Date\.now\(\)\+ERRAND_DRAFT_TTL_MS/,'preview receipt expires after 24 hours');
assert.match(app,/maskedPhone\(customerPhone\.value\)/,'stored tracking receipt masks the phone number');
assert.match(app,/localStorage\.setItem\(ERRAND_PREVIEW_ORDER_KEY/,'preview receipt survives reload locally');
assert.match(app,/previewSubmit\.disabled=!ready/,'name, phone, and confirmation gate intake');
assert.match(app,/history\.replaceState\(null,'',`\$\{location\.pathname\}\?preview-order=/,'tracking has a restorable local URL');
assert.doesNotMatch(app,/fetch\([^)]*(?:order|dispatch|zendely|gendeli)/i,'preview intake never calls an order or dispatch endpoint');
assert.match(css,/\.customer-contact/,'contact form is visibly styled');
assert.match(css,/\.progress-card li\[data-state="current"\]/,'current tracking state is visibly distinct');
assert.match(css,/@media\(max-width:430px\).*\.preview-intake>p,\.preview-intake label\{font-size:16px\}/s,'mobile explanation and consent text stay readable');

console.log('errand intake and tracking regression checks passed');
