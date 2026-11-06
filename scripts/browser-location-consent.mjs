import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
let playwright;try{playwright=await import('playwright');}catch{playwright=await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs')).href);}
const root=process.cwd(),output=process.env.OUTPUT_DIR || 'tmp/location-consent-browser';await fs.mkdir(output,{recursive:true});
let failJournal=false;const posted=[];
const html=`<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/location-privacy.css"><title>위치 동의 검사</title><button id="start">현재 위치 사용</button><button data-location-records>내 기록</button><button data-location-withdraw>위치 동의 철회</button><p data-location-status role="status"></p><output id="result"></output><script>window.daedongDataApi={baseUrl:''};</script><script src="/location-privacy.js"></script><script>document.querySelector('#start').onclick=()=>MatjidoLocation.getCurrentPosition(()=>document.querySelector('#result').textContent='위치 적용',()=>document.querySelector('#result').textContent='주소로 찾기');</script></html>`;
const server=http.createServer(async(req,res)=>{
 try{
  if(req.url==='/test'){res.setHeader('Content-Type','text/html; charset=utf-8');res.end(html);return;}
  if(req.url==='/api/location-journal'){
   let text='';for await(const chunk of req)text+=chunk;
   if(req.method==='POST')posted.push(JSON.parse(text));
   res.writeHead(failJournal?503:200,{'Content-Type':'application/json'});res.end(JSON.stringify({ok:!failJournal,version:'2026-11-03.1',createdAt:new Date().toISOString(),expiresAt:'2099-01-01T00:00:00Z',records:[]}));return;
  }
  let pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);if(pathname.endsWith('/'))pathname+='index.html';
  const file=path.resolve(root,'.'+pathname);if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  res.setHeader('Content-Type',file.endsWith('.css')?'text/css':file.endsWith('.js')?'text/javascript':'text/html; charset=utf-8');res.end(await fs.readFile(file));
 }catch{res.writeHead(404).end();}
});await new Promise(r=>server.listen(0,'127.0.0.1',r));const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await playwright.chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
try{
 for(const viewport of [{width:390,height:844},{width:320,height:568},{width:1280,height:900}]){
  const context=await browser.newContext({viewport});const page=await context.newPage();
  await context.addInitScript(()=>{window.gpsCalls=0;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(success){window.gpsCalls++;setTimeout(()=>success({coords:{latitude:34.7604,longitude:127.6622,accuracy:20}}),20);}}});});
  await page.goto(origin+'/test');assert.equal(await page.evaluate(()=>gpsCalls),0);
  await page.locator('#start').click();await page.locator('dialog').waitFor({state:'visible'});assert.equal(await page.evaluate(()=>gpsCalls),0);
  assert.equal(await page.locator('[data-location-agree]').isDisabled(),true);assert.equal(await page.locator('input:checked').count(),0);
  await page.locator('[name=adult]').check();assert.equal(await page.locator('[data-location-agree]').isDisabled(),true);
  await page.locator('[data-location-cancel]').click();assert.equal(await page.evaluate(()=>gpsCalls),0);assert.equal(await page.locator('#result').textContent(),'주소로 찾기');
  await page.locator('#start').click();await page.locator('[name=adult]').check();await page.locator('[name=agree]').check();
  await page.screenshot({path:path.join(output,`consent-${viewport.width}.png`),fullPage:true});
  const bounds=await page.locator('dialog').boundingBox();assert.ok(bounds.x>=0 && bounds.x+bounds.width<=viewport.width+1);assert.ok(bounds.height<=viewport.height);
  await page.locator('[data-location-agree]').click();await page.waitForFunction(()=>document.querySelector('#result').textContent==='위치 적용');assert.equal(await page.evaluate(()=>gpsCalls),1);
  await page.locator('[data-location-withdraw]').click();await page.waitForFunction(()=>document.querySelector('[data-location-status]').textContent.includes('삭제했습니다'));
  assert.equal(await page.evaluate(()=>localStorage.getItem('matjidoLocationConsentV1')),null);
  await page.locator('#start').click();await page.locator('dialog').waitFor({state:'visible'});await page.keyboard.press('Escape');assert.equal(await page.evaluate(()=>gpsCalls),1);
  failJournal=true;await page.locator('#start').click();await page.locator('[name=adult]').check();await page.locator('[name=agree]').check();await page.locator('[data-location-agree]').click();await page.waitForFunction(()=>document.querySelector('.location-consent-status').textContent.includes('저장하지 못'));
  assert.equal(await page.evaluate(()=>gpsCalls),1);await page.locator('[data-location-cancel]').click();failJournal=false;
  for(const url of ['/location-terms/','/privacy/']){await page.goto(origin+url);await page.locator('h1').waitFor();assert.ok((await page.locator('body').innerText()).includes('6개월'));assert.ok(await page.locator('[data-location-withdraw]').isVisible());await page.screenshot({path:path.join(output,`${url.includes('location-terms')?'terms':'privacy'}-${viewport.width}.png`),fullPage:true});}
  await context.close();
 }
 if(process.env.LOCATION_FULL_APP==='1'){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,serviceWorkers:'block'}),page=await context.newPage(),errors=[],gpsOutbound=[];
  page.on('pageerror',error=>errors.push(error.message));
  await context.addInitScript(()=>{sessionStorage.setItem('daedongCommunityIntroPlayedV4','1');sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1','1');window.gpsCalls=0;Object.defineProperty(navigator,'geolocation',{value:{getCurrentPosition(success){window.gpsCalls++;setTimeout(()=>success({coords:{latitude:34.7604,longitude:127.6622,accuracy:20}}),20);}}});});
  await context.route('**/api/location-journal',route=>route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':origin},body:JSON.stringify({ok:true,createdAt:new Date().toISOString(),expiresAt:'2099-01-01T00:00:00Z',records:[]})}));
  for(const remote of ['https://daedong-yeosu-data-api-preview.sisakim.workers.dev','https://daedong-yeosu-admin.sisakim.chatgpt.site'])await context.route(remote+'/api/**',async route=>{
   if(route.request().url().endsWith('/location-journal'))return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':origin},body:JSON.stringify({ok:true,createdAt:new Date().toISOString(),expiresAt:'2099-01-01T00:00:00Z',records:[]})});
   if(route.request().method()==='OPTIONS')return route.fulfill({status:204,headers:{'Access-Control-Allow-Origin':origin,'Access-Control-Allow-Headers':'Content-Type, X-Daedong-Client, Authorization','Access-Control-Allow-Methods':'GET, POST, DELETE, OPTIONS'}});
   if(route.request().method()!=='GET')return route.fulfill({status:204,body:''});
   try{const response=await route.fetch({headers:{...route.request().headers(),origin:'https://preview.daedongmap.com'}});await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':origin}});}catch{await route.abort();}
  });
  await context.route('**/api/events',route=>route.fulfill({status:204,body:''}));
  page.on('request',req=>{if(/nominatim|tile.openstreetmap/.test(req.url()))gpsOutbound.push(req.url());});
  await page.goto(origin+'/',{waitUntil:'domcontentloaded'});await page.locator('#storeGrid .store-card').first().waitFor({timeout:45000});
  await page.waitForFunction(()=>window.__daedongCatalogProgress?.complete===true&&typeof areaModal==='function'&&String(areaModal).includes('rc7-address-sheet'),null,{timeout:45000});
  await page.locator('#locationBtn').tap();await page.locator('.rc7-address-sheet').waitFor();await page.locator('#gpsLocationBtn').tap();await page.locator('dialog.location-consent').waitFor().catch(async error=>{await page.screenshot({path:path.join(output,'full-app-error.png')});console.log(JSON.stringify({errors,info:await page.evaluate(()=>({module:typeof MatjidoLocation,gps:window.gpsCalls,button:document.querySelector('#gpsLocationBtn')?.outerHTML,dialogs:document.querySelectorAll('dialog').length,handler:typeof useCurrentLocation==='function'?String(useCurrentLocation).slice(0,100):'missing'}))}));throw error;});assert.equal(await page.evaluate(()=>gpsCalls),0);
  await page.locator('[name=adult]').check();await page.locator('[name=agree]').check();await page.locator('[data-location-agree]').click();await page.locator('[data-rc7-step="detail"]:not([hidden])').waitFor({timeout:15000});
  await page.locator('#addressConfirmBtn').click();await page.waitForFunction(()=>document.querySelector('#modal').hidden);assert.equal(await page.evaluate(()=>gpsCalls),1);assert.equal(gpsOutbound.length,0);
  assert.equal(await page.evaluate(()=>localStorage.getItem('daedongDeliveryAddressV2')),null);
  assert.equal(await page.evaluate(()=>JSON.parse(sessionStorage.getItem('daedongDeliveryAddressV2')).type),'current');
  await page.locator('.legal [data-location-settings]').click();await page.locator('[data-location-withdraw]').click();await page.waitForFunction(()=>state.coords===null);assert.equal(await page.evaluate(()=>sessionStorage.getItem('daedongDeliveryAddressV2')),null);
  await page.locator('.modal-close').click();await page.locator('#mainSearch').fill('김밥');await page.locator('#storeGrid .store-card').first().waitFor();await page.locator('#storeGrid .store-card .store-photo').first().click();await page.locator('#modal:not([hidden]) .store-detail').waitFor({timeout:30000});
  assert.ok(await page.locator('#modal .detail-photo').count()>0);await page.screenshot({path:path.join(output,'full-app-detail-390.png')});assert.deepEqual(errors,[]);await context.close();
 }
 for(const event of posted)assert.deepEqual(Object.keys(event).sort(),['adult','eventId','kind','version']);
 console.log('PASS browser: unselected consent, cancel/escape, age gate, recorded use, withdrawal, re-consent, offline fail-closed, terms/privacy at 320/390/1280px');
}finally{await browser.close();await new Promise(r=>server.close(r));}
