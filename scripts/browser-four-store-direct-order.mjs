import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
let chromium;
try { ({chromium}=await import('playwright')); } catch(error) {
 if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES)throw error;
 ({chromium}=await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright','index.mjs')).href));
}

const targets={'7bc7239e6b509c44':'S503561','04910f606ba038a6':'S502168','d86586aaef8454c9':'S503551','84c118675c0caa4c':'S502719'};
const base=process.env.BASE_URL||'http://127.0.0.1:4188';
let server;
if(!process.env.BASE_URL){
 const root=process.cwd(),mime={'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.jpg':'image/jpeg','.png':'image/png','.woff2':'font/woff2'};
 server=http.createServer((req,res)=>{try{let file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,base).pathname));if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404).end();}});
 await new Promise(resolve=>server.listen(4188,'127.0.0.1',resolve));
}
const browser=await chromium.launch({headless:true,args:['--disable-features=BackForwardCache'],...(process.env.CODEX_BROWSER_EXECUTABLE_PATH?{executablePath:process.env.CODEX_BROWSER_EXECUTABLE_PATH}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ko-KR',timezoneId:'Asia/Seoul',serviceWorkers:'block'});
await context.addInitScript(()=>{sessionStorage.setItem('daedongCommunityIntroPlayedV4','1');sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1','1');});
await context.route('**/api/events',route=>route.fulfill({status:204,body:''}));
if(['localhost','127.0.0.1'].includes(new URL(base).hostname)){
 await context.route(/https:\/\/daedong-yeosu-data-api(?:-preview)?\.sisakim\.workers\.dev\/api\//,async route=>{
  const preview=route.request().url().includes('data-api-preview.');
  const response=await route.fetch({headers:{...route.request().headers(),origin:preview?'https://preview.daedongmap.com':'https://daedongmap.com'}});
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':new URL(base).origin}});
 });
}
// Intercept only the provider destination: navigation/back are real, no order
// is created and the stored merchant URL/code must still be exact.
await context.route('https://ond.bursim.co.kr/shop/mns/**',async route=>{
 const code=new URL(route.request().url()).searchParams.get('stCode');
 assert.ok(Object.values(targets).includes(code));
 await route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><html lang="ko"><meta charset="utf-8"><title>주문 연결 확인</title><h1>'+code+'</h1></html>'});
});
const page=await context.newPage(),report={success:false,stores:[],repeatReturns:[],hours:[],errors:[]};
page.on('pageerror',error=>report.errors.push(error.message));
const out='artifacts/four-direct';fs.mkdirSync(out,{recursive:true});
try{
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(ids=>typeof openAppBrowser==='function'&&window.__daedongCatalogProgress?.complete===true&&ids.every(id=>stores.some(s=>s.id===id)),Object.keys(targets),{timeout:45000});
 await page.locator('[data-order-key="direct"]').click();
 await page.waitForSelector('#modal[data-app-browser-key="direct"]:not([hidden])');
 const listed=await page.locator('#modal [data-app-store-order]').evaluateAll(nodes=>nodes.map(node=>node.dataset.appStoreOrder));
 assert.deepEqual([...listed].sort(),Object.keys(targets).sort(),'Home direct ordering exposes exactly the four approved stores');
 await page.screenshot({path:out+'/four-store-list.png'});
 await page.evaluate(()=>hardClose({fromPop:true}));
 for(const key of ['direct','ondongne']){
  // Start an independent channel visit. fromPop is an external-return signal,
  // so calling it after Back deliberately restores the pending order list.
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__daedongCatalogProgress?.complete===true,{},{timeout:45000});
  await page.locator('[data-order-key="'+key+'"]').tap();
  await page.waitForSelector('#modal[data-app-browser-key="'+key+'"]:not([hidden])');
  const entries=await page.locator('#modal [data-app-store-order]').evaluateAll(nodes=>nodes.map(n=>n.dataset.appStoreOrder));
  assert.deepEqual([...entries].sort(),Object.keys(targets).sort());
  const first=Object.keys(targets)[0],other=Object.keys(targets)[2];
  for(const id of [first,first,other,first]){
   await page.locator('#modal [data-app-store-order="'+id+'"]').tap();
   await page.waitForURL('https://ond.bursim.co.kr/shop/mns/**',{timeout:15000});
   assert.equal(await page.locator('h1').innerText(),targets[id]);
   await page.goBack({waitUntil:'domcontentloaded'});
   await page.waitForSelector('#modal[data-app-browser-key="'+key+'"] [data-app-store-order="'+id+'"]',{timeout:15000});
   await page.waitForFunction(()=>window.__daedongCatalogProgress?.complete===true&&typeof fxOpenRegisteredAppOrder==='function',{},{timeout:45000});
   const locks=await page.locator('#modal [data-app-store-order]').evaluateAll(nodes=>nodes.filter(n=>n.disabled||n.dataset.routeBusy==='true'||n.getAttribute('aria-busy')==='true').length);
   assert.equal(locks,0,key+': native Back must not restore a locked order button');
   report.repeatReturns.push({key,id,code:targets[id]});
  }
  await page.screenshot({path:out+'/'+key+'-repeated-back.png'});
 }
 await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>window.__daedongCatalogProgress?.complete===true,{},{timeout:45000});
 await page.evaluate(async()=>{await window.daedongStoreServiceInfo.ready;});
 for(const [id,code] of Object.entries(targets)){
  await page.evaluate(id=>openStore(fxStoreById(id)),id);
  await page.waitForSelector('#modal:not([hidden]) .store-detail[data-store-id="'+id+'"]:not(.store-detail-loading)',{timeout:30000});
  const detailRoute=page.locator('#modal a[data-route-key="direct"]').first();
  await detailRoute.waitFor({state:'visible'});
  const href=await detailRoute.getAttribute('href');
  assert.equal(await page.locator('#modal a[data-route-key="ondongne"]').first().getAttribute('href'),href);
  assert.equal(new URL(href).searchParams.get('stCode'),code);
  assert.equal(new URL(href).hostname,'ond.bursim.co.kr');
  assert.doesNotMatch(href,/notion|bit\.ly/);
  await page.screenshot({path:out+'/'+id+'-detail.png'});
  await page.locator('[data-store-menu-preview="'+id+'"]').click();
  const sticky=page.locator('a[data-menu-sticky-order="direct"]');
  await sticky.waitFor({state:'visible',timeout:15000});
  assert.equal(new URL(await sticky.getAttribute('href')).searchParams.get('stCode'),code);
  assert.doesNotMatch(await sticky.innerText(),/준비중/);
  assert.equal(await page.locator('a[data-menu-sticky-order="ondongne"]').getAttribute('href'),href);
  report.stores.push({id,code,detail:true,menu:true});
  if(id===Object.keys(targets)[0])await page.screenshot({path:out+'/sura-menu-order.png'});
  await page.locator('[data-menu-preview-close]').first().click();
  await page.waitForSelector('[data-store-menu-overlay]',{state:'hidden'});
  await page.evaluate(()=>hardClose({fromPop:true}));
 }
 const scenarios=[['2026-11-07T10:59:00+09:00','closed'],['2026-11-07T11:00:00+09:00','open'],['2026-11-08T00:59:00+09:00','closing-soon'],['2026-11-08T01:00:00+09:00','closed'],['2026-11-08T12:00:00+09:00','closed'],['2026-11-08T15:00:00+09:00','open'],['2026-11-09T00:59:00+09:00','closing-soon'],['2026-11-09T01:00:00+09:00','closed']];
 report.hours=await page.evaluate(({ids,scenarios})=>ids.flatMap(id=>scenarios.map(([at,expected])=>({id,at,expected,actual:window.daedongStoreServiceInfo.status(id,new Date(at)).state}))),{ids:Object.keys(targets),scenarios});
 for(const result of report.hours)assert.equal(result.actual,result.expected,JSON.stringify(result));
 assert.deepEqual(report.errors,[]);
 report.success=true;
 console.log('PASS 390×844: exactly four stores; original provider routes on store detail and menu; 32 opening/midnight/Sunday boundary checks');
}catch(error){report.failure=error.stack||String(error);await page.screenshot({path:out+'/failure.png'}).catch(()=>{});throw error;}
finally{fs.writeFileSync(out+'/report.json',JSON.stringify(report,null,2));await context.unrouteAll({behavior:'wait'});await browser.close();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
