let rc6Coordinates={},rc6BannerTargets={},rc6StorePriority={},rc6ManagedStoreIds=new Set(),rc6SharedManagedStoreIds=new Set(),rc6Pointer=null,rc6LocationCache={key:'',stores:[]},rc6ChannelSortingInstalled=false,rc6HeroRenderKey='',rc6HeroDayTimer=0,rc6ActiveHeroDay='';
const rc6AppRegisteredStoresBase=appRegisteredStores;
const rc6PhoneStoresBase=fxPhoneStores;
const rc6DirectBrandsBase=fxDirectBrands;
const rc6OpenBrandHubBase=fxOpenBrandHub;
const rc6Verified=store=>Boolean(store&&store.coordinateVerified&&Number.isFinite(store.lat)&&Number.isFinite(store.lng));
function rc6ApplyCoordinates(){canonicalStores.forEach(store=>{const row=rc6Coordinates[String(store.id)];if(row&&row.status==='verified'&&Number.isFinite(Number(row.latitude))&&Number.isFinite(Number(row.longitude))){store.lat=Number(row.latitude);store.lng=Number(row.longitude);store.coordinateSource='verified';store.coordinateVerified=true;}else{store.lat=null;store.lng=null;store.coordinateSource='';store.coordinateVerified=false;}});coordinateStores=canonicalStores.filter(rc6Verified);}
function rc6ApplyStorePriority(){rc6ManagedStoreIds=new Set((rc6StorePriority.managedStoreIds||[]).map(String));rc6SharedManagedStoreIds=new Set((rc6StorePriority.sharedManagedStoreIds||[]).map(String));canonicalStores.forEach(store=>{const id=String(store.id);store.managed=rc6ManagedStoreIds.has(id);store.sharedManaged=!store.managed&&rc6SharedManagedStoreIds.has(id);});rc6LocationCache={key:'',stores:[]};}
function rc6OwnershipTier(store){const id=String(store?.id??store?.store_id??'');return rc6ManagedStoreIds.has(id)?0:rc6SharedManagedStoreIds.has(id)?1:2;}
function rc6RandomizeGull(gull){const curve=()=>`${Math.round(-20+Math.random()*40)}px`,bank=()=>`${Math.round(-11+Math.random()*22)}deg`;['a','b','c','d','e'].forEach(key=>gull.style.setProperty(`--curve-${key}`,curve()));['start','a','b','c','d','end'].forEach(key=>gull.style.setProperty(`--bank-${key}`,bank()));gull.style.setProperty('--flap',`${(.44+Math.random()*.34).toFixed(2)}s`);}
function rc6Gulls(){const shell=document.querySelector('.yeosu-night-shell');if(!shell||shell.querySelector('.rc6-gulls'))return;const layer=document.createElement('div');layer.className='rc6-gulls';layer.setAttribute('aria-hidden','true');[[12,22,11,-2,.8],[20,29,13,-6,1],[27,18,9,-9,.7],[33,25,14,-3,.9]].forEach(([y,size,duration,delay,scale],i)=>{layer.insertAdjacentHTML('beforeend',`<svg class="rc6-gull" style="--y:${y}%;--size:${size}px;--duration:${duration}s;--delay:${delay}s;--scale:${scale};--x:${62+i*8}%" viewBox="0 0 32 14"><g class="rc6-gull-flap"><path d="M2 10 Q9 2 16 9 Q23 2 30 10"/></g></svg>`);const gull=layer.lastElementChild;rc6RandomizeGull(gull);gull.addEventListener('animationiteration',event=>{if(event.target===gull)rc6RandomizeGull(gull);});});shell.prepend(layer);}
const RC6_DAILY_HERO_LIMIT=15,RC6_DAILY_STORE_HERO_LIMIT=12;
function rc6SeoulDay(now=new Date()){
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 const values={};for(const part of parts)if(part.type!=='literal')values[part.type]=part.value;
 const year=Number(values.year),month=Number(values.month),day=Number(values.day);
 return{key:[values.year,values.month,values.day].join('-'),number:Math.floor(Date.UTC(year,month-1,day)/86400000)};
}
function rc6HeroHash(value){let hash=2166136261;for(const char of String(value||'')){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619);}return hash>>>0;}
function rc6HeroGroupKey(entry){
 const store=entry.rankedStore||entry.store||{},bucket=Number.isFinite(store.rc6LocationBucket)?store.rc6LocationBucket:9,tier=Number.isFinite(store.rc6OwnershipTier)?store.rc6OwnershipTier:rc6OwnershipTier(store);
 const distance=Number(store.rc6NeighborhoodDistance),band=bucket===1&&Number.isFinite(distance)?Math.floor(distance*2):0;
 return [bucket,tier,band].join(':');
}
function rc6RotateHeroGroup(items,seed,dayNumber){
 if(items.length<2)return items;
 const offset=(rc6HeroHash(seed)+dayNumber)%items.length;
 const rotated=[...items.slice(offset),...items.slice(0,offset)];
 return dayNumber%2?[rotated[0],...rotated.slice(1).reverse()]:rotated;
}
function rc6DailyHeroOrder(entries,day=rc6SeoulDay()){
 const groups=[];for(const entry of entries){const key=rc6HeroGroupKey(entry),last=groups[groups.length-1];if(!last||last.key!==key)groups.push({key,items:[entry]});else last.items.push(entry);}
 const locationKey=[state.location,state.addressLabel,state.coords?.lat??'',state.coords?.lng??''].join('|');
 return groups.flatMap(group=>rc6RotateHeroGroup(group.items,locationKey+'|'+group.key,day.number)).slice(0,RC6_DAILY_STORE_HERO_LIMIT);
}
function rc6SpecialHeroEntries(day=rc6SeoulDay()){
 const specials=Object.entries(rc6BannerTargets).filter(([,target])=>target.status==='notion'&&target.notionUrl&&target.image).map(([key,target],index)=>({banner:{desktop:target.image,mobile:target.image},index:HERO_BANNERS.length+index,key:`notion-${key}`,target,store:null,tier:3,kind:'notion'}));
 return rc6RotateHeroGroup(specials,'notion-specials',day.number);
}
function rc6InterleaveHeroEntries(managed,specials){
 if(!specials.length)return managed.slice(0,RC6_DAILY_HERO_LIMIT);
 const result=[],slots=[2,6,10];let specialIndex=0;
 managed.forEach((item,index)=>{result.push(item);if(specialIndex<specials.length&&index===slots[specialIndex])result.push(specials[specialIndex++]);});
 while(specialIndex<specials.length)result.push(specials[specialIndex++]);
 return result.slice(0,RC6_DAILY_HERO_LIMIT);
}
function rc6StaticHeroBannersByStore(){
 const byId=new Map();
 HERO_BANNERS.forEach((banner,index)=>{const key=String(index+1).padStart(2,'0'),target=rc6BannerTargets[key]||{};if(target.status==='mapped'&&target.storeId)byId.set(String(target.storeId),{banner,key,target});});
 return byId;
}
function rc6ManagedStoreHeroEntries(){
 const staticById=rc6StaticHeroBannersByStore();
 return rc6RankCandidatesByCustomerLocation(stores.filter(store=>fxVisible(store)&&rc6OwnershipTier(store)<2)).map((rankedStore,index)=>{
  const id=String(rankedStore.id),preset=staticById.get(id),photo=fxPhoto(rankedStore),banner=preset?.banner||(photo?{desktop:photo,mobile:photo}:null);
  if(!banner)return null;
  return{banner,index,key:preset?.key||`store-${id}`,target:preset?.target||{label:rankedStore.name},store:rankedStore,rankedStore,tier:rc6OwnershipTier(rankedStore),kind:'store',presentation:preset?'creative':'photo'};
 }).filter(Boolean);
}
function rc6HeroEntries(){
 return rc6InterleaveHeroEntries(rc6DailyHeroOrder(rc6ManagedStoreHeroEntries()),rc6SpecialHeroEntries());
}
function rc6RenderHero(){
 const track=document.querySelector('#heroTrack');if(!track)return;
 const day=rc6SeoulDay(),entries=rc6HeroEntries(),renderKey=day.key+'|'+entries.map(item=>item.key).join('|')+'|'+[state.location,state.addressLabel,state.coords?.lat??'',state.coords?.lng??''].join('|');
 if(rc6HeroRenderKey===renderKey&&track.children.length)return;rc6HeroRenderKey=renderKey;if(heroCarousel)heroCarousel.destroy();
 track.innerHTML=entries.map((item,displayIndex)=>{const{banner,target,store}=item,isNotion=item.kind==='notion',isPhoto=item.presentation==='photo',label=isNotion?`${target.label} 노션에서 자세히 보기`:`${store.name} 가게 상세 보기`,targetAttr=isNotion?`data-rc6-banner-notion="${escapeHtml(target.notionUrl)}"`:`data-rc6-banner-store="${escapeHtml(store.id)}"`;let media;if(isNotion){media=`<img src="${banner.desktop}" alt="${escapeHtml(label)}" width="1200" height="675" decoding="async" loading="${displayIndex?'lazy':'eager'}">`;}else if(isPhoto){const proximity=item.rankedStore?.proximityLabel||'가까운 우리가게',meta=[store.area,store.cat].filter(Boolean).join(' · ');media=`<span class="rc6-store-hero-media"><img src="${escapeHtml(banner.desktop)}" alt="${escapeHtml(store.name)}" width="1200" height="700" decoding="async" loading="${displayIndex?'lazy':'eager'}"><span class="rc6-store-hero-copy"><small>${escapeHtml(proximity)}</small><strong>${escapeHtml(store.name)}</strong><span>${escapeHtml(meta)}</span><b>가게카드 보기&nbsp; ›</b></span></span>`;}else{media=`<picture><source media="(max-width:520px)" srcset="${banner.mobile}"><img src="${banner.desktop}" alt="${escapeHtml(label)}" width="1200" height="700" decoding="async" loading="${displayIndex?'lazy':'eager'}"></picture>`;}return `<button type="button" class="carousel-slide hero-slide rc6-hero-target" data-hero-index="${displayIndex}" ${targetAttr} aria-label="${escapeHtml(label)}">${media}</button>`}).join('');
 if(entries.length)heroCarousel=new InfiniteCarousel(document.querySelector('#heroCarousel'),{interval:3500});
}
function rc6WatchHeroDay(){
 rc6ActiveHeroDay=rc6SeoulDay().key;if(rc6HeroDayTimer)clearInterval(rc6HeroDayTimer);
 rc6HeroDayTimer=setInterval(()=>{const next=rc6SeoulDay().key;if(next===rc6ActiveHeroDay)return;rc6ActiveHeroDay=next;rc6HeroRenderKey='';rc6RenderHero();},60000);
}
function rc6HeroEvents(){const track=document.querySelector('#heroTrack'),shell=track?.closest('.carousel-shell');if(!track||!shell)return;const selector='[data-rc6-banner-store],[data-rc6-banner-notion]';track.addEventListener('pointerdown',e=>{const slide=e.target.closest(selector);if(!slide)return;rc6Pointer={id:e.pointerId,x:e.clientX,y:e.clientY,index:Number(slide.dataset.heroIndex),slide};},{capture:true});shell.addEventListener('pointerup',e=>{if(!rc6Pointer||rc6Pointer.id!==e.pointerId)return;const p=rc6Pointer;rc6Pointer=null;const releasedSlide=document.elementFromPoint(e.clientX,e.clientY)?.closest(selector);if(Math.hypot(e.clientX-p.x,e.clientY-p.y)>8||releasedSlide!==p.slide)return;e.preventDefault();const storeId=p.slide.dataset.rc6BannerStore;if(storeId){const store=stores.find(item=>String(item.id)===storeId);if(store)setTimeout(()=>openStore(store),0);return;}const href=p.slide.dataset.rc6BannerNotion;if(!href)return;try{const url=new URL(href,location.href);if(url.protocol==='https:')location.assign(url.href);}catch(error){console.warn('Invalid Notion banner URL',error);} });shell.addEventListener('pointercancel',()=>{rc6Pointer=null},{capture:true});}
function rc6UseCurrentLocation(){const button=document.querySelector('#gpsLocationBtn');if(!button)return;if(!navigator.geolocation){button.innerHTML='⌖ <span>이 기기는 위치 기능을 지원하지 않습니다</span>';return;}button.disabled=true;button.innerHTML='⌖ <span>현재 위치 확인 중…</span>';navigator.geolocation.getCurrentPosition(position=>{button.disabled=false;const accuracy=Number(position.coords.accuracy||Infinity);if(accuracy>1000){button.innerHTML='⌖ <span>선택한 주소·동네 기준으로 보여드려요</span>';state.rc6GpsMode='fallback';return;}button.innerHTML=`⌖ <span>${accuracy<=300?'현재 위치 확인 완료':'대략적인 현재 위치 확인 완료'}</span>`;chooseAddressBase('현재 위치',{area:'여수시 전체',coords:{lat:position.coords.latitude,lng:position.coords.longitude},sortByDistance:true,type:'current'});state.locationAccuracy=accuracy;state.rc6GpsMode=accuracy<=300?'exact':'approximate';},error=>{button.disabled=false;state.rc6GpsMode='denied';button.innerHTML=`⌖ <span>${error.code===1?'선택한 주소·동네 기준으로 보여드려요':'현재 위치를 확인하지 못했습니다'}</span>`;},{enableHighAccuracy:true,timeout:10000,maximumAge:300000});}

