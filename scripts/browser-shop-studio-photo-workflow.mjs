import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {execFileSync} from 'node:child_process';
let playwright;try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs')).href);}
const browser=await playwright.chromium.launch({headless:true}),origin=process.env.STUDIO_TEST_ORIGIN||'http://127.0.0.1:4195';
try{
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[],writes=[];
  page.on('pageerror',e=>errors.push(e.message));
  await ctx.route('**/*',route=>{if(!['GET','HEAD'].includes(route.request().method())){writes.push(route.request().url());return route.fulfill({status:204,body:''});}return route.continue();});
  if(process.env.STUDIO_LEGACY_NAVIGATION==='1')await ctx.route(/\/store-studio\/studio\.js(?:\?|$)/,route=>route.fulfill({contentType:'application/javascript',body:execFileSync('git',['show','7888f2ce19b2b211a5d49d8acf1e1a85b21c0618:store-studio/studio.js'],{encoding:'utf8'})}));
  await page.goto(origin+'/store-studio/index.html');await page.waitForFunction(()=>!document.querySelector('#choosePhotos').disabled);
  await page.locator('#photos').setInputFiles(['croissant','bread','cake'].map(name=>path.resolve('assets/studio-bakery/'+name+'.webp')));
  await page.waitForFunction(()=>document.querySelectorAll('.scene-item').length===3&&!document.querySelector('#choosePhotos').disabled);
  await page.getByRole('button',{name:'bread 목록에서 선택',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.activeElement.id),'itemName','Selecting a list photo must focus its name, not jump back to the scene');
  const box=await page.locator('#itemDescription').boundingBox();assert.ok(box.y>0&&box.y+box.height<844,'Name and description must be on screen');
  await page.locator('#itemName').fill('갓 구운 빵');await page.locator('#itemName').press('Tab');
  const photoId=await page.locator('.scene-item.selected').getAttribute('data-item-id');
  await page.getByRole('button',{name:'사진 목록으로',exact:true}).click();
  assert.equal(await page.evaluate(()=>document.activeElement.getAttribute('aria-label')),'갓 구운 빵 목록에서 선택');
  await page.getByRole('button',{name:'cake 목록에서 선택',exact:true}).click();await page.locator('#itemDescription').fill('오늘 만든 케이크');await page.locator('#itemDescription').press('Tab');
  await page.getByRole('button',{name:'진열장에서 보기',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'sceneViewport');
  await page.getByRole('button',{name:'사진 추가',exact:true}).click();await page.locator('#photoSearch').fill('갓 구운');
  await page.getByRole('button',{name:'갓 구운 빵 목록에서 선택',exact:true}).click();
  assert.equal(await page.locator('.scene-item.selected').getAttribute('data-item-id'),photoId);
  await page.locator('#itemName').fill('버터 식빵');await page.locator('#itemName').press('Tab');
  await page.getByRole('button',{name:'사진 목록으로',exact:true}).click();assert.equal(await page.locator('#itemList button').count(),0);assert.equal(await page.evaluate(()=>document.activeElement.id),'photoSearch');assert.equal(await page.locator('#photoSearch').inputValue(),'갓 구운');
  await page.locator('#resetPhotoSearch').click();await page.getByRole('button',{name:'버터 식빵 목록에서 선택',exact:true}).click();
  // Navigation alone must not add undo records; one undo reverts the last name change.
  await page.locator('#undo').click();await page.getByRole('button',{name:'갓 구운 빵 목록에서 선택',exact:true}).click();assert.equal(await page.locator('#itemName').inputValue(),'갓 구운 빵');
  await page.locator('#redo').click();await page.getByRole('button',{name:'버터 식빵 목록에서 선택',exact:true}).click();
  await page.locator('#itemLocked').check();await page.locator('#itemHidden').check();
  await page.getByRole('button',{name:'사진 목록으로',exact:true}).click();await page.getByRole('button',{name:'버터 식빵 목록에서 선택',exact:true}).click();assert.equal(await page.locator('#itemLocked').isChecked(),true);assert.equal(await page.locator('#itemHidden').isChecked(),true);assert.equal(await page.locator('#remove').isDisabled(),true);
  await page.locator('#preview').click();assert.equal(await page.locator('.photo-edit-navigation').isVisible(),false);await page.locator('#preview').click();
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.scene-item').length===3);await page.getByRole('button',{name:'cake 목록에서 선택',exact:true}).click();assert.equal(await page.locator('#itemDescription').inputValue(),'오늘 만든 케이크');
  await page.setViewportSize({width:1280,height:900});await page.getByRole('button',{name:'사진 목록으로',exact:true}).click();await page.getByRole('button',{name:'버터 식빵 목록에서 선택',exact:true}).click();assert.equal(await page.evaluate(()=>document.activeElement.id),'itemName');assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  assert.deepEqual(writes,[]);assert.deepEqual(errors,[]);
  console.log('PASS photo workflow: list-to-name focus, visible description, edit/list/scene round trips, filtered-out rename recovery, no navigation undo pollution, hidden/locked edit, reload and desktop; no API writes');
}finally{await browser.close();}
