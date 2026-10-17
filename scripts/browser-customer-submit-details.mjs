// Local automated application tests; not an operating browser or live order system.
// Start serve-store-commerce-qa.mjs on 4197 with --test-intake explicitly enabled.
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
let playwright;try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs')).href);}
const origin=process.env.STORE_QA_ORIGIN||'http://127.0.0.1:4197';
if(new URL(origin).hostname!=='127.0.0.1')throw Error('Loopback test server required.');
const before=await fetch(origin+'/api/qa-state').then(r=>r.json());
assert.equal(before.testIntake,true,'Explicit in-memory test-intake mode is required');
assert.equal(before.realWorker,true,'Use the actual built worker, not synthetic errand receipts');
const browser=await playwright.chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),errors=[],external=[];
  context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){external.push(route.request().url());return route.abort();}return route.continue();});
  const merchant=await context.newPage();
  await merchant.goto(origin+'/store-partner/index.html');await merchant.locator('#storeCategory').selectOption('반찬·먹거리');await merchant.locator('#storeName').fill('상세주소 전달 시험상점');await merchant.locator('#ownerPhone').fill('01012345678');await merchant.locator('#findAddress').click();await merchant.getByRole('button',{name:'테스트 주소 선택 (실제 주소검색 아님)'}).click();await merchant.locator('#nextStep').click();await merchant.locator('#nextStep').click();
  for(const [name,price] of [['시험 크루아상','3200'],['시험 식빵','6500'],['시험 케이크','9000']]){await merchant.locator('#productName').fill(name);await merchant.locator('#productPrice').fill(price);await merchant.locator('#addProduct').click();}
  await merchant.locator('#nextStep').click();await merchant.locator('#previewAgreement').check();await merchant.locator('#savePreview').click();await merchant.locator('#customerStorePreview').waitFor({state:'visible'});
  const customer=await context.newPage();await customer.goto(new URL(await merchant.locator('#customerStorePreview').getAttribute('href'),merchant.url()).href);await customer.waitForFunction(()=>document.querySelectorAll('#productGrid button').length===3);
  for(const name of ['시험 크루아상','시험 식빵','시험 케이크'])await customer.locator('.product-card').filter({hasText:name}).getByRole('button',{name:'장바구니 담기',exact:true}).click();
  await customer.locator('#openCart').click();await customer.locator('#openAddress').click();await customer.getByRole('button',{name:'테스트 주소 선택 (실제 주소검색 아님)'}).click();await customer.locator('#addressDetail').fill('시험동 101호 · 공동현관 1234 · 실제 배송 금지');await customer.locator('#addressDetail').press('Tab');await customer.waitForFunction(()=>document.querySelector('#orderTotal').textContent==='23,000원');
  await customer.locator('#previewOrder').click();await customer.locator('#orderReviewPanel').waitFor({state:'visible'});assert.equal(await customer.locator('#reviewTotal').innerText(),'23,000원');assert.match(await customer.locator('#reviewAddressDetail').innerText(),/101호/);
  await customer.locator('#reviewAddress').scrollIntoViewIfNeeded();await customer.screenshot({path:'../tmp/customer-submit-address-review.png'});
  let firstStoreReceipt,firstStorePayload;
  await customer.route('**/api/store-orders/preview',async route=>{firstStorePayload=route.request().postDataJSON();const committed=await route.fetch();assert.equal(committed.status(),201);firstStoreReceipt=await committed.json();await route.abort('connectionreset');},{times:1});
  await customer.locator('#sendPreviewOrder').click();await customer.waitForFunction(()=>document.querySelector('#reviewSubmitStatus').textContent.includes('기존 접수'));
  await customer.reload();await customer.locator('#pendingStoreSubmission').waitFor({state:'visible'});
  const responsePromise=customer.waitForResponse(r=>r.request().method()==='POST'&&r.url()===origin+'/api/store-orders/preview');
  await customer.locator('#recoverStoreSubmission').click();const response=await responsePromise;const saved=await response.json();assert.equal(response.status(),200,JSON.stringify(saved));assert.equal(saved.order.id,firstStoreReceipt.order.id);assert.equal(saved.customerToken,firstStoreReceipt.customerToken);assert.equal(saved.replayed,true);assert.deepEqual(response.request().postDataJSON(),firstStorePayload,'Recovery uses the original signed quote and UUID after reload');
  const expectedDestination='전라남도 여수시 테스트로 10 · 시험동 101호 · 공동현관 1234 · 실제 배송 금지';
  assert.equal(response.request().postDataJSON().destinationLabel,expectedDestination,'Actual POST must retain reviewed detail');
  const restored=await fetch(origin+'/api/store-orders/preview/'+encodeURIComponent(saved.order.id),{headers:{'X-Matjido-Order-Token':saved.customerToken}}).then(r=>r.json());assert.equal(restored.order.destinationLabel,expectedDestination,'Server-persisted detail must equal customer-reviewed detail');
  const managerView=await fetch(origin+'/api/store-orders/preview?storeId='+encodeURIComponent(restored.order.storeId),{headers:{'X-Matjido-Preview-Client':'store-manager-preview'}}).then(r=>r.json());assert.equal(managerView.orders.find(order=>order.id===saved.order.id)?.destinationLabel,expectedDestination,'The merchant order list must receive the same detailed destination');

  const errand=await context.newPage();let posts=0;
  context.on('request',r=>{if(r.method()==='POST'&&r.url()===origin+'/api/errand/orders')posts++;});
  await errand.goto(origin+'/errand/index.html');await errand.locator('#requestStart').click();await errand.locator('[data-policy-check="prohibited"]').check();await errand.locator('[data-policy-check="fees"]').check();await errand.locator('#policyContinue').click();
  for(const kind of ['pickup','dropoff']){await errand.locator(`[data-address-open="${kind}"]`).click();await errand.getByRole('button',{name:'테스트 주소 선택 (실제 주소검색 아님)'}).click();await errand.locator(`[data-address-detail="${kind}"]`).fill(kind==='pickup'?'시험상점 계산대':'시험동 101호 · 실제 배송 금지');}
  await errand.locator('[data-item-kind="서류·열쇠"]').click();await errand.locator('#itemName').fill('시험 서류봉투 1개');await errand.locator('[name="itemScale"]').first().check();await errand.locator('#errandContent').fill('시험 서류봉투 1개 전달 · 실제 배송 금지');
  assert.equal(await errand.locator('#itemPhoto').getAttribute('capture'),null);await errand.locator('#itemPhoto').setInputFiles(path.resolve('assets/studio-bakery/bread.webp'));await errand.locator('#itemPhotoPreview').waitFor({state:'visible'});assert.match(await errand.locator('#itemPhotoStatus').innerText(),/전송하지 않습니다/);
  await errand.locator('#packingStatus').selectOption('밀봉·완충 포장 완료');await errand.locator('#declaredValue').fill('10000');
  await errand.locator('.safety-confirmations').evaluate(element=>{element.open=true;});await errand.locator('.safety-confirmations input[value="시간 지연 가능성 확인"]').check();
  await errand.locator('#addressNext').click();await errand.locator('#customerName').fill('시험고객');await errand.locator('#customerPhone').fill('01012345678');await errand.locator('#previewAgreement').check();
  // Commit the real worker transaction, then lose its response at the network boundary.
  let firstErrandReceipt,firstErrandPayload;
  await errand.route('**/api/errand/orders',async route=>{firstErrandPayload=route.request().postDataJSON();const committed=await route.fetch();assert.equal(committed.status(),201,await committed.text());firstErrandReceipt=await committed.json();await route.abort('connectionreset');},{times:1});await errand.locator('#previewSubmit').click();await errand.waitForFunction(()=>document.querySelector('#previewSubmitStatus').dataset.state==='error');assert.equal(await errand.locator('#previewSubmit').isEnabled(),true);assert.equal(await errand.locator('#itemName').inputValue(),'시험 서류봉투 1개');assert.equal(posts,1);
  // Recovery is explicit and reuses the frozen original, even if the editable contact has changed.
  await errand.route('**/api/errand/orders',async route=>{await new Promise(resolve=>setTimeout(resolve,800));await route.continue();},{times:1});
  await errand.locator('#recoverErrandSubmission').click();await errand.locator('#customerName').fill('전송 중 변경된 이름');assert.equal(await errand.locator('#previewSubmit').isDisabled(),true);await errand.locator('#previewAgreement').uncheck();await errand.locator('#previewAgreement').check();assert.equal(await errand.locator('#previewSubmit').isDisabled(),true);
  await errand.locator('#previewSubmit').dispatchEvent('click');await errand.locator('#trackingPreview').waitFor({state:'visible'});assert.equal(posts,2,'One lost response and one deliberate retry; no concurrent duplicate POST');assert.equal(await errand.locator('#trackingOrderId').innerText(),firstErrandReceipt.order.id);assert.equal(await errand.locator('#trackingContact').innerText(),'시험고객 · 010-****-5678');
  await errand.reload();await errand.locator('#trackingReview').click();assert.equal(await errand.locator('#trackingDetails').isVisible(),true);assert.equal(await errand.locator('#paymentPreview').isVisible(),false);assert.equal(await errand.locator('#trackingDescription').innerText(),'시험 서류봉투 1개 전달 · 실제 배송 금지');assert.match(await errand.locator('#trackingItemDetails').innerText(),/오토바이/);assert.match(await errand.locator('#trackingDropoff').innerText(),/101호/);assert.equal(await errand.locator('#trackingReview').getAttribute('aria-expanded'),'true');
  await errand.locator('#trackingRefresh').click();await errand.waitForFunction(()=>!document.querySelector('#trackingRefresh').disabled);assert.equal(await errand.locator('#trackingDetails').isVisible(),true);await errand.locator('#trackingReview').click();assert.equal(await errand.locator('#trackingDetails').isVisible(),false);await errand.locator('#trackingReview').click();
  assert.ok(await errand.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await errand.locator('#trackingDetails').scrollIntoViewIfNeeded();await errand.screenshot({path:'../tmp/customer-submit-errand-receipt.png'});
  const after=await fetch(origin+'/api/qa-state').then(r=>r.json());assert.equal(after.orders,before.orders+1);assert.equal(after.errandReceipts,before.errandReceipts+1);assert.deepEqual(external,[]);assert.deepEqual(errors,[]);
  console.log('PASS: actual worker commit → network response lost → original receipt recovered for store + errand; store reload recovery, one order each, original token/UUID, three products, detailed address, saved photo chooser, busy guard, submitted contact snapshot, read-only receipt after reload; no hosted writes/payment/dispatch.');
}finally{await browser.close();}
