import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url),design=require('./store-studio/design.js'),bakery=require('./store-studio/bakery.js');
const geometry=require('./store-studio/layout.js');
const fixture=design.decor({id:'fixture',type:'rack',width:30,height:40,x:10,y:30}),attached=[geometry.bounded({id:'photo',decorId:'fixture',x:20,y:50,size:15,rotation:25})];
const before=JSON.stringify(attached);const moved=design.translate(fixture,attached,999,999,geometry);assert.equal(JSON.stringify(attached),before);assert.equal(moved.items[0].x-attached[0].x,moved.fixture.x-fixture.x);assert.equal(moved.items[0].y-attached[0].y,moved.fixture.y-fixture.y);assert.ok(moved.fixture.x+moved.fixture.width<=100);assert.deepEqual(design.translate(fixture,attached,0,0,geometry).items,attached);assert.equal(design.translate(fixture,[{...attached[0],locked:true}],3,3,geometry).blocked,true);
for(const type of Object.keys(design.types))for(const width of [-100,10,90,1000])for(const height of [-1,5,65,999]){const item=design.decor({type,width,height,x:999,y:999,color:'bad'});assert.ok(item.x>=0&&item.x+item.width<=100);assert.ok(item.y>=18&&item.y+item.height<=98);assert.equal(item.color,'#87613e');}
assert.equal(design.image('https://untrusted.test/pixel.png'),false);assert.equal(design.image('data:image/svg+xml;base64,AAAA'),false);
assert.equal(design.image('../assets/studio-bakery/cake.webp'),true);
assert.throws(()=>design.validateImport({version:1,scene:{items:[]}}));
assert.throws(()=>design.validateImport({format:'matjido-studio',version:1,scene:{items:[{src:'javascript:alert(1)'}]}}));
assert.throws(()=>design.validateImport({format:'matjido-studio',version:1,scene:{items:[],decor:Array(31).fill({})}}));
const sample=bakery.create();assert.equal(sample.sampleOnly,true);assert.equal(sample.catalogStoreId,'');assert.equal(sample.items.length,8);assert.equal(sample.decor.length,7);
assert.ok(sample.items.every(item=>design.image(item.src)&&!item.productUrl&&!item.catalogProductId));
assert.equal(new Set(sample.items.map(item=>item.demoSku)).size,5,'Duplicate displays share a sample SKU');
for(const asset of design.assets)assert.ok(fs.existsSync('store-studio/'+asset));
const app=fs.readFileSync('store-studio/studio.js','utf8');assert.ok(app.includes("exampleMode?'scene-bakery-example-v1':'scene'"));assert.ok(app.includes('if(exampleMode)return;'));assert.ok(app.includes('Boolean(value.example)!==exampleMode'));
console.log('PASS shop design: bounded furniture, safe image/backup formats, sample SKU and independent sample storage');
