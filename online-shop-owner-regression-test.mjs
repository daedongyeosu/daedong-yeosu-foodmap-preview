import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import fs from 'node:fs';
const require=createRequire(import.meta.url),sharing=require('./delivery-cost-sharing.js'),shop=require('./online-shop.js');
for(const total of [0,1,99,100,101,4000,5500,5501,100000]){
  const choices=sharing.choices(total);assert.equal(choices[0],0);assert.equal(choices.at(-1),total);
  for(let i=1;i<choices.length-1;i++)assert.equal(choices[i]-choices[i-1],100);
  for(let percent=0;percent<=100;percent++){
    const p={mode:'ratio',customerPercent:percent},s=sharing.split(total,p);assert.equal(s.customerWon+s.merchantWon,total);assert.ok(s.customerWon>=0&&s.merchantWon>=0);
    if(percent===50)assert.equal(s.customerWon,Math.round(total/2));
    if(percent===100)assert.equal(s.customerWon,total);
    if(percent===0)assert.equal(s.customerWon,0);
  }
  for(const won of choices){const roundtrip=sharing.split(total,sharing.policy(total,won));assert.equal(roundtrip.customerWon,won);}
}
const detail={id:'qa-store',name:'시험 가게',category:'반찬·먹거리',address:'전남 여수시 테스트로 10',phone:'01012345678'},menu={storeId:'qa-store',items:[{id:'m1',name:'메뉴1',price:9999,image:'assets/one.webp',description:'설명'},{id:'m2',name:'메뉴2',image:''},{id:'m3',name:'메뉴3',image:'javascript:alert(1)'}]};
const draft=shop.importStore('qa-store',detail,menu,'https://preview.daedongmap.com/');assert.ok(draft.products.every(p=>p.price===null));assert.equal(draft.products[0].description,'설명');assert.equal(draft.products[0].image,'https://preview.daedongmap.com/assets/one.webp');assert.equal(draft.products[1].image,'');assert.equal(draft.products[2].image,'');assert.equal(shop.importStore('qa-store',detail,{...menu,items:[...menu.items].reverse()},'https://preview.daedongmap.com/').products[2].id,draft.products[0].id);
assert.throws(()=>shop.importStore('other-store',detail,menu,'https://preview.daedongmap.com/'));
assert.throws(()=>shop.importStore('qa-store',detail,{...menu,storeId:'other'},'https://preview.daedongmap.com/'));
assert.throws(()=>shop.importStore('qa-store',detail,{...menu,items:[menu.items[0],menu.items[0]]},'https://preview.daedongmap.com/'));
const app=fs.readFileSync('app.js','utf8');assert.ok(app.includes('loadOnlineShopEntry(store)'));assert.ok(app.includes('onlineShopEntryMarkup(store)'));assert.ok(!app.includes('localStorage.getItem(\'publishedShop'));
console.log('PASS existing-store import identity/prices/photos/stable IDs and 100-won allocation/endpoints/exact half/conservation');
