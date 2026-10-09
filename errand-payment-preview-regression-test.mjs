import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('./errand/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('./errand/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('./errand/styles.css',import.meta.url),'utf8');

assert.match(html,/id="paymentPreview"[^>]*hidden/);
assert.match(html,/토스페이/);
assert.match(html,/카카오페이/);
assert.match(html,/네이버페이/);
assert.match(html,/신용·체크카드/);
assert.match(html,/주문별 가상계좌/);
assert.match(html,/휴대폰 요금으로 결제/);
assert.match(html,/예시 금액/);
assert.match(html,/실제 결제와 젠딜리 주문은 발생하지 않습니다/);
assert.match(html,/class="payment-submit"[^>]*disabled/);
assert.match(app,/request\.hidden=true;\s*payment\.hidden=false/);
assert.match(app,/addressNext\.disabled=!\(addressesReady&&contentReady\)/);
assert.match(app,/new URLSearchParams\(location\.search\)\.has\('payment'\)/);
assert.match(css,/\.quick-payment-grid/);
assert.match(css,/@media\(max-width:430px\).*\.quick-payment-grid\{grid-template-columns:1fr\}/s);

console.log('errand payment preview regression checks passed');
