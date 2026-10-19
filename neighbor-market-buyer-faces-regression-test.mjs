import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),M=require('./neighbor-market/model.js'),js=fs.readFileSync('neighbor-market/market.js','utf8'),html=fs.readFileSync('neighbor-market/index.html','utf8'),css=fs.readFileSync('neighbor-market/market.css','utf8');
let scene=M.example(),other={...M.blank(),name:'옷과 취미',items:[{...scene.items[5],id:'other'}]};scene=M.addFace(scene,'clothes',other);scene=M.replaceFace(scene,'clothes',other);
const context=vm.createContext({M,current:()=>scene});
for(const name of ['faceLabel','itemFace']){const source=js.match(new RegExp('  function '+name+'\\([^\\n]+'));assert.ok(source,name+' must have a single owner');vm.runInContext(source[0],context);}
assert.equal(vm.runInContext("faceLabel('main')",context),'1/2 · 첫 진열면');assert.equal(vm.runInContext("faceLabel('clothes')",context),'2/2 · 옷과 취미');assert.equal(vm.runInContext("itemFace('other').id",context),'clothes');assert.equal(vm.runInContext("itemFace('missing')",context),undefined);
for(const id of ['catalogFilter','catalogFaceSelect','catalogEmpty','detailFace'])assert.equal((html.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id);
assert.match(js,/catalogScope!=='all'&&source.id!==catalogScope/);assert.match(js,/if\(catalogScope!=='all'\)catalogScope=id/,'Scene navigation must keep a face-filtered catalog in sync');
assert.match(js,/!opener\?\.closest\('#basketItems'\)/,'Cart reinspection must not replace the remembered browsing origin');assert.match(js,/browseReturn=\{id,face:activeFace,scope:catalogScope,kind:/);
assert.match(js,/basketTouched=false;browseReturn=null;catalogScope='all'/,'Changing between own/sample views must reset old cart return targets');
assert.match(js,/className='basket-product'/);assert.match(js,/className='basket-remove'/);assert.match(js,/장바구니에서만 뺐습니다/);assert.match(js,/label.onclick=\(\)=>showProduct\(item.id,label\)/);
assert.match(js,/\$\('continueShopping'\).onclick=returnToBrowsing/);assert.match(js,/back\?\.kind==='scene'\?\$\('objects'\).children/,'Continue must return to the original scene or catalog, not always the catalog');
assert.match(css,/\.basket-row>\.basket-remove\{min-width:64px/);assert.match(css,/\.basket-product>img\{width:46px;height:58px;object-fit:contain/);
assert.doesNotMatch(js,/fetch\(|XMLHttpRequest|sendBeacon|localStorage|innerHTML|eval\(/);assert.match(html,/실제 거래는 아직 준비 중/);
assert.match(fs.readFileSync('scripts/browser-neighbor-market.mjs','utf8'),/import\('\.\/browser-neighbor-market-buyer-faces.mjs'\)/,'The new browser checks must run in existing CI');
console.log('PASS buyer face origins/filter sync, cart detail/removal/return ownership and no server writes');
