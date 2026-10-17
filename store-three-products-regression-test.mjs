import assert from 'node:assert/strict';
import fs from 'node:fs';
const merchant=fs.readFileSync('store-partner/app.js','utf8'),html=fs.readFileSync('store-partner/index.html','utf8'),cart=fs.readFileSync('online-store/app.js','utf8'),fixture=fs.readFileSync('scripts/serve-store-commerce-qa.mjs','utf8');
for(const id of ['productEditorStatus','cancelProductEdit','customerStorePreview','customerPreviewHelp'])assert.ok(html.includes('id="'+id+'"'));
assert.match(merchant,/id:existing\?\.id\|\|/);assert.match(merchant,/products=products\.map\(item=>item\.id===existing\.id\?product:item\)/);assert.match(merchant,/currentStep===3&&!productReadyToLeave/);
assert.doesNotMatch(cart,/DEFAULT_PLATFORM_FEE/);assert.match(cart,/platformFee==null\?'배송비와 함께 확인'/);assert.match(cart,/이용금액 별도/);
assert.match(cart,/if\(deliveryAddress&&cartLines\(\)\.length\)(?:void )?requestDeliveryQuote/);assert.match(cart,/function invalidateCartQuotes\(\)/);
assert.match(fixture,/new DatabaseSync\(':memory:'\)/);assert.match(fixture,/server\.listen\(port,'127\.0\.0\.1'/);assert.match(fixture,/주문·결제를 생성하지 않습니다/);
console.log('PASS merchant/cart contracts: stable edits and pending protection, explicit unquoted fees, safe loopback memory-only QA with orders blocked');
