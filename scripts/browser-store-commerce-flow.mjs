// Run with STORE_PREVIEW_SOURCE pointing to the backend checkout. No hosted APIs or live DB are used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
const source=process.env.STORE_PREVIEW_SOURCE;
if(!source)throw new Error('STORE_PREVIEW_SOURCE must point to the backend source checkout for this integration test.');
const {handleStorePreviewOrders}=await import(pathToFileURL(path.join(source,'worker/store-preview-orders.ts')).href);
class LocalD1{
  database=new DatabaseSync(':memory:');
  constructor(){for(const file of ['0009_numerous_donald_blake.sql','0011_chubby_spitfire.sql'])this.database.exec(fs.readFileSync(path.join(source,'drizzle',file),'utf8'));}
  prepare(sql){let values=[];const statement={bind:(...args)=>{values=args;return statement;},run:async()=>{const result=this.database.prepare(sql).run(...values);return {success:true,meta:{changes:Number(result.changes)}};},first:async()=>this.database.prepare(sql).get(...values)||null,all:async()=>({results:this.database.prepare(sql).all(...values)})};return statement;}
  async batch(statements){this.database.exec('BEGIN');try{const results=[];for(const item of statements)results.push(await item.run());this.database.exec('COMMIT');return results;}catch(error){this.database.exec('ROLLBACK');throw error;}}
}
const env={DB:new LocalD1(),RATE_LIMIT_SALT:'isolated-browser-test-only-no-live-secret'};
let playwright;try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs')).href);}
const browser=await playwright.chromium.launch({headless:true}),origin=process.env.STUDIO_TEST_ORIGIN||'http://127.0.0.1:4192';
const address={roadAddress:'전라남도 여수시 테스트로 10',jibunAddress:'전라남도 여수시 테스트동 10',address:'전라남도 여수시 테스트로 10',zonecode:'59700',sido:'전라남도',sigungu:'여수시'};
const errors=[];let created=0,deliveryPayload=null,deliveryQuotes=0;
try{
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  ctx.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  await ctx.route('https://**/*',async route=>{
    const request=route.request(),url=new URL(request.url());
    if(url.hostname==='t1.daumcdn.net')return route.fulfill({contentType:'text/javascript',body:`window.daum={Postcode:class{constructor(options){this.options=options;}embed(){this.options.oncomplete(${JSON.stringify(address)});}}};`});
    if(url.pathname.startsWith('/api/store-orders/preview')){
      const response=await handleStorePreviewOrders(new Request(url,{method:request.method(),headers:{...request.headers(),origin},body:['GET','HEAD'].includes(request.method())?undefined:request.postData()}),env,{allowedOrigins:new Set([origin])});
      if(request.method()==='POST'&&url.pathname==='/api/store-orders/preview'&&response.status===201)created++;
      return route.fulfill({status:response.status,headers:Object.fromEntries(response.headers),body:await response.text()});
    }
    if(url.pathname==='/api/store-delivery-quote'){deliveryQuotes++;deliveryPayload=request.postDataJSON();return route.fulfill({contentType:'application/json',body:JSON.stringify({available:true,quoteId:'isolated-road-quote',deliveryFee:5000,platformFee:500,roadDistanceMeters:2100,policyVersion:'test-only',expiresAt:new Date(Date.now()+60000).toISOString()})});}
    throw new Error('External request blocked: '+url.pathname);
  });
  const merchant=await ctx.newPage();await merchant.goto(origin+'/store-partner/index.html');
  await merchant.locator('#storeCategory').selectOption({index:1});await merchant.locator('#storeName').fill('동작검사 상점');await merchant.locator('#ownerPhone').fill('01012345678');await merchant.locator('#findAddress').click();await merchant.locator('#storeAddressDetail').fill('테스트 픽업 위치');
  await merchant.locator('#nextStep').click();await merchant.locator('#nextStep').click();
  await merchant.locator('#productName').fill('검사용 상품');await merchant.locator('#productPrice').fill('5000');await merchant.locator('#stockMode').selectOption('수량 관리');await merchant.locator('#stockQuantity').fill('3');await merchant.locator('#addProduct').click();
  await merchant.locator('#nextStep').click();await merchant.locator('#previewAgreement').check();await merchant.locator('#savePreview').click();await merchant.waitForFunction(()=>document.querySelector('#saveStatus').textContent.includes('저장 완료'));
  const saved=await merchant.evaluate(()=>JSON.parse(localStorage.getItem('matjido-store-onboarding-preview-v1')));assert.match(saved.storeId,/^preview-/);assert.notEqual(saved.storeId,'demo-yeosu-store');
  const shop=await ctx.newPage();await shop.goto(origin+`/online-store/index.html?catalogStore=${saved.storeId}`);await shop.waitForFunction(()=>document.querySelector('#productGrid').textContent.includes('검사용 상품'));
  await shop.locator('#productGrid button').click();await shop.locator('#openCart').click();await shop.locator('#openAddress').click();await shop.waitForFunction(()=>document.querySelector('#quoteStatus').textContent.includes('계산이 완료'));
  assert.equal(deliveryPayload.pickup.address,saved.address);assert.equal(deliveryPayload.pickup.detail,'테스트 픽업 위치');
  await shop.locator('#previewOrder').click();await shop.locator('#orderReviewPanel').waitFor({state:'visible'});
  await shop.evaluate(()=>refreshServerCatalog()); // A background poll must not invalidate the price-confirmed review.
  await shop.locator('#sendPreviewOrder').click();await shop.waitForFunction(()=>document.querySelector('#trackingOrderId').textContent.startsWith('SO-TEST-'));
  const orderId=await shop.locator('#trackingOrderId').innerText();assert.ok(orderId.startsWith('SO-TEST-'));
  const manager=await ctx.newPage();await manager.goto(origin+'/store-manager/index.html');await manager.waitForFunction(id=>document.querySelector('#orderList').textContent.includes(id),orderId);
  const card=manager.locator('.order-card').filter({hasText:orderId});await card.getByRole('button',{name:'주문 보기'}).click();
  await manager.getByRole('button',{name:'주문 수락',exact:true}).click();await manager.waitForFunction(()=>document.querySelector('#panelStatus').textContent==='준비중');
  await manager.getByRole('button',{name:'상품 준비완료',exact:true}).click();await manager.waitForFunction(()=>document.querySelector('#panelStatus').textContent==='준비완료');
  await manager.getByRole('button',{name:'배송요청',exact:true}).click();assert.equal(await manager.locator('#confirmDelivery').isDisabled(),true);await manager.locator('#packingCheck').check();await manager.locator('#confirmDelivery').click();await manager.waitForFunction(()=>document.querySelector('#panelStatus').textContent==='배송요청');
  await shop.locator('#refreshTracking').click();await shop.waitForFunction(()=>document.querySelector('#trackingStatus').textContent==='배송요청 완료');
  assert.equal(created,1);assert.deepEqual(errors,[]);
  const row=env.DB.database.prepare('SELECT status FROM store_preview_orders WHERE id=?').get(orderId);assert.equal(row.status,'DELIVERY_REQUESTED');
  const stock=env.DB.database.prepare('SELECT stock_remaining FROM store_preview_catalog WHERE store_id=?').get(saved.storeId);assert.equal(stock.stock_remaining,2);
  await shop.waitForFunction(()=>document.querySelector('#productGrid').textContent.includes('재고 2개'));
  await shop.locator('#orderTracking').scrollIntoViewIfNeeded();await shop.screenshot({path:'../tmp/store-commerce-tracking-mobile.png'});
  const quoteCount=deliveryQuotes;
  await shop.evaluate(()=>localStorage.removeItem('matjido-store-onboarding-preview-v1'));
  const missing=await ctx.newPage();await missing.goto(origin+`/online-store/index.html?catalogStore=${saved.storeId}`);await missing.waitForFunction(()=>document.querySelector('#productGrid').textContent.includes('검사용 상품'));await missing.locator('#productGrid button').click();await missing.locator('#openCart').click();await missing.locator('#openAddress').click();await missing.waitForFunction(()=>document.querySelector('#quoteStatus').textContent.includes('픽업 주소를 확인하지 못했습니다'));assert.equal(deliveryQuotes,quoteCount,'Missing pickup must not produce a quote with an empty origin');
  console.log('PASS local API integration: UI product registration → signed server quote → one test order → merchant accept/prepare/packing confirmation → delivery-request state → customer tracking; stock 3→2. No hosted writes, real routing, payment, dispatch or delivery completion.');
}finally{await browser.close();env.DB.database.close();}
