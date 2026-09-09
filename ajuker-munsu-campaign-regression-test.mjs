import {beforeSharedHero,beforeSharedLinks} from './scripts/shared-campaign-baseline.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const id='e66f136d0e468b6e',name='아주커치킨 문수점';
const hero=beforeSharedHero(read('data/hero-campaigns.json')),links=beforeSharedLinks(read('data/store-campaign-links.json'));
const campaign=hero.campaigns[id],link=links.campaigns.find(x=>x.storeId===id);
assert.ok(campaign && link, '문수점 전용 구성이 있어야 합니다.');
assert.equal(campaign.storeId,id);assert.equal(campaign.title,name);
assert.equal(campaign.layout,'food14-plus3');assert.equal(campaign.storeHeroLimit,14);
const names=["후라이드치킨","양념치킨","간장치킨","매콤양념치킨","반반치킨","순살치킨","순살양념","순살간장","순살반반","후라이드 윙봉","양념윙봉","간장윙봉","반반윙봉","감자튀김 케이준"];
const hashes=["9006ff44fcf6b1ade343ba423a3fe17df061edf47c19954f13ef147f37aa48fc","1987f03f8845d799d3fdff844add1deeb95f5c19a4515fc553dde2c1f4fcc87b","5a9fb0f798c98e9450d81e398fa2b220fae00a41660defd600f58507b264b6a9","4092ce03d71b525a94d35ef53efb95cf75fbadb4603819f590e8cc14bed10f3e","6713f1d43b38ab4652fc81d7a9bf10649d8038681a2b1687178f58a6463db9a8","0242dcbff6f734c565a92ccef8a471c0e24350089cb9637586c3b080d7851c2b","66d17c53a8a85626e43c7acef8f00b8c5e29e533c4d26fd487ffe909f78014d7","663e042c697185f469d18580924d4e39f8acb837546efcf9396d12ba556d4072","cb8bc6ff8b37bd0b55f782ef0e6b387591b54b87077fca9c033c05a41907c4b8","4060c1f4a605d78db0c5a0f3b807e909d37da333ba5160641d0f824c4f9d9367","304840007a91a3e11a576afd4daf6ca8b94ed50cecacd1199d9e6ae9e2430888","ba91a7e5dc02e355152795d337c32736f3f07d47dd0c272a51b780fa03eb07e6","1fa10fb502232bd14ee9d7f4c473f374cf5247b79f697700c47bee16f751f18a","b4af08e0d7d28ea3d7a1ae257b6959d8a8d874e313ab502c0787d70c49776e14"];
assert.equal(campaign.slides.length,14);
assert.deepEqual(campaign.slides.map(x=>x.meta),names,'실제 문수점 메뉴명을 순서대로 유지');
assert.equal(new Set(campaign.slides.map(x=>x.image)).size,14);
campaign.slides.forEach((slide,i)=>{
 assert.equal(slide.storeId,id);assert.equal(slide.title,name);
 const data=fs.readFileSync(slide.image);
 assert.equal(createHash('sha256').update(data).digest('hex'),hashes[i],names[i]+': 검수한 음식사진 유지');
 assert.equal(data.subarray(8,12).toString(),'WEBP');
});
assert.equal(new Set(hashes).size,14,'동일 사진 복제 금지');
assert.equal(link.url,'https://daedongmap.com/?hero='+id);
assert.equal(link.previewUrl,'https://preview.daedongmap.com/?hero='+id);
const qr=fs.readFileSync(link.qrAsset,'utf8');
assert.ok(qr.includes('data-target-url="'+link.url+'"'));
assert.match(qr,/viewBox="0 0 33 33"/);
const cells=[...qr.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map(x=>[+x[1],+x[2]]);
for(const axis of [0,1]){assert.equal(Math.min(...cells.map(x=>x[axis])),0);assert.equal(Math.max(...cells.map(x=>x[axis])),32);}
const production=fs.readFileSync('data-api.js','utf8').includes("const BASE_URL = IS_GOHEUNG ? '' : 'https://daedong-yeosu-data-api.sisakim.workers.dev'");
const baseline=production?{"repo":"work/ajuker-production","hero":"693a7ec2bc1cdabc1e06a2d799077db5a2cf20909994f63e24ebc0c09a4c69f4","links":"f5df464f2925f8133cad2f9019a543fdbd460ea0591fc07380d76d22e14e5ee1"}:{"repo":"work/ajuker-preview","hero":"7bde01cbca75a7fb9988f4a072b282a5a95d800282f3cf08286b8becaf6d07a7","links":"5e7298c52ad74c1b1b7cd58bce874ec88a44283bfb2bbf03d662857392ec8710"};
assert.equal(hash({...hero,campaigns:Object.fromEntries(Object.entries(hero.campaigns).filter(([key])=>key!==id))}),baseline.hero,'기존 전체 가게전용 구성 보존');
assert.equal(hash({...links,campaigns:links.campaigns.filter(x=>x.storeId!==id)}),baseline.links,'기존 전체 QR·링크 순서와 내용 보존');
const rc6=fs.readFileSync('rc6-fixes.js','utf8');
const start=rc6.indexOf('function rc6CampaignHeroEntries(){'),end=rc6.indexOf('\nfunction rc6HeroEntries()',start);
const store={id,name};
const entries=JSON.parse(JSON.stringify(new vm.Script(rc6.slice(start,end)+'\nrc6CampaignHeroEntries()').runInNewContext({
 RC6_IS_GOHEUNG:false,RC6_CAMPAIGN_STORE_HERO_LIMIT:14,RC6_CAMPAIGN_SPECIAL_HERO_KEYS:['18','19','20'],
 rc6RequestedHeroCampaign:()=>({campaign,store}),rc6CampaignStoreById:key=>key===id?store:null,
 rc6CampaignMenuSlides:new Map(),rc6BannerTargets:read('data/banner-targets.json'),HERO_BANNERS:[]
})));
assert.equal(entries.length,17);
assert.equal(entries.filter(x=>x.kind==='store').length,14);
assert.deepEqual(entries.filter(x=>x.kind==='notion').map(x=>x.key),['campaign-notion-18','campaign-notion-19','campaign-notion-20']);
for(const f of ['rc6-fixes.js','final-experience.js','index.html'])assert.ok(fs.readFileSync(f,'utf8').includes('ajuker-munsu-14-1'));
console.log('Ajuker Munsu: verified branch, 14 distinct menu photos + 3 original ads, borderless QR, all previous campaigns preserved');
