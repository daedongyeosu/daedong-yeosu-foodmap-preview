import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
let playwright;
try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs')).href);}
const browser=await playwright.chromium.launch({headless:true});
try{
  const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.route('https://shop.example.test/**',route=>route.fulfill({contentType:'text/html',body:'<h1>주문 연결 동작검사</h1>'}));
  await page.goto(`${process.env.STUDIO_TEST_ORIGIN||'http://127.0.0.1:4192'}/store-studio/index.html`);
  await page.waitForFunction(()=>!document.querySelector('#choosePhotos').disabled);
  await page.locator('#preview').click();
  for(const id of ['customerMap','customerPhone','customerOrder']){assert.equal(await page.locator('#'+id).isVisible(),false);assert.equal(await page.locator('#'+id).getAttribute('href'),null);}
  assert.equal(await page.locator('#customerOrderMissing').isDisabled(),true);
  await page.locator('#preview').click();await page.locator('#businessSettings summary').click();
  const set=async(id,value)=>{await page.locator('#'+id).fill(value);await page.locator('#'+id).press('Tab');};
  await set('businessIntro','직접 구운 빵과 커피를 만나보세요.');
  await set('businessAddress','동작검사용 주소 · 실제 매장 주소 등록 위치');
  await set('businessHours','매일 10:00~20:00 · 시안용 안내');
  await set('businessPhone','010-1234-5678');
  await set('businessDelivery','배달 가능 지역과 배송비는 주문 화면에서 확인하세요.');
  await set('businessMapUrl','javascript:alert(1)');await set('businessOrderUrl','https://shop.example.test/shop');
  assert.equal(await page.locator('#businessMapUrl').getAttribute('aria-invalid'),'true');
  await page.locator('#preview').click();assert.equal(await page.locator('#customerMap').getAttribute('href'),null);await page.locator('#preview').click();
  const mapUrl='https://map.naver.com/p/';await set('businessMapUrl',mapUrl);
  const photo=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=160;c.height=160;const ctx=c.getContext('2d');ctx.fillStyle='#996334';ctx.fillRect(30,35,95,100);return c.toDataURL('image/png').split(',')[1];});
  const file={name:'라테.png',mimeType:'image/png',buffer:Buffer.from(photo,'base64')};
  await page.locator('#photos').setInputFiles(file);await page.waitForFunction(()=>document.querySelectorAll('.scene-item').length===1&&!document.querySelector('#choosePhotos').disabled);
  await set('itemDescription','고소한 라테 · 따뜻하게 포장합니다.');
  await page.locator('#realStorePhoto').setInputFiles(file);await page.waitForFunction(()=>!document.querySelector('#removeRealPhoto').disabled);
  await page.locator('#preview').click();await page.locator('.scene-item').click();
  assert.equal(await page.locator('#customerProductOrder').getAttribute('href'),'https://shop.example.test/shop');
  assert.equal(await page.locator('#customerProductOrder').innerText(),'가게 주문 화면 열기');
  assert.equal(await page.locator('#customerMap').getAttribute('href'),mapUrl);assert.equal(await page.locator('#customerPhone').getAttribute('href'),'tel:01012345678');
  assert.equal(await page.locator('#customerProductDescription').innerText(),'고소한 라테 · 따뜻하게 포장합니다.');
  assert.equal(await page.locator('#realPhotoFigure').isVisible(),true);
  await page.locator('#preview').click();await set('itemProductUrl','javascript:alert(1)');
  await page.locator('#preview').click();await page.locator('.scene-item').click();assert.equal(await page.locator('#customerProductOrder').getAttribute('href'),null);
  await page.locator('#preview').click();await set('itemProductUrl','https://shop.example.test/item/latte');
  // Verify persisted routing metadata and the real-store image, not only text on this page.
  await page.waitForFunction(async()=>{const db=await new Promise(resolve=>{const r=indexedDB.open('matjido-shop-studio-v1');r.onsuccess=()=>resolve(r.result);});const data=await new Promise(resolve=>{const r=db.transaction('drafts').objectStore('drafts').get('scene');r.onsuccess=()=>resolve(r.result);});db.close();return data?.business?.realPhoto&&data?.business?.phone==='010-1234-5678'&&data?.items?.[0]?.productUrl==='https://shop.example.test/item/latte';});
  await page.reload();await page.waitForFunction(()=>document.querySelectorAll('.scene-item').length===1);
  await page.locator('#preview').click();await page.locator('.scene-item').click();
  assert.equal(await page.locator('#customerProductOrder').innerText(),'이 상품 주문 화면 열기');
  assert.equal(await page.locator('#customerAddress').innerText(),'동작검사용 주소 · 실제 매장 주소 등록 위치');
  assert.equal(await page.locator('#customerOrder').getAttribute('href'),'https://shop.example.test/shop');
  const popupPromise=page.waitForEvent('popup');await page.locator('#customerProductOrder').click();const popup=await popupPromise;await popup.waitForLoadState();
  assert.equal(popup.url(),'https://shop.example.test/item/latte');await popup.close();
  assert.equal(await page.locator('#productInfo').innerText(),'라테','Opening the order page must preserve the shop being browsed');
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.locator('#scene').scrollIntoViewIfNeeded();fs.mkdirSync('../tmp',{recursive:true});await page.screenshot({path:'../tmp/shop-studio-customer-mobile.png'});
  assert.deepEqual(errors,[]);console.log('PASS customer studio: honest unconfigured actions, invalid links, visit/phone/order routes, product fallback, real photo, persistence and order-link navigation without losing the shop');
}finally{await browser.close();}
