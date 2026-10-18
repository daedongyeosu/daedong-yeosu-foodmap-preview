import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),M=require('./neighbor-market/model.js'),clone=value=>JSON.parse(JSON.stringify(value));
for(const input of ['',null,undefined,' ','-1','1.2','1e3','100원','1,000','100000000',NaN,Infinity,{},[]])assert.equal(M.price(input),null,String(input));
for(const [input,expected] of [['0',0],[' 5000 ',5000],['000100',100],['99999999',99999999],[12000,12000]])assert.equal(M.price(input),expected);
const example=M.example(),clean=M.clean(example);assert.equal(clean.items.length,6);assert.equal(new Set(clean.items.map(item=>item.id)).size,6);assert.ok(clean.items.every(item=>item.sample));assert.deepEqual(M.clean(clean),clean,'Normalization is idempotent');
assert.deepEqual(M.basket(clean,new Set(['sample-0','sample-0','sample-1'])).items.map(item=>item.id),['sample-0','sample-1']);assert.equal(M.basket(clean,new Set(['sample-0','sample-1'])).total,47000);
const sold=clone(clean);sold.items[0].sold=true;assert.equal(M.basket(sold,new Set(['sample-0','sample-1'])).total,9000,'Sold items cannot be selected');
const free=clone(clean);free.items[0].price=0;assert.equal(M.clean(free).items[0].price,0);assert.equal(M.basket(free,new Set(['sample-0'])).items.length,1);
assert.throws(()=>M.validateEntries([]));assert.throws(()=>M.validateEntries([{...clean.items[0],price:''}]),/1번째/);assert.equal(M.validateEntries([{...clean.items[0],price:'0',name:''}])[0].name,'내 물건 1');
for(const src of ['https://example.com/x.png','javascript:alert(1)','data:image/svg+xml;base64,PHN2Zz4=','../private/document.jpg'])assert.equal(M.image(src),false);
for(const id of [undefined,null,3,'','bad"id','x'.repeat(81)]){const bad=clone(clean);bad.items[0].id=id;assert.throws(()=>M.clean(bad));}
const duplicate=clone(clean);duplicate.items[1].id=duplicate.items[0].id;assert.throws(()=>M.clean(duplicate));
for(const mutation of [scene=>scene.items[0].price=null,scene=>scene.format='matjido-studio',scene=>scene.items.push(...Array(20).fill(scene.items[0]))]){const bad=clone(clean);mutation(bad);assert.throws(()=>M.clean(bad));}
const styled=M.applyTheme(clean,'closet');assert.deepEqual(styled.items,clean.items);assert.equal(styled.wall,M.themes.closet.wall);assert.equal(clean.wall,M.themes.attic.wall,'Theme changes are immutable');
const arranged=M.arrange({...clone(clean),items:clone(clean.items).map((item,index)=>({...item,x:5,y:28,locked:index===0}))});assert.equal(arranged.items[0].x,5);assert.equal(arranged.items[0].y,28);assert.deepEqual(arranged.items.map(item=>[item.id,item.name,item.price,item.src]),clean.items.map(item=>[item.id,item.name,item.price,item.src]));
for(const item of M.arrange({...M.blank(),items:Array.from({length:20},(_,i)=>({...clean.items[0],id:'item-'+i}))}).items){assert.ok(item.x>=0&&item.x+item.size<=100);assert.ok(item.y>=19&&item.y+item.size*.9<=96);}
assert.notEqual(M.DB,'matjido-shop-studio-v1');assert.notEqual(M.KEY,'scene');
const html=fs.readFileSync('neighbor-market/index.html','utf8'),js=fs.readFileSync('neighbor-market/market.js','utf8');
assert.match(html,/실제 판매·예약·결제·배송은 발생하지 않습니다/);assert.match(html,/사진과 가격만 넣으면/);assert.match(html,/type="file" accept="image\/\*" multiple/);assert.match(html,/capture="environment"/);
assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|sendBeacon|localStorage|innerHTML|eval\(/,'Prototype must not call servers, use other store storage, or inject HTML');
assert.match(js,/tx.oncomplete=resolve/);assert.match(js,/r.result\?\.revision\?\?0\)!==expected/);assert.match(js,/basketIds.has\(item.id\)\)return/);assert.match(js,/sample:false/);
for(const name of ['camera','books','bag']){const image=fs.readFileSync('assets/neighbor-market/'+name+'.webp');assert.equal(image.subarray(8,12).toString(),'WEBP');assert.ok(image.length<150000);}
console.log('PASS isolated neighbor market: exact prices/free vs missing, six declared samples, one-off basket/sold guards, safe input and scene identity, themes/locked layout, 20-photo bounds, new storage and no server integration');
