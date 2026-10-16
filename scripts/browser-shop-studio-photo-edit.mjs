import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
let playwright;try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs')).href);}
const browser=await playwright.chromium.launch({headless:true}),origin=process.env.STUDIO_TEST_ORIGIN||'http://127.0.0.1:4192';
try{
  for(const width of [390,1280]){
    const ctx=await browser.newContext({viewport:{width,height:width===390?844:900}}),page=await ctx.newPage(),errors=[],writes=[];
    page.on('pageerror',error=>errors.push(error.message));
    await ctx.route('https://**/*',route=>{if(route.request().method()!=='GET')writes.push(route.request().method());return route.fulfill({status:200,contentType:'application/json',body:JSON.stringify({storeId:'test-shop',products:[{id:'kept-product',name:'원래 상품',price:3000,stockMode:'판매 가능'}]})});});
    await page.goto(origin+'/store-studio/index.html');await page.waitForFunction(()=>!document.querySelector('#choosePhotos').disabled);
    const png=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=80;c.height=50;c.getContext('2d').fillRect(0,0,80,50);return c.toDataURL().split(',')[1];});
    const image={name:'내 상품.png',mimeType:'image/png',buffer:Buffer.from(png,'base64')};
    await page.locator('#photos').setInputFiles(image);await page.waitForFunction(()=>document.querySelectorAll('.scene-item').length===1&&!document.querySelector('#choosePhotos').disabled);
    await page.locator('#itemName').fill('직접 만든 빵');await page.locator('#itemName').press('Tab');await page.locator('#itemDescription').fill('오늘 만든 상품');await page.locator('#itemDescription').press('Tab');
    await page.locator('#itemSize').fill('30');await page.locator('#itemSize').dispatchEvent('change');await page.locator('#itemRotation').fill('20');await page.locator('#itemRotation').dispatchEvent('change');await page.locator('#itemLocked').check();
    const id=await page.locator('.scene-item').getAttribute('data-item-id'),style=await page.locator('.scene-item').getAttribute('style'),oldSrc=await page.locator('.scene-item img').getAttribute('src');
    const blue=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=40;c.height=90;const x=c.getContext('2d');x.fillStyle='blue';x.fillRect(0,0,40,90);return c.toDataURL().split(',')[1];});
    await page.locator('#replacePhoto').click();await page.locator('#replacementPhoto').setInputFiles({name:'다른 사진.png',mimeType:'image/png',buffer:Buffer.from(blue,'base64')});await page.waitForFunction(old=>document.querySelector('.scene-item img').src!==old&&!document.querySelector('#replacePhoto').disabled,oldSrc);
    assert.equal(await page.locator('.scene-item').getAttribute('data-item-id'),id);assert.equal(await page.locator('.scene-item').getAttribute('style'),style);assert.equal(await page.locator('#itemName').inputValue(),'직접 만든 빵');assert.ok(await page.locator('#itemLocked').isChecked());
    const replaced=await page.locator('.scene-item img').getAttribute('src');await page.locator('#undo').click();assert.equal(await page.locator('.scene-item img').getAttribute('src'),oldSrc);await page.locator('#redo').click();assert.equal(await page.locator('.scene-item img').getAttribute('src'),replaced);
    await page.getByRole('button',{name:'직접 만든 빵 목록에서 선택'}).click();
    await page.locator('#replacePhoto').click();await page.locator('#replacementPhoto').setInputFiles({name:'오류.png',mimeType:'image/png',buffer:Buffer.from('not a picture')});await page.waitForFunction(()=>document.querySelector('#saveStatus').textContent.includes('읽을 수 없습니다'));assert.equal(await page.locator('.scene-item img').getAttribute('src'),replaced);
    await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.scene-item').length===1);assert.equal(await page.locator('.scene-item img').getAttribute('src'),replaced);
    await page.getByRole('button',{name:'직접 만든 빵 목록에서 선택'}).click();
    await page.locator('#registerPhotoProduct').click();await page.waitForURL('**/store-partner/index.html?studioProduct=*');
    assert.equal(await page.locator('#productName').inputValue(),'직접 만든 빵');assert.equal(await page.locator('#productDescription').inputValue(),'오늘 만든 상품');assert.equal(await page.locator('#productPrice').inputValue(),'');assert.ok(await page.locator('#studioProductPhoto').isVisible());assert.equal(await page.locator('#studioProductPhoto').getAttribute('src'),replaced);assert.equal(await page.locator('#productPhoto').evaluate(input=>input.files.length),1);assert.equal(await page.locator('#productCount').innerText(),'등록 0개');
    await page.reload();assert.equal(await page.locator('#productName').inputValue(),'직접 만든 빵','Refresh retains unsubmitted handoff');
    await page.locator('#productPrice').fill('3000.5');await page.locator('#addProduct').click();assert.equal(await page.locator('#productCount').innerText(),'등록 0개');await page.locator('#productPrice').fill('3500');await page.locator('#addProduct').click();assert.equal(await page.locator('#productCount').innerText(),'등록 1개');assert.ok(!page.url().includes('studioProduct='));assert.equal(await page.evaluate(()=>Object.keys(sessionStorage).some(key=>key.startsWith('matjido-studio-product-v1:'))),false);
    await page.locator('#nextStep').click();await page.locator('#previewAgreement').check();await page.locator('#savePreview').click();assert.ok(await page.locator('#storeName').isVisible(),'Missing merchant identity must block saving');
    assert.deepEqual(writes,[],'No automatic publication/catalog writes');
    await page.goto(origin+'/store-studio/index.html');await page.waitForFunction(()=>document.querySelectorAll('.scene-item').length===1);await page.getByRole('button',{name:'직접 만든 빵 목록에서 선택'}).click();
    await page.locator('#catalogSettings summary').click();await page.locator('#catalogStore').fill('test-shop');await page.locator('#catalogStore').press('Tab');await page.locator('#loadCatalog').click();await page.waitForFunction(()=>document.querySelector('#itemCatalogProduct').options.length===2);await page.locator('#itemCatalogProduct').selectOption('kept-product');assert.ok(await page.locator('#registerPhotoProduct').isDisabled());
    await page.locator('#replacePhoto').click();await page.locator('#replacementPhoto').setInputFiles(image);await page.waitForFunction(()=>!document.querySelector('#replacePhoto').disabled);assert.equal(await page.locator('#itemCatalogProduct').inputValue(),'kept-product');assert.equal(await page.locator('.scene-item').getAttribute('data-item-id'),id);
    await page.screenshot({path:`../tmp/studio-photo-edit-${width}.png`,fullPage:true});
    await page.locator('#itemTools').screenshot({path:`../tmp/studio-photo-tools-${width}.png`});
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    await page.locator('#itemCatalogProduct').selectOption('');
    await page.evaluate(()=>localStorage.setItem('matjido-store-onboarding-preview-v1',JSON.stringify({previewOnly:true,storeId:'different-store',products:[]})));
    await page.locator('#registerPhotoProduct').click();assert.ok(page.url().includes('/store-studio/'));assert.match(await page.locator('#saveStatus').innerText(),/상점이 다릅니다/);
    await page.evaluate(()=>localStorage.setItem('matjido-store-onboarding-preview-v1',JSON.stringify({previewOnly:true,storeId:'test-shop',storeName:'기존 상점',products:[{id:'kept-product',name:'기존 상품',price:3000,unit:'개',stockMode:'판매 가능'}]})));
    await page.locator('#registerPhotoProduct').click();await page.waitForURL('**/store-partner/index.html?studioProduct=*');assert.equal(await page.locator('#productCount').innerText(),'등록 1개');assert.equal(await page.locator('#storeName').inputValue(),'기존 상점');
    await page.locator('#productPrice').fill('4000');await page.locator('#addProduct').click();assert.equal(await page.locator('#productCount').innerText(),'등록 2개');assert.ok((await page.locator('#productDrafts').innerText()).includes('기존 상품'));
    await page.goto(origin+'/store-partner/index.html?studioProduct=invalid');assert.match(await page.locator('#studioProductNotice').innerText(),/없거나 30분/);assert.equal(await page.locator('#productName').inputValue(),'');
    assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);await ctx.close();
  }
  console.log('PASS photo replacement, undo/reload, registration handoff, linked product protection on mobile and desktop');
}finally{await browser.close();}
