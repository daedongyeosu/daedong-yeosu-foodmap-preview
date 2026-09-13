import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const deps=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=await import(deps?pathToFileURL(path.join(deps,'playwright/index.mjs')).href:'playwright');
const base=process.env.BASE_URL||'https://preview.daedongmap.com/';
const local=process.env.LOCAL_OVERRIDE==='1';
const out=process.env.REPORT_DIR||path.join(root,'artifacts/store-entry-status');
fs.mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ko-KR',serviceWorkers:'block'});
await context.addInitScript(()=>{
  sessionStorage.setItem('daedongCommunityIntroPlayedV4','1');
  sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1','1');
});
await context.route('**/api/events',r=>r.fulfill({status:204,body:''}));
await context.route('**/*posthog.com/**',r=>r.abort());
if(local) await context.route(new URL('/**',base).href,r=>{
  const name=decodeURIComponent(new URL(r.request().url()).pathname).slice(1)||'index.html';
  const file=path.resolve(root,name);
  if(!file.startsWith(root+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile())return r.continue();
  const type={'.html':'text/html','.js':'application/javascript','.json':'application/json','.css':'text/css','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.jpg':'image/jpeg'}[path.extname(file)];
  return r.fulfill({status:200,body:fs.readFileSync(file),...(type?{contentType:type}:{})});
});
const page=await context.newPage();
const report={base,local,checkedAt:new Date().toISOString(),surfaces:[],errors:[],success:false};
page.on('pageerror',e=>report.errors.push(e.message));
async function check(name,selector){
  await page.waitForFunction(s=>{
    const rows=[...document.querySelectorAll(s)];
    return rows.length>0&&rows.every(row=>row.querySelectorAll('.store-service-status').length===1);
  },selector,{timeout:15000});
  const result=await page.locator(selector).evaluateAll(rows=>({count:rows.length,labels:[...new Set(rows.map(row=>row.querySelector('.store-service-status')?.textContent.trim()))]}));
  assert.ok(result.labels.every(label=>['영업 중','곧 영업 종료','영업 종료','시간 미확인','정보 연결 지연','영업시간 확인 중','영업시간 확인','정기휴무','임시휴무','브레이크 타임'].includes(label)),JSON.stringify(result));
  report.surfaces.push({name,...result});console.log(name,result.count,result.labels.join(', '));
}
async function close(){await page.evaluate(()=>{if(!document.querySelector('#modal').hidden)hardClose();});}
try{
  await page.goto(new URL('?hero=e57c51a4f6294349&qa=store-entry-status',base).href,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>typeof rc6Initialize==='function'&&typeof rc5Card==='function'&&window.daedongStoreServiceInfo);
  await page.evaluate(async()=>{await window.daedongCatalogReady;await window.daedongLocationRankingReady;await window.daedongStoreServiceInfo.ready;});
  await close();
  await page.waitForFunction(()=>document.querySelectorAll('#heroTrack .rc6-campaign-hero[data-rc6-banner-store="e57c51a4f6294349"]').length>=14);
  const entries=await page.locator('#heroTrack > [data-hero-index]').evaluateAll(rows=>[...new Map(rows.map(n=>[n.dataset.heroIndex,{i:Number(n.dataset.heroIndex),id:n.dataset.rc6BannerStore||'',ad:n.dataset.rc6BannerNotion||''}])).values()].sort((a,b)=>a.i-b.i));
  assert.equal(entries.length,17);assert.equal(entries.filter(e=>e.id==='e57c51a4f6294349').length,14);assert.deepEqual(entries.filter(e=>e.ad).map(e=>e.i),[4,9,14]);
  report.campaign={storeId:'e57c51a4f6294349',food:14,ads:3};
  await page.screenshot({path:path.join(out,'gyegunsang-dedicated.png')});
  await check('home recommendations','.rail-card[data-rail-card-store]');
  const rails=await page.evaluate(()=>RC2_RAIL_SPECS.map(s=>s.id));
  for(const id of rails){
    await page.evaluate(id=>rc2OpenRailList(id),id);
    const selector='#modalContent .rail-list-modal .app-browser-card';
    if(await page.locator(selector).count()){
      await check('rail:'+id,selector);
      assert.equal(await page.locator(selector+' .store-entry-action').filter({hasText:'메뉴·주문방법 보기'}).count(),await page.locator(selector).count());
      if(id==='local'){
        await page.screenshot({path:path.join(out,'local-recommendations.png')});
        const first=page.locator(selector).first(),target=await first.getAttribute('data-channel-store-id');
        await first.tap();
        await page.locator(`#modalContent .store-detail[data-store-id="${target}"]`).waitFor();
        assert.equal(new URL(page.url()).origin,new URL(base).origin,'Store card must not make a telephone/app call');
      }
    }
    await close();
  }
  const cats=await page.evaluate(()=>categories.filter(c=>c!=='전체'));
  for(const cat of cats){
    await page.evaluate(cat=>{state.query='';state.brandId='';state.category=cat;rc5RenderCategory();},cat);
    if(await page.locator('#storeGrid .rc5-category-card').count())await check('category:'+cat,'#storeGrid .rc5-category-card');
    await page.evaluate(()=>rc4OpenCategoryAll());
    if(await page.locator('#modalContent .store-card').count())await check('category-all:'+cat,'#modalContent .store-card');
    if(cat==='치킨')await page.screenshot({path:path.join(out,'chicken-all.png')});
    await close();
  }
  for(const key of ['direct','mukkebi','ddangyo','ondongne','yogiyo','coupang','baemin']){
    await page.evaluate(key=>openAppBrowser(key),key);
    if(await page.locator('#modalContent .app-browser-card').count())await check('order-app:'+key,'#modalContent .app-browser-card');
    await close();
  }
  await page.evaluate(()=>fxOpenPhoneDirectory());
  if(await page.locator('#modalContent .phone-order-card').count())await check('phone directory','#modalContent .phone-order-card');
  await close();
  await page.evaluate(()=>savedStoreList('찜한 가게',['e57c51a4f6294349'],'없음'));
  await check('saved / recent shared renderer','#modalContent .personal-store-row');
  await close();
  // Check all four status labels against the shared calculator, including overnight closing.
  report.status=await page.evaluate(()=>{
    const id='e57c51a4f6294349';
    return ['2026-09-13T14:00:00+09:00','2026-09-13T21:15:00+09:00','2026-09-13T23:00:00+09:00'].map(d=>window.daedongStoreServiceInfo.status(id,new Date(d)).state);
  });
  assert.deepEqual(report.status,['open','closing-soon','closed']);
  assert.deepEqual(report.errors,[]);
  report.success=true;
}finally{
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  await browser.close();
}
