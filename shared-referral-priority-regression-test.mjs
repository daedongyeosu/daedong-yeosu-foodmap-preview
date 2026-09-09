import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const rc6=fs.readFileSync('rc6-fixes.js','utf8'),app=fs.readFileSync('app.js','utf8'),rc2=fs.readFileSync('rc2-fixes.js','utf8');
const config=JSON.parse(fs.readFileSync('data/store-priority.json','utf8'));
function fn(source,name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);let depth=0;for(let i=source.indexOf('{',start);i<source.length;i++){if(source[i]==='{')depth++;if(source[i]==='}'&&--depth===0)return source.slice(start,i+1)}throw Error(name);}
const partner=config.referralProfiles['shared-yeosu'];
assert.equal(partner.enabled,true);assert.equal(partner.storeIds.length,102);assert.equal(new Set(partner.storeIds).size,102);
assert.ok(partner.storeIds.every(id=>/^[a-f0-9]{16}$/.test(id)));
for(const id of ['65cc1845e542d5fb','7bc7239e6b509c44','04910f606ba038a6','84c118675c0caa4c','d86586aaef8454c9'])assert.ok(!partner.storeIds.includes(id),'Known own store/shop-in-shop excluded');
assert.deepEqual(Object.keys(partner).sort(),['enabled','storeIds']);
function context(key='',goheung=false){
 const c=vm.createContext({RC6_PARTNER_KEY:key,RC6_IS_GOHEUNG:goheung,rc6StorePriority:config,rc6PartnerStoreIds:new Set(),rc6ManagedStoreIds:new Set(['own']),rc6SharedManagedStoreIds:new Set(),rc6DeprioritizedStoreIds:new Set(config.deprioritizedStoreIds),rc6NearStores:()=>[],compareStoreBusinessStatus:(a,b)=>(a?.store||a).rank-(b?.store||b).rank});
 for(const name of ['rc6PartnerActive','rc6PartnerTier','rc6ApplyPartnerPriority','rc6ConfigurePartnerPriority','rc6OwnershipTier','rc6RankCandidatesByCustomerLocation'])vm.runInContext(fn(rc6,name),c);
 c.rc6ConfigurePartnerPriority();return c;
}
const p={id:partner.storeIds[0],rank:0},own={id:'own',rank:0},other={id:'other',rank:0},closed={id:partner.storeIds[1],rank:3};
const ids=x=>Array.from(x,s=>(s.store||s).id);
const c=context('shared-yeosu');assert.ok(c.rc6PartnerActive());
assert.deepEqual(ids(c.rc6RankCandidatesByCustomerLocation([own,other,closed,p])),[p.id,'own','other',closed.id]);
assert.deepEqual(ids(c.rc6ApplyPartnerPriority([own,other,closed,p])),[p.id,'own','other',closed.id]);
assert.deepEqual(ids(c.rc6ApplyPartnerPriority([{store:own},{store:p}])),[p.id,'own']);
assert.equal(c.rc6OwnershipTier(own),2);assert.equal(c.rc6OwnershipTier(p),0);
for(const id of ['0987413e7ca12e2a','b8267998349b16e1','361f855efc21c1c2']){assert.ok(partner.storeIds.includes(id));assert.equal(c.rc6OwnershipTier({id}),0);assert.equal(context().rc6OwnershipTier({id}),3,'Former-managed priority changes only on shared link');}
for(const key of ['', 'unknown','__proto__','constructor']){const normal=context(key);assert.equal(normal.rc6PartnerActive(),false);assert.equal(normal.rc6OwnershipTier(own),0);const input=[other,own,p];assert.equal(normal.rc6ApplyPartnerPriority(input),input);}
assert.equal(context('shared-yeosu',true).rc6PartnerActive(),false);
assert.match(fn(app,'applyCategoryPriorityOverrides'),/rc6ApplyPartnerPriority\(input\)/);
assert.match(fn(rc2,'rc2ApplyManagedRegionPriority'),/rc6ApplyPartnerPriority\(cards\)/);
assert.match(rc6,/rc6ApplyStorePriority\(\);rc6ConfigurePartnerPriority\(\)/);
assert.match(rc6,/RC6_PARTNER_KEY=new URLSearchParams\(location.search\)/);
const service=fs.readFileSync('store-service-info.js','utf8');
Object.assign(c,{overviewQuery:'',overviewIdentityPriority:()=>0,overviewStatusPriority:e=>e.rank,overviewMenuEvidencePriority:()=>0,locationMode:'all',referenceCoordinate:()=>null});
vm.runInContext(fn(service,'compareOverviewEntries'),c);
const sharedEntry={storeId:p.id,rank:0,index:10,area:'문수',ownershipTier:0,areaDistance:4,locationBucket:1};
const ownEntry={storeId:'own',rank:0,index:0,area:'문수',ownershipTier:2,areaDistance:0,locationBucket:0};
for(const mode of ['all','selected','nearby']){c.locationMode=mode;c.referenceCoordinate=()=>({lat:1,lng:1});assert.ok(c.compareOverviewEntries(sharedEntry,ownEntry)<0);assert.ok(c.compareOverviewEntries({...sharedEntry,rank:3},ownEntry)>0);}
c.overviewQuery='exact own name';c.overviewIdentityPriority=e=>e.storeId==='own'?0:1;assert.ok(c.compareOverviewEntries(sharedEntry,ownEntry)>0,'Exact query relevance preserved');
console.log('shared referral priority regression passed: URL isolation, own exclusions, status, ordering, wrappers, unknown profile, Goheung');
