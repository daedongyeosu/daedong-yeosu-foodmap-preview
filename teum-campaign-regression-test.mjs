import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const id='d9730ed96e5fbd9a',name='틈 돈까스 미평점';
const hero=JSON.parse(readFileSync('data/hero-campaigns.json','utf8'));
const campaign=hero.campaigns[id];
assert.ok(campaign,'Existing live store must have its own campaign');
assert.equal(hero.virtualStores[id],undefined,'Never shadow the live store or its routes');
assert.equal(campaign.storeId,id);
assert.equal(campaign.title,name);
assert.equal(campaign.slug,'teum-donkatsu-mipyeong');
assert.equal(campaign.layout,'food14-plus3');
assert.equal(campaign.slides.length,14);
assert.equal(new Set(campaign.slides.map(s=>s.image)).size,14,'Do not duplicate food photos');
assert.equal(new Set(campaign.slides.map(s=>s.meta)).size,14,'Do not duplicate menu captions');
for(const slide of campaign.slides){
 assert.equal(slide.storeId,id,'Do not link another store');
 assert.equal(slide.title,name);
 assert.match(slide.image,/^https:\/\/dwdwaxgahvp6i\.cloudfront\.net\/shbimg\/biz\/img\//);
 assert.ok(slide.meta.trim());
 assert.doesNotMatch(slide.meta,/\d[\d,]*\s*원|와우\s*회원/);
}
const links=JSON.parse(readFileSync('data/store-campaign-links.json','utf8')).campaigns.filter(s=>s.storeId===id);
assert.equal(links.length,1);
assert.equal(links[0].name,name);
assert.equal(links[0].url,'https://daedongmap.com/?hero=d9730ed96e5fbd9a');
assert.equal(links[0].previewUrl,'https://preview.daedongmap.com/?hero=d9730ed96e5fbd9a');
assert.equal(links[0].qrAsset,'assets/qr/teum-donkatsu-mipyeong.svg');
const svg=readFileSync(links[0].qrAsset,'utf8');
assert.ok(svg.includes('<desc>'+links[0].url+'</desc>'),'Printed QR must target permanent production URL');
for(const [file,asset] of [['rc6-fixes.js','hero-campaigns.json'],['final-experience.js','rc6-fixes.js'],['index.html','final-experience.js']]){
 const source=readFileSync(file,'utf8');
 assert.ok(source.split('\n').some(line=>line.includes(asset+'?v=') && line.includes('teum-campaign-1')),'Refresh cache chain: '+file);
}
console.log('teum-campaign-regression-test: pass');
