import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
let playwright;try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs')).href);}
const origin=process.env.STUDIO_TEST_ORIGIN||'http://127.0.0.1:4196',output=process.env.OUTPUT_DIR||'tmp/studio-first-owner';
assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Use an isolated local draft, never a real merchant session');
await fs.mkdir(output,{recursive:true});
const browser=await playwright.chromium.launch({headless:true}),report={roleTest:'AI merchant-role browser QA; not a human usability study or physical phone test',results:[]};
try{
  for(const width of [390,320,1280]){
    const context=await browser.newContext({viewport:{width,height:width<500?844:900},isMobile:width<500,hasTouch:width<500}),page=await context.newPage(),blocked=[],errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await context.route('**/*',route=>{const request=route.request();if(new URL(request.url()).origin!==origin||!['GET','HEAD'].includes(request.method())){blocked.push(request.url());return route.abort();}return route.continue();});
    await page.goto(origin+'/store-studio/index.html');await page.waitForFunction(()=>!document.getElementById('choosePhotos').disabled);
    const together=async()=>{const g=await page.evaluate(()=>{const r=document.getElementById('scene').getBoundingClientRect();return{top:r.top,bottom:r.bottom,scrollY,overflow:document.documentElement.scrollWidth>innerWidth,height:innerHeight};});assert.ok(g.top>=0&&g.bottom<=g.height);assert.equal(g.scrollY,0);assert.equal(g.overflow,false);};
    await together();assert.match(await page.locator('#photoReviewCount').innerText(),/아직 사진/);assert.equal(await page.locator('#photosNext').isDisabled(),true);
    for(const task of ['photos','arrange','save']){const b=await page.locator('[data-studio-task='+task+']').boundingBox();assert.ok(b.x>=0&&b.x+b.width<=width,'Three primary steps must fit without horizontal navigation');}
    const chooser=page.waitForEvent('filechooser');await page.locator('#choosePhotos').click();assert.equal((await chooser).isMultiple(),true);
    await page.locator('#photos').setInputFiles(['croissant','bread','cake'].map(name=>path.resolve('assets/studio-bakery/'+name+'.webp')));
    await page.waitForFunction(()=>document.querySelectorAll('#photoReviewList input').length===3&&!document.getElementById('choosePhotos').disabled);
    assert.equal(await page.locator('[data-studio-task=photos]').getAttribute('aria-pressed'),'true','Upload must stay in the name review');
    const names=['버터 크루아상','시골 깜빠뉴','딸기 생크림 케이크'];
    await page.locator('#photoReviewList input').first().focus();await page.locator('#photoReviewList input').first().evaluate(node=>node.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',isComposing:true,bubbles:true})));assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'사진 1 표시 이름','Korean IME composition must not jump to the next photo');
    for(let index=0;index<3;index++){
      const input=page.getByRole('textbox',{name:'사진 '+(index+1)+' 표시 이름',exact:true});await input.fill(names[index]);await input.press('Enter');
      assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')||document.activeElement.id),index===2?'photosNext':'사진 '+(index+2)+' 표시 이름');await together();
    }
    const positions=()=>page.locator('.scene-item').evaluateAll(nodes=>nodes.map(node=>({id:node.dataset.itemId,style:node.getAttribute('style')})));
    const before=await positions();await page.locator('#photosNext').click();await page.locator('#arrangeAll').click();await page.waitForFunction(()=>document.getElementById('draftSaveStatus').textContent.includes('저장 완료'));
    const arranged=await positions();assert.notDeepEqual(arranged,before);await together();await page.locator('#undo').click();assert.deepEqual(await positions(),before,'One undo must undo placement only');await page.locator('#redo').click();assert.deepEqual(await positions(),arranged);
    if(width<500){
      const client=await context.newCDPSession(page),box=await page.locator('.scene-item').first().boundingBox(),x=box.x+box.width/2,y=box.y+box.height/2;
      await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x,y}]});
      for(let step=1;step<=5;step++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:x+step*5,y:y-10}]});
      await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await client.detach();assert.notDeepEqual(await positions(),arranged,'A real touch gesture must move the displayed photo');await together();await page.locator('#undo').click();assert.deepEqual(await positions(),arranged);
    }
    await page.locator('#arrangeNext').click();await page.locator('#saveDraft').click();await page.waitForFunction(()=>document.getElementById('draftSaveStatus').textContent.includes('저장 완료'));
    assert.match(await page.locator('#saveGuide').innerText(),/아직 다른 휴대폰이나 고객에게 보이지 않습니다/);assert.equal(await page.locator('#cloudSettings').getAttribute('open'),null,'Local save must not connect or publish');
    await page.screenshot({path:path.join(output,'save-'+width+'.png')});
    const download=page.waitForEvent('download');await page.locator('#backupDraft').click();const file=await download,downloadPath=await file.path(),saved=JSON.parse(await fs.readFile(downloadPath,'utf8'));
    assert.deepEqual(saved.scene.items.map(item=>item.name),names);assert.ok(saved.scene.items.every(item=>item.src.startsWith('data:image/')));
    await page.locator('#reviewDraft').click();assert.equal(await page.locator('#editorPanel').isVisible(),false);assert.equal(await page.locator('.browse-product').count(),3);await page.locator('#preview').click();
    await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.scene-item').length===3);assert.deepEqual(await positions(),arranged);assert.deepEqual(await page.locator('#photoReviewList input').evaluateAll(nodes=>nodes.map(node=>node.value)),names);
    await page.locator('[data-studio-task=photos]').click();await page.screenshot({path:path.join(output,'photos-'+width+'.png')});
    // A failed write must not claim success or erase the last confirmed draft.
    await page.evaluate(()=>{window.originalPut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(){throw new DOMException('simulated storage full','QuotaExceededError');};});
    await page.getByRole('textbox',{name:'사진 1 표시 이름',exact:true}).fill('저장 실패 시험');await page.getByRole('textbox',{name:'사진 1 표시 이름',exact:true}).press('Enter');await page.waitForFunction(()=>document.getElementById('draftSaveStatus').classList.contains('error'));
    assert.doesNotMatch(await page.locator('#draftSaveStatus').innerText(),/저장 완료/);await page.locator('[data-studio-task=save]').click();assert.equal(await page.locator('#backupDraft').isEnabled(),true);
    await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.scene-item').length===3);assert.deepEqual(await page.locator('#photoReviewList input').evaluateAll(nodes=>nodes.map(node=>node.value)),names,'Last successful draft must survive failed writes');
    // Partial image failure preserves the three saved photos and reports the bad file.
    await page.locator('#photos').setInputFiles([{name:'bad.png',mimeType:'image/png',buffer:Buffer.from('not an image')},{name:'extra.webp',mimeType:'image/webp',buffer:await fs.readFile(path.resolve('assets/studio-bakery/croissant.webp'))}]);
    await page.waitForFunction(()=>document.querySelectorAll('.scene-item').length===4&&document.getElementById('saveStatus').textContent.includes('bad.png'));assert.match(await page.locator('#saveStatus').innerText(),/bad.png.*읽을 수 없습니다/);assert.equal(await page.locator('#photoReviewList input').count(),4);
    // Existing detailed tools, locking, hidden photos and attached photos remain available.
    await page.locator('#photoReviewList button').first().click();await page.locator('#itemLocked').check();await page.locator('#itemHidden').check();const locked=(await positions())[0];
    await page.locator('[data-studio-task=furniture]').click();await page.getByRole('button',{name:'유리 쇼케이스 추가',exact:true}).click();const decor=await page.locator('#decorRoot>.decor').getAttribute('data-decor-id');
    await page.locator('[data-studio-task=photos]').click();await page.locator('#photoReviewList button').nth(1).click();await page.locator('#itemDecor').selectOption(decor);const attached=(await positions())[1];
    await page.locator('[data-studio-task=arrange]').click();await page.locator('#arrangeAll').click();assert.deepEqual((await positions())[0],locked);assert.deepEqual((await positions())[1],attached);await together();
    for(const task of ['furniture','atmosphere','business','utilities','save']){await page.locator('[data-studio-task='+task+']').click();await together();}
    assert.deepEqual(blocked,[]);assert.deepEqual(errors,[]);report.results.push({width,photoNames:names,realIndexedDBReload:true,failedWritePreservedDraft:true,partialImageError:true,lockedAndAttachedPreserved:true,blocked,errors});await context.close();
  }
  const context=await browser.newContext({viewport:{width:390,height:844}});await context.addInitScript(()=>{Object.defineProperty(window,'indexedDB',{get(){throw new Error('disabled in test');}});});const page=await context.newPage();await context.route('**/*',route=>new URL(route.request().url()).origin===origin&&['GET','HEAD'].includes(route.request().method())?route.continue():route.abort());await page.goto(origin+'/store-studio/index.html');await page.waitForFunction(()=>!document.getElementById('choosePhotos').disabled);assert.equal(await page.locator('#saveDraft').isDisabled(),true);assert.match(await page.locator('#draftSaveStatus').innerText(),/저장하지 못했습니다/);await context.close();
  report.success=true;await fs.writeFile(path.join(output,'report.json'),JSON.stringify(report,null,2));console.log('PASS first owner: three-photo gallery import, keyboard naming, explicit arrangement + undo, verified local save/reload/backup, no-storage/failure honesty, partial uploads, all tools preserved; no external calls or writes');
}finally{await browser.close();}
