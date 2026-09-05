import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let playwright;
try { playwright = await import('playwright'); }
catch(error) {
  if(!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw error;
  playwright = await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES,'playwright/index.mjs')).href);
}
const base = process.env.BASE_URL || 'https://preview.daedongmap.com/';
const local = process.env.CAMPAIGN_LOCAL_OVERRIDE === '1';
const production = new URL(base).hostname === 'daedongmap.com';
const out = process.env.CAMPAIGN_REPORT_DIR || root;
const ids = ['7bc7239e6b509c44','d86586aaef8454c9','84c118675c0caa4c','04910f606ba038a6'];
const data = JSON.parse(fs.readFileSync(path.join(root,'data/hero-campaigns.json')));
const browser = await playwright.chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ko-KR',serviceWorkers:'block'});
await context.addInitScript(()=>{
  sessionStorage.setItem('daedongCommunityIntroPlayedV4','1');
  sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1','1');
});
await context.route('**/api/events',route=>route.fulfill({status:204,body:''}));
await context.route('**/*posthog.com/**',route=>route.abort());
if(local){
  await context.route(new URL('/**',base).href,route=>{
    const file = new URL(route.request().url()).pathname.slice(1) || 'index.html';
    if(!['index.html','final-experience.js','rc6-fixes.js','data/hero-campaigns.json','data/store-campaign-links.json'].includes(file)) return route.continue();
    return route.fulfill({status:200,body:fs.readFileSync(path.join(root,file)),contentType:file.endsWith('.json')?'application/json':file.endsWith('.js')?'application/javascript':'text/html'});
  });
}
const report = {base,localOverride:local,checkedAt:new Date().toISOString(),stores:[],errors:[],success:false};
fs.mkdirSync(out,{recursive:true});
let active;
try {
  for(const id of ids){
    const page=await context.newPage(); active=page;
    page.on('pageerror',e=>report.errors.push(e.message));
    await page.goto(new URL(`?hero=${id}`,base).href,{waitUntil:'domcontentloaded'});
    const detail=page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${id}"]`);
    if(production){
      await detail.waitFor({timeout:30000});
      assert.ok((await detail.innerText()).includes(data.campaigns[id].title));
      await page.locator('#modal .modal-close').tap();
      await page.waitForFunction(id=>document.querySelector('#modal')?.hidden && new URL(location.href).searchParams.get('hero')===id,id);
    }
    const selector=`#heroTrack > .rc6-campaign-hero[data-rc6-banner-store="${id}"]`;
    await page.locator(selector).first().waitFor({timeout:15000});
    const slides=await page.locator(selector).evaluateAll(nodes=>[...new Map(nodes.map(n=>[n.dataset.heroIndex,{
      index:n.dataset.heroIndex,storeId:n.dataset.rc6BannerStore,title:n.querySelector('.rc6-store-hero-copy strong')?.textContent?.trim(),
      meta:n.querySelector('.rc6-store-hero-copy > span')?.textContent?.trim(),image:n.querySelector('img')?.getAttribute('src'),
    }])).values()].sort((a,b)=>Number(a.index)-Number(b.index)));
    assert.equal(slides.length,8);
    assert.deepEqual(slides.map(s=>s.title),data.campaigns[id].slides.map(s=>s.title));
    assert.deepEqual(slides.map(s=>s.meta),data.campaigns[id].slides.map(s=>s.meta));
    assert.deepEqual(slides.map(s=>s.image),data.campaigns[id].slides.map(s=>s.image));
    const foreign=await page.locator('#heroTrack > .rc6-campaign-hero[data-rc6-banner-store]').evaluateAll((nodes,id)=>nodes.filter(n=>n.dataset.rc6BannerStore!==id).length,id);
    assert.equal(foreign,0);
    const first=page.locator(selector+'[data-hero-index="0"]').first();
    await first.scrollIntoViewIfNeeded();
    await first.locator('.rc6-store-hero-media > img').evaluate(img=>img.decode());
    const box=await first.boundingBox();
    assert.ok(box.width<=390 && box.width>=300 && box.x>=0);
    await page.screenshot({path:path.join(out,`${id}-dedicated-map.png`)});
    const photos=[];
    for(const slide of data.campaigns[id].slides){
      const actual=await page.evaluate(async src=>{
        const image=new Image(); image.src=src; await image.decode();
        return {width:image.naturalWidth,height:image.naturalHeight};
      },slide.image);
      assert.ok(actual.width>100 && actual.height>100);
      photos.push({name:slide.meta,...actual});
    }
    await first.tap();
    await detail.waitFor({timeout:10000});
    await page.locator('#modal .modal-close').tap();
    await page.waitForFunction(id=>document.querySelector('#modal')?.hidden && new URL(location.href).searchParams.get('hero')===id,id);
    assert.equal(await page.locator(selector).evaluateAll(nodes=>new Set(nodes.map(n=>n.dataset.heroIndex)).size),8);
    await first.tap();
    await detail.waitFor({timeout:10000});
    await page.locator(`[data-store-menu-preview="${id}"]`).tap();
    const menu=page.locator('.store-menu-preview');
    await menu.waitFor({timeout:15000});
    assert.equal(await menu.locator('h1').innerText(),data.campaigns[id].title);
    assert.doesNotMatch(await menu.innerText(),/\d[\d,]*\s*원(?:\s|$)|와우\s*회원/);
    report.stores.push({id,name:data.campaigns[id].title,slides:8,photos,qrOpensDedicatedMap:true,initialDetailAutoOpen:production,closePreservesCampaign:true,bannerReopensDetail:true,menuOpens:true,mobileWidth:box.width});
    await page.close(); active=null;
  }
  assert.equal(report.errors.length,0,JSON.stringify(report.errors));
  report.success=true;
}catch(error){
  report.failure=error.stack||String(error);
  if(active) await active.screenshot({path:path.join(out,'four-campaign-failure.png')}).catch(()=>{});
}finally{
  fs.writeFileSync(path.join(out,'four-store-campaign-browser-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  await browser.close();
}
if(!report.success) process.exit(1);
