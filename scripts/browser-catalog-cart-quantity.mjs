// Isolated fixture catalog only; no real merchants, payments, dispatch or remote requests.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
let playwright;try{playwright=await import('playwright');}catch{playwright=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'qa.cjs'))('playwright');}
const origin=process.env.STUDIO_TEST_ORIGIN||'http://127.0.0.1:4199';if(new URL(origin).hostname!=='127.0.0.1')throw Error('Loopback only');
const output=process.env.OUTPUT_DIR||'../tmp';fs.mkdirSync(output,{recursive:true});
const browser=await playwright.chromium.launch({headless:true});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[],writes=[],outside=[];
 ctx.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
 let fail=false,stock=3,price=3200,hold=false,heldResolve;const fixtureProducts=()=>[{id:'a',name:'시험 크루아상',price,stockMode:'수량 관리',stockQuantity:stock,unit:'개'},{id:'b',name:'시험 식빵',price:6500,stockMode:'판매 가능',unit:'개'},{id:'c',name:'시험 케이크',price:9000,stockMode:'판매 가능',unit:'개'}];
 await ctx.route('**/*',async route=>{const request=route.request(),url=new URL(request.url());if(url.origin===origin&&['GET','HEAD'].includes(request.method()))return route.continue();if(url.origin==='https://daedong-yeosu-admin.sisakim.chatgpt.site'&&url.pathname.endsWith('/catalog')&&request.method()==='GET'){if(hold){hold=false;return heldResolve(route);}return route.fulfill({status:fail?503:200,json:{storeId:'qa-quantity',storeName:'격리 수량 시험점',products:fixtureProducts()}});}if(!['GET','HEAD'].includes(request.method()))writes.push(request.url());else outside.push(request.url());return route.abort();});
 const page=await ctx.newPage();await page.goto(origin+'/online-store/index.html?catalogStore=qa-quantity');await page.waitForFunction(()=>document.querySelectorAll('#productGrid button').length===3);
 for(let i=0;i<3;i++){await page.locator('#productGrid button').nth(i).tap();await page.waitForFunction(count=>document.querySelector('#cartCount').textContent===String(count),i+1);}
 await page.locator('#openCart').tap();assert.equal(await page.locator('#productSubtotal').innerText(),'18,700원');
 const minus=()=>page.getByRole('button',{name:'시험 크루아상 수량 줄이기',exact:true}),plus=()=>page.getByRole('button',{name:'시험 크루아상 수량 늘리기',exact:true});assert.ok(await minus().isDisabled());
 stock=0;await plus().tap();await page.waitForFunction(()=>document.querySelector('#orderStatus').textContent.includes('구매할 수 없는'));assert.equal(await page.locator('#cartCount').innerText(),'3','Fresh sold-out check must not add or remove the existing line');
 stock=3;await page.reload();await page.waitForFunction(()=>document.querySelectorAll('#productGrid button').length===3);await page.locator('#openCart').tap();
 fail=true;await plus().tap();await page.waitForFunction(()=>document.querySelector('#orderStatus').textContent.includes('확인하지 못'));assert.equal(await page.locator('#productSubtotal').innerText(),'18,700원');fail=false;
 price=3000;await plus().tap();await page.waitForFunction(()=>document.querySelector('#productSubtotal').textContent==='21,500원');await minus().tap();await page.waitForFunction(()=>document.querySelector('#productSubtotal').textContent==='18,500원');assert.ok(await minus().isDisabled());
 await page.evaluate(()=>{window.qaSetItem=Storage.prototype.setItem;Storage.prototype.setItem=function(key,value){if(key.startsWith('matjido-customer-store-cart'))throw Error('test quota');return window.qaSetItem.call(this,key,value);};});
 await page.getByRole('button',{name:'시험 식빵 삭제',exact:true}).tap();await page.waitForFunction(()=>document.querySelector('#orderStatus').textContent.includes('저장하지 못'));assert.equal(await page.locator('#cartCount').innerText(),'3');assert.equal(await page.locator('#productSubtotal').innerText(),'18,500원');await page.evaluate(()=>{Storage.prototype.setItem=window.qaSetItem;});
 // A second tab changes another SKU while the first tab waits for fresh stock.
 const second=await ctx.newPage();await second.goto(origin+'/online-store/index.html?catalogStore=qa-quantity');await second.waitForFunction(()=>document.querySelector('#cartCount').textContent==='3');
 const heldRequest=new Promise(resolve=>{heldResolve=resolve;});hold=true;await plus().tap();const held=await heldRequest;
 const otherCart=await second.evaluate(()=>{const key='matjido-customer-store-cart-v1:store:qa-quantity',cart=JSON.parse(localStorage.getItem(key));cart.c={...cart.c,quantity:2};localStorage.setItem(key,JSON.stringify(cart));return cart;});
 await held.fulfill({json:{storeId:'qa-quantity',products:fixtureProducts()}});await page.waitForFunction(()=>document.querySelector('#orderStatus').textContent.includes('다른 화면'));assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('matjido-customer-store-cart-v1:store:qa-quantity'))),otherCart);assert.equal(await page.locator('#cartCount').innerText(),'4');
 fail=true;await page.getByRole('button',{name:'시험 식빵 삭제',exact:true}).tap();assert.equal(await page.locator('#cartCount').innerText(),'3','Deletion works offline and preserves other SKUs');fail=false;
 await page.reload();await page.waitForFunction(()=>document.querySelector('#cartCount').textContent==='3');await page.locator('#openCart').tap();assert.equal(await page.locator('#productSubtotal').innerText(),'21,000원');await page.setViewportSize({width:320,height:568});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.screenshot({path:path.join(output,'browser-catalog-quantity-mobile.png')});
  await second.evaluate(()=>localStorage.clear());await page.waitForFunction(()=>document.querySelector('#cartCount').textContent==='0');assert.equal(await page.locator('#orderTotal').innerText(),'배송비 계산 전');
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.deepEqual(outside,[]);
 console.log('PASS registered catalog fixture: three products18700, minimum1, fresh stock/failure, lower price lock, failed-delete rollback, stale-tab conflict, offline explicit delete, reload, 320px; zero orders/remote requests');
}finally{await browser.close();}
