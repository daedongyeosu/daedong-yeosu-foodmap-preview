// Isolated customer application QA; local examples only, no payment, orders or hosted writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
let playwright;try{playwright=await import('playwright');}catch{const require=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'qa.cjs'));playwright=require('playwright');}
const {chromium}=playwright,outputDir=process.env.OUTPUT_DIR||'../tmp';fs.mkdirSync(outputDir,{recursive:true});
const origin=process.env.STUDIO_TEST_ORIGIN||'http://127.0.0.1:4198';if(new URL(origin).hostname!=='127.0.0.1')throw Error('Loopback only');
const browser=await chromium.launch({headless:true});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[],outside=[];
 await context.route('**/*',r=>{if(new URL(r.request().url()).origin!==origin){outside.push(r.request().url());return r.abort();}return r.continue();});
 for(const example of ['bakery','boutique','banchan','hardware']){
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  await page.goto(origin+'/store-studio/index.html?example='+example+'&view=customer');await page.locator('.scene-item img').first().waitFor();
  await page.locator('#scene').scrollIntoViewIfNeeded();const item=page.locator('.scene-item').first(),geometry=await item.getAttribute('style');
  await item.tap();assert.match(await page.locator('#cartDockQuantity').innerText(),/아직 담지/);assert.equal(await page.locator('#sampleCartCount').innerText(),'0');
  const session=await context.newCDPSession(page);await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:2.5});
  await page.waitForFunction(()=>visualViewport.scale>2);
  await page.evaluate(()=>window.scrollTo(0,document.querySelector('#scene').getBoundingClientRect().top+scrollY-30));
  const inView=()=>page.evaluate(()=>{const b=document.querySelector('#cartDock').getBoundingClientRect(),v=visualViewport;return b.left>=v.offsetLeft-1&&b.top>=v.offsetTop-1&&b.right<=v.offsetLeft+v.width+1&&b.bottom<=v.offsetTop+v.height+1;});
  await page.waitForFunction(()=>{const b=document.querySelector('#cartDock').getBoundingClientRect(),v=visualViewport;return b.right<=v.offsetLeft+v.width+1&&b.bottom<=v.offsetTop+v.height+1;});assert.ok(await inView());
  // Chromium input takes CSS coordinates; the dock itself compensates the native page scale.
  async function tapDock(id){const p=await page.locator('#'+id).evaluate(node=>{const b=node.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};});await page.touchscreen.tap(p.x,p.y);}
  const beforeTap=await page.evaluate(()=>visualViewport.pageTop);
  await tapDock('cartDockAdd');await page.waitForFunction(()=>document.querySelector('#sampleCartCount').textContent==='1');
  assert.ok(Math.abs(await page.evaluate(()=>visualViewport.pageTop)-beforeTap)<2,'Adding never scrolls away from the shop');
  assert.match(await page.locator('#cartDockFeedback').innerText(),/1개를 체험 장바구니에 담았습니다/);assert.match(await page.locator('#cartDockQuantity').innerText(),/1개 담김/);assert.match(await page.locator('#cartDockSummary').innerText(),/장바구니 1개/);
  await tapDock('cartDockAdd');await page.waitForFunction(()=>document.querySelector('#sampleCartCount').textContent==='2');
  await tapDock('cartDockToggle');await page.waitForFunction(()=>{const b=document.querySelector('#cartDock').getBoundingClientRect(),v=visualViewport;return !document.querySelector('#cartDockDetails').hidden&&b.top>=v.offsetTop-1&&b.bottom<=v.offsetTop+v.height+1;});assert.ok(await inView());
  const row=page.locator('#cartDockItems .cart-dock-row').first();
  const minus=()=>row.getByRole('button',{name:/수량 줄이기$/}),plus=()=>row.getByRole('button',{name:/수량 늘리기$/}),remove=()=>row.getByRole('button',{name:/ 삭제$/});
  assert.equal(await minus().count(),1,'The expanded cart needs a minus control, not only whole-product removal');
  assert.equal(await plus().count(),1);assert.equal(await row.locator('.cart-quantity-value').innerText(),'2');
  async function tapControl(button){const p=await button.evaluate(node=>{const b=node.getBoundingClientRect();return {x:b.x+b.width/2,y:b.y+b.height/2};});await page.touchscreen.tap(p.x,p.y);}
  const totalForTwo=await page.locator('#sampleCartTotal').innerText(),beforeQuantity=await page.evaluate(()=>visualViewport.pageTop);
  await tapControl(minus());await page.waitForFunction(()=>document.querySelector('#sampleCartCount').textContent==='1');
  assert.equal(await row.locator('.cart-quantity-value').innerText(),'1');assert.ok(await minus().isDisabled());
  assert.match(await page.locator('#cartDockQuantity').innerText(),/1개 담김/);assert.ok(await inView());
  assert.ok(Math.abs(await page.evaluate(()=>visualViewport.pageTop)-beforeQuantity)<2,'Quantity changes stay in the shop viewport');
  await tapControl(plus());await page.waitForFunction(()=>document.querySelector('#sampleCartCount').textContent==='2');
  assert.equal(await page.locator('#sampleCartTotal').innerText(),totalForTwo);assert.equal(await row.locator('.cart-quantity-value').innerText(),'2');
  if(example==='bakery'||example==='banchan')await page.screenshot({path:path.join(outputDir,'browser-studio-cart-'+example+'-quantity-mobile.png')});
  await tapControl(remove());await page.waitForFunction(()=>document.querySelector('#sampleCartCount').textContent==='0');assert.match(await page.locator('#cartDockQuantity').innerText(),/아직 담지/);assert.match(await page.locator('#cartDockFeedback').innerText(),/삭제/);
  await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await page.locator('#cartDockToggle').tap();
  // Quantity limit and clear use the same source of truth as the original cart.
  for(let i=0;i<20;i++)await page.locator('#cartDockAdd').evaluate(button=>button.click());assert.equal(await page.locator('#sampleCartCount').innerText(),'20');assert.ok(await page.locator('#cartDockAdd').isDisabled());
  await page.locator('#cartDockToggle').tap();assert.ok(await plus().isDisabled());await minus().tap();assert.equal(await page.locator('#sampleCartCount').innerText(),'19');assert.ok(await plus().isEnabled());
  // Repeated keyboard changes retain focus even though the dock is re-rendered.
  await plus().focus();await page.keyboard.press('Enter');assert.equal(await page.locator('#sampleCartCount').innerText(),'20');
  assert.match(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),/수량 줄이기$/);
  await page.locator('#sampleCartClear').evaluate(button=>button.click());assert.match(await page.locator('#cartDockSummary').innerText(),/장바구니 0개/);assert.equal(await item.getAttribute('style'),geometry);
  // A different SKU must survive quantity changes/deletion of the first one.
  await page.locator('.browse-product').nth(1).evaluate(button=>button.click());await page.locator('#cartDockAdd').tap();
  await item.evaluate(button=>button.click());await page.locator('#cartDockAdd').tap();await page.locator('#cartDockAdd').tap();
  assert.equal(await page.locator('#sampleCartCount').innerText(),'3');assert.equal(await page.locator('#cartDockItems .cart-dock-row').count(),2);
  const firstSku=await page.locator('#cartDockItems button').last().getAttribute('data-cart-sku');
  const firstRow=page.locator('#cartDockItems .cart-dock-row').last(),otherRow=page.locator('#cartDockItems .cart-dock-row').first();
  await firstRow.getByRole('button',{name:/수량 줄이기$/}).tap();assert.equal(await page.locator('#sampleCartCount').innerText(),'2');assert.equal(await otherRow.locator('.cart-quantity-value').innerText(),'1');
  await page.setViewportSize({width:320,height:568});await page.waitForTimeout(100);assert.ok(await inView(),'Narrow phones still show the cart controls');
  for(const button of await page.locator('#cartDockItems button').all()){const box=await button.boundingBox();assert.ok(box.width>=44&&box.height>=44,'Touch targets remain at least 44px');}
  await firstRow.getByRole('button',{name:/ 삭제$/}).tap();assert.equal(await page.locator('#sampleCartCount').innerText(),'1');assert.equal(await page.locator('#cartDockItems .cart-dock-row').count(),1);
  assert.notEqual(await page.locator('#cartDockItems button').first().getAttribute('data-cart-sku'),firstSku);assert.equal(await page.locator('#sampleCartItems .cart-quantity-value').innerText(),'1');
  await page.locator('#sampleCartClear').evaluate(button=>button.click());await page.setViewportSize({width:390,height:844});
  await page.locator('#preview').evaluate(button=>button.click());assert.ok(await page.locator('#cartDock').isHidden());await page.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);console.log('PASS four stores 390×844: 2.5× zoom physical add/minus/plus/delete taps, 2→1→2 exact totals, minimum1/maximum20, focus retained, dock in viewport, clear/editor hidden; zero remote requests');
}finally{await browser.close();}
