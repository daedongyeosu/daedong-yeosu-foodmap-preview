import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {cleanScene} from './server/store-studio.mjs';
const design=createRequire(import.meta.url)('./store-studio/design.js');
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=';
const appearance=design.appearance({logoImage:png,logoSize:99,logoSide:'right',surfaces:{wall:{image:png,mode:'repeat',opacity:0,scale:270},floor:{image:png,x:17,y:83}}});
assert.equal(appearance.logoSize,22);assert.equal(appearance.surfaces.wall.opacity,0);assert.equal(appearance.surfaces.floor.mode,'cover');
assert.equal(design.appearance({logoImage:'https://example.com/a.png'}).logoImage,'');assert.equal(design.surface({image:'data:image/svg+xml;base64,PHN2Zz4='}).image,'');
const scene={shopTitle:'내 개성 상점',items:[{id:'art',src:png,purpose:'decoration',photoFrame:'wood',catalogProductId:'sku',productUrl:'javascript:bad'},{id:'goods',src:png,catalogProductId:'sku',productUrl:'https://example.com/order'}],decor:[],appearance,business:{}};
const clean=cleanScene(scene);assert.deepEqual(clean.appearance.surfaces,appearance.surfaces);assert.equal(clean.appearance.logoImage,png);assert.equal(clean.items[0].purpose,'decoration');assert.equal(clean.items[0].photoFrame,'wood');assert.equal(clean.items[0].catalogProductId,'');assert.equal(clean.items[0].productUrl,'');assert.equal(clean.items[1].catalogProductId,'sku');assert.equal(clean.items[1].purpose,'product');
for(const value of ['https://example.com/x.png','data:image/svg+xml;base64,PHN2Zz4=','data:image/png;base64,PHN2Zz4=']){
  assert.throws(()=>cleanScene({...scene,appearance:{logoImage:value}}));
  assert.throws(()=>cleanScene({...scene,appearance:{surfaces:{floor:{image:value}}}}));
}
assert.equal(cleanScene({...scene,appearance:{}}).appearance.logoImage,'');
console.log('PASS shop branding: independent surfaces, transparent opacity, logo limits, raster-only server validation, decoration/product separation and legacy defaults');
