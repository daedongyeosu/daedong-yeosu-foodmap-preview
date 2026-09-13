import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {reviewedMenuPhotoEvidence} from './scripts/reviewed-menu-photo-evidence.mjs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const source = read('data-api.js');
function functionSource(name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0, name);
  let depth = 0;
  for (let i = source.indexOf('{', source.indexOf(')', start)); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw new Error(name);
}
const context = vm.createContext({});
for (const name of ['menuPhotoNameHash', 'applyReviewedMenuPhotos', 'restoreReviewedMenuSearchPhotos']) {
  vm.runInContext(functionSource(name), context);
}
const storeId = '0123456789abcdef';
const dish = {id:'verified-menu',name:'순살치킨 2인분',description:'순살치킨 + 콜라 500ml',image:'',price:18000,category:'메인'};
const photo = {nameHash:context.menuPhotoNameHash(dish.name),descriptionHash:context.menuPhotoNameHash(dish.description),image:'assets/reviewed-menu-photos/'+storeId+'/verified.jpg'};
const registry = {version:1,stores:{[storeId]:{items:{[dish.id]:photo},mainImage:photo.image}}};
const menu = {storeId,name:'가게',mainImage:'',items:[dish],routes:[{key:'mukkebi',url:'https://example.com/order'}]};
assert.equal(reviewedMenuPhotoEvidence(storeId,dish,registry,()=>true),photo.image);
assert.equal(reviewedMenuPhotoEvidence(storeId,dish,registry,()=>false),'','missing published file is not evidence');
for(const changed of [{...dish,name:'뼈치킨 2인분'},{...dish,description:'다른 구성'},{...dish,id:'different'},{...dish,image:'new.jpg'}]) {
  assert.equal(reviewedMenuPhotoEvidence(storeId,changed,registry,()=>true),'','browser evidence independently rejects stale mappings');
}
assert.equal(reviewedMenuPhotoEvidence('1111111111111111',dish,registry,()=>true),'');
for(const invalid of ['assets/reviewed-menu-photos/1111111111111111/a.jpg','assets/reviewed-menu-photos/'+storeId+'/../wrong.jpg','https://example.com/photo.jpg']){
  const wrong={stores:{[storeId]:{items:{[dish.id]:{...photo,image:invalid}}}}};
  assert.equal(reviewedMenuPhotoEvidence(storeId,dish,wrong,()=>true),'','other-store/remote/traversal image is not evidence');
}
const serialize = value => JSON.parse(JSON.stringify(value));
const original = serialize(menu);
const filled = context.applyReviewedMenuPhotos(storeId,menu,registry);
assert.equal(filled.items[0].image,photo.image);
assert.equal(filled.mainImage,photo.image);
assert.deepEqual(serialize(menu),original,'input stays immutable');
assert.deepEqual(serialize(filled.routes),original.routes,'routes stay intact');
assert.deepEqual(serialize({...filled.items[0],image:''}),original.items[0],'only missing image changes');
for (const item of [
  {...dish,description:'뼈치킨 + 콜라 1.25L'},
  {...dish,description:''},
  {...dish,name:'뼈치킨 2인분'},
  {...dish,name:'순살치킨 1인분'},
  {...dish,id:'another-menu'},
  {...dish,image:'newer-correct.jpg'}
]) {
  const result=context.applyReviewedMenuPhotos(storeId,{...menu,items:[item]},registry);
  assert.equal(result.items[0].image,item.image,'changed identity, composition or newer photo must not be overwritten');
  assert.equal(result.mainImage,'','stale photo cannot become hero');
}
assert.equal(context.applyReviewedMenuPhotos('1111111111111111',menu,registry),menu);
assert.equal(context.applyReviewedMenuPhotos(storeId,{...menu,storeId:'1111111111111111'},registry).items[0].image,'');
const search={stores:{[storeId]:{i:[
  [dish.id,dish.name,dish.description,'',18000],
  [dish.id,dish.name,'뼈치킨 + 콜라 1.25L','',18000],
  [dish.id,dish.name,dish.description,'newer-correct.jpg',18000]
]}}};
const result=context.restoreReviewedMenuSearchPhotos(search,registry);
assert.equal(result.stores[storeId].i[0][3],photo.image);
assert.equal(result.stores[storeId].i[1][3],'');
assert.equal(result.stores[storeId].i[2][3],'newer-correct.jpg');
assert.equal(result.stores[storeId].i[0][4],18000);
assert.equal(search.stores[storeId].i[0][3],'','search stays immutable');
const legacy={version:1,stores:{[storeId]:{items:{[dish.id]:{nameHash:photo.nameHash,image:photo.image}}}}};
assert.equal(context.applyReviewedMenuPhotos(storeId,menu,legacy).items[0].image,photo.image,'previous reviewed photos remain compatible');
assert.equal(context.menuPhotoNameHash(''),context.menuPhotoNameHash(undefined),'empty descriptions remain stable');

