import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const deps=process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
const {chromium}=await import(deps?pathToFileURL(path.join(deps,'playwright/index.mjs')).href:'playwright');
const base=process.env.BASE_URL||'https://preview.daedongmap.com/';
const local=process.env.LOCAL_OVERRIDE==='1';
const output=process.env.REPORT_DIR||path.join(root,'artifacts/benefit-dedupe');
fs.mkdirSync(output,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ko-KR',serviceWorkers:'block'});
await context.addInitScript(()=>{sessionStorage.setItem('daedongCommunityIntroPlayedV4','1');sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1','1');});
await context.route('**/api/events',r=>r.fulfill({status:204,body:''}));
await context.route('**/*posthog.com/**',r=>r.abort());
// Test-only exports in an isolated browser; production exports remain unchanged.
await context.route('**/store-service-info.js*',async route=>{
  let source=local?fs.readFileSync(path.join(root,'store-service-info.js'),'utf8'):await(await route.fetch()).text();
  source=source.replace(/\}\)\(\);\s*$/,'window.__benefitQA={benefitLabels,detailBenefitItems,scopedBenefitLabel,sourceStores,serviceInfoForStore,refreshServiceSurfaces};})();');
  await route.fulfill({status:200,contentType:'application/javascript',body:source});
});
const page=await context.newPage();
const report={base,local,success:false,surfaces:[],errors:[]};
page.on('pageerror',e=>report.errors.push(e.message));
async function close(){await page.evaluate(()=>{if(!document.querySelector('#modal').hidden)hardClose();});}
async function checkCards(name){
  await page.evaluate(()=>window.__benefitQA.refreshServiceSurfaces());
  const result=await page.locator('[data-store-service-card-meta]').evaluateAll(nodes=>({
    cards:nodes.length,
    duplicates:nodes.flatMap(n=>{
      const labels=[...n.querySelectorAll('.store-service-card-payment')].map(b=>b.textContent.trim());
      return labels.length!==new Set(labels).size?[{id:n.closest('[data-id]')?.dataset.id,labels}]:[];
    })
  }));
  assert.deepEqual(result.duplicates,[],name);
  report.surfaces.push({name,cards:result.cards});
}
try{
  await page.goto(base,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>window.__benefitQA&&window.daedongStoreServiceInfo);
  await page.evaluate(async()=>{await window.daedongCatalogReady;await window.daedongStoreServiceInfo.ready;});
  report.audit=await page.evaluate(()=>{
    const q=window.__benefitQA,duplicates=[],mutated=[];
    const stores=q.sourceStores();
    for(const store of stores){
      const info=q.serviceInfoForStore(store),before=JSON.stringify(info);
      const labels=q.benefitLabels(info).map(q.scopedBenefitLabel);
      const detail=q.detailBenefitItems(info).filter(b=>b.state==='available').map(q.scopedBenefitLabel);
      if(labels.length!==new Set(labels).size||detail.length!==new Set(detail).size)duplicates.push({id:store.id,name:store.name,labels,detail});
      if(JSON.stringify(info)!==before)mutated.push(store.id);
    }
    return {stores:stores.length,duplicates,mutated};
  });
  assert.ok(report.audit.stores>2000,'Must audit the whole current customer catalog');
  assert.deepEqual(report.audit.duplicates,[]);
  assert.deepEqual(report.audit.mutated,[]);
  await close();
  await checkCards('home grid');
  const cats=await page.evaluate(()=>categories.filter(c=>c!=='전체'));
  for(const cat of cats){
    await page.evaluate(c=>{state.query='';state.brandId='';state.category=c;rc5RenderCategory();rc4OpenCategoryAll();},cat);
    await checkCards('category-all:'+cat);
    await close();
  }
  const affected=[
    ['d9730ed96e5fbd9a','틈 돈까스'],['9407e6bd4e71b539','수원왕갈비통닭'],['884076b36adf9697','촌닭두마리치킨']
  ];
  for(const [id,query] of affected){
    await page.evaluate(query=>{state.query=query;state.category='전체';state.brandId='';renderStores({resetCount:true});},query);
    await page.locator(`#storeGrid [data-id="${id}"] [data-store-service-card-meta]`).waitFor();
    await checkCards('search-grid:'+id);
    const card=page.locator(`#storeGrid [data-id="${id}"]`);
    assert.equal(await card.locator('.store-service-card-payment').filter({hasText:'여수섬섬페이 가맹점'}).count(),1);
    await page.evaluate(()=>{for(let i=0;i<5;i++)window.__benefitQA.refreshServiceSurfaces();});
    assert.equal(await card.locator('[data-store-service-card-meta]').count(),1,'Repeated refresh must stay idempotent');
    if(id===affected[0][0]){await card.scrollIntoViewIfNeeded();await page.screenshot({path:path.join(output,'teum-card.png')});}
    await page.evaluate(q=>window.daedongStoreServiceInfo.showOverview(document.activeElement,{query:q,focusQuery:false}),query);
    const row=page.locator(`.store-service-overview-card[data-store-service-store-id="${id}"]`);
    await row.waitFor();
    assert.equal(await row.locator('.store-service-overview-payments b').filter({hasText:'여수섬섬페이 가맹점'}).count(),1);
    const labels=await page.locator('.store-service-overview-card').evaluateAll(nodes=>nodes.map(n=>[...n.querySelectorAll('.store-service-overview-payments b')].map(b=>b.textContent.trim())));
    assert.ok(labels.length>0,'Search must return store cards');
    labels.forEach(values=>assert.equal(values.length,new Set(values).size));
    report.surfaces.push({name:'integrated-search:'+id,cards:labels.length});
    await page.keyboard.press('Escape');
    await close();
  }
  assert.deepEqual(report.errors,[]);
  report.success=true;
  console.log(JSON.stringify({success:true,stores:report.audit.stores,surfaces:report.surfaces.length,duplicates:0}));
}finally{
  fs.writeFileSync(path.join(output,'report.json'),JSON.stringify(report,null,2));
  await browser.close();
}
