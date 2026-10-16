import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {cleanScene} from './server/store-studio.mjs';
const require=createRequire(import.meta.url),design=require('./store-studio/design.js');
assert.equal(Object.keys(design.types).length,48);assert.equal(design.findDecor().length,48);assert.equal(design.findDecor('','beauty').length,6);assert.equal(design.findDecor('피팅')[0].type,'fittingroom');assert.equal(design.findDecor('없는검색어').length,0);
assert.equal(design.createDecor('__proto__','safe').type,'rack');assert.equal(design.createDecor('constructor','safe').type,'rack');
const decor=Object.keys(design.types).map((type,n)=>design.createDecor(type,'fixture-'+n));
for(const item of decor){assert.equal(item.type,design.catalog[item.type].type);assert.ok(item.width+item.x<=100);assert.ok(item.height+item.y<=98);}
const scene={shopTitle:'도구 확인',items:[],decor:decor.map(item=>({...item,finish:'fabric',accent:'#123456',showLabel:false})),appearance:{},business:{}};
const restored=cleanScene(scene);assert.deepEqual(restored.decor.map(i=>i.type),decor.map(i=>i.type));assert.ok(restored.decor.every(i=>i.finish==='fabric'&&i.accent==='#123456'&&!i.showLabel));
assert.equal(cleanScene({...scene,decor:Array.from({length:60},(_,i)=>({...decor[0],id:'fixture-'+i}))}).decor.length,60);
assert.throws(()=>cleanScene({...scene,decor:Array.from({length:61},(_,i)=>({...decor[0],id:'fixture-'+i}))}));
assert.equal(design.decor({type:'vanity',finish:'url(evil)',accent:'javascript:evil'}).finish,'plain');
assert.equal(design.decor({type:'vanity',text:''}).text,'','An intentionally blank label must survive restoration');
console.log('PASS 48 furniture tools, six industry groups, searchable metadata, appearance sanitization and 60-object client/server roundtrip');
