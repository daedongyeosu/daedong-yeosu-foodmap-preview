import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {cleanScene} from './server/store-studio.mjs';
const require=createRequire(import.meta.url),design=require('./store-studio/design.js'),composition=require('./store-studio/composition.js');
const fixtures=['rack','vanity','toolbox'].map((type,i)=>({...design.createDecor(type,'item-'+i),locked:i===1,hidden:i===0})),original=JSON.stringify(fixtures);
assert.equal(composition.palettes.length,8);assert.equal(new Set(composition.palettes.map(p=>p.name)).size,8);
for(const palette of composition.palettes){const result=composition.styleSelection(fixtures,['item-0','item-1'],palette,['color','accent','finish']);assert.ok(result.ok);assert.ok(result.changed>0);assert.equal(result.limited,2);assert.equal(result.fixtures[0].color,palette.color);assert.equal(result.fixtures[0].finish,fixtures[0].finish);assert.equal(result.fixtures[1].accent,palette.accent);assert.deepEqual(result.fixtures[2],fixtures[2]);
  for(let i=0;i<2;i++)for(const key of ['id','x','y','width','height','text','locked','hidden','cabinet'])assert.deepEqual(result.fixtures[i][key],fixtures[i][key]);
  const stored=cleanScene({shopTitle:'내 배색',items:[],decor:result.fixtures});assert.equal(stored.decor[1].accent,palette.accent);assert.equal(stored.decor[1].finish,palette.finish);
}
const partial=composition.styleSelection(fixtures,['item-1'],{color:'#123456'},['color']);assert.equal(partial.fixtures[1].color,'#123456');assert.equal(partial.fixtures[1].accent,fixtures[1].accent);assert.equal(partial.fixtures[1].finish,fixtures[1].finish);
assert.equal(JSON.stringify(fixtures),original);assert.equal(composition.styleSelection(fixtures,[],{},['color']).ok,false);assert.equal(composition.styleSelection(fixtures,['item-1'],{},[]).ok,false);assert.equal(composition.styleSelection(fixtures,['item-1'],{color:'url(evil)'},['color']).ok,false);assert.equal(composition.styleSelection(fixtures,['item-1'],{finish:'url(evil)'},['finish']).ok,false);
assert.equal(composition.styleSelection(fixtures,['item-1'],fixtures[1],['color','accent','finish']).changed,0);
console.log('PASS eight palettes, selective batch styling, supported materials, legacy appearance protection, position/lock/hide preservation and server roundtrip');