const published=JSON.parse(read('data/reviewed-menu-photo-links.json'));
let guarded=0;
for(const [id,store] of Object.entries(published.stores))for(const [itemId,p] of Object.entries(store.items)) {
  assert.ok(itemId);
  assert.doesNotMatch(p.image,/coupang-menu\/v1|raw-archive:|screens\/|file:/);
  assert.ok(!('businessNumber' in p)&&!('address' in p)&&!('phone' in p),'no identity proofs in public index');
  if(p.descriptionHash){
    guarded++;
    assert.match(p.descriptionHash,/^[0-9a-f]{1,8}$/);
    assert.ok(p.image.startsWith('assets/reviewed-menu-photos/'+id+'/'),'photo path owned by exact store');
    const bytes=fs.readFileSync(new URL(p.image,import.meta.url));
    if(p.image.endsWith('.webp')){
      assert.equal(bytes.toString('ascii',0,4),'RIFF');assert.equal(bytes.toString('ascii',8,12),'WEBP');
    }else{
      assert.ok(p.image.endsWith('.jpg'));assert.equal(bytes[0],0xff);assert.equal(bytes[1],0xd8);
    }
  }
}
assert.equal(guarded,1743,'all newly reviewed mappings keep composition guards');
assert.match(source,/reviewed-menu-photo-links\/\$\{bucket\}\.json\?v=all-menu-photos-20260913/);
assert.doesNotMatch(source,/fetch\('data\/reviewed-menu-photo-links\.json/,'detail/search must never download the whole inventory');
const combined={version:1,stores:{}};
for(const bucket of '0123456789abcdef'){
  const text=read('data/reviewed-menu-photo-links/'+bucket+'.json');
  assert.ok(Buffer.byteLength(text)<64*1024,'one store loads a small bounded photo shard');
  const shard=JSON.parse(text);
  assert.ok(Object.keys(shard.stores).every(id=>id[0]===bucket));
  Object.assign(combined.stores,shard.stores);
}
assert.deepEqual(combined,published,'sharding loses no reviewed photo or existing hero');
const fetched=[],loader=vm.createContext({Map,Promise,reviewedPhotoLinkRequests:new Map(),
  createRequestAbort:()=>({signal:undefined,cleanup:()=>{}}),
  fetch:async url=>{fetched.push(url);const bucket=url.match(/\/([a-f0-9])\.json/)[1];return{ok:true,json:async()=>JSON.parse(read('data/reviewed-menu-photo-links/'+bucket+'.json'))};}});
vm.runInContext(functionSource('reviewedMenuPhotoLinks'),loader);
vm.runInContext('async '+functionSource('reviewedMenuSearchPhotoLinks'),loader);
await Promise.all([loader.reviewedMenuPhotoLinks(storeId),loader.reviewedMenuPhotoLinks('0222222222222222')]);
assert.equal(fetched.length,1,'same bucket shares one request');
await loader.reviewedMenuPhotoLinks('../invalid');assert.equal(fetched.length,1,'invalid store cannot build a path');
await loader.reviewedMenuSearchPhotoLinks({stores:{[storeId]:{},'1111111111111111':{}}});
assert.equal(fetched.length,2,'search fetches only missing result buckets');
await loader.reviewedMenuSearchPhotoLinks({stores:{}});assert.equal(fetched.length,2,'empty search needs no photos');
let attempts=0;loader.reviewedPhotoLinkRequests.clear();loader.fetch=async()=>{attempts++;if(attempts===1)throw Error('transient');return{ok:true,json:async()=>({stores:{}})};};
assert.equal(await loader.reviewedMenuPhotoLinks(storeId),null);
await loader.reviewedMenuPhotoLinks(storeId);assert.equal(attempts,2,'transient failure never poisons photo cache');
assert.match(read('index.html'),/data-api\.js\?[^"\n]*all-menu-photos-20260913/);
assert.match(read('scripts/browser-alien-pizza-menu-search.mjs'),/sources\.flatMap\(item => \[item\.image, reviewedPhotoFor\(item\)\]\)/,'browser coverage uses verified additional evidence, not a broad photo exemption');
console.log('PASS verified photo reconciliation: identity/composition guards, stale source rejection, search parity, immutable fields and owned assets');
