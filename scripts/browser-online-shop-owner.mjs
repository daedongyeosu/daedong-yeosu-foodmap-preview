import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'qa.cjs')),{chromium}=require('playwright');
const origin=process.env.STUDIO_TEST_ORIGIN||'http://127.0.0.1:4197',sourceId='qa-existing-store';
if(new URL(origin).hostname!=='127.0.0.1')throw Error('Loopback QA only');
const detail={id:sourceId,store_id:sourceId,name:'세 메뉴 시험 상점',category:'반찬·먹거리',address:'전남 여수시 테스트로 10',phone:'01012345678',hasMenu:true,customerVisible:true,district:'문수동',channelKeys:['phone'],routes:[{key:'phone',name:'전화주문',url:'tel:01012345678'}]};
const menu={storeId:sourceId,items:['croissant','sourdough','coffee'].map((image,i)=>({id:'source-'+i,name:['크루아상','시골빵','커피'][i],description:'기존 메뉴 설명 '+i,category:'빵·음료',image:'https://preview.daedongmap.com/assets/studio-bakery/'+image+'.webp'}))};
const browser=await chromium.launch({headless:true}),errors=[];
async function setup(ctx){
  await ctx.route('**/data-api.js?*',r=>r.fulfill({contentType:'application/javascript',body:`window.daedongDataApi={regionCode:'yeosu',isCustomerHiddenStoreId:()=>false,catalog:async()=>[${JSON.stringify(detail)}],catalogBootstrap:async()=>[${JSON.stringify(detail)}],services:async()=>({}),detail:async()=>(${JSON.stringify(detail)}),menu:async()=>(${JSON.stringify(menu)})};`}));
  await ctx.route('https://preview.daedongmap.com/assets/studio-bakery/**',r=>r.fulfill({contentType:'image/webp',body:fs.readFileSync(path.resolve('assets/studio-bakery/'+r.request().url().split('/').at(-1)))}));
  await ctx.route('**/*',async r=>{const u=new URL(r.request().url());if(u.origin===origin||u.origin==='https://preview.daedongmap.com'&&u.pathname.startsWith('/assets/studio-bakery/'))return r.fallback();if(u.protocol==='data:')return r.fallback();return r.abort();});
}
try{
  const reset=await browser.newContext();await reset.addCookies([{name:'qa-shop-role',value:'admin',url:origin}]);const state=await reset.request.get(origin+'/api/online-shops/manage/'+sourceId);if(state.ok()){const saved=await state.json();if(saved.published)await reset.request.post(origin+'/api/online-shops/manage/'+sourceId+'/unpublish',{data:{version:saved.version}});}await reset.close();
  const owner=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await setup(owner);const page=await owner.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  await page.goto(origin+'/store-partner/index.html?sourceStore='+sourceId);await page.locator('#importExistingStore').click();await page.waitForFunction(()=>document.querySelector('#existingStoreStatus').textContent.includes('3개 메뉴'));
  assert.equal(await page.locator('#storeName').inputValue(),detail.name);assert.equal(await page.locator('.product-draft-photo').count(),3);
  await page.locator('#nextStep').click();await page.locator('#nextStep').click();assert.equal(await page.locator('.imported-price').count(),3);assert.equal(await page.locator('.imported-price').first().inputValue(),'');
  await page.locator('#deliveryShare').focus();await page.keyboard.press('ArrowLeft');assert.match(await page.locator('#deliveryShareEstimate').innerText(),/고객 부담 5,400원.*상점 부담 100원/);
  await page.getByRole('button',{name:'반반',exact:true}).click();assert.match(await page.locator('#deliveryShareEstimate').innerText(),/2,750원.*2,750원/);
  await page.locator('#nextStep').click();await page.locator('#previewAgreement').check();await page.locator('#savePreview').click();await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.imported-price').length===3);assert.equal(await page.locator('.imported-price').first().inputValue(),'');
  const before=await owner.request.get(origin+'/api/online-shops/public/'+sourceId);assert.equal(before.status(),404);
  await owner.addCookies([{name:'qa-shop-role',value:'owner',url:origin}]);
  const admin=await browser.newContext();await admin.addCookies([{name:'qa-shop-role',value:'admin',url:origin}]);const grant=await admin.request.post(origin+'/api/online-shops/manage/'+sourceId+'/grant',{data:{userId:'owner',reason:'격리 시험에서 확인한 합성 상점'}});assert.equal(grant.status(),200,await grant.text());
  // Reconnect obtains version zero without replacing the local owner draft.
  await page.reload();await page.locator('#nextStep').click();await page.locator('#nextStep').click();await page.locator('#nextStep').click();await page.locator('#saveOnlineShop').click();await page.waitForFunction(()=>document.querySelector('#publicationStatus').textContent.includes('초안을 저장'));
  await page.locator('#publishOnlineShop').click();await page.waitForFunction(()=>document.querySelector('#publicationStatus').textContent.includes('모든 메뉴'));assert.equal((await admin.request.get(origin+'/api/online-shops/public/'+sourceId)).status(),404);
  await page.locator('[data-step-nav="3"]').click();for(let i=0;i<3;i++)await page.locator('.imported-price').nth(i).fill(String([3200,6500,9000][i]));
  await page.locator('#nextStep').click();await page.locator('#saveOnlineShop').click();await page.waitForFunction(()=>document.querySelector('#publicationStatus').textContent.includes('초안을 저장'));await page.locator('#publishOnlineShop').click();await page.waitForFunction(()=>document.querySelector('#publicationStatus').textContent.includes('공개했습니다'));
  const customer=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await setup(customer);const card=await customer.newPage();card.on('pageerror',e=>errors.push(e.message));
  // Exercise the actual detail renderer, keeping external navigation/order routes intact.
  await card.goto(origin+'/');await card.evaluate(async()=>{await catalogBootPromise;});await card.waitForTimeout(500);
  await card.evaluate(raw=>rc2OpenStoreFromCustomer({...normalizedStore(raw,0),__secureDetailReady:true}),detail);
  await card.getByRole('link',{name:'온라인 상점 보기',exact:true}).waitFor({timeout:5000});assert.ok(await card.locator('.online-shop-public-link>span:nth-child(2)').evaluate(n=>n.getBoundingClientRect().width>200));await card.screenshot({path:'../tmp/existing-shop-card-mobile.png'});
  await card.getByRole('link',{name:'온라인 상점 보기',exact:true}).click();await card.waitForFunction(()=>document.querySelectorAll('#productGrid .product-card').length===3);assert.equal(await card.locator('#productGrid img').count(),3);
  for(let i=0;i<3;i++)await card.locator('#productGrid .product-card').nth(i).getByRole('button',{name:'장바구니 담기',exact:true}).click();await card.locator('#openCart').click();assert.equal(await card.locator('#productSubtotal').innerText(),'18,700원');assert.ok(await card.locator('#previewOrder').isDisabled());assert.ok(await card.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await card.screenshot({path:'../tmp/existing-shop-customer-cart-mobile.png'});
  await card.locator('#openAddress').click();await card.getByRole('button',{name:'테스트 주소 선택 (실제 주소검색 아님)'}).click();await card.waitForFunction(()=>document.querySelector('#orderTotal').textContent.includes('20,850원'));assert.match(await card.locator('#storeSubsidy').innerText(),/2,150원/);assert.match(await card.locator('#customerDeliveryFee').innerText(),/2,150원/);assert.match(await card.locator('#platformFee').innerText(),/포함/);
  await page.locator('#unpublishOnlineShop').click();await page.waitForFunction(()=>document.querySelector('#publicationStatus').textContent.includes('공개를 중지'));
  await card.goto(origin+'/');await card.evaluate(async()=>{await catalogBootPromise;});await card.waitForTimeout(500);await card.evaluate(raw=>rc2OpenStoreFromCustomer({...normalizedStore(raw,0),__secureDetailReady:true}),detail);await card.waitForTimeout(600);assert.equal(await card.locator('.online-shop-public-link').count(),0);assert.equal(await card.locator('.online-shop-owner-link').count(),1);
  assert.deepEqual(errors,[]);console.log('PASS mobile: existing store → 3 original photos/unpriced menus → prices → 100-won slider/exact half/reload → verified server save/publication → anonymous actual card CTA → 18700 basket → unpublish hides CTA; no payment/order/dispatch.');
}finally{await browser.close();}