function rc6DiversifyDistance(rows){const result=[],pending=[...rows];while(pending.length){let index=pending.findIndex(row=>!result.slice(-3).some(old=>rc5BrandKey(old.store)===rc5BrandKey(row.store)));if(index<0)index=0;result.push(pending.splice(index,1)[0]);}return result;}
function rc6ClosestNeighborhood(coords){return yeosuNeighborhoods.map(item=>({name:item.name,point:neighborhoodPoint(item.name)})).filter(item=>item.point).map(item=>({...item,distance:haversine(coords,item.point)})).sort((a,b)=>a.distance-b.distance)[0]?.name||'';}
function rc6LocationSourceRank(store){return store.locationSource==='verified-address'?1:store.locationSource==='store-name-branch'?2:store.locationSource==='notion-or-canonical-neighborhood'?3:4;}
function rc6OrderSignals(store){return{routeCount:(store.routes||[]).length,ownershipTier:rc6OwnershipTier(store)};}
function rc6NearStores(){
 const customerHasCoords=Boolean(state.coords),selected=neighborhoodFor(state.location)||neighborhoodFor(state.addressLabel)||(customerHasCoords?rc6ClosestNeighborhood(state.coords):'');
 if(!selected&&!customerHasCoords)return[];const customerPoint=customerHasCoords?state.coords:neighborhoodPoint(selected);
 const cacheKey=[state.coords?.lat??'',state.coords?.lng??'',selected,state.location,state.addressLabel,canonicalStores.length,coordinateStores.length,rc6ManagedStoreIds.size,rc6SharedManagedStoreIds.size].join('|');if(rc6LocationCache.key===cacheKey)return rc6LocationCache.stores;
 const rows=canonicalStores.map(store=>{const names=store.neighborhoods?.length?store.neighborhoods:storeNeighborhoods(store),same=Boolean(selected&&names.includes(selected));const neighborhoodCandidates=names.map(name=>({name,point:neighborhoodPoint(name)})).filter(item=>item.point).map(item=>({...item,distance:customerPoint?haversine(customerPoint,item.point):Infinity})).sort((a,b)=>a.distance-b.distance);const candidate=same?selected:(neighborhoodCandidates[0]?.name||names[0]||'');const actual=customerHasCoords&&rc6Verified(store)?haversine(state.coords,{lat:store.lat,lng:store.lng}):null;const neighborhoodDistance=same?0:(neighborhoodCandidates[0]?.distance??Infinity);const sourceRank=rc6LocationSourceRank(store),signals=rc6OrderSignals(store);const bucket=same?0:candidate?1:2;return{store,candidate,bucket,actual,neighborhoodDistance,sourceRank,...signals};}).sort((a,b)=>a.bucket-b.bucket||a.ownershipTier-b.ownershipTier||(a.bucket===0?(Number(a.actual===null)-Number(b.actual===null)||(a.actual??Infinity)-(b.actual??Infinity)||a.sourceRank-b.sourceRank):a.neighborhoodDistance-b.neighborhoodDistance)||b.routeCount-a.routeCount||a.store.name.localeCompare(b.store.name,'ko'));
 const grouped=[];rows.forEach(row=>{const key=`${row.bucket}:${row.ownershipTier}`,last=grouped[grouped.length-1];if(!last||last.key!==key)grouped.push({key,rows:[row]});else last.rows.push(row);});const ranked=grouped.flatMap(group=>rc6DiversifyDistance(group.rows)).map(row=>({...row.store,distance:row.actual,rc6SortDistance:row.actual??row.neighborhoodDistance,rc6LocationBucket:row.bucket,rc6OwnershipTier:row.ownershipTier,rc6NeighborhoodDistance:row.neighborhoodDistance,proximityLabel:row.actual!==null?'':row.bucket===0?`${selected}의 가게`:row.bucket===1?`${row.candidate} 주변 가게`:'여수의 다른 추천 가게',locationSource:row.store.locationSource,neighborhoodConfidence:row.store.neighborhoodConfidence}));rc6LocationCache={key:cacheKey,stores:ranked};return ranked;
}
function rc6RankCandidatesByCustomerLocation(candidates){const nearby=rc6NearStores();if(!nearby.length)return candidates.map((store,index)=>({store,index})).sort((a,b)=>rc6OwnershipTier(a.store)-rc6OwnershipTier(b.store)||a.index-b.index).map(item=>item.store);const rank=new Map(nearby.map((store,index)=>[String(store.id),index])),details=new Map(nearby.map(store=>[String(store.id),store]));return candidates.map((store,index)=>({store:{...store,...details.get(String(store.id))},index})).sort((a,b)=>(rank.get(String(a.store.id))??Infinity)-(rank.get(String(b.store.id))??Infinity)||a.index-b.index).map(item=>item.store);}
function rc6CategoryCandidates(){
 const brand=state.brandId?BRAND_BY_ID[state.brandId]:null;
 return stores.map(store=>({store,score:relevance(store,state.query)}))
  .filter(item=>item.score>0&&fxVisible(item.store))
  .filter(({store})=>state.category==='전체'||store.cat===state.category)
  .filter(({store})=>!brand||brandMatchesStore(store,brand))
  .sort((a,b)=>{
   const aPin=Number.isFinite(Number(a.store.pinPosition))?Number(a.store.pinPosition):9999,bPin=Number.isFinite(Number(b.store.pinPosition))?Number(b.store.pinPosition):9999;
   if(aPin!==bPin)return aPin-bPin;
   if(a.store.forceBottom!==b.store.forceBottom)return a.store.forceBottom?1:-1;
   if(rc6OwnershipTier(a.store)!==rc6OwnershipTier(b.store))return rc6OwnershipTier(a.store)-rc6OwnershipTier(b.store);
   return b.score-a.score||a.store.name.localeCompare(b.store.name,'ko');
  }).map(item=>item.store);
}
function rc6DiversifyStoresByTier(input){const groups=[];input.forEach(store=>{const tier=rc6OwnershipTier(store),last=groups[groups.length-1];if(!last||last.tier!==tier)groups.push({tier,stores:[store]});else last.stores.push(store);});return groups.flatMap(group=>rc5Diversify(group.stores));}
function rc6CategoryStoresByCustomerLocation(){return rc6DiversifyStoresByTier(rc6RankCandidatesByCustomerLocation(rc6CategoryCandidates()));}
function rc6InstallChannelLocationSorting(){
 if(rc6ChannelSortingInstalled)return;rc6ChannelSortingInstalled=true;
 appRegisteredStores=function rc6LocationAppStores(key){return rc6RankCandidatesByCustomerLocation(rc6AppRegisteredStoresBase(key));};
 fxPhoneStores=function rc6LocationPhoneStores(category='추천'){
  const items=rc6PhoneStoresBase(category),byId=new Map(items.map(item=>[String(item.store.id),item]));
  return rc6RankCandidatesByCustomerLocation(items.map(item=>item.store)).map(store=>({...byId.get(String(store.id)),store}));
 };
 fxDirectBrands=function rc6LocationDirectBrands(){
  const nearby=rc6NearStores(),rank=new Map(nearby.map((store,index)=>[String(store.id),index]));
  return rc6DirectBrandsBase().map(brand=>{const stores=rc6RankCandidatesByCustomerLocation((brand.stores||[]).map(fxStoreById).filter(Boolean));return{...brand,stores:stores.map(store=>String(store.id)),rc6Nearest:Math.min(...stores.map(store=>rank.get(String(store.id))??Infinity))};}).sort((a,b)=>a.rc6Nearest-b.rc6Nearest||a.name.localeCompare(b.name,'ko'));
 };
 fxOpenBrandHub=function rc6LocationBrandHub(view='channels',value=''){
  if(view!=='happy-stores'){rc6OpenBrandHubBase(view,value);return;}
  const ids=[...fxHappyByStore].filter(([,item])=>item.brandName===value).map(([id])=>id);
  const stores=rc6RankCandidatesByCustomerLocation(ids.map(fxStoreById).filter(fxVisible));
  const cards=stores.map(store=>`<button type="button" class="channel-store-card glass-action" data-channel-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area||'여수')} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`).join('');
  openModal(`<section class="happyorder-hub"><h2 id="modalTitle">해피오더 · ${escapeHtml(value)}</h2><p>주소 설정 후 주변 주문 가능 매장이 표시됩니다. 지역과 영업 상태에 따라 일부 매장은 표시되지 않을 수 있습니다.</p><div class="channel-store-list">${cards}</div></section>`);
 };
}
function rc6RankNewStoresByCustomerLocation(candidates){const ranked=rc6RankCandidatesByCustomerLocation(candidates),groups=[];ranked.forEach(store=>{const bucket=Number.isFinite(store.rc6LocationBucket)?store.rc6LocationBucket:9,tier=rc6OwnershipTier(store),key=`${bucket}:${tier}`,last=groups[groups.length-1];if(!last||last.key!==key)groups.push({key,stores:[store]});else last.stores.push(store);});return groups.flatMap(group=>group.stores.sort((a,b)=>(a.rawIndex??Infinity)-(b.rawIndex??Infinity)||a.name.localeCompare(b.name,'ko')));}
function rc6LocationRankedRail(spec,originalRank){if(spec.kind==='near')return rc6NearStores();let candidates=spec.kind==='new'?stores.filter(fxVisible):originalRank(spec);if(spec.kind==='local')candidates=candidates.filter(store=>['direct','mukkebi','ddangyo','ondongne'].some(key=>routeFor(store,key)));return spec.kind==='new'?rc6RankNewStoresByCustomerLocation(candidates):rc6RankCandidatesByCustomerLocation(candidates);}
const rc6CommitAddressBase=commitAddressSelection;
function rc6CommitAddress(){if(addressDraft?.type!=='current'){rc6CommitAddressBase();return;}const coords=addressDraft.coords;if(!coords)return;state.location='여수시 전체';state.addressLabel='현재 위치';state.coords=coords;state.sortByDistance=true;sessionStorage.setItem('rc6LocationActive','1');document.querySelector('#locationText').textContent='현재 위치';hardClose();setTimeout(showHomeAfterAddressCommit,60);}
async function rc6Initialize(){[rc6Coordinates,rc6BannerTargets,rc6StorePriority]=await Promise.all([fetchJson('data/store-coordinates.json',{}),fetchJson('data/banner-targets.json?v=notion-banner-15',{}),fetchJson('data/store-priority.json',{})]);rc6ApplyCoordinates();rc6ApplyStorePriority();rc4StoreHasRealCoordinates=rc6Verified;fxDistance=store=>state.coords&&rc6Verified(store)?haversine(state.coords,{lat:store.lat,lng:store.lng}):null;const originalRank=fxRankStores,originalFiltered=filteredStores,originalRenderStores=renderStores;fxRankStores=spec=>rc6LocationRankedRail(spec,originalRank);filteredStores=()=>rc6RankCandidatesByCustomerLocation(originalFiltered());rc5CategoryStores=rc6CategoryStoresByCustomerLocation;rc4CategoryList=rc6CategoryStoresByCustomerLocation;rc6InstallChannelLocationSorting();useCurrentLocation=rc6UseCurrentLocation;commitAddressSelection=rc6CommitAddress;renderStores=function rc6RenderStores(options={}){rc6RenderHero();return originalRenderStores(options);};rc6RenderHero();rc6WatchHeroDay();rc6HeroEvents();rc6Gulls();renderStores({resetCount:true});fxRenderRails();document.querySelector('.build-mark').textContent='대동여수음식지도 RC6 온라인 검수 후보';}
