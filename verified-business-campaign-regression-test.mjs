import fs from 'node:fs';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
const read=f=>JSON.parse(fs.readFileSync(f,'utf8'));
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const batch=read('data/verified-campaign-stores.json'),ids=new Set(batch.map(x=>x.storeId));
assert.equal(batch.length,122);assert.equal(ids.size,122);assert.equal(hash(batch),'8ce9be923c4e591948c6a4b806a03cb411428461141060e65a101fd23216a85e');
assert.ok(ids.has('65cc1845e542d5fb'),'Correct Yeoseo/Munsu single-brand shop must be included');
assert.ok(!ids.has('c143aca89697f5aa'),'Unmanaged Hakdong store must never enter verified batch');
assert.ok(!ids.has('e0c6949efb48f4b2'),'Previously hidden stores must not be republished');
const hero=read('data/hero-campaigns.json'),links=read('data/store-campaign-links.json');
assert.equal(hash({...hero,campaigns:Object.fromEntries(Object.entries(hero.campaigns).filter(([id])=>!ids.has(id)))}),'284c8c2c39047e2ac26f3c36ca7b41f15a92703fbe3b0c7fd5cdd17658455951');
assert.equal(hash({...links,campaigns:links.campaigns.filter(x=>!ids.has(x.storeId))}),'bfc1aad436aa07ec03e1680ea11a8192a81f7df136da3dc89e01ba8c3acc27c5');
for(const {storeId,name} of batch){
 assert.match(storeId,/^[a-f0-9]{16}$/);const c=hero.campaigns[storeId],l=links.campaigns.find(x=>x.storeId===storeId);
 assert.equal(c.storeId,storeId);assert.equal(c.title,name);assert.equal(c.slides.length,storeId==='dc638b23f8cf3c5b'?14:1);assert.ok(c.slides.every(x=>x.storeId===storeId));
 assert.equal(l.url,`https://daedongmap.com/?hero=${storeId}`);assert.equal(l.previewUrl,`https://preview.daedongmap.com/?hero=${storeId}`);
 const svg=fs.readFileSync(l.qrAsset,'utf8');const size=Number(svg.match(/viewBox="0 0 (\d+) \d+"/)[1]);
 const cells=[...svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map(x=>[+x[1],+x[2]]);
 assert.equal(Math.min(...cells.map(x=>x[0])),0);assert.equal(Math.min(...cells.map(x=>x[1])),0);
 assert.equal(Math.max(...cells.map(x=>x[0])),size-1);assert.equal(Math.max(...cells.map(x=>x[1])),size-1);
 assert.deepEqual(Object.keys(batch.find(x=>x.storeId===storeId)).sort(),['name','storeId'],'Private business numbers must not be published');
}
console.log('Verified business campaign additions and baseline preservation passed');
