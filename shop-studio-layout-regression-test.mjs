import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),layout=require('./store-studio/layout.js');
const photo=(id,extra={})=>({id,x:8,y:30,size:18,rotation:0,locked:false,hidden:false,...extra});
for(const angle of [-45,-20,0,20,45])for(const size of [8,18,45]){
  const bounded=layout.bounded(photo('edge',{x:100,y:100,size,rotation:angle}));
  const f=layout.footprint(bounded);
  assert.ok(bounded.x-f.offsetX>=-1e-8);
  assert.ok(bounded.x+bounded.size+f.offsetX<=100+1e-8);
  assert.ok(bounded.y-f.offsetY>=20-1e-8);
  assert.ok(bounded.y+f.baseHeight+f.offsetY<=98+1e-8,'Rotated photos must stay inside the shop');
  const snapped=layout.onShelf(bounded,3),snapFootprint=layout.footprint(snapped);
  assert.ok(layout.shelfLevels(3).some(level=>Math.abs(level-snapped.y-snapFootprint.baseHeight-snapFootprint.offsetY)<1e-8));
}
for(const zones of [1,2,3])for(const shelves of [2,3,4])for(const count of [1,5,12,24,40]){
  const original=Array.from({length:count},(_,i)=>photo(String(i))),copy=structuredClone(original);
  const result=layout.arrange(original,zones,shelves);
  assert.deepEqual(original,copy,'Arranging must not mutate the previous draft');
  if(!result.ok){assert.equal(result.items,undefined);assert.ok(result.message);continue;}
  assert.equal(result.items.length,count);
  for(const [i,item] of result.items.entries()){
    assert.ok(item.size>=8);
    assert.deepEqual(layout.bounded(item),item);
    for(const other of result.items.slice(i+1))assert.equal(layout.overlaps(item,other),false,'Arranged items must not overlap');
  }
}
const fixed=photo('locked',{locked:true,x:15,y:46}),hidden=photo('hidden',{hidden:true});
const result=layout.arrange([fixed,hidden,photo('moving')],1,3);
assert.equal(result.ok,true);assert.deepEqual(result.items[0],fixed);assert.deepEqual(result.items[1],hidden);
assert.equal(layout.overlaps(result.items[0],result.items[2]),false);
assert.equal(layout.arrange([fixed,hidden]).ok,false);
console.log('PASS shop studio geometry: rotation bounds, shelf placement, immutable arrangement, collision avoidance and locked/hidden preservation');
