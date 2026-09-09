import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
import {beforeSharedHero,beforeSharedLinks} from './scripts/shared-campaign-baseline.mjs';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const hash=x=>createHash('sha256').update(typeof x==='string'||Buffer.isBuffer(x)?x:JSON.stringify(x)).digest('hex');
const fixture=read('scripts/fixtures/shared-store-campaigns-102.json');
assert.equal(hash(fixture),'060bfefda356f9653620d4050f27d0fccc0c4f7692a00769ca2c8cb246c3f9b2','Reviewed release fixture must not drift');
const hero=read('data/hero-campaigns.json'),links=read('data/store-campaign-links.json'),priority=read('data/store-priority.json'),ads=read('data/banner-targets.json');
const ids=fixture.stores.map(x=>x.storeId);
assert.equal(ids.length,102);assert.equal(new Set(ids).size,102);
assert.deepEqual(ids,priority.referralProfiles['shared-yeosu'].storeIds,'Reuse the exact previously approved /s roster; no rematching');
assert.equal(fixture.stores.filter(x=>x.added).length,89);
assert.equal(fixture.stores.filter(x=>x.preserved).length,2);
assert.equal(Object.keys(fixture.originalCampaigns).length,11);
assert.deepEqual(read('data/shared-campaign-stores.json'),fixture.stores.filter(x=>x.added).map(({storeId,name})=>({storeId,name})));
const production=fs.readFileSync('data-api.js','utf8').includes("const BASE_URL = IS_GOHEUNG ? '' : 'https://daedong-yeosu-data-api.sisakim.workers.dev'");
const baseline=fixture.baselines[production?'production':'preview'];
assert.equal(hash(beforeSharedHero(hero)),baseline.hero,'All non-target campaigns and virtual store records preserved');
assert.equal(hash(beforeSharedLinks(links)),baseline.links,'All original QR destinations, order and manifest metadata preserved');
assert.equal(hash(priority),baseline.priority,'Shared ranking, managed ranking and hidden-store rules unchanged');
assert.equal(hash(ads),baseline.ads,'All three original general advertisements unchanged');
const rc6=fs.readFileSync('rc6-fixes.js','utf8');
const render=rc6.slice(rc6.indexOf('function rc6CampaignHeroEntries(){'),rc6.indexOf('\nfunction rc6HeroEntries()'));
for(const expected of fixture.stores){
 const id=expected.storeId,c=hero.campaigns[id],link=links.campaigns.find(x=>x.storeId===id);
 assert.equal(hash(c),expected.campaignHash,id+': exact reviewed menu names and photos');
 assert.equal(c.storeId,id);assert.equal(c.title,expected.name);
 assert.equal(c.slides.length,expected.slideCount);assert.ok(expected.foodPhotoCount<=14);
 if(!expected.preserved)assert.equal(c.menuHydration,'curated-static');
 assert.equal(new Set(c.slides.map(s=>s.image)).size,c.slides.length);
 assert.ok(c.slides.every(s=>s.storeId===id&&s.title===expected.name));
 const digests=c.slides.map(s=>[s.image,/^https:/.test(s.image)?null:hash(/\.svg$/.test(s.image)?fs.readFileSync(s.image,'utf8').replace(/\r\n/g,'\n'):fs.readFileSync(s.image))]);
 assert.equal(hash(digests),expected.imageDigest,id+': published food image bytes');
 assert.equal(new Set(digests.filter(x=>x[1]).map(x=>x[1])).size,digests.filter(x=>x[1]).length,'No repeated photo filler');
 if(expected.foodPhotoCount===0){assert.equal(c.slides.length,1);assert.match(c.slides[0].image,/\.svg$/);}
 assert.equal(hash(link),expected.linkHash);assert.equal(link.url,'https://daedongmap.com/?hero='+id);
 const qr=fs.readFileSync(link.qrAsset,'utf8').replace(/\r\n/g,'\n');
 assert.equal(hash(qr),expected.qrHash);
 const n=+qr.match(/viewBox="0 0 (\d+) \d+"/)[1];
 const cells=[...qr.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map(x=>[+x[1],+x[2]]);
 if(cells.length){for(const axis of [0,1]){assert.equal(Math.min(...cells.map(x=>x[axis])),0);assert.equal(Math.max(...cells.map(x=>x[axis])),n-1);}}
 else {assert.equal(id,'068b2ae8fe32874a');assert.equal(expected.preserved,true);assert.match(qr,/path stroke="#000000"/);}
 // The earlier Pizza Meokda SVG is hash-preserved. Its delivered PNG, like all
 // 102 print files, is separately generated/decoded with zero file border.
 const store={id,name:expected.name};
 const entries=new vm.Script(render+'\nrc6CampaignHeroEntries()').runInNewContext({
  RC6_IS_GOHEUNG:false,RC6_CAMPAIGN_STORE_HERO_LIMIT:14,RC6_CAMPAIGN_SPECIAL_HERO_KEYS:['18','19','20'],
  rc6RequestedHeroCampaign:()=>({campaign:c,store}),rc6CampaignStoreById:key=>key===id?store:null,
  rc6CampaignMenuSlides:new Map(),rc6BannerTargets:ads,HERO_BANNERS:[]
 });
 assert.equal(entries.filter(x=>x.kind==='store').length,expected.slideCount);
 assert.equal(entries.filter(x=>x.kind==='notion').length,3);
 assert.equal(entries.length,expected.slideCount+3);
}
const load=rc6.slice(rc6.indexOf('async function rc6LoadRequestedCampaignMenuSlides(){'),rc6.indexOf('\nfunction rc6CampaignHeroEntries()'));
for(const [curated,staticCount,expectedCalls] of [[true,1,0],[true,5,0],[false,14,0],[false,1,1]]){
 let calls=0,renders=0;const cache=new Map();
 const context={window:{daedongDataApi:{menu:async()=>{calls++;return {};}}},
  rc6RequestedHeroCampaign:()=>({campaign:{...(curated?{menuHydration:'curated-static'}:{}),slides:Array.from({length:staticCount},()=>({image:'x'}))},store:{id:'test'}}),
  rc6BuildCampaignMenuSlides:()=>Array.from({length:14},()=>({image:'review-unrelated'})),rc6CampaignMenuSlides:cache,rc6HeroRenderKey:'old',rc6RenderHero:()=>renders++,console};
 await new vm.Script(load+'\nrc6LoadRequestedCampaignMenuSlides()').runInNewContext(context);
 assert.equal(calls,expectedCalls);assert.equal(renders,expectedCalls);
}
for(const file of ['rc6-fixes.js','final-experience.js','index.html'])assert.ok(fs.readFileSync(file,'utf8').includes('shared102-menu-1'));
assert.equal(fixture.stores.reduce((n,r)=>n+r.foodPhotoCount,0),1019);
assert.equal(fixture.stores.filter(r=>r.foodPhotoCount===14).length,50);
assert.equal(fixture.stores.filter(r=>r.foodPhotoCount===0).length,6);
console.log('Shared102: exact IDs; 89 additions + 11 curated updates + 2 preserved; 1019 food photos; every page retains 3 ads; borderless QR; all prior state preserved');
