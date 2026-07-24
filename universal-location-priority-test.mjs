import {readFile} from 'node:fs/promises';

const stores=JSON.parse(await readFile(new URL('./data/stores.json',import.meta.url)));
const coordinates=JSON.parse(await readFile(new URL('./data/store-coordinates.json',import.meta.url)));
const neighborhoodData=JSON.parse(await readFile(new URL('./data/yeosu-neighborhoods.json',import.meta.url)));
const priority=JSON.parse(await readFile(new URL('./data/store-priority.json',import.meta.url)));
const appSource=await readFile(new URL('./app.js',import.meta.url),'utf8');
const rc2Source=await readFile(new URL('./rc2-fixes.js',import.meta.url),'utf8');
const rc6Source=await readFile(new URL('./rc6-fixes.js',import.meta.url),'utf8');

const neighborhoods=neighborhoodData.neighborhoods;
const byName=new Map(neighborhoods.map(item=>[item.name,item]));
const managed=new Set((priority.managedStoreIds||[]).map(String));
const shared=new Set((priority.sharedManagedStoreIds||[]).map(String));
const normalize=value=>String(value||'').toLowerCase().replace(/[\s,\/·&()\-_.]/g,'');
const findNeighborhoods=value=>{const text=normalize(value);return neighborhoods.filter(item=>[item.name,...item.aliases].some(alias=>text.includes(normalize(alias)))).map(item=>item.name)};
const idOf=store=>String(store.store_id||store.id||'');
const point=name=>{const item=byName.get(name);return item&&Number.isFinite(Number(item.latitude))?{lat:Number(item.latitude),lng:Number(item.longitude)}:null};
const haversine=(a,b)=>{const R=6371,r=v=>v*Math.PI/180,dLat=r(b.lat-a.lat),dLng=r(b.lng-a.lng),x=Math.sin(dLat/2)**2+Math.cos(r(a.lat))*Math.cos(r(b.lat))*Math.sin(dLng/2)**2;return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x))};
const tier=store=>managed.has(idOf(store))?0:shared.has(idOf(store))?1:2;

function classify(store){
 const address=/여수시/.test(String(store.address||''))?findNeighborhoods(store.address):[];
 const branchText=[store.branchName,store.name].filter(Boolean).join(' ');
 const branch=/점|지점|항|지구/.test(branchText)?findNeighborhoods(branchText):[];
 const notion=findNeighborhoods(store.district||store.area||'');
 const names=address.length?address:[...new Set([...branch,...notion])];
 return{store,names,tier:tier(store)};
}

function rankFor(location){
 const customer=point(location);
 return searchable.map(item=>{
  const same=item.names.includes(location);
  const distances=item.names.map(point).filter(Boolean).map(candidate=>haversine(customer,candidate));
  return{...item,bucket:same?0:item.names.length?1:2,neighborhoodDistance:same?0:Math.min(...distances,Infinity)};
 }).sort((a,b)=>a.bucket-b.bucket||a.tier-b.tier||a.neighborhoodDistance-b.neighborhoodDistance||a.store.name.localeCompare(b.store.name,'ko'));
}

const searchable=stores.filter(store=>idOf(store)&&store.name&&normalize(store.name)!=='제목없음').map(classify);
const titleless=stores.length-searchable.length;
const verifiedCoordinates=searchable.filter(item=>coordinates[idOf(item.store)]?.status==='verified').length;
if(stores.length!==650||searchable.length!==649||titleless!==1||verifiedCoordinates!==326){
 throw new Error(`frozen counts changed: ${JSON.stringify({canonical:stores.length,searchable:searchable.length,titleless,verifiedCoordinates})}`);
}

const audited=[];
for(const neighborhood of neighborhoods){
 const location=neighborhood.name,ranked=rankFor(location),same=ranked.filter(item=>item.bucket===0);
 if(!same.length)continue;
 const firstOther=ranked.findIndex(item=>item.bucket!==0);
 if(firstOther!==-1&&ranked.slice(firstOther).some(item=>item.bucket===0))throw new Error(`${location}: another neighborhood appeared before all local stores`);
 for(let index=1;index<same.length;index++)if(same[index-1].tier>same[index].tier)throw new Error(`${location}: ownership priority broke inside the local neighborhood`);
 const managedLocal=same.filter(item=>item.tier===0);
 if(managedLocal.length&&same[0].tier!==0)throw new Error(`${location}: managed local store is not first`);
 audited.push({location,localStores:same.length,managedLocalStores:managedLocal.length,first:same[0].store.name});
}

for(const required of ['둔덕동','미평동','화장동'])if(!audited.some(item=>item.location===required))throw new Error(`${required}: local-store audit coverage missing`);
for(const required of [
 '...new Set([...branchNeighborhoods,...notionNeighborhoods])',
])if(!appSource.includes(required))throw new Error(`multi-neighborhood wiring missing: ${required}`);
if(![
 'const key = `${bucket}:${tier}`',
 "const key = String(bucket) + ':' + String(tier)",
].some(required=>rc2Source.includes(required)))throw new Error('rail location-priority bucket/tier wiring missing');
if(![
 'addStore(store, true)',
 'addStore(store, relaxDiversity, allowGlobalReuse)',
].some(required=>rc2Source.includes(required)))throw new Error('rail location-priority fill wiring missing');
for(const required of [
 'neighborhoodFor(state.location)||neighborhoodFor(state.addressLabel)',
 'a.bucket-b.bucket||a.ownershipTier-b.ownershipTier',
 'rc6LocationBucket:row.bucket',
 'rc6RankNewStoresByCustomerLocation',
])if(!rc6Source.includes(required))throw new Error(`universal location-priority wiring missing: ${required}`);
if(rc6Source.includes('.slice(0,80)'))throw new Error('new-store rail still limits candidates before location ranking');
if(rc6Source.includes('const bestTier='))throw new Error('banner still filters ownership before location ranking');

console.log(JSON.stringify({
 counts:{canonical:stores.length,searchable:searchable.length,titleless,verifiedCoordinates},
 auditedNeighborhoods:audited.length,
 representatives:audited.filter(item=>['둔덕동','미평동','화장동'].includes(item.location)),
 ordering:'customer neighborhood -> managed -> shared manager -> other -> adjacent neighborhoods',
 status:'PASS',
},null,2));
