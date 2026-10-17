// Isolated customer application QA; local examples only, no payment, orders or hosted writes.
import assert from 'node:assert/strict';
import path from 'node:path';
import {createRequire} from 'node:module';
const require=createRequire(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'qa.cjs')),{chromium}=require('playwright');
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
  assert.match(await page.locator('#cartDockItems').innerText(),/2개/);
  if(example==='bakery')await page.screenshot({path:'../tmp/studio-cart-dock-zoom-mobile.png'});
  await page.locator('#cartDockItems button').first().evaluate(button=>button.click());assert.equal(await page.locator('#sampleCartCount').innerText(),'0');assert.match(await page.locator('#cartDockQuantity').innerText(),/아직 담지/);assert.match(await page.locator('#cartDockFeedback').innerText(),/뺐습니다/);
  await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});await page.locator('#cartDockToggle').tap();
  // Quantity limit and clear use the same source of truth as the original cart.
  for(let i=0;i<20;i++)await page.locator('#cartDockAdd').evaluate(button=>button.click());assert.equal(await page.locator('#sampleCartCount').innerText(),'20');assert.ok(await page.locator('#cartDockAdd').isDisabled());
  await page.locator('#sampleCartClear').evaluate(button=>button.click());assert.match(await page.locator('#cartDockSummary').innerText(),/장바구니 0개/);assert.equal(await item.getAttribute('style'),geometry);
  await page.locator('#preview').evaluate(button=>button.click());assert.ok(await page.locator('#cartDock').isHidden());await page.close();
 }
 assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);console.log('PASS four stores 390×844: 2.5× zoom dock inside visual viewport, physical add taps, immediate quantity/message/total, drawer/remove/limit/clear, editor hidden; zero remote requests');
}finally{await browser.close();}
