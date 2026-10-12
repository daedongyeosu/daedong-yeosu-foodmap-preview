import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const customer = fs.readFileSync(new URL('./online-store/app.js', import.meta.url), 'utf8');
const partner = fs.readFileSync(new URL('./store-partner/app.js', import.meta.url), 'utf8');
const manager = fs.readFileSync(new URL('./store-manager/app.js', import.meta.url), 'utf8');

test('customer asks the server to confirm current price and stock before creating an order', () => {
  assert.match(customer, /STORE_ORDER_ENDPOINT}\/quote/);
  assert.match(customer, /priceQuoteToken/);
  assert.match(customer, /pricingAuthority==='SERVER'/);
  assert.match(customer, /서버에서 현재 가격과 재고를 확정/);
});

test('merchant draft and manager toggles synchronize the preview catalog', () => {
  assert.match(partner, /method:'PUT'/);
  assert.match(partner, /STORE_CATALOG_ENDPOINT/);
  assert.match(partner, /서버가 테스트 가격·재고·누적 주문수를 관리/);
  assert.match(manager, /syncServerCatalog/);
  assert.match(manager, /STORE_ORDER_ENDPOINT}\/catalog/);
});

test('customer refreshes the public catalog without enabling real payment', () => {
  assert.match(customer, /refreshServerCatalog/);
  assert.match(customer, /실제 결제는 발생하지/);
  assert.doesNotMatch(customer, /payments\/confirm/);
});
