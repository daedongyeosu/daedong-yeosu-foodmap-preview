import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const api = read('data-api.js'), ranking = read('rc6-fixes.js'), rails = read('rc2-fixes.js');
const app = read('app.js');
const address = read('rc7-address-map.js'), menuUi = read('store-menu-preview.js');
function fn(source, name) {
  const start = source.indexOf('function ' + name + '(');
  assert.ok(start >= 0, name);
  const argsEnd = source.indexOf(')', start);
  let depth = 0;
  for (let i = source.indexOf('{', argsEnd); i < source.length; i++) {
    if (source[i] === '{') depth++;
    if (source[i] === '}' && --depth === 0) return source.slice(start, i + 1);
  }
  throw Error(name);
}
const inventory = JSON.parse(read('data/reviewed-menu-photo-links.json'));
const photos = vm.createContext({});
vm.runInContext(fn(api, 'menuPhotoNameHash') + '\n' + fn(api, 'applyReviewedMenuPhotos'), photos);
vm.runInContext(fn(api, 'restoreReviewedMenuSearchPhotos'), photos);
let assets = 0;
for (const [storeId, store] of Object.entries(inventory.stores)) {
  assert.match(storeId, /^[a-f0-9]{16}$/);
  for (const photo of Object.values(store.items)) {
    assert.match(photo.image, /^assets\/(campaigns\/shared-store-menus|reviewed-menu-photos)\//);
    assert.ok(photo.image.includes('/' + storeId + '/'), 'asset belongs to exact store');
    assert.ok(fs.statSync(new URL(photo.image, import.meta.url)).size > 0);
    assert.match(photo.nameHash, /^[a-f0-9]{1,8}$/);
    assets++;
  }
}
assert.equal(Object.keys(inventory.stores).length, 285);
assert.equal(assets, 2714); // Norang Yeoseo: nine recovered, reviewed source crops.
const achasan = 'c7a234ae0185bdee';
const dish = {id: 'coupang-920304-1', name: '[걸쭉꾸덕] 아차산매운떡볶이', image: ''};
const source = {storeId: achasan, mainImage: '', items: [dish]};
const fixed = photos.applyReviewedMenuPhotos(achasan, source, inventory);
assert.equal(fixed.items[0].image, 'assets/reviewed-menu-photos/' + achasan + '/14.jpg');
assert.equal(fixed.mainImage, fixed.items[0].image);
assert.equal(source.items[0].image, '', 'source data remains immutable');
const search = {stores:{[achasan]:{i:[[dish.id,dish.name,'description',''],[dish.id,'다른 떡볶이','description','']]}}};
const searchFixed = photos.restoreReviewedMenuSearchPhotos(search,inventory);
assert.equal(searchFixed.stores[achasan].i[0][3],fixed.items[0].image);
assert.equal(searchFixed.stores[achasan].i[1][3],'');
assert.equal(search.stores[achasan].i[0][3],'','search source is not mutated');
assert.equal(photos.applyReviewedMenuPhotos('0000000000000000', source, inventory), source);
assert.equal(photos.applyReviewedMenuPhotos(achasan, {...source, storeId: '0000000000000000'}, inventory).items[0].image, '');
for (const changed of [{...dish, name: '다른 떡볶이'}, {...dish, id: 'other'}, {...dish, image: 'new-correct-photo.jpg'}]) {
  const result = photos.applyReviewedMenuPhotos(achasan, {...source, items: [changed]}, inventory);
  assert.equal(result.items[0].image, changed.image, 'changed name, ID or corrected photo is never overwritten');
}
const zero = photos.applyReviewedMenuPhotos(achasan, {...source, items: [{...dish, name: '떡볶이 2인분'}]}, inventory);
assert.equal(zero.mainImage, '', 'a stale match cannot invent a hero');
const hero = vm.createContext({storeById: id => id === achasan ? {id} : null,
  photoResolver: {resolve: () => ({src: 'real-food.jpg', classification: 'food'})},
  isQuarantinedMenuImage: src => String(src).includes('/coupang-menu/v1/'), OFFICIAL_MENU_PLACEHOLDER_IMAGE: 'official-logo.png'});
vm.runInContext(fn(menuUi, 'menuHeroImage'), hero);
assert.equal(hero.menuHeroImage({storeId: achasan, items: []}), 'real-food.jpg');
assert.equal(hero.menuHeroImage({storeId: 'other', items: []}), 'official-logo.png');
hero.photoResolver.resolve = () => ({src: 'store-logo.jpg', classification: 'store_logo'});
assert.equal(hero.menuHeroImage({storeId: achasan, items: []}), 'official-logo.png');
hero.photoResolver.resolveGallery = () => [{src:'store-logo.jpg',classification:'store_logo'}, {src:'second-food.jpg',classification:'food'}];
assert.equal(hero.menuHeroImage({storeId: achasan, items: []}), 'second-food.jpg', 'food in a later gallery slot is not lost behind the first logo');
assert.equal(hero.menuHeroImage({storeId:'other',items:[]}), 'official-logo.png');
const legacyContext = vm.createContext({normalize:s=>String(s||'').toLowerCase(),uniquePaths:p=>[...new Set(p)].filter(Boolean),
  photoUrlKey:s=>s,mobilePhotoPath:s=>s,isKnownBlankDetailPhotoPath:()=>false,isOfficialStorePlaceholderImage:()=>false,isQuarantinedCollectedPhoto:()=>false});
vm.runInContext(app.slice(app.indexOf('const REVIEWED_LEGACY_FOOD_PHOTOS ='), app.indexOf('  markup(store,',app.indexOf('class PhotoResolver {'))) + '}\nthis.resolver = new PhotoResolver(); this.reviewed = REVIEWED_LEGACY_FOOD_PHOTOS;',legacyContext);
assert.equal(Object.keys(legacyContext.reviewed).length,10);
for(const [id,path] of Object.entries(legacyContext.reviewed)) {
  assert.ok(fs.existsSync(new URL(path,import.meta.url)));
  assert.equal(legacyContext.resolver.resolve({id,name:'existing',legacyImages:[path]}).classification,'food');
  assert.equal(legacyContext.resolver.resolve({id:'other',name:'other',legacyImages:[path]}).classification,'legacy_unclassified');
  assert.equal(legacyContext.resolver.resolve({id,name:'existing',legacyImages:['new-photo.jpg']}).classification,'legacy_unclassified');
}

const c = vm.createContext({
  fxPhoto: store => store.photo || '', photoResolver: {resolve: store => ({classification: store.classification || 'food'})},
  isOfficialStorePlaceholderImage: src => src === 'official-logo.png', isQuarantinedCollectedPhoto: src => src.includes('/coupang-menu/v1/'),
  storeHasChannel: (store, key) => store.channelKeys?.includes(key),
  compareStoreBusinessStatus: (a, b) => (a.store || a).status - (b.store || b).status,
  storeBusinessStatusPriority: store => store.status,
  rc6NearStores: () => [], rc6PartnerTier: store => store.partner ? 0 : 1,
  rc6PartnerActive: () => true, rc6OwnershipTier: store => store.owner ? 0 : 2,
  rc5Diversify: items => [...items].reverse(), sortStoresByBusinessStatus: items => [...items].sort((a,b)=>a.status-b.status),
  rc6RainManagedRatio: () => 0, rc6RainMode: 'rain3'
});
for (const name of ['rc6DiscoveryTier','rc6RankCandidatesByCustomerLocation','rc6ApplyPartnerPriority','rc6DiversifyStoresByTier','rc6ApplyRainExposure']) vm.runInContext(fn(ranking,name),c);
const make = (id, channelKeys, photo = 'food.jpg', extra = {}) => ({id, name:id, channelKeys, photo, status:0, rc6LocationBucket:0, ...extra});
const two = make('two',['mukkebi','ddangyo']);
const one = make('one',['mukkebi']);
const foodOnly = make('food',[]);
const noPhoto = make('empty',['mukkebi','ddangyo'],'',{partner:true,owner:true});
assert.deepEqual([two,one,foodOnly,noPhoto].map(s=>c.rc6DiscoveryTier(s)), [0,1,2,3]);
assert.equal(c.rc6DiscoveryTier({...two,classification:'store_logo'}),3);
assert.equal(c.rc6DiscoveryTier({...two,photo:'official-logo.png'}),3);
assert.equal(c.rc6DiscoveryTier({...two,photo:'/coupang-menu/v1/quarantine.jpg'}),3);
assert.equal(c.rc6DiscoveryTier({...two,routes:[{key:'ddangyo',customerUsable:false}]}),1);
const input = [noPhoto,foodOnly,one,two], ids = rows => Array.from(rows,s=>s.id);
assert.deepEqual(ids(c.rc6RankCandidatesByCustomerLocation(input)), ['two','one','food','empty']);
assert.deepEqual(ids(c.rc6ApplyPartnerPriority(input)), ['two','one','food','empty']);
const outside = {...two,id:'outside',rc6LocationBucket:1};
assert.deepEqual(ids(c.rc6RankCandidatesByCustomerLocation([outside,one])), ['one','outside']);
assert.deepEqual(ids(c.rc6RankCandidatesByCustomerLocation([{...two,id:'closed',status:3},one])), ['one','closed']);
assert.deepEqual(ids(c.rc6DiversifyStoresByTier([two,one,noPhoto])), ['two','one','empty']);
c.rc6PartnerActive = () => false;
assert.deepEqual(ids(c.rc6ApplyRainExposure([two,one,noPhoto],3)), ['two','one','empty']);
assert.match(rails, /\$\{status\}:\$\{bucket\}:\$\{quality\}:\$\{tier\}/, 'randomized rail bands preserve quality');
assert.match(fn(rails,'rc2DiversifyRailLead'), /rc6DiscoveryTier/, 'lead variation preserves quality');
Object.assign(c,{rc2BrandKey:store=>store.id,rc2RandomizedRailStores:items=>items,fxRankStores:()=>[],
  rc2ApplyManagedRegionPriority:items=>items,rc2HasVerifiedRecommendationPhoto:()=>true});
vm.runInContext(fn(rails,'rc2RailCandidates'),c);
assert.deepEqual(ids(c.rc2RailCandidates({kind:'near'},new Set(['two']),1,new Map([['two',1]]),[two,one,noPhoto])),['two'],
  'a card used on another rail must not force an incomplete card into the leading slot');
Object.assign(c,{RC2_MANAGED_REGION_PRIORITY_STORE_BY_RAIL:{today:'empty'},rc2ManagedRegionPriorityNeighborhood:()=>true,
  fxStoreById:()=>noPhoto,fxVisible:()=>true,rc2ManagedRegionDailyPosition:()=>0});
vm.runInContext(fn(rails,'rc2ApplyManagedRegionPriority'),c);
assert.deepEqual(ids(c.rc2ApplyManagedRegionPriority([two,one],{id:'today'},2,[two,one,noPhoto])),['two','one'],
  'promotional injection must not evict a complete local listing');

const a = vm.createContext({currentAreaForCoords: () => '선원동', addressAreaFor: () => '화장동', addressDraft: null});
for (const name of ['validCoords','selectedAddressArea','fullAddress']) vm.runInContext(fn(address,name),a);
const selected = {type:'postcode',address:'전남광주통합특별시 여수시 무선2길 39',addressArea:'화장동',area:'화장동',coords:{lat:34.77,lng:127.64}};
assert.equal(a.selectedAddressArea(selected),'화장동','postcode legal dong must beat approximate map anchor');
assert.equal(a.selectedAddressArea({...selected,coords:null}),'화장동');
assert.equal(a.validCoords({lat:null,lng:null}),null);
assert.equal(a.validCoords({lat:'',lng:''}),null);
assert.equal(a.validCoords({lat:100,lng:127}),null);
assert.equal(a.fullAddress(selected),'여수시 무선2길 39');
let saved, activated, step = '';
Object.assign(a,{addressDraft:selected,document:{querySelector:()=>({value:''})},showAddressStep:v=>{step=v;},
  analyticsCoarseRegion:()=>({}),saveAddressBook:items=>{saved=items;},getAddressBook:()=>[],addressKey:()=>'',activateAddress:item=>{activated=item;}});
vm.runInContext(fn(address,'commitAddress'),a);
a.commitAddress();
assert.equal(step,'');assert.equal(saved.length,1);assert.equal(activated.area,'화장동');
a.addressDraft = {...selected,coords:null};a.commitAddress();assert.equal(activated.coords,null);
a.addressDraft = {...selected,type:'current'};a.commitAddress();assert.equal(step,'map','manual GPS confirmation remains');
assert.match(address,/showAddressStep\('detail'\);\s*void locateSelectedAddress\(addressDraft\)/,'search goes directly to save, geocode is optional');
assert.doesNotMatch(fn(address,'confirmMapPosition'),/mismatch/);
let resolveGeocode;
Object.assign(a,{addressDraft:selected,geocodeAddress:()=>new Promise(r=>{resolveGeocode=r;}),document:{querySelector:()=>({})},renderDraft:()=>{}});
vm.runInContext('async ' + fn(address,'locateSelectedAddress'),a);
const pending=a.locateSelectedAddress(selected);const newer={...selected,address:'다른 주소'};a.addressDraft=newer;
resolveGeocode({lat:34.7,lng:127.6});await pending;assert.equal(a.addressDraft,newer,'late coordinate reply cannot alter newer address');
for(const file of ['index.html','final-experience.js']) assert.match(read(file),/photo-address-priority-20260913/);
const steps=['saved','detail','map'].map(name=>({dataset:{rc7Step:name},hidden:name!=='detail'}));
const back={dataset:{rc7StepBack:'saved'}};
const stepContext=vm.createContext({document:{querySelectorAll:()=>steps,querySelector:s=>s.includes('step-back')?back:s.includes('detail')?steps[1]:s.includes('saved')?steps[0]:null},map:null,requestAnimationFrame:()=>{},initializeMap:()=>{},renderDraft:()=>{}});
vm.runInContext(fn(address,'showAddressStep'),stepContext);
stepContext.showAddressStep('map');assert.equal(back.dataset.rc7StepBack,'detail','optional map returns to the entered address');
stepContext.showAddressStep('saved');stepContext.showAddressStep('map');assert.equal(back.dataset.rc7StepBack,'saved','GPS/recovery map returns to address choices');
const semanticCases=[['f58b53f029285459','coupang-712171-13','[시원+촉촉]냉면2+촉촉~ 삼겹보쌈(200g)+명태회80g'],['6df173b638236d49','ddangyo-1136055-10000082','바삭 고기 튀김왕만두 5알 +와사비 간장']];
for(const [storeId,id,name] of semanticCases){const payload={storeId,items:[{id,name,image:''}]};assert.ok(photos.applyReviewedMenuPhotos(storeId,payload,inventory).items[0].image);payload.items[0].name+=' 다른 구성';assert.equal(photos.applyReviewedMenuPhotos(storeId,payload,inventory).items[0].image,'');}
console.log('PASS reviewed exact-menu photo inventory, food/channel ranking, postcode one-step save and stale reply guards');
