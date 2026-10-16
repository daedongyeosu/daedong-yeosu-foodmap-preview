import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const layout=createRequire(import.meta.url)('./store-studio/layout.js');
const item=layout.bounded({id:'photo',x:8,y:26,size:10,rotation:30,catalogProductId:'sku',decorId:'shelf',purpose:'product'}),items=[item],original=JSON.stringify(items);
const result=layout.repeatPlan(items,'photo',{columns:3,rows:2,gapX:2,gapY:3});assert.equal(result.ok,true);assert.equal(result.count,5);const f=layout.footprint(item);assert.equal(result.positions[0].x,item.x+f.width+2);assert.equal(result.positions[2].y,item.y+f.height+3);assert.equal(JSON.stringify(items),original);
for(const patch of [{columns:0},{columns:1,rows:1},{rows:5},{gapX:Infinity},{gapY:-1},{columns:2.5}])assert.equal(layout.repeatPlan(items,'photo',{columns:3,rows:2,gapX:2,gapY:3,...patch}).ok,false);
for(const flag of ['locked','hidden'])assert.equal(layout.repeatPlan([{...item,[flag]:true}],'photo',{columns:2,rows:1,gapX:2,gapY:2}).ok,false);
assert.equal(layout.repeatPlan([{...item,x:90}],'photo',{columns:2,rows:1,gapX:2,gapY:2}).ok,false);
const obstacle={...item,id:'other',...result.positions[0]};assert.equal(layout.repeatPlan([...items,obstacle],'photo',{columns:2,rows:1,gapX:2,gapY:2}).ok,false);assert.equal(layout.repeatPlan([...items,{...obstacle,hidden:true}],'photo',{columns:2,rows:1,gapX:2,gapY:2}).ok,true);
const many=Array.from({length:40},(_,i)=>({...item,id:i?'other-'+i:'photo',hidden:i>0}));assert.equal(layout.repeatPlan(many,'photo',{columns:2,rows:1,gapX:2,gapY:2}).ok,false);
for(const rotation of [-45,0,45]){const photo=layout.bounded({...item,rotation}),r=layout.repeatPlan([photo],'photo',{columns:3,rows:2,gapX:0,gapY:0});assert.ok(r.ok);assert.equal(r.count,5);}
console.log('PASS repeat display geometry: rotation bounds, selected anchor, full-plan collision/limit/lock/hidden rejection and immutable inputs');
