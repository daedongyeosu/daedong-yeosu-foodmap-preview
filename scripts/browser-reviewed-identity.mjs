import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright';
const base = process.env.BASE_URL || 'http://127.0.0.1:4173';
const out = process.env.OUTPUT_DIR || 'browser-reviewed-identity';
fs.mkdirSync(out,{recursive:true});
const expected = {'43384f472418faec':'1042642943','23e36eb3741524aa':'4277888320','c76dbc66a4867b84':'2005576147','3cd502d3432e2118':'1526738731','24f321d28eec1c6a':'2005576147'};
const report = {base,viewport:'390x844',checks:[],errors:[],success:false};
const browser = await chromium.launch({headless:true,...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath:process.env.CODEX_BROWSER_EXECUTABLE_PATH}:{})});
const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ko-KR',serviceWorkers:'block'});
const proxy = process.env.PERF_PROXY_API_ORIGIN;
if(proxy) await context.route(proxy+'/api/**',async route=>{
 try {
  const response = await route.fetch({headers:{...route.request().headers(),origin:process.env.PERF_REQUEST_ORIGIN || 'https://daedongmap.com'}});
  await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':new URL(base).origin}});
 } catch { await route.abort(); }
});
await context.route('**/api/events',route=>route.fulfill({status:204,body:''}));
await context.route(url=>/(^|\.)(posthog\.com|google-analytics\.com|googletagmanager\.com)$/.test(url.hostname),route=>route.abort());
await context.addInitScript(()=>sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1','1'));
const page = await context.newPage();
page.on('pageerror',e=>report.errors.push(e.message));
async function verify(id,place,entry) {
 await page.goto(base+entry,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(id=>typeof allStores!=='undefined'&&allStores.some(s=>String(s.id)===id)&&typeof rc3VerifiedPhysicalMap==='function',id,{timeout:45000});
 if(!entry.includes('store=')) await page.evaluate(id=>openStore(allStores.find(s=>String(s.id)===id)),id);
 const detail=page.locator('#modal:not([hidden]) .store-detail[data-store-id="'+id+'"]:not(.store-detail-loading)');
 await detail.waitFor({timeout:30000});
 const link=detail.locator('a[data-detail-only="naver"]');
 await link.waitFor({timeout:30000});
 await link.scrollIntoViewIfNeeded();
 assert.equal(await link.getAttribute('href'),'https://map.naver.com/p/entry/place/'+place);
 assert(await link.isVisible(),'visible map button');
 const data=await page.evaluate(id=>{
  const s=allStores.find(s=>String(s.id)===id),c=resolveStoreChannels(s);
  return {id:s.id,name:s.name,phone:s.phone||'',naverMap:s.naverMap,orders:[...Object.values(c.primaryOrder),...Object.values(c.externalOrder)].filter(Boolean).map(x=>({key:x.key,url:x.url})),photoCount:document.querySelectorAll('#modal .detail-photo').length};
 },id);
 assert(data.orders.length>0,'order routes retained');
 // The second Godwaeji record already has no photos in the saved baseline.
 if(id!=='24f321d28eec1c6a') assert(data.photoCount>0,'existing store photo retained');
 else assert.equal(await detail.locator('.detail-photo-placeholder').count(),1,'existing no-photo placeholder retained');
 report.checks.push({...data,entry,passed:true});
 await page.screenshot({path:path.join(out,id+(entry.includes('hero=')?'-hero':'')+'.png')});
}
try {
 for(const [id,place] of Object.entries(expected)) await verify(id,place,'/');
 await verify('43384f472418faec',expected['43384f472418faec'],'/?hero=43384f472418faec&store=43384f472418faec');
 const guards=await page.evaluate(()=>{
  const id='43384f472418faec',wrong=rc3VerifiedPhysicalMap({id,naverMap:'https://map.naver.com/p/entry/place/999',__verifiedPhysicalMapSource:id});
  return {wrong,unresolved:rc3VerifiedPhysicalMap({id:'0e6d7a1000b1c53b',naverMap:'https://naver.me/5qLvAuT5'})};
 });
 assert.equal(guards.wrong,null); assert.equal(guards.unresolved,null);
 report.guards=guards;
 assert.equal(report.errors.length,0,report.errors.join('\n'));
 report.success=true;
} catch(e) {
 report.failure=e.stack||String(e);
 await page.screenshot({path:path.join(out,'failure.png')}).catch(()=>{});
} finally {
 await browser.close();
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report,null,2));
}
if(!report.success) process.exit(1);
