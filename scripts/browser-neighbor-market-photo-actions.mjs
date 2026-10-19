import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
let playwright;
try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs')).href);}
const origin=new URL(process.env.MARKET_TEST_ORIGIN||'http://127.0.0.1:4201').origin;
assert.ok(['127.0.0.1','localhost','preview.daedongmap.com'].includes(new URL(origin).hostname),'Isolated/preview QA only');
const output=process.env.OUTPUT_DIR||'tmp/neighbor-market-photo-actions';await fs.mkdir(output,{recursive:true});
const photos=['camera','books','bag'].map(name=>path.resolve('assets/neighbor-market/'+name+'.webp'));
const browser=await playwright.chromium.launch({headless:true}),results=[];
async function editingSpace(page){const handle=page.locator('#workspaceResize');if(await handle.isVisible())await handle.press('End');await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));}
async function record(page,name='matjido-neighbor-market-preview-v1',key='owner-draft'){
  return page.evaluate(({name,key})=>new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onsuccess=()=>{const db=r.result,q=db.transaction('drafts').objectStore('drafts').get(key);q.onsuccess=()=>{resolve(q.result);db.close();};q.onerror=()=>reject(q.error);};r.onerror=()=>reject(r.error);}),{name,key});
}
async function seed(page,value,name='matjido-neighbor-market-preview-v1',key='owner-draft'){
  await page.evaluate(({value,name,key})=>new Promise((resolve,reject)=>{const r=indexedDB.open(name,1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts');r.onsuccess=()=>{const db=r.result,tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(value,key);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};}),{value,name,key});
}
async function ready(page){await page.goto(origin+'/neighbor-market/index.html');await page.waitForFunction(()=>!document.getElementById('startMarket').disabled);}
async function chooser(page,button,input){const pending=page.waitForEvent('filechooser');await page.locator('#'+button).click();const pick=await pending;assert.equal(await pick.element().getAttribute('id'),input);assert.equal(await pick.element().getAttribute('accept'),'image/*');assert.equal(pick.isMultiple(),input==='photos');assert.equal(await pick.element().getAttribute('capture'),input==='camera'?'environment':null);return pick;}
async function imported(page,n){await page.waitForFunction(n=>document.querySelectorAll('.price-input').length===n&&!document.getElementById('buildMarket').disabled,n);}
async function saveNew(page,price){await page.locator('.price-input').first().fill(String(price));await page.locator('#buildMarket').click();await page.waitForFunction(()=>!document.getElementById('makerDialog').open);}
async function exportScene(page){const pending=page.waitForEvent('download');await page.locator('#exportDraft').click();const download=await pending;assert.equal(download.suggestedFilename(),'맛지도_이웃장터_시안.json');return JSON.parse(await fs.readFile(await download.path(),'utf8'));}
async function geometry(page){
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
  const g=await page.evaluate(()=>({width:innerWidth,height:innerHeight,scrollY,overflow:document.documentElement.scrollWidth>innerWidth,boxes:['marketScene','customTools','saveDecor','takeDecorPhoto','chooseDecorPhotos'].map(id=>{const r=document.getElementById(id).getBoundingClientRect();return{id,x:r.x,y:r.y,width:r.width,height:r.height,bottom:r.bottom,right:r.right};})}));
  assert.equal(g.overflow,false,JSON.stringify(g));assert.equal(g.scrollY,0);
  for(const box of g.boxes){assert.ok(box.x>=0&&box.y>=0&&box.right<=g.width+1&&box.bottom<=g.height+1,JSON.stringify(g));assert.ok(box.height>=(['marketScene','customTools'].includes(box.id)?65:44),JSON.stringify(g));}
  for(const id of ['takeDecorPhoto','chooseDecorPhotos'])assert.equal(await page.locator('#'+id).evaluate(node=>{const r=node.getBoundingClientRect();return node.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2));}),true,'Sticky button must be hit-testable');
  return g;
}
try{
  for(const viewport of [{width:390,height:844},{width:320,height:568},{width:1280,height:900}]){
    const context=await browser.newContext({viewport,isMobile:viewport.width<=700,hasTouch:true}),page=await context.newPage(),errors=[],blocked=[],downloads=[];
    await context.route('**/*',route=>{const r=route.request();if(new URL(r.url()).origin!==origin||!['GET','HEAD'].includes(r.method())){blocked.push({url:r.url(),method:r.method()});return route.abort();}return route.continue();});
    page.on('pageerror',e=>errors.push(e.message));page.on('download',d=>downloads.push(d.suggestedFilename()));let acceptConfirm=true;
    page.on('dialog',dialog=>dialog.type()==='confirm'&&!acceptConfirm?dialog.dismiss():dialog.accept());await ready(page);
    await seed(page,{sentinel:'KEEP EXISTING SHOP'},'matjido-shop-studio-v1','scene');
    // Genuine first use: three photos, prices, then customize (not a prebuilt owner fixture).
    await page.locator('#startMarket').click();await page.locator('#photos').setInputFiles(photos);await imported(page,3);
    for(const [i,price] of [12000,9000,0].entries())await page.locator('.price-input').nth(i).fill(String(price));
    await page.locator('#buildMarket').click();await page.waitForFunction(()=>!document.getElementById('makerDialog').open);
    const first=await record(page);await page.locator('#customize').click();await editingSpace(page);await geometry(page);
    assert.equal(await page.locator('#precisePosition').evaluate(node=>node.open),false);assert.equal(await page.locator('#moveLeft').isVisible(),false);
    await page.getByRole('button',{name:'햇살 드는 책방',exact:true}).click();await page.locator('#decorName').fill('내 손으로 꾸민 장터');await page.locator('#decorName').press('Tab');
    await page.getByRole('button',{name:'꽃병 ＋',exact:true}).click();await page.locator('#selectedObject').selectOption(first.scene.items[0].id);
    await page.locator('#objectSize').fill('20');await page.locator('#objectSize').dispatchEvent('change');await page.locator('#objectLock').check();
    // Existing drag remains primary; the folded arrows still work when explicitly opened.
    await page.locator('#selectedObject').selectOption(first.scene.items[1].id);await page.locator('#precisePosition>summary').click();await page.locator('#moveRight').click();await page.locator('#precisePosition>summary').click();
    const moving=page.locator('#objects button').nth(2),start=await moving.getAttribute('style'),box=await moving.boundingBox();
    if(viewport.width<=700){const client=await context.newCDPSession(page);const x=box.x+box.width/2,y=box.y+box.height/2;await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+15,y:y-8}]});await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await client.detach();}
    else{await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width/2+20,box.y+box.height/2-8,{steps:5});await page.mouse.up();}
    assert.notEqual(await moving.getAttribute('style'),start,'Dragging works with precise arrows closed');
    const decoration=page.locator('.market-decoration').first(),decorStyle=await decoration.getAttribute('style'),decorBox=await decoration.boundingBox();
    await page.mouse.move(decorBox.x+decorBox.width/2,decorBox.y+decorBox.height/2);await page.mouse.down();await page.mouse.move(decorBox.x+decorBox.width/2+18,decorBox.y+decorBox.height/2-5,{steps:4});await page.mouse.up();assert.notEqual(await decoration.getAttribute('style'),decorStyle,'Decorations also drag without opening the arrows');
    const before=await exportScene(page),downloadCount=downloads.length;assert.deepEqual(await record(page),first,'Decor edits still unsaved');
    await page.locator('#customTools').evaluate(node=>node.scrollTop=0);await geometry(page);await page.screenshot({path:path.join(output,'editor-top-'+viewport.width+'.png')});
    await page.locator('#customTools').evaluate(node=>node.scrollTop=node.scrollHeight);await geometry(page);
    const camera=await chooser(page,'takeDecorPhoto','camera');await camera.setFiles([]);await page.locator('#closeMaker').click();assert.equal(await page.locator('#makerDialog').evaluate(node=>node.open),false);assert.deepEqual(await record(page),first);assert.equal(await page.locator('#takeDecorPhoto').evaluate(node=>node===document.activeElement),true);
    const album=await chooser(page,'chooseDecorPhotos','photos');await album.setFiles(photos[0]);await imported(page,1);
    assert.equal(await page.locator('#marketNameOption').isVisible(),false);assert.equal(await page.locator('#makerTitle').innerText(),'새 사진만 추가하기');assert.deepEqual(await record(page),first);
    await page.locator('#buildMarket').click();assert.match(await page.locator('#makerError').innerText(),/가격/);assert.deepEqual(await record(page),first);
    await page.screenshot({path:path.join(output,'new-photo-price-'+viewport.width+'.png')});
    await saveNew(page,2500);assert.equal(await page.locator('body').evaluate(node=>node.classList.contains('customizing')),true);
    const appended=await record(page);assert.deepEqual(appended.scene.items.slice(0,3),before.items);
    for(const key of Object.keys(before).filter(key=>key!=='items'))assert.deepEqual(appended.scene[key],before[key],key);
    assert.equal(appended.scene.items.length,4);assert.equal(appended.scene.items[3].price,2500);assert.equal(downloads.length,downloadCount,'Photo entry must not download a draft');
    await geometry(page);await page.screenshot({path:path.join(output,'editor-photo-actions-'+viewport.width+'.png')});
    await page.locator('#undo').click();assert.deepEqual(await exportScene(page),before,'Undo removes only newly appended photo, keeping prior unsaved decor');
    assert.equal(await page.locator('#undo').isDisabled(),false,'Earlier edit history survives photo addition');await page.locator('#redo').click();await page.locator('#saveDecor').click();await page.waitForFunction(()=>document.getElementById('saveDecor').textContent==='저장됨');
    const restored=await record(page);await page.reload();await page.waitForFunction(()=>!document.getElementById('startMarket').disabled);assert.deepEqual(await record(page),restored);await page.locator('#customize').click();await editingSpace(page);
    // Cancel only the new input; neither the old stored scene nor the live scene changes.
    const cancelPick=await chooser(page,'chooseDecorPhotos','photos');await cancelPick.setFiles(photos[1]);await imported(page,1);acceptConfirm=false;await page.locator('#closeMaker').click();assert.equal(await page.locator('#makerDialog').evaluate(node=>node.open),true);acceptConfirm=true;await page.locator('#closeMaker').click();assert.deepEqual(await record(page),restored);assert.deepEqual(await exportScene(page),restored.scene);
    // Quota failure preserves old saved data and new inputs; temporary preview is explicit.
    await page.locator('#decorName').fill('아직 저장 전인 이름');await page.locator('#decorName').press('Tab');const unsaved=await exportScene(page);
    const failedPick=await chooser(page,'takeDecorPhoto','camera');await failedPick.setFiles(photos[2]);await imported(page,1);await page.locator('.price-input').fill('7000');
    await page.evaluate(()=>{window.originalPhotoPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(...args){if(this.transaction.db.name==='matjido-neighbor-market-preview-v1')throw new DOMException('simulated full','QuotaExceededError');return window.originalPhotoPut.apply(this,args);};});
    await page.locator('#buildMarket').click();await page.waitForFunction(()=>!document.getElementById('buildMarket').disabled);assert.equal(await page.locator('#makerDialog').evaluate(node=>node.open),true);assert.match(await page.locator('#makerError').innerText(),/저장 공간/);assert.equal(await page.locator('.price-input').inputValue(),'7000');assert.deepEqual(await record(page),restored);
    await page.locator('#previewWithoutSave').click();assert.equal(await page.locator('#objects button').count(),5);assert.deepEqual(await record(page),restored);await page.locator('#undo').click();assert.deepEqual(await exportScene(page),unsaved);
    await page.evaluate(()=>IDBObjectStore.prototype.put=window.originalPhotoPut);
    if(viewport.width===390){for(const short of [{width:390,height:460},{width:640,height:360}]){await page.setViewportSize(short);await page.locator('#customTools').evaluate(node=>node.scrollTop=node.scrollHeight);await geometry(page);await page.screenshot({path:path.join(output,'short-'+short.width+'x'+short.height+'.png')});}await page.setViewportSize(viewport);}
    assert.deepEqual(await record(page,'matjido-shop-studio-v1','scene'),{sentinel:'KEEP EXISTING SHOP'});assert.deepEqual(errors,[]);assert.deepEqual(blocked,[]);
    results.push({viewport,photos:3,appendPreservesUnsavedDecor:true,cancelPreserves:true,quotaPreserves:true,undoRedo:true,arrowsFoldedAndFunctional:true,stickyButtons:true});await context.close();
  }
  // All-AI customized scenes are preserved by ADD (normal photo/price replacement remains separate).
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();await context.route('**/*',route=>new URL(route.request().url()).origin===origin&&['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());page.on('dialog',d=>d.accept());await ready(page);await page.locator('#customize').click();await editingSpace(page);const sample=await exportScene(page);
  await (await chooser(page,'chooseDecorPhotos','photos')).setFiles(photos[0]);await imported(page,1);await saveNew(page,1000);const addedSample=await record(page);assert.deepEqual(addedSample.scene.items.slice(0,6),sample.items);assert.equal(addedSample.scene.items.length,7);
  // Capacity applies across old + new photos; invalid images are not silently accepted.
  const capacity={...addedSample,revision:addedSample.revision+1,scene:{...addedSample.scene,items:Array.from({length:19},(_,i)=>({...addedSample.scene.items[6],id:'capacity-'+i}))}};await seed(page,capacity);await ready(page);await page.locator('#customize').click();await editingSpace(page);
  await (await chooser(page,'chooseDecorPhotos','photos')).setFiles([{name:'broken.png',mimeType:'image/png',buffer:Buffer.from('broken image')}]);await page.waitForFunction(()=>!document.getElementById('closeMaker').disabled);assert.equal(await page.locator('.price-input').count(),0);assert.match(await page.locator('#uploadStatus').innerText(),/읽을 수 없습니다/);assert.deepEqual(await record(page),capacity);
  await page.locator('#photos').setInputFiles(photos);await imported(page,1);assert.match(await page.locator('#uploadStatus').innerText(),/20장 한도/);await saveNew(page,0);assert.equal((await record(page)).scene.items.length,20);assert.equal(await page.locator('#takeDecorPhoto').isDisabled(),true);assert.equal(await page.locator('#chooseDecorPhotos').isDisabled(),true);assert.match(await page.locator('#decorPhotoHint').innerText(),/20장/);assert.equal(await page.locator('#finishDecorating').evaluate(node=>node===document.activeElement),true);
  // Another window saves while this editor has new input: do not overwrite it.
  await seed(page,capacity);await ready(page);await page.locator('#customize').click();await editingSpace(page);const staleScene=await exportScene(page);
  await (await chooser(page,'chooseDecorPhotos','photos')).setFiles(photos[0]);await imported(page,1);await page.locator('.price-input').fill('8000');
  const other=await context.newPage();await ready(other);await other.locator('#editMarket').click();await other.locator('.price-input').first().fill('3333');await other.locator('#buildMarket').click();await other.waitForFunction(()=>!document.getElementById('makerDialog').open);const newer=await record(other);
  await page.locator('#buildMarket').click();await page.waitForFunction(()=>document.getElementById('makerError').textContent.includes('다른 창'));assert.equal(await page.locator('.price-input').inputValue(),'8000');assert.deepEqual(await record(page),newer);await page.locator('#closeMaker').click();assert.deepEqual(await exportScene(page),staleScene,'Old live scene also stays unchanged after conflict');await context.close();
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({success:true,scope:'Mobile-size Chromium role QA, simulated native file selection; not physical phone/camera verification. GET/HEAD preview only; no server writes.',results,samplePreserved:true,capacity:true,invalidImage:true,staleAppendPreserves:true},null,2));
  console.log('PASS editor photo actions: 390/320/1280 and short viewports, sticky camera/gallery, drag + folded precise controls, old photos/decor retained, append/save/undo/cancel/quota/reload, samples and 20-photo cap');
}finally{await browser.close();}
