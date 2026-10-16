import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
let playwright;
try{playwright=await import('playwright');}
catch{playwright=await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs')).href);}
const {chromium}=playwright;
const browser=await chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(`${process.env.STUDIO_TEST_ORIGIN||'http://127.0.0.1:4192'}/store-studio/`);
  // The fixture server serves files, so explicitly use index.html if it has no directory index.
  if(await page.locator('#photos').count()===0)await page.goto(`${process.env.STUDIO_TEST_ORIGIN||'http://127.0.0.1:4192'}/store-studio/index.html`);
  await page.locator('#preset').waitFor();
  await page.waitForFunction(()=>!document.querySelector('#choosePhotos').disabled);
  await page.locator('#shopTitle').fill('사장님의 카페');await page.locator('#shopTitle').press('Tab');
  await page.locator('#zones').selectOption('3');await page.locator('#material').selectOption('brick');
  // Create actual transparent image bytes through the browser; no external uploads.
  const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=120;c.height=120;const x=c.getContext('2d');x.fillStyle='#98562a';x.fillRect(30,30,65,60);x.strokeStyle='#98562a';x.lineWidth=8;x.strokeRect(92,40,20,30);return c.toDataURL('image/png').split(',')[1];});
  await page.locator('#photos').setInputFiles([{name:'커피.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')},{name:'두번째 커피.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')}]);
  await page.waitForFunction(()=>document.querySelectorAll('.scene-item').length===2&&!document.querySelector('#choosePhotos').disabled);
  assert.equal(await page.locator('.divider').count(),2);
  const item=page.locator('.scene-item').first();await item.click();
  await page.locator('#itemName').fill('따뜻한 라테');await page.locator('#itemName').press('Tab');
  const before=await page.locator('.scene-item.selected').getAttribute('style');
  await page.locator('#moveRight').click();
  assert.notEqual(await page.locator('.scene-item.selected').getAttribute('style'),before);
  await page.locator('#duplicate').click();assert.equal(await page.locator('.scene-item').count(),3);
  await page.locator('#remove').click();assert.equal(await page.locator('.scene-item').count(),2);
  await page.locator('#undo').click();assert.equal(await page.locator('.scene-item').count(),3);
  await page.locator('#redo').click();assert.equal(await page.locator('.scene-item').count(),2);
  // Real mouse drag exercises the same pointer handlers as touch input.
  const target=page.locator('.scene-item').first();await target.scrollIntoViewIfNeeded();const box=await target.boundingBox();
  const startStyle=await target.getAttribute('style');await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2,box.y+box.height/2+100,{steps:5});await page.mouse.up();
  assert.notEqual(await page.locator('.scene-item').first().getAttribute('style'),startStyle,'Drag must change the position');
  await page.getByRole('button',{name:'고객처럼 보기'}).click();assert.ok(await page.locator('#itemTools').isHidden());
  await page.locator('.scene-item').first().click();assert.equal(await page.locator('#productInfo').innerText(),'따뜻한 라테');
  await page.getByRole('button',{name:'꾸미기로 돌아가기'}).click();
  await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent.includes('저장했습니다'));
  // Wait for the saved IndexedDB snapshot, not just a message from an earlier save.
  await page.waitForFunction(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('matjido-shop-studio-v1');r.onsuccess=()=>resolve(r.result);});const value=await new Promise(resolve=>{const r=db.transaction('drafts').objectStore('drafts').get('scene');r.onsuccess=()=>resolve(r.result);});db.close();return value?.items.length===2&&value.items[0].name==='따뜻한 라테';});
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.scene-item').length===2);
  assert.equal(await page.locator('#shopTitle').inputValue(),'사장님의 카페');
  assert.equal(await page.locator('#zones').inputValue(),'3');
  assert.equal(await page.locator('#material').inputValue(),'brick');
  assert.ok(await page.locator('.scene-item img').first().evaluate(img=>img.complete&&img.naturalWidth>0),'Photo must survive reload');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow on mobile');
  await page.locator('#scene').scrollIntoViewIfNeeded();
  fs.mkdirSync('../tmp',{recursive:true});await page.screenshot({path:'../tmp/shop-studio-mobile.png'});
  await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'../tmp/shop-studio-desktop.png'});
  assert.deepEqual(errors,[]);console.log('PASS studio: photos, zones, movement, real pointer drag, duplication, removal, undo/redo, preview and persisted image restoration');
}finally{await browser.close();}
