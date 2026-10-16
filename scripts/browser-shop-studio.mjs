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
  await page.getByRole('button',{name:'따뜻한 라테 목록에서 선택'}).click();
  const selectedId=await page.locator('.scene-item.selected').getAttribute('data-item-id');
  await page.locator('#itemLocked').check();
  assert.equal(await page.locator('#moveRight').isDisabled(),true);
  assert.equal(await page.locator('#remove').isDisabled(),true);
  const lockedStyle=await page.locator('.scene-item.selected').getAttribute('style');
  await page.locator('.scene-item.selected').focus();await page.keyboard.press('ArrowRight');
  assert.equal(await page.locator('.scene-item.selected').getAttribute('style'),lockedStyle,'Keyboard cannot move a locked item');
  await page.locator('#itemHidden').check();
  await page.getByRole('button',{name:'고객처럼 보기'}).click();
  assert.equal(await page.locator('.scene-item').count(),1,'Hidden photos must not appear in customer preview');
  await page.getByRole('button',{name:'꾸미기로 돌아가기'}).click();
  await page.waitForFunction(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('matjido-shop-studio-v1');r.onsuccess=()=>resolve(r.result);});const value=await new Promise(resolve=>{const r=db.transaction('drafts').objectStore('drafts').get('scene');r.onsuccess=()=>resolve(r.result);});db.close();return value?.items[0].hidden&&value.items[0].locked;});
  await page.reload();await page.getByRole('button',{name:'따뜻한 라테 목록에서 선택'}).click();
  assert.equal(await page.locator('#itemLocked').isChecked(),true);assert.equal(await page.locator('#itemHidden').isChecked(),true);
  await page.locator('#itemLocked').uncheck();await page.locator('#itemHidden').uncheck();
  await page.locator('#snapSelected').click();
  const contact=await page.locator('.scene-item.selected').evaluate(node=>{const stage=document.querySelector('#items').getBoundingClientRect(),r=node.getBoundingClientRect();return (r.bottom-stage.top)/stage.height*100;});
  assert.ok([26+68/3,26+136/3,94].some(level=>Math.abs(level-contact)<.2),'Photo should rest on a shelf');
  await page.locator('#bringFront').click();assert.equal(await page.locator('.scene-item').last().getAttribute('data-item-id'),selectedId);
  await page.locator('#sendBack').click();assert.equal(await page.locator('.scene-item').first().getAttribute('data-item-id'),selectedId);
  const positionsBefore=await page.locator('.scene-item').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('style')));
  await page.locator('#arrangeAll').click();
  const arranged=await page.locator('.scene-item').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('style')));
  assert.notDeepEqual(arranged,positionsBefore);
  await page.locator('#undo').click();assert.deepEqual(await page.locator('.scene-item').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('style'))),positionsBefore);
  await page.locator('#redo').click();assert.deepEqual(await page.locator('.scene-item').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('style'))),arranged);
  await page.locator('#focusMode').click();assert.equal(await page.locator('.tools').isVisible(),false);
  assert.deepEqual(await page.locator('.scene-item').evaluateAll(nodes=>nodes.map(node=>node.getAttribute('style'))),arranged,'Focus mode preserves the layout');
  await page.locator('#focusMode').click();assert.equal(await page.locator('.tools').isVisible(),true);
  // Exercise a real touch sequence, not just mouse emulation.
  await page.locator('#snapShelves').uncheck();await page.locator('#scene').scrollIntoViewIfNeeded();
  const touchNode=page.locator('.scene-item').first(),touchBox=await touchNode.boundingBox();
  const touchBefore=await touchNode.getAttribute('style'),touchX=touchBox.x+touchBox.width/2,touchY=touchBox.y+touchBox.height/2;
  const session=await context.newCDPSession(page);
  await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:touchX,y:touchY}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:touchX+15,y:touchY+15}]});
  await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
  assert.notEqual(await touchNode.getAttribute('style'),touchBefore,'Touch drag must move the photo');
  await page.locator('#scene').scrollIntoViewIfNeeded();
  fs.mkdirSync('../tmp',{recursive:true});await page.screenshot({path:'../tmp/shop-studio-mobile.png'});
  await page.setViewportSize({width:1280,height:900});await page.screenshot({path:'../tmp/shop-studio-desktop.png'});
  assert.deepEqual(errors,[]);console.log('PASS studio: photos, restore, mouse/touch drag, lock, hide, layers, shelf placement, arrange undo/redo and focus mode');
}finally{await browser.close();}
