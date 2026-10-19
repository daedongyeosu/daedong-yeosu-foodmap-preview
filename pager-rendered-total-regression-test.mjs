import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app=fs.readFileSync('app.js','utf8'),pager=fs.readFileSync('store-list-horizontal-pager.js','utf8');
function fn(source,name){const start=source.indexOf(`function ${name}(`);assert.ok(start>=0,name);return source.slice(start,source.indexOf('\n}',start)+2);}
const cards=Array.from({length:16},(_,i)=>({classList:{contains:name=>name==='store-card'},offsetLeft:i*100}));
const grid={dataset:{},children:cards,clientWidth:200,classList:{contains:name=>name==='store-grid'}};
let sorts=0,list=Array.from({length:2000},(_,i)=>({id:String(i)}));
const state={category:'전체',query:'',brandId:'',location:'전체',sortByDistance:false,visibleCount:16,coords:null,addressLabel:''};
const elements=new Map();
for(const key of ['#recommendSection h2','#resetCategoryBtn','#storeGrid','#loadMoreBtn','#searchSummary'])elements.set(key,key==='#storeGrid'?grid:{});
const sandbox=vm.createContext({state,stores:list,INITIAL_STORE_BATCH_SIZE:16,REGION_DEFAULT_AREA:'전체',BRAND_BY_ID:{},
  $:key=>elements.get(key),window:{},filteredStores:()=>{sorts++;return list;},storeCard:store=>`<i>${store.id}</i>`,
  observeDeferredPhotos(){},renderCategories(){},escapeHtml:String});
vm.runInContext('const storeListRenderTotals=new WeakMap();\n'+['storeListTotalContext','rememberStoreListRenderTotal','storeListRenderTotal','renderStores'].map(name=>fn(app,name)).join('\n')+'\n'+fn(pager,'storeListPagerEligible')+'\n'+fn(pager,'storeListPagerMetrics'),sandbox);
sandbox.renderStores();assert.equal(sorts,1);
for(let i=0;i<10;i++){
  const metric=sandbox.storeListPagerMetrics(grid);
  assert.equal(metric.total,2000);assert.equal(metric.pageSize,2);assert.equal(metric.maxPage,999);
}
assert.equal(sorts,1,'ten pager reads must not rerank the catalog after its render');
// Background catalog completion must not require repainting the active DOM.
list=Array(32).fill({id:'bootstrap'});sandbox.stores=list;sandbox.renderStores();const afterBootstrap=sorts;
list=Array(36).fill({id:'complete'});sandbox.stores=list;
assert.equal(sandbox.storeListPagerMetrics(grid).total,36,'32->36 invalidates without a DOM repaint');
assert.equal(sorts,afterBootstrap+1);sandbox.storeListPagerMetrics(grid);assert.equal(sorts,afterBootstrap+1);
// Equal-size replacement, append, filter replacement and scalar conditions.
list=Array(36).fill({id:'replaced'});sandbox.stores=list;let previous=sorts;
sandbox.storeListPagerMetrics(grid);assert.equal(sorts,previous+1);
list.push({id:'appended'});previous=sorts;assert.equal(sandbox.storeListPagerMetrics(grid).total,37);assert.equal(sorts,previous+1);
sandbox.filteredStores=()=>{sorts++;return list.slice(0,20);};previous=sorts;
assert.equal(sandbox.storeListPagerMetrics(grid).total,20);assert.equal(sorts,previous+1);
for(const change of [()=>state.location='여서동',()=>state.addressLabel='새 주소',()=>state.coords={lat:34.7,lng:127.7},()=>state.coords.lat=34.8,()=>state.sortByDistance=true]){
  change();previous=sorts;sandbox.storeListPagerMetrics(grid);assert.equal(sorts,previous+1);sandbox.storeListPagerMetrics(grid);assert.equal(sorts,previous+1);
}
state.category='치킨';previous=sorts;
assert.equal(sandbox.storeListPagerMetrics(grid).total,16);assert.equal(sorts,previous,'category lists retain their rendered-card count');
state.category='전체';list=[];sandbox.stores=list;grid.children=[];sandbox.renderStores();previous=sorts;
assert.equal(sandbox.storeListPagerMetrics(grid).total,0);assert.equal(sorts,previous,'empty render retains an exact zero');
const legacy=vm.createContext({state,filteredStores:()=>Array(42).fill({})});
vm.runInContext(fn(pager,'storeListPagerEligible')+'\n'+fn(pager,'storeListPagerMetrics'),legacy);
assert.equal(legacy.storeListPagerMetrics(grid).total,42,'legacy mixed loading retains its fallback');
assert.ok(fs.readFileSync('index.html','utf8').split('\n').filter(l=>l.includes('pager-rendered-total-1')).length===2);
console.log('PASS pager avoids repeat ranking; bootstrap/full catalog, same-size replacement, append, filter, location, coordinates, categories and legacy invalidation preserved');
