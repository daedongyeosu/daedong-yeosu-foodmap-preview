// Isolated application test with native Chromium touch input; no operating browser or hosted writes.
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
let playwright;try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs')).href);}
const origin=process.env.STUDIO_TEST_ORIGIN||'http://127.0.0.1:4198';
if(new URL(origin).hostname!=='127.0.0.1')throw Error('Loopback only');
const browser=await playwright.chromium.launch({headless:true});
async function pinch(session,x,y){
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:x-30,y,id:0},{x:x+30,y,id:1}]});
  for(const distance of [35,40,45,50,55,60,65,70]){await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x-distance,y,id:0},{x:x+distance,y,id:1}]});await new Promise(resolve=>setTimeout(resolve,25));}
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
}
try{
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[],outside=[];
  context.on('page',page=>page.on('pageerror',error=>errors.push(error.message)));
  await context.route('**/*',route=>{if(new URL(route.request().url()).origin!==origin){outside.push(route.request().url());return route.abort();}return route.continue();});
  // Control distinguishes a headless host with native page zoom disabled from an app regression.
  const control=await context.newPage();await control.setContent('<meta name="viewport" content="width=device-width,initial-scale=1"><div style="height:1800px;background:beige">Unrestricted native pinch control</div>');
  const controlSession=await context.newCDPSession(control);await pinch(controlSession,195,300);
  const nativeZoomAvailable=await control.waitForFunction(()=>visualViewport.scale>1.2,null,{timeout:1500}).then(()=>true,()=>false);await controlSession.detach();await control.close();
  if(!nativeZoomAvailable)console.warn('UNVERIFIED native zoom: unrestricted control also stays at scale 1 on this headless host. Physical mobile pinch verification remains required.');
  for(const example of ['bakery','boutique','banchan','hardware']){
    const page=await context.newPage();await page.goto(origin+`/store-studio/index.html?example=${example}&view=customer`);await page.locator('.scene-item img').first().waitFor();await page.waitForFunction(()=>[...document.querySelectorAll('.scene-item img')].every(img=>img.complete&&img.naturalWidth>0));
    assert.equal(await page.locator('#zoomScene').count(),0);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    const image=page.locator('.scene-item').first();await image.scrollIntoViewIfNeeded();const before=await image.getAttribute('style');
    const session=await context.newCDPSession(page),scale=()=>page.evaluate(()=>visualViewport.scale);
    const initial=await scale(),sceneBox=await page.locator('#scene').boundingBox();
    assert.ok(await image.evaluate(node=>[node,node.closest('#scene'),node.closest('#sceneViewport')].every(element=>/pinch-zoom|manipulation/.test(getComputedStyle(element).touchAction))),'No ancestor may suppress native pinch');
    await pinch(session,195,Math.min(650,sceneBox.y+sceneBox.height/2));
    if(nativeZoomAvailable)await page.waitForFunction(base=>visualViewport.scale>base*1.2,initial,{timeout:5000});
    assert.equal(await image.getAttribute('style'),before,'Pinch must never move or resize the merchant product');
    if(example==='bakery')await page.screenshot({path:'../tmp/studio-native-pinch-mobile.png'});
    // Reset only this automated test viewport, then verify ordinary product selection and cart.
    await session.send('Emulation.setPageScaleFactor',{pageScaleFactor:1});
    await page.locator('.browse-product').first().tap();await page.locator('#productDetails').waitFor({state:'visible'});await page.locator('#sampleAdd').tap();assert.equal(await page.locator('#sampleCartCount').innerText(),'1');
    const detail=page.locator('#customerProductPhoto');await detail.scrollIntoViewIfNeeded();const detailBox=await detail.boundingBox();
    await pinch(session,detailBox.x+detailBox.width/2,detailBox.y+Math.min(detailBox.height/2,80));
    assert.ok(await detail.evaluate(node=>/auto|pinch-zoom|manipulation/.test(getComputedStyle(node).touchAction)));
    if(nativeZoomAvailable)await page.waitForFunction(()=>visualViewport.scale>1.2);await session.detach();await page.close();
  }
  assert.deepEqual(errors,[]);assert.deepEqual(outside,[]);
  console.log(`PASS four stores: native pinch allowed at target/ancestors, two-finger input leaves product geometry unchanged, tap/details/cart, normal page fit; zero remote requests. Native scale change ${nativeZoomAvailable?'verified':'UNVERIFIED (control unavailable)'}.`);
}finally{await browser.close();}
