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
const ids = ['2017de4f9111f3ce','93ae27237a8e75c4','1d691d8e74499d31'];
const expected = { '2017de4f9111f3ce': {cards:37,drinks:7,photos:27}, '93ae27237a8e75c4': {cards:53,drinks:6,photos:25}, '1d691d8e74499d31': {cards:46,drinks:7,photos:31} };
const data = JSON.parse(fs.readFileSync(path.join(root,'data/hero-campaigns.json')));
const targets = JSON.parse(fs.readFileSync(path.join(root,'data/banner-targets.json')));
const ads = ['18','19','20'].map(key=>({url:targets[key].notionUrl,image:targets[key].image}));
async function renderFrames(page){
  await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))));
}
async function readyMenuCard(page,card){
  await card.scrollIntoViewIfNeeded();
  // A content-visibility:auto placeholder can have a visible bounding box
  // before its actual text/image subtree has been painted.
  await card.evaluate(async node=>{
    const deadline=performance.now()+5000;
    while(performance.now()<deadline){
      const title=node.querySelector('h3');
      if(node.innerText.trim() && title?.getBoundingClientRect().height>0) return;
      await new Promise(resolve=>requestAnimationFrame(resolve));
    }
    throw new Error('Menu card content did not become render-ready');
  });
  await renderFrames(page);
}
async function decodeMenuImage(page,image){
  await readyMenuCard(page,image.locator('xpath=ancestor::*[@data-menu-card][1]'));
  const result=await image.evaluate(async img=>{
    const deadline=performance.now()+15000;
    while(!img.getAttribute('src') && performance.now()<deadline) await new Promise(resolve=>setTimeout(resolve,40));
    if(!img.getAttribute('src')) throw new Error('Menu image source was never hydrated: '+img.alt);
    let timer;
    try{
      await Promise.race([img.decode(),new Promise((_,reject)=>{timer=setTimeout(()=>reject(new Error('Menu image decode timeout: '+img.alt)),15000);})]);
    }finally{clearTimeout(timer);}
    return {id:img.closest('[data-menu-card]')?.dataset.menuId,name:img.alt,src:img.src,currentSrc:img.currentSrc,width:img.naturalWidth,height:img.naturalHeight};
  });
  assert.ok(result.width>0 && result.height>0,'Menu image must actually decode: '+result.name);
  await renderFrames(page);
  return result;
}
async function readyMenuScreenshot(page,card){
  await readyMenuCard(page,card);
  for(const image of await card.locator(':scope > .store-menu-photo > img').all()) await decodeMenuImage(page,image);
  // Restore the card anchor after image loading can change layout.
  await readyMenuCard(page,card);
}
async function assertComposition(page,id){
  const entries=await page.locator('#heroTrack > [data-hero-index]').evaluateAll(nodes=>[...new Map(nodes.map(n=>[n.dataset.heroIndex,{
    index:Number(n.dataset.heroIndex),storeId:n.dataset.rc6BannerStore||'',url:n.dataset.rc6BannerNotion||'',image:n.querySelector('img')?.getAttribute('src'),
  }])).values()].sort((a,b)=>a.index-b.index));
  assert.equal(entries.length,17,'Fourteen food slides plus three general ads must remain visible');
  assert.deepEqual(entries.map(e=>e.index),Array.from({length:17},(_,i)=>i));
  const food=entries.filter(e=>e.storeId);
  assert.equal(food.length,14);
  assert.ok(food.every(e=>e.storeId===id),'No foreign store photos');
  assert.deepEqual(entries.filter(e=>e.url).map(({index,url,image})=>({index,url,image})),ads.map((ad,i)=>({index:[4,9,14][i],...ad})));
}
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
    if(!['index.html','final-experience.js','rc6-fixes.js','data/hero-campaigns.json','data/store-campaign-links.json','menu-family-model.js'].includes(file)) return route.continue();
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
    const detail=page.locator(`#modal:not([hidden]) .store-detail:not(.store-detail-loading):not(.store-detail-degraded)[data-store-id="${id}"]`);
    if(production){
      await detail.waitFor({timeout:30000});
      const title = (await detail.locator('h2').first().innerText()).replace(/\s/g,'');
      // The existing live catalog omits the branch suffix for this store.
      const allowedTitles = [data.campaigns[id].title, ...(id==='04910f606ba038a6'?['오워래 수제 돈까스']:[])];
      assert.ok(allowedTitles.map(name=>name.replace(/\s/g,'')).includes(title),title);
      await page.waitForTimeout(600); // Let the existing modal/touch transition settle.
      await page.locator('#modal .modal-close').tap();
      await page.waitForFunction(id=>document.querySelector('#modal')?.hidden && new URL(location.href).searchParams.get('hero')===id,id);
      await page.waitForTimeout(600);
    }
    const selector=`#heroTrack > .rc6-campaign-hero[data-rc6-banner-store="${id}"]`;
    await page.locator(selector).first().waitFor({timeout:15000});
    const slides=await page.locator(selector).evaluateAll(nodes=>[...new Map(nodes.map(n=>[n.dataset.heroIndex,{
      index:n.dataset.heroIndex,storeId:n.dataset.rc6BannerStore,title:n.querySelector('.rc6-store-hero-copy strong')?.textContent?.trim(),
      meta:n.querySelector('.rc6-store-hero-copy > span')?.textContent?.trim(),image:n.querySelector('img')?.getAttribute('src'),
    }])).values()].sort((a,b)=>Number(a.index)-Number(b.index)));
    assert.equal(slides.length,14);
    await assertComposition(page,id);
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
    await first.locator('.rc6-store-hero-media').tap();
    await detail.waitFor({timeout:10000});
    await page.waitForTimeout(600);
    await page.locator('#modal .modal-close').tap();
    await page.waitForFunction(id=>document.querySelector('#modal')?.hidden && new URL(location.href).searchParams.get('hero')===id,id);
    await page.waitForTimeout(600);
    await assertComposition(page,id);
    await first.locator('.rc6-store-hero-media').tap();
    await detail.waitFor({timeout:10000});
    await page.waitForTimeout(600);
    await page.locator(`[data-store-menu-preview="${id}"]`).tap();
    const menu=page.locator('.store-menu-preview');
    await menu.waitFor({timeout:15000});
    await menu.locator('[data-menu-card]').first().waitFor({state:'visible',timeout:15000});
    for(let step=0;step<12 && await menu.locator('[data-menu-card]').count()<expected[id].cards;step++){
      const previous=await menu.locator('[data-menu-card]').count();
      await menu.locator('.store-menu-scroll').evaluate(node=>{node.scrollTop=node.scrollHeight;});
      await page.waitForFunction(previous=>document.querySelectorAll('.store-menu-preview [data-menu-card]').length>previous,previous,{timeout:5000});
      await page.waitForFunction(()=>!document.querySelector('.store-menu-preview')?.__menuRenderState?.scrollChunkLocked);
    }
    const menuCards=await menu.locator('[data-menu-card]').count();
    assert.equal(menuCards,expected[id].cards);
    const kindCounts=await menu.locator('[data-menu-card]').evaluateAll(nodes=>nodes.map(n=>n.dataset));
    const projectedPhotos=await page.evaluate(async id=>{
      const raw=await window.daedongDataApi.menu(id);
      return window.daedongMenuFamilies.project(raw).items.filter(item=>item.image).map(item=>({id:String(item.id),image:new URL(item.image,location.href).href}));
    },id);
    assert.equal(projectedPhotos.length,expected[id].photos,'Current original-backed family photo count');
    const photoSources=new Map(projectedPhotos.map(item=>[item.id,item.image]));
    const menuPhotos=[];
    const allMenuPhotos=menu.locator('[data-menu-card] > .store-menu-photo > img');
    assert.equal(await allMenuPhotos.count(),expected[id].photos,'No original-backed family photo is missing');
    for(const image of await allMenuPhotos.all()){
      const actual=await decodeMenuImage(page,image);
      assert.equal(actual.src,photoSources.get(actual.id),'Menu image source must match its original-backed family: '+actual.name);
      assert.equal(actual.currentSrc,actual.src,'No silent photo replacement: '+actual.name);
      menuPhotos.push(actual);
    }
    const firstPhoto=menu.locator('[data-menu-card] > .store-menu-photo > img').first();
    assert.equal(await firstPhoto.count(),1,'Large original menu photo exists');
    {
      await decodeMenuImage(page,firstPhoto);
      const photoBox=await firstPhoto.boundingBox();
      assert.ok(photoBox?.width>=300,'Menu photos must retain the original large width');
    }
    if(id==='1d691d8e74499d31'){
      const wrong=menu.locator('[data-menu-card]').filter({hasText:'갈아만든 배'});
      assert.equal(await wrong.count(),1,'Drink remains a visible menu');
      assert.equal(await wrong.locator('img').count(),0,'Wrong cider label must not be shown');
    }
    const beverageNames=id==='2017de4f9111f3ce'?['스프라이트']:id==='93ae27237a8e75c4'?['코카콜라','스프라이트']:['환타파인','스프라이트','코카콜라','갈아만든 배'];
    for(const name of beverageNames){
      const beverage=menu.locator('[data-menu-card]').filter({hasText:name}).first();
      assert.equal(await beverage.count(),1,name+' remains a menu card');
      await readyMenuCard(page,beverage);
      await page.waitForFunction(name=>[...document.querySelectorAll('.store-menu-preview [data-menu-card]')].some(node=>node.innerText.includes(name)),name,{timeout:5000});
      assert.ok((await beverage.innerText()).includes(name),name+' remains visible when scrolled into view');
    }
    await readyMenuScreenshot(page,menu.locator('[data-menu-card]').last());
    await page.screenshot({path:path.join(out,id+'-menu-bottom.png')});
    await readyMenuScreenshot(page,menu.locator('[data-menu-card]').first());
    await page.screenshot({path:path.join(out,id+'-menu-top.png')});
    assert.ok(menuCards>0,'A heading without actual menu cards is not a working menu');
    assert.equal(await menu.locator('h1').innerText(),data.campaigns[id].title);
    assert.doesNotMatch(await menu.innerText(),/\d[\d,]*\s*원(?:\s|$)|와우\s*회원/);
    await assertComposition(page,id);
    report.stores.push({id,name:data.campaigns[id].title,slides:17,foodSlides:14,generalAds:3,photos,menuPhotos,menuPhotoDecodes:menuPhotos.length,menuPhotoSourcesMatch:true,qrOpensDedicatedMap:true,initialDetailAutoOpen:production,closePreservesCampaign:true,bannerReopensDetail:true,menuOpens:true,menuCards,mobileWidth:box.width});
    await page.close(); active=null;
  }
  assert.equal(report.errors.length,0,JSON.stringify(report.errors));
  report.success=true;
}catch(error){
  report.failure=error.stack||String(error);
  if(active) await active.screenshot({path:path.join(out,'three-campaign-failure.png')}).catch(()=>{});
}finally{
  fs.writeFileSync(path.join(out,'three-store-campaign-browser-report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
  await context.unrouteAll({behavior:'ignoreErrors'});
  await browser.close();
}
if(!report.success) process.exit(1);
