import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),design=require('./store-studio/design.js'),composition=require('./store-studio/composition.js'),layout=require('./store-studio/layout.js');
const fixtures=[['a',8,26,16,12],['b',40,43,20,18],['c',75,67,18,20]].map(([id,x,y,width,height])=>design.decor({id,type:'rack',x,y,width,height}));
const items=[layout.bounded({id:'photo',decorId:'b',x:44,y:44,size:10,rotation:30,catalogProductId:'sku'})],ids=['a','b','c'],original=JSON.stringify({fixtures,items});
for(const mode of ['left','right','top','bottom','centerX','centerY','spaceX','spaceY']){
  const result=composition.arrange(fixtures,items,ids,mode,layout);assert.ok(result.ok,mode+': '+result.message);const f=result.fixtures;
  const axis=['left','right','centerX','spaceX'].includes(mode)?'x':'y',size=axis==='x'?'width':'height';
  if(mode.startsWith('space'))assert.ok(Math.abs(f[1][axis]-f[0][axis]-f[0][size]-(f[2][axis]-f[1][axis]-f[1][size]))<1e-6);
  else {const value=i=>i[axis]+(['right','bottom'].includes(mode)?i[size]:mode.startsWith('center')?i[size]/2:0);assert.ok(f.every(i=>Math.abs(value(i)-value(f[0]))<1e-6));}
  assert.equal(result.items[0].x-items[0].x,f[1].x-fixtures[1].x);assert.equal(result.items[0].catalogProductId,'sku');
}
assert.equal(JSON.stringify({fixtures,items}),original);assert.equal(composition.arrange(fixtures,items,['a'],'left',layout).ok,false);assert.equal(composition.arrange(fixtures,items,['a','b'],'spaceX',layout).ok,false);
for(const key of ['locked','hidden'])assert.equal(composition.arrange(fixtures.map((f,i)=>i===1?{...f,[key]:true}:f),items,ids,'left',layout).ok,false);
assert.equal(composition.arrange(fixtures,[{...items[0],locked:true}],ids,'left',layout).ok,false);
assert.equal(composition.arrange(fixtures,items,ids,'unknown',layout).ok,false);
const crowded=fixtures.map((i,n)=>({...i,x:20+n*5,width:25}));assert.equal(composition.arrange(crowded,[],ids,'spaceX',layout).ok,false);
const boundary=[{...fixtures[0],x:0},{...fixtures[1],x:60}];const outside=[layout.bounded({...items[0],x:10})];assert.equal(composition.arrange(boundary,outside,['a','b'],'left',layout).ok,false);assert.equal(outside[0].x,10);
console.log('PASS eight atomic furniture alignments, equal gaps, linked rotated photos, bounds, locks, hidden fixtures, invalid modes and immutable inputs');
