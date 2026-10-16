import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url),examples=require('./store-studio/examples.js'),design=require('./store-studio/design.js');
assert.equal(examples.all.length,4);assert.equal(examples.get('__proto__'),null);assert.equal(examples.template('constructor'),null);
const keys=new Set();for(const info of examples.all){
  const store=examples.get(info.id),scene=store.create(),template=examples.template(info.id);keys.add(examples.draftKey(info.id));
  assert.equal(scene.sampleOnly,true);assert.equal(scene.catalogStoreId,'');assert.equal(template.items.length,0);assert.equal(template.sampleOnly,false);assert.equal(template.business.phone,'');assert.equal(template.business.orderUrl,'');
  assert.ok(scene.items.every(item=>design.image(item.src)&&scene.decor.some(value=>value.id===item.decorId)));
  scene.shopTitle='changed';assert.notEqual(store.create().shopTitle,'changed');
}
assert.equal(keys.size,4);assert.ok(!keys.has('scene'));assert.equal(examples.draftKey('bakery'),'scene-bakery-example-v1');
assert.ok(fs.readFileSync('index.html','utf8').includes('href="store-alley/index.html"'));
for(const type of ['mannequin','mirror','clothesrack','pegboard','bin'])assert.ok(Object.hasOwn(design.types,type));
console.log('PASS shop alley: four independent examples, safe template without products/contact, distinct draft keys, expanded fixtures and home entry');
