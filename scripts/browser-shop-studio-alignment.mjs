import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
let playwright;try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs')).href);}
const browser=await playwright.chromium.launch({headless:true}),origin=process.env.STUDIO_TEST_ORIGIN||'http://127.0.0.1:4192';
try{
  const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true}),page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());await page.goto(origin+'/store-studio/index.html');await page.waitForFunction(()=>!document.querySelector('#choosePhotos').disabled);
  const scene=await page.evaluate(()=>({format:'matjido-studio',version:1,example:false,scene:{shopTitle:'가지런한 내 상점',decor:[['one',8,26,16,12],['two',40,43,20,18],['three',75,67,18,20]].map(([id,x,y,width,height])=>({...ShopStudioDesign.createDecor('rack',id),x,y,width,height})),items:[],appearance:{},business:{}}}));
  await page.locator('#sceneFile').setInputFiles({name:'scene.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(scene))});await page.waitForSelector('#decorRoot .decor');await page.locator('#compositionSettings').evaluate(n=>n.open=true);await page.locator('#furnitureSettings').evaluate(n=>n.open=true);
  assert.equal(await page.locator('[data-align=left]').isDisabled(),true);for(const id of ['one','two'])await page.locator(`[data-group-id=${id}]`).check();assert.equal(await page.locator('[data-align=spaceX]').isDisabled(),true);await page.locator('[data-group-id=three]').check();
  const positions=()=>page.locator('#decorRoot .decor').evaluateAll(nodes=>nodes.map(n=>({x:parseFloat(n.style.left),y:parseFloat(n.style.top),width:parseFloat(n.style.width)})));
  await page.locator('[data-align=bottom]').click();const aligned=await page.locator('#decorRoot .decor').evaluateAll(nodes=>nodes.map(n=>parseFloat(n.style.top)+parseFloat(n.style.height)));assert.ok(aligned.every(y=>Math.abs(y-aligned[0])<1e-6));
  await page.locator('[data-align=spaceX]').click();const spaced=await positions();assert.ok(Math.abs((spaced[1].x-spaced[0].x-spaced[0].width)-(spaced[2].x-spaced[1].x-spaced[1].width))<1e-6);
  await page.locator('#undo').click();assert.equal((await positions())[1].x,40);await page.locator('#redo').click();assert.deepEqual(await positions(),spaced);
  await page.waitForFunction(expected=>new Promise(resolve=>{const request=indexedDB.open('matjido-shop-studio-v1');request.onsuccess=()=>{const db=request.result,r=db.transaction('drafts').objectStore('drafts').get('scene');r.onsuccess=()=>{const ok=r.result?.decor?.[1]?.x===expected;db.close();resolve(ok);};};}),spaced[1].x);
  await page.reload();await page.waitForSelector('#decorRoot .decor');assert.deepEqual(await positions(),spaced);await page.locator('#furnitureSettings').evaluate(n=>n.open=true);await page.locator('#compositionSettings').evaluate(n=>n.open=true);for(const id of ['one','two','three'])await page.locator(`[data-group-id=${id}]`).check();
  await page.locator('#decorList button').first().click();await page.locator('#decorLocked').check();const locked=await positions();await page.locator('[data-align=left]').click();assert.deepEqual(await positions(),locked);assert.match(await page.locator('#saveStatus').textContent(),/잠금/);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#compositionAlignment').screenshot({path:'../tmp/shop-alignment-tools-mobile.png'});await page.locator('#preview').click();assert.equal(await page.locator('#compositionSettings').isVisible(),false);assert.deepEqual(errors,[]);
  console.log('PASS alignment browser: selection gating, bottoms/equal gaps, undo/redo/reload, locked all-or-nothing, mobile layout and customer isolation');
}finally{await browser.close();}
