import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('info/order-preparing/index.html','utf8');
const script=fs.readFileSync('info/order-preparing/page.js','utf8');
assert.match(html,/가게바로주문 준비중/);
assert.match(html,/다른 주문 방법 보기/);
assert.doesNotMatch(html,/bit\.ly|notion\.(so|site|com)/);
for(const [search,expected] of [['?store=aa0a00258c22f377','/?store=aa0a00258c22f377'],['?store=https://invalid.example/','/'],['?store=../../other','/'],['','/']]){
 const link={href:'/'};
 vm.runInNewContext(script,{location:{search},URLSearchParams,document:{getElementById:id=>{assert.equal(id,'store-order-methods');return link;}}});
 assert.equal(link.href,expected);
}
const store=JSON.parse(fs.readFileSync('data/hero-campaigns.json','utf8')).virtualStores.aa0a00258c22f377;
const production=fs.readFileSync('data-api.js','utf8').includes("const BASE_URL = IS_GOHEUNG ? '' : 'https://daedong-yeosu-data-api.sisakim.workers.dev'");
if (production) {
assert.equal(store.name,'뽕뜨락피자 여수여서점');
assert.equal(store.routes.find(r=>r.key==='mukkebi').url,'http://mukkebi.com/shop.php?data=68966');
assert.equal(new URL(store.routes.find(r=>r.key==='coupang').url).searchParams.get('storeId'),'654172');
assert.equal(store.routes.find(r=>r.key==='direct').url,'https://daedongmap.com/info/order-preparing/?store=aa0a00258c22f377');
assert.ok(store.routes.every(r=>!/^https?:\/\/bit\.ly\//.test(r.url)));
} else assert.equal(store,undefined,'Preview keeps the canonical API store instead of adding a duplicate virtual store');
console.log('PASS native order guide: preparing preserved, same-store return, invalid IDs rejected; original app store identities preserved');
