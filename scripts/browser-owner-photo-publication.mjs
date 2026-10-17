// Separate phone-sized contexts and real compiled Worker, memory D1/R2 only. Never real identity or order writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'qa.cjs')),{chromium}=require('playwright');
const origin=process.env.STUDIO_TEST_ORIGIN||'http://127.0.0.1:4197',sourceId='qa-existing-store';if(new URL(origin).hostname!=='127.0.0.1')throw Error('Loopback only');
const browser=await chromium.launch({headless:true}),errors=[],outside=[];
const detail={id:sourceId,name:'상품사진 공개 시험 가게',category:'반찬·먹거리',address:'전남 여수시 테스트로 10',phone:'01012345678'};
async function device(role){const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});if(role)await ctx.addCookies([{name:'qa-shop-role',value:role,url:origin}]);
 await ctx.route('**/data-api.js?*',r=>r.fulfill({contentType:'application/javascript',body:`window.daedongDataApi={detail:async()=>(${JSON.stringify(detail)}),menu:async()=>({storeId:'${sourceId}',items:[]})};`}));
 await ctx.route('**/*',r=>{if(new URL(r.request().url()).origin===origin)return r.fallback();outside.push(r.request().url());return r.abort();});return ctx;}
async function save(page){await page.locator('#saveOnlineShop').click();await page.waitForFunction(()=>document.querySelector('#publicationStatus').textContent.includes('초안을 저장'));}
try{
 const admin=await device('admin');assert.equal((await admin.request.post(origin+'/api/qa-reset-shop')).status(),200);
 assert.equal((await admin.request.post(origin+'/api/online-shops/manage/'+sourceId+'/grant',{data:{userId:'owner',reason:'메모리 시험용 상점주 확인'},headers:{origin}})).status(),200);
 const owner=await device('owner'),page=await owner.newPage();page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
 await page.goto(origin+'/store-partner/index.html?sourceStore='+sourceId);await page.locator('#importExistingStoreBasics').click();await page.waitForFunction(()=>document.querySelector('#storeName').value==='상품사진 공개 시험 가게');await page.locator('#nextStep').click();await page.locator('#nextStep').click();
 const rows=[['크루아상',3200,'croissant'],['식빵',6500,'bread'],['케이크',9000,'cake']];
 for(const [i,[name,price,file]] of rows.entries()){
  await page.locator('#productName').fill(name);await page.locator('#productPrice').fill(String(price));await page.locator('#productPhoto').setInputFiles(path.resolve('assets/studio-bakery/'+file+'.webp'));await page.waitForFunction(()=>!document.querySelector('#addProduct').disabled);await page.locator('#addProduct').click();await page.waitForFunction(n=>document.querySelectorAll('.product-draft-photo').length===n,i+1);
 }
 const dataImages=await page.locator('.product-draft-photo').evaluateAll(nodes=>nodes.map(n=>n.src));assert.equal(new Set(dataImages).size,3);
 await page.locator('#nextStep').click();
 // Deliberate first upload failure: no false success or loss of the owner's local pictures.
 await page.route('**/api/online-shops/manage/*/photos',r=>r.fulfill({status:503,json:{message:'시험: 사진 저장 연결 실패'}}),{times:1});
 await page.locator('#saveOnlineShop').click();await page.waitForFunction(()=>document.querySelector('#publicationStatus').textContent.includes('사진 저장 연결 실패'));assert.equal((await admin.request.get(origin+'/api/online-shops/public/'+sourceId)).status(),404);
 assert.deepEqual(await page.locator('.product-draft-photo').evaluateAll(nodes=>nodes.map(n=>n.src)),dataImages);
 await save(page);const server=await(await owner.request.get(origin+'/api/online-shops/manage/'+sourceId)).json();const images=server.shop.products.map(p=>p.image);assert.equal(new Set(images).size,3);
 const anonymous=await device();for(const image of images){assert.equal((await anonymous.request.get(image)).status(),404);assert.equal((await owner.request.get(image)).status(),200);}
 await page.locator('#publishOnlineShop').click();await page.waitForFunction(()=>document.querySelector('#publicationStatus').textContent.includes('공개했습니다'));
 await owner.close(); // No owner browser, localStorage or IndexedDB survives into the following contexts.
 const ownerPhone2=await device('owner'),second=await ownerPhone2.newPage();second.on('dialog',d=>d.accept());second.on('pageerror',e=>errors.push(e.message));
 await second.goto(origin+'/store-partner/index.html?sourceStore='+sourceId);await second.locator('#loadOnlineShop').waitFor({state:'visible'});await second.locator('#loadOnlineShop').click();await second.waitForFunction(()=>document.querySelectorAll('.product-draft-photo').length===3);
 assert.deepEqual(await second.locator('.product-draft-photo').evaluateAll(nodes=>nodes.map(n=>n.src)),images);
 const customer=await anonymous.newPage();customer.on('pageerror',e=>errors.push(e.message));await customer.goto(origin+'/online-store/index.html?publicShop='+sourceId);
 await customer.waitForFunction(()=>document.querySelectorAll('#productGrid img').length===3&&[...document.querySelectorAll('#productGrid img')].every(n=>n.complete&&n.naturalWidth>0));
 await customer.screenshot({path:'../tmp/owner-photo-public-products-mobile.png',fullPage:true});
 for(let i=0;i<3;i++){const response=await anonymous.request.get(images[i]);assert.equal(response.status(),200);assert.ok(Buffer.from(await response.body()).equals(Buffer.from(dataImages[i].split(',')[1],'base64')));}
 assert.equal(await customer.evaluate(async()=>Object.keys(await MatjidoProductPhotos.list('shop-qa-existing-store')).length),0,'Customer cannot depend on owner-local image storage');
 for(let i=0;i<3;i++)await customer.locator('#productGrid .product-card').nth(i).getByRole('button',{name:'장바구니 담기',exact:true}).click();await customer.locator('#openCart').click();assert.equal(await customer.locator('#productSubtotal').innerText(),'18,700원');assert.ok(await customer.locator('#previewOrder').isDisabled());
 await customer.getByRole('button',{name:'크루아상 수량 늘리기',exact:true}).click();assert.equal(await customer.locator('#productSubtotal').innerText(),'21,900원');await customer.getByRole('button',{name:'식빵 수량 줄이기',exact:true}).click();assert.equal(await customer.locator('#productSubtotal').innerText(),'15,400원');
 await customer.screenshot({path:'../tmp/owner-photo-public-customer-cart-mobile.png'});
 await customer.reload();await customer.locator('#openCart').click();assert.equal(await customer.locator('#productSubtotal').innerText(),'15,400원');
 await second.locator('#nextStep').click();await second.locator('#nextStep').click();await second.getByRole('button',{name:'크루아상 수정',exact:true}).click();await second.locator('#productPhoto').setInputFiles(path.resolve('assets/studio-bakery/coffee.webp'));await second.waitForFunction(()=>!document.querySelector('#addProduct').disabled);await second.locator('#addProduct').click();await second.locator('#nextStep').click();await save(second);
 const changed=await(await ownerPhone2.request.get(origin+'/api/online-shops/manage/'+sourceId)).json(),newImage=changed.shop.products[0].image;assert.notEqual(newImage,images[0]);assert.equal((await anonymous.request.get(newImage)).status(),404);assert.equal((await anonymous.request.get(images[0])).status(),200);
 await second.locator('#publishOnlineShop').click();await second.waitForFunction(()=>document.querySelector('#publicationStatus').textContent.includes('공개했습니다'));assert.equal((await anonymous.request.get(newImage)).status(),200);assert.equal((await anonymous.request.get(images[0])).status(),404);
 await second.locator('#unpublishOnlineShop').click();await second.waitForFunction(()=>document.querySelector('#publicationStatus').textContent.includes('공개를 중지'));
 for(const image of [newImage,...images])assert.equal((await anonymous.request.get(image)).status(),404);assert.equal((await anonymous.request.get(origin+'/api/online-shops/public/'+sourceId)).status(),404);
 await customer.reload();await customer.waitForFunction(()=>document.querySelector('#catalogSelectionStatus').textContent.includes('비공개'));assert.equal(await customer.locator('#productGrid .product-card').count(),0);
 const state=await(await admin.request.get(origin+'/api/qa-state')).json();assert.equal(state.orders,0);assert.equal(state.errandReceipts,0);assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
 console.log('PASS three device photos → private server storage → publication → owner phone2 restore + anonymous phone3 distinct exact bytes → 18700 cart/increase/remove/reload → draft replacement isolation → republish → unpublish hides JSON + photos. No real identity, payment, order, dispatch or remote requests.');
}finally{await browser.close();}
