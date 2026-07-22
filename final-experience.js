'use strict';

/* Final local experience layer. Frozen store/order datasets remain read-only. */
const FX_PHONE_URL='data/phone-order-runtime.json?v=phone-audit-batch-04';
const FX_BRAND_URL='data/brand-app-mapping.json';
const FX_BRAND_SUPPLEMENT_URL='data/brand-app-missing-nine-supplement.json';
const FX_HAPPY_URL='data/happyorder-channel-research.json';
const FX_BRAND_PHOTO_POOL_URL='data/brand-photo-pools.json';
const FX_APPROVED_BRAND_PHOTO_ASSIGNMENTS={
 '066197a9443c3145':'assets/store-photos/485a846f6445df/02.webp','4059491d8dbb4159':'assets/photo-batch-3-refresh/card/bbq.webp','572e4a658f762cbe':'assets/notion-recovery-180/450856a6b5fd4846/01.png','e2645d79ef555a24':'assets/photo-batch-3-refresh/card/bbq.webp','c1df1c34732d2757':'assets/notion-recovery-180/450856a6b5fd4846/01.png','e32f28eff787161a':'assets/notion-recovery-180/450856a6b5fd4846/01.png','9cba7b46fed409a9':'assets/notion-recovery-180/450856a6b5fd4846/01.png','39f3c8acab504b00':'assets/store-photos/af8b15c5b69a94/01.webp','9ee73ce6168105ec':'assets/store-photos/e982b7aa80a2e4/02.webp'
};
const FX_BATTLE_SESSION='daedongNavalSuccessPlayedV1';
const FX_ENTRY_SESSION='daedongEntryFireworkPlayedV1';
const FX_WEATHER_CACHE='daedongYeosuWeatherV1';
window.DAEDONG_WEATHER_CONFIG=window.DAEDONG_WEATHER_CONFIG||{enabled:false,proxyUrl:'',cacheMinutes:18};

let fxBrandData={stores:[],brands:[]};
let fxSupplement={storeMappings:[],directApps:[]};
let fxHappyData={candidateStoreMappings:[],currentScreenBrands:[],categories:[]};
let fxPhoneData={storeMappings:[]};
let fxBrandPhotoPool={brands:{},assignments:{}};
let fxRainState='clear';
let fxTouchLocked=false;
const fxBrandByStore=new Map();
const fxHappyByStore=new Map();
const fxPhoneByStore=new Map();
const fxOriginalNormalizedStore=normalizedStore;
const fxOriginalFilteredStores=filteredStores;
const fxOriginalRenderStores=renderStores;
const fxOriginalOpenStore=openStore;
const fxOriginalAppRegisteredStores=appRegisteredStores;

function fxVisible(store){return Boolean(store&&normalize(store.name)!=='제목없음'&&normalize(store.name)!=='이름없는가게');}
function fxSvg(id,cls='ui-icon'){return `<svg class="${cls}" aria-hidden="true"><use href="assets/ui/ui-icons.svg#${id}"></use></svg>`;}
function fxPlatform(){const ua=navigator.userAgent||'';if(/iphone|ipad|ipod/i.test(ua))return'ios';if(/android/i.test(ua))return'android';return'other';}
function fxLowPower(){return Number(navigator.hardwareConcurrency||8)<=4||Number(navigator.deviceMemory||8)<=4;}
function fxReduced(){return matchMedia('(prefers-reduced-motion: reduce)').matches;}
function fxStoreById(id){return stores.find(store=>String(store.id)===String(id));}
function fxPhoto(store){return fxBrandPhotoPool.assignments?.[String(store?.id)]||FX_APPROVED_BRAND_PHOTO_ASSIGNMENTS[String(store?.id)]||photoResolver?.resolve(store)?.src||'';}
function fxCardPhoto(store){const src=fxPhoto(store);return src?`<img src="${escapeHtml(src)}" alt="${escapeHtml(store.name)}" loading="lazy" decoding="async">`:`<span class="app-browser-photo-placeholder">${fxSvg('food','category-local-icon')}</span>`;}
function fxDistance(store){return state.coords&&store.lat!==null&&store.lng!==null?haversine(state.coords,{lat:store.lat,lng:store.lng}):null;}

normalizedStore=function(raw,index){const store=fxOriginalNormalizedStore(raw,index);store.customerVisible=normalize(raw.name)!=='제목없음';store.rawIndex=index;return store;};
filteredStores=function(){return fxOriginalFilteredStores().filter(fxVisible);};
appRegisteredStores=function(key){return fxOriginalAppRegisteredStores(key).filter(fxVisible);};

function fxCategoryMarkup(name){return `<button type="button" class="category glass-action ${state.category===name?'active':''}" data-cat="${escapeHtml(name)}">${fxSvg('food','category-local-icon')}<span>${escapeHtml(name)}</span></button>`;}
renderCategories=function(){const names=['전체',...mainCategories()];$('#categoryGrid').innerHTML=names.map(fxCategoryMarkup).join('');};

function fxThemeMatch(store,spec){const text=storeText(store);return spec.pattern?spec.pattern.test(text):true;}
function fxRankStores(spec){return stores.filter(fxVisible).filter(store=>fxThemeMatch(store,spec)).map(store=>{const distance=fxDistance(store);const low=['direct','mukkebi','ddangyo','ondongne'].some(key=>routeFor(store,key));let score=spec.pattern?80:20;if(distance!==null)score+=Math.max(0,32-distance*4);if(low)score+=12;if(store.managed)score+=8;else if(store.sharedManaged)score+=5;if(spec.kind==='near'&&distance!==null)score+=Math.max(0,120-distance*25);if(spec.kind==='local'&&low)score+=80;if(spec.kind==='new')score+=Math.max(0,500-(store.rawIndex||0));return{store,distance,score};}).sort((a,b)=>b.score-a.score||(a.distance??999)-(b.distance??999)||a.store.name.localeCompare(b.store.name,'ko')).map(item=>({...item.store,distance:item.distance}));}
const FX_RAIL_SPECS=[
 {id:'near',kind:'near',title:'지금 가까운 가게',desc:'선택한 위치를 먼저 반영해요'},
 {id:'local',kind:'local',title:'여수에 힘이 되는 주문',desc:'지역 주문경로가 확인된 가게'},
 {id:'solo',title:'나 혼자 술 한잔',desc:'혼자 즐기기 좋은 안주와 소량 메뉴',pattern:/닭발|곱창|회|족발|보쌈|치킨|닭강정|국물|분식|야식|주점/},
 {id:'group',title:'오늘은 회식이다',desc:'여럿이 나누기 좋은 메뉴',pattern:/회|해산물|족발|보쌈|치킨|고기|삼겹|아귀|해물찜|찜닭|탕|전골/},
 {id:'warm',title:'왕후의 밥, 걸인의 찬',desc:'소박해도 마음까지 따뜻해지는 한 끼',pattern:/백반|집밥|국밥|찌개|죽|김치찜|도시락|반찬|한식/},
 {id:'appetite',title:'입맛 없을 때',desc:'매콤하고 새콤한 음식',pattern:/냉면|밀면|쫄면|비빔|마라|떡볶이|김치/},
 {id:'rain',title:'비 오는 날',desc:'현재 여수에 비가 올 때 생각나는 음식',pattern:/전|국밥|찌개|탕|수제비|칼국수|짬뽕|부침/},
 {id:'noodle',title:'면 음식이 당길 때',desc:'국수·면·짬뽕 한 그릇',pattern:/면|국수|짬뽕|짜장|파스타|우동|라멘/},
 {id:'sweet',title:'시원하고 달달한 것이 당길 때',desc:'카페·빙수·디저트',pattern:/카페|커피|디저트|빙수|아이스크림|베이커리|떡/},
 {id:'mood',title:'기분전환이 필요할 때',desc:'평소와 다른 메뉴',pattern:/피자|버거|치킨|마라|아시안|돈까스|일식/},
 {id:'new',kind:'new',title:'새로 들어온 가게',desc:'최근 지도에 등록된 가게'}
];
function fxSelectedRails(){const hour=new Date().getHours();const ids=fxRainState!=='clear'?['rain','near','local','warm','noodle','new']:hour>=17?['near','local','group','solo','mood','new']:['near','local','warm','appetite','sweet','new'];return ids.slice(0,6).map(id=>FX_RAIL_SPECS.find(spec=>spec.id===id));}
function fxRenderRails(){const root=$('#recommendRails');if(!root)return;if(state.category!=='전체'||state.query||state.brandId){root.hidden=true;root.innerHTML='';return;}root.hidden=false;const used=new Set();root.innerHTML=fxSelectedRails().map(spec=>{let list=fxRankStores(spec).filter(store=>!used.has(store.id)).slice(0,8);if(list.length<3)list=fxRankStores(spec).slice(0,8);list.slice(0,4).forEach(store=>used.add(store.id));const cards=list.map(store=>{const distance=spec.kind==='near'&&Number.isFinite(store.distance)?`약 ${store.distance<1?`${Math.round(store.distance*1000)}m`:`${store.distance.toFixed(1)}km`}`:'';const locationLabel=distance||store.proximityLabel||'';return `<button type="button" class="rail-card glass-action" data-rail-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span class="rail-card-copy"><h3>${escapeHtml(store.name)}</h3><p>${locationLabel?`${escapeHtml(locationLabel)} · `:''}${escapeHtml(store.area||'여수')} · ${escapeHtml(store.cat)}</p></span></button>`}).join('');const empty=spec.kind==='near'?'주소에서 동네를 확인하면 가까운 권역의 가게를 보여드립니다.':'추천 가게를 확인 중입니다.';return `<section class="recommend-rail" data-rail="${spec.id}"><header class="recommend-rail-head"><div><h2>${escapeHtml(spec.title)}</h2><p>${escapeHtml(spec.desc)}</p></div></header><div class="recommend-track">${cards||`<p class="empty">${empty}</p>`}</div></section>`;}).join('');}
renderStores=function(options={}){fxOriginalRenderStores(options);fxRenderRails();};

function fxAppBrowserMarkup(key,selectedCategory='추천'){
 const meta=APP_META[key],all=appRegisteredStores(key),cats=[...new Set(all.map(store=>store.cat).filter(Boolean))];const list=selectedCategory==='추천'?all:all.filter(store=>store.cat===selectedCategory);
 const chips=`<nav class="app-browser-category-chips"><button type="button" data-app-category="추천" class="${selectedCategory==='추천'?'active':''}">추천</button>${cats.map(cat=>`<button type="button" data-app-category="${escapeHtml(cat)}" class="${selectedCategory===cat?'active':''}">${escapeHtml(cat)}</button>`).join('')}</nav>`;
 const cards=list.map(store=>`<button type="button" class="app-browser-card glass-action" data-app-store-id="${escapeHtml(store.id)}" data-app-key="${key}">${appBrowserPhoto(store)}<span class="app-browser-info"><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area||'여수')} · ${escapeHtml(store.cat)}</small><span>${appIcon(key,'app-browser-app-icon')}</span></span><b>›</b></button>`).join('');
 return `<section class="app-browser"><header class="app-browser-head">${appIcon(key,'app-browser-head-icon')}<div><h2 id="modalTitle">${escapeHtml(meta.label)} 등록 가게</h2><p>실제 주문주소가 등록된 가게만 보여드립니다.</p></div></header>${chips}<div class="app-browser-list">${cards||'<div class="empty">해당 조건의 가게가 없습니다.</div>'}</div></section>`;
}
openAppBrowser=function(key,selectedCategory='추천'){if(!['direct','mukkebi','ddangyo','ondongne','yogiyo','coupang','baemin'].includes(key))return;openModal(fxAppBrowserMarkup(key,selectedCategory));$('#modal').dataset.appBrowserKey=key;$('#modal').dataset.appBrowserCategory=selectedCategory;};
globalExternalGuide=function(key){openAppBrowser(key);};

function fxPhoneStores(category='추천'){let list=fxPhoneData.storeMappings.map(item=>({...item,store:fxStoreById(item.store_id)})).filter(item=>fxVisible(item.store));if(category!=='추천')list=list.filter(item=>item.store.cat===category);return list.sort((a,b)=>(fxDistance(a.store)??999)-(fxDistance(b.store)??999)||a.store.name.localeCompare(b.store.name,'ko'));}
function fxOpenPhoneDirectory(category='추천'){
 const all=fxPhoneStores(),cats=[...new Set(all.map(item=>item.store.cat).filter(Boolean))];const list=fxPhoneStores(category);
 const chips=`<nav class="app-browser-category-chips"><button type="button" data-phone-category="추천" class="${category==='추천'?'active':''}">추천</button>${cats.map(cat=>`<button type="button" data-phone-category="${escapeHtml(cat)}" class="${category===cat?'active':''}">${escapeHtml(cat)}</button>`).join('')}</nav>`;
 const cards=list.map(({store})=>`<button type="button" class="phone-order-card glass-action" data-phone-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area||'여수')} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`).join('');
 openModal(`<section class="phone-order-sheet"><h2 id="modalTitle">전화주문 가능한 가게</h2><p>가게를 선택해도 전화가 자동으로 걸리지 않습니다. 전화번호를 확인한 뒤 전화 걸기 버튼을 눌러주세요.</p>${chips}<div class="phone-order-list">${cards||'<p class="empty">확인 가능한 전화페이지가 없습니다.</p>'}</div></section>`);
}
function fxOpenPhoneConfirm(id){const item=fxPhoneByStore.get(String(id)),store=fxStoreById(id),phone=String(store?.phone||'').replace(/[^0-9]/g,'');const valid=/^02\d{7,8}$/.test(phone)||/^0(?:3[1-3]|4[1-4]|5[1-5]|6[1-4])\d{7,8}$/.test(phone)||/^01[016789]\d{7,8}$/.test(phone)||/^070\d{8}$/.test(phone);if(!item?.clickableTel||!store||!valid)return;openModal(`<section class="phone-order-confirm" data-store-id="${escapeHtml(store.id)}"><h2 id="modalTitle">${escapeHtml(store.name)} 전화주문</h2><div class="phone-confirm-photo">${fxCardPhoto(store)}</div><p>${escapeHtml(store.area||'여수')} · ${escapeHtml(store.cat)}</p><p>가게를 선택해도 전화가 자동으로 걸리지 않습니다. 전화번호를 확인한 뒤 전화 걸기 버튼을 눌러주세요.</p><div class="phone-confirm-actions"><a class="phone-call-link" href="tel:${escapeHtml(phone)}">전화 걸기</a><button class="phone-cancel" type="button" data-phone-cancel>취소</button></div></section>`);$('#modal').dataset.activeStoreId=store.id;}

function fxBuildIndexes(){
 fxBrandByStore.clear();fxHappyByStore.clear();fxPhoneByStore.clear();
 for(const item of fxBrandData.stores||[])fxBrandByStore.set(String(item.store_id),{brandName:item.brandName,storeName:item.storeName,appLink:item.appLink,packageName:item.packageName,buttonLabel:item.buttonLabel,icon:item.icon,platform:'Android'});
 for(const item of fxSupplement.storeMappings||[]){const app=item.orderChannels?.brandApp;if(app)fxBrandByStore.set(String(item.store_id),{brandName:item.brandName,storeName:item.storeName,...app});}
 const brandTemplates=new Map();
 for(const item of fxBrandByStore.values()){
  const key=normalize(String(item.brandName||'').replace(/domino'?s?/gi,'도미노피자'));
  if(key&&!brandTemplates.has(key))brandTemplates.set(key,item);
 }
 for(const store of stores){
  if(fxBrandByStore.has(String(store.id)))continue;
  const identity=normalize([store.brandName,store.name].filter(Boolean).join(' ').replace(/domino'?s?/gi,'도미노피자'));
  const match=[...brandTemplates].find(([key])=>key&&identity.includes(key));
  if(match)fxBrandByStore.set(String(store.id),{...match[1],storeName:store.name,brandName:match[1].brandName});
 }
 for(const item of fxHappyData.candidateStoreMappings||[])if(item.happyOrder)fxHappyByStore.set(String(item.store_id),{storeName:item.storeName,...item.happyOrder,category:item.category});
 for(const item of fxPhoneData.storeMappings||[])fxPhoneByStore.set(String(item.store_id),item);
 for(const store of stores){const phone=String(store.phone||'').replace(/[^0-9]/g,'');if(phone&&!fxPhoneByStore.has(String(store.id)))fxPhoneByStore.set(String(store.id),{store_id:String(store.id),storeName:store.name,phone,clickableTel:true});}
}
function fxDirectBrands(){const map=new Map();for(const [id,item] of fxBrandByStore){if(!map.has(item.brandName))map.set(item.brandName,{name:item.brandName,icon:item.icon,stores:[]});map.get(item.brandName).stores.push(id);}return [...map.values()].sort((a,b)=>a.name.localeCompare(b.name,'ko'));}
function fxOpenBrandHub(view='channels',value=''){
 if(view==='channels'){openModal(`<section class="brand-app-hub"><h2 id="modalTitle">브랜드앱 주문</h2><p>직접 브랜드앱과 공통 주문채널 해피오더를 각각 선택할 수 있습니다.</p><div class="brand-app-grid"><button type="button" class="brand-app-tile glass-action" data-brand-view="direct">${fxSvg('store','order-svg')}<b>직접 브랜드앱</b><small>Android 앱</small></button><button type="button" class="brand-app-tile glass-action" data-brand-view="happy"><img src="assets/order-channels/happyorder.png" alt="해피오더"><b>해피오더</b><small>공통 주문채널</small></button></div></section>`);return;}
 if(view==='direct'){const cards=fxDirectBrands().map(brand=>`<button type="button" class="brand-app-tile glass-action" data-direct-brand="${escapeHtml(brand.name)}">${brand.icon?`<img src="${escapeHtml(brand.icon)}" alt="">`:fxSvg('store','order-svg')}<b>${escapeHtml(brand.name)}</b></button>`).join('');openModal(`<section class="brand-app-hub"><h2 id="modalTitle">직접 브랜드앱</h2><p>현재 검증된 링크는 Android Google Play입니다. iPhone은 자동 이동하지 않습니다.</p><div class="brand-app-grid">${cards}</div></section>`);return;}
 if(view==='direct-stores'){const brand=fxDirectBrands().find(item=>item.name===value);const cards=(brand?.stores||[]).map(fxStoreById).filter(fxVisible).map(store=>`<button type="button" class="channel-store-card glass-action" data-channel-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area||'여수')} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`).join('');openModal(`<section class="brand-app-hub"><h2 id="modalTitle">${escapeHtml(value)}</h2><p>대동여수음식지도에 등록된 해당 브랜드 여수 지점입니다.</p><div class="channel-store-list">${cards}</div></section>`);return;}
 if(view==='happy'){const cats=[...new Set((fxHappyData.currentScreenBrands||[]).map(item=>item.category).filter(Boolean))];openModal(`<section class="happyorder-hub"><h2 id="modalTitle">해피오더</h2><p>카테고리를 선택한 뒤 해피오더에서 확인된 브랜드와 여수 지점을 찾아보세요.</p><div class="brand-app-grid">${cats.map(cat=>`<button type="button" class="brand-app-tile glass-action" data-happy-category="${escapeHtml(cat)}">${fxSvg('food','order-svg')}<b>${escapeHtml(cat)}</b></button>`).join('')}</div></section>`);return;}
 if(view==='happy-brands'){const brands=(fxHappyData.currentScreenBrands||[]).filter(item=>item.category===value&&item.currentScreenConfirmed);openModal(`<section class="happyorder-hub"><h2 id="modalTitle">해피오더 · ${escapeHtml(value)}</h2><div class="happyorder-brand-grid">${brands.map(brand=>`<button type="button" class="happyorder-brand-tile glass-action" data-happy-brand="${escapeHtml(brand.brandName)}">${brand.brandSelectionImage?`<img src="${escapeHtml(brand.brandSelectionImage)}" alt="">`:`<img src="assets/order-channels/happyorder.png" alt="">`}<b>${escapeHtml(brand.brandName)}</b></button>`).join('')}</div></section>`);return;}
 if(view==='happy-stores'){const ids=[...fxHappyByStore].filter(([,item])=>item.brandName===value).map(([id])=>id);const cards=ids.map(fxStoreById).filter(fxVisible).map(store=>`<button type="button" class="channel-store-card glass-action" data-channel-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area||'여수')} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`).join('');openModal(`<section class="happyorder-hub"><h2 id="modalTitle">해피오더 · ${escapeHtml(value)}</h2><p>주소 설정 후 주변 주문 가능 매장이 표시됩니다. 지역과 영업 상태에 따라 일부 매장은 표시되지 않을 수 있습니다.</p><div class="channel-store-list">${cards}</div></section>`);}
}
brandsModal=function(){fxOpenBrandHub('channels');};

function fxAppAction(item,type){const platform=fxPlatform(),isHappy=type==='happy';const label=isHappy?item.buttonLabel:'브랜드앱 설치·열기';if(platform==='ios')return `<div class="platform-note"><img src="${escapeHtml(item.icon)}" alt=""><span><b>${escapeHtml(label)}</b><small>현재 Android 앱만 확인됨</small></span><span>iPhone 안내</span></div>`;return `<a href="${escapeHtml(item.appLink)}" target="_blank" rel="noopener" data-final-app-channel="${type}"><img src="${escapeHtml(item.icon)}" alt=""><span><b>${escapeHtml(label)}</b><small>Android · 특정 지점 딥링크 아님</small></span><b>›</b></a>`;}
function fxEnhanceStoreDetail(store){const detail=$('#modalContent .store-detail');if(!detail)return;const brand=fxBrandByStore.get(String(store.id)),happy=fxHappyByStore.get(String(store.id));if(brand||happy){const target=detail.querySelector('.store-other-wrap')||detail.querySelector('.detail-personal-actions');const html=`<div class="brand-store-actions">${brand?fxAppAction(brand,'brand'):''}${happy?fxAppAction(happy,'happy'):''}</div>`;target?.insertAdjacentHTML('beforebegin',html);}const quick=detail.querySelectorAll('.detail-quick-link .quick-icon');quick.forEach(icon=>{const text=icon.parentElement.textContent;icon.innerHTML=text.includes('네이버')?fxSvg('map'):fxSvg('card');});const actions=detail.querySelector('.detail-personal-actions');if(actions){actions.classList.add('final-personal-actions');actions.insertAdjacentHTML('beforeend',`<button type="button" class="detail-personal-btn glass-action" data-share-store="${escapeHtml(store.id)}">공유하기</button>`);}}
openStore=function(store){if(!fxVisible(store))return;fxOriginalOpenStore(store);fxEnhanceStoreDetail(store);};

function fxDiversifySearchPhotos(items){const remaining=[...items],result=[];if(remaining.length)result.push(remaining.shift());while(remaining.length){const previous=fxPhoto(result.at(-1).store),counts=new Map();remaining.forEach(item=>counts.set(fxPhoto(item.store),(counts.get(fxPhoto(item.store))||0)+1));let index=-1,best=-1;remaining.forEach((item,i)=>{const photo=fxPhoto(item.store),count=counts.get(photo)||0;if(photo!==previous&&count>best){index=i;best=count;}});if(index<0)index=0;result.push(remaining.splice(index,1)[0]);}return result;}
let fxSearchRenderToken=0;
function fxSearchCard({store}){return `<button type="button" class="app-browser-card glass-action" data-search-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span class="app-browser-info"><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area||'여수')} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`;}
function fxRenderSearchResults(query=''){
 const target=$('#fxSearchResults');if(!target)return;const q=String(query).trim(),token=++fxSearchRenderToken;
 target.removeAttribute('aria-label');target.removeAttribute('aria-busy');
 if(!q){target.innerHTML='';return;}
 target.innerHTML='';target.setAttribute('aria-busy','true');
 let readinessChecks=0;const render=()=>{
  if(token!==fxSearchRenderToken||!target.isConnected)return;
  if(!searchableStores.length&&readinessChecks++<100){setTimeout(render,50);return;}
  const ranked=searchableStores.map(store=>({store,score:relevance(store,q)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.store.name.localeCompare(b.store.name,'ko'));
  const list=fxDiversifySearchPhotos(ranked);target.removeAttribute('aria-busy');if(!list.length){target.innerHTML='<p class="empty">검색 결과가 없습니다.</p>';return;}
  target.setAttribute('aria-label',`${list.length}개 검색 결과`);let index=0;
  const append=()=>{if(token!==fxSearchRenderToken||!target.isConnected)return;const next=list.slice(index,index+36);target.insertAdjacentHTML('beforeend',next.map(fxSearchCard).join(''));index+=next.length;if(index===next.length){const card=target.closest('.modal-card');if(card)card.scrollTop=0;}if(index<list.length)requestAnimationFrame(append);};append();
 };setTimeout(render,0);
}
function fxSearchModal(query=''){
 const q=String(query).trim(),current=$('#modal .search-popup');
 if(current&&!$('#modal').hidden){const input=$('#fxSearchInput');if(input)input.value=q;fxRenderSearchResults(q);setTimeout(()=>input?.focus(),0);return;}
 openModal(`<section class="app-browser search-popup"><h2 id="modalTitle">메뉴·가게명·동네 검색</h2><div class="searchbox"><input id="fxSearchInput" value="${escapeHtml(q)}" placeholder="메뉴, 가게명, 동네 검색" autocomplete="off"><button id="fxSearchRun" class="primary-btn" type="button">검색</button></div><div id="fxSearchResults" class="app-browser-list" aria-live="polite"></div></section>`);
 const input=$('#fxSearchInput'),run=$('#fxSearchRun');run?.addEventListener('click',()=>fxRenderSearchResults(input?.value||''));
 requestAnimationFrame(()=>{input?.focus();if(q)fxRenderSearchResults(q);});
}

function fxRipple(x,y){if(fxReduced())return;for(let i=0;i<2;i++){const ring=document.createElement('i');ring.className=`ripple-ring ${i?'second':''}`;ring.style.left=`${x}px`;ring.style.top=`${y}px`;document.body.append(ring);setTimeout(()=>ring.remove(),480);}}
function fxFormation(){const lane=$('#navalLane');if(!lane)return;lane.querySelectorAll('.turtle-ship').forEach(node=>node.remove());[['',7],['escort',2],['escort two',13]].forEach(([cls,bottom])=>{const ship=document.createElement('i');ship.className=`turtle-ship ${cls}`;ship.style.left='18px';ship.style.bottom=`${bottom}px`;lane.append(ship);setTimeout(()=>ship.remove(),680);});}
function fxBridgeLight(){const layer=$('.bridge-light-layer');if(!layer)return;layer.classList.remove('active');void layer.offsetWidth;layer.classList.add('active');setTimeout(()=>layer.classList.remove('active'),620);}
function fxFireworks(withToast=false){if(fxReduced()||fxLowPower())return;const layer=$('#microFxLayer');if(!layer)return;for(const [left,top] of [['12%','38px'],['84%','53px'],['68%','26px']]){const fire=document.createElement('i');fire.className='firework';fire.style.left=left;fire.style.top=top;layer.append(fire);setTimeout(()=>fire.remove(),700);}if(withToast){const toast=document.createElement('div');toast.className='success-toast';toast.textContent='여수에 힘이 되는 주문길을 선택했어요';layer.append(toast);setTimeout(()=>toast.remove(),1200);}}
function fxBattle({phone=false}={}){fxFormation();fxBridgeLight();if(phone||fxReduced()||fxLowPower()||sessionStorage.getItem(FX_BATTLE_SESSION))return;sessionStorage.setItem(FX_BATTLE_SESSION,'1');const lane=$('#navalLane');if(!lane)return;for(const cls of ['enemy-ship','battle-smoke','cannon-flash','cannon-ball']){const node=document.createElement('i');node.className=cls;lane.append(node);setTimeout(()=>node.remove(),1250);}fxFireworks(true);}
function fxGull(target,favorite=false){if(fxReduced()||fxLowPower())return;const r=target.getBoundingClientRect(),g=document.createElement('i');g.className=`gull-fx ${favorite?'favorite':''}`;g.style.left=`${r.left+r.width/2}px`;g.style.top=`${r.top}px`;document.body.append(g);setTimeout(()=>g.remove(),520);}
function fxShare(store,target){fxGull(target,false);const url=location.href,title=`${store.name} · 대동여수음식지도`;if(navigator.share)navigator.share({title,url}).catch(()=>{});else navigator.clipboard?.writeText(url);}

function fxRainCount(level){return level==='light'?15:level==='moderate'?27:40;}
function fxApplyRain(level){fxRainState=['light','moderate','strong'].includes(level)?level:'clear';const shell=$('.yeosu-night-shell'),layer=$('.weather-layer');if(!shell||!layer)return;shell.dataset.weather=fxRainState;layer.className='weather-layer';layer.innerHTML='';if(fxRainState==='clear'){fxRenderRails();return;}layer.classList.add('rain');const count=Math.max(6,Math.round(fxRainCount(fxRainState)*(fxLowPower()?.5:1)));for(let i=0;i<count;i++){const d=document.createElement('i');d.className='rain-drop';d.style.left=`${(i*37)%101}%`;d.style.animationDelay=`-${(i*83)%760}ms`;d.style.setProperty('--rain-speed',fxRainState==='strong'?'430ms':fxRainState==='moderate'?'590ms':'780ms');d.style.setProperty('--rain-opacity',fxRainState==='strong'?'.72':fxRainState==='moderate'?'.6':'.43');layer.append(d);}fxRenderRails();}
async function fxInitWeather(){const params=new URLSearchParams(location.search);if(['localhost','127.0.0.1'].includes(location.hostname)&&params.has('fxRain')){fxApplyRain(params.get('fxRain'));return;}const config=window.DAEDONG_WEATHER_CONFIG;if(!config.enabled||!config.proxyUrl){fxApplyRain('clear');return;}try{const cached=readLocalJson(FX_WEATHER_CACHE,null),ttl=(config.cacheMinutes||18)*60000;if(cached&&Date.now()-cached.savedAt<ttl){fxApplyRain(cached.level);return;}const response=await fetch(config.proxyUrl,{headers:{accept:'application/json'},signal:AbortSignal.timeout(4500)});if(!response.ok)throw new Error('weather proxy');const data=await response.json();const age=Date.now()-new Date(data.observedAt||0).getTime();if(!Number.isFinite(age)||age>40*60000)throw new Error('stale observation');const mm=Number(data.currentPrecipitationMm??data.rn1??0);const level=mm<=0?'clear':mm<3?'light':mm<15?'moderate':'strong';writeLocalJson(FX_WEATHER_CACHE,{level,savedAt:Date.now(),observedAt:data.observedAt});fxApplyRain(level);}catch{fxApplyRain('clear');}}

function fxPressStart(event){const target=event.target.closest('.glass-action,.category,.brand-app-tile,.happyorder-brand-tile,.phone-order-card,.channel-store-card,.primary-btn');if(!target||target.disabled||fxTouchLocked)return;fxTouchLocked=true;target.classList.add('pressing');fxRipple(event.clientX,event.clientY);setTimeout(()=>{target.classList.remove('pressing');fxTouchLocked=false;},210);}
function fxOrderClick(button){const key=button.dataset.orderKey;$$('.order-item').forEach(item=>item.classList.remove('selected'));button.classList.add('selected');if(['direct','mukkebi','ddangyo','ondongne'].includes(key))fxFormation();if(key==='brand')fxOpenBrandHub('channels');else if(key==='phone')fxOpenPhoneDirectory();else openAppBrowser(key);}

function fxInstallEvents(){
 document.addEventListener('pointerdown',fxPressStart,true);
 document.addEventListener('click',event=>{
  const order=event.target.closest('[data-order-key]');if(order){event.preventDefault();event.stopImmediatePropagation();fxOrderClick(order);return;}
  if(event.target.closest('#searchSurface')&&!event.target.closest('#clearMainSearch')){event.preventDefault();event.stopImmediatePropagation();fxSearchModal($('#mainSearch').value);return;}
  if(event.target.closest('#searchBtn')){event.preventDefault();event.stopImmediatePropagation();fxSearchModal($('#mainSearch').value);return;}
  const rail=event.target.closest('[data-rail-store-id]');if(rail){const store=fxStoreById(rail.dataset.railStoreId);if(store)openStore(store);return;}
  const phoneCat=event.target.closest('[data-phone-category]');if(phoneCat){fxOpenPhoneDirectory(phoneCat.dataset.phoneCategory);return;}
  const phoneStore=event.target.closest('[data-phone-store-id]');if(phoneStore){fxOpenPhoneConfirm(phoneStore.dataset.phoneStoreId);return;}
  if(event.target.closest('[data-phone-cancel]')){hardClose();return;}
  const brandView=event.target.closest('[data-brand-view]');if(brandView){fxOpenBrandHub(brandView.dataset.brandView);return;}
  const directBrand=event.target.closest('[data-direct-brand]');if(directBrand){fxOpenBrandHub('direct-stores',directBrand.dataset.directBrand);return;}
  const happyCat=event.target.closest('[data-happy-category]');if(happyCat){fxOpenBrandHub('happy-brands',happyCat.dataset.happyCategory);return;}
  const happyBrand=event.target.closest('[data-happy-brand]');if(happyBrand){fxOpenBrandHub('happy-stores',happyBrand.dataset.happyBrand);return;}
  const channelStore=event.target.closest('[data-channel-store-id]');if(channelStore){const store=fxStoreById(channelStore.dataset.channelStoreId);if(store)openStore(store);return;}
  const searchStore=event.target.closest('[data-search-store-id]');if(searchStore){const store=fxStoreById(searchStore.dataset.searchStoreId);if(store)openStore(store);return;}
  const share=event.target.closest('[data-share-store]');if(share){const store=fxStoreById(share.dataset.shareStore);if(store)fxShare(store,share);return;}
  const favorite=event.target.closest('[data-favorite-store]');if(favorite)fxGull(favorite,true);
  const finalLocal=event.target.closest('.detail-route[data-route-key="direct"],.detail-route[data-route-key="mukkebi"],.detail-route[data-route-key="ddangyo"],.detail-route[data-route-key="ondongne"],.community-choice-link');if(finalLocal)fxBattle();
 },true);
 document.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.id==='fxSearchInput'){event.preventDefault();fxSearchModal(event.target.value);}});
 document.addEventListener('visibilitychange',()=>document.documentElement.classList.toggle('page-hidden',document.hidden));
}

async function fxInitialize(){
 const [brand,supplement,happy,phone,brandPhotos]=await Promise.all([fetchJson(FX_BRAND_URL,{stores:[],brands:[]}),fetchJson(FX_BRAND_SUPPLEMENT_URL,{storeMappings:[],directApps:[]}),fetchJson(FX_HAPPY_URL,{candidateStoreMappings:[],currentScreenBrands:[],categories:[]}),fetchJson(FX_PHONE_URL,{storeMappings:[]}),fetchJson(FX_BRAND_PHOTO_POOL_URL,{brands:{},assignments:{}})]);
 fxBrandData=brand;fxSupplement=supplement;fxHappyData=happy;fxPhoneData=phone;fxBrandPhotoPool=brandPhotos;fxBuildIndexes();
 APP_META.phone.icon='assets/ui/phone.svg';
 fxRenderRails();
 await fxInitWeather();
 if(!sessionStorage.getItem(FX_ENTRY_SESSION)){sessionStorage.setItem(FX_ENTRY_SESSION,'1');setTimeout(()=>fxFireworks(false),280);}
}

const fxRc2Style=document.createElement('link');
fxRc2Style.rel='stylesheet';
fxRc2Style.href='rc2-fixes.css?v=rc2';
document.head.append(fxRc2Style);
const fxRc3Style=document.createElement('link');
fxRc3Style.rel='stylesheet';
fxRc3Style.href='rc3-fixes.css?v=phone-audit-batch-04';
document.head.append(fxRc3Style);
const fxRc4Style=document.createElement('link');
fxRc4Style.rel='stylesheet';
fxRc4Style.href='rc4-fixes.css?v=rc4';
document.head.append(fxRc4Style);
const fxRc5Style=document.createElement('link');
fxRc5Style.rel='stylesheet';
fxRc5Style.href='rc5-fixes.css?v=category-card-single-detail-1';
document.head.append(fxRc5Style);
function fxAllCategoryTileFromEvent(event){
 const grid=document.getElementById('categoryGrid');
 if(!grid)return null;
 const path=typeof event.composedPath==='function'?event.composedPath():[];
 const fromPath=path.find(node=>node instanceof Element&&node.getAttribute?.('data-cat')==='전체');
 const tile=fromPath||event.target?.closest?.('[data-cat="전체"]');
 return tile&&grid.contains(tile)?tile:null;
}
document.addEventListener('click',event=>{
 if(!fxAllCategoryTileFromEvent(event))return;
 event.preventDefault();
 event.stopImmediatePropagation();
 if(typeof allCategoriesModal==='function')allCategoriesModal();
},true);

const fxRc2Script=document.createElement('script');
fxRc2Script.src='rc2-fixes.js?v=rc2';
fxRc2Script.async=false;
fxRc2Script.onload=()=>{
 const fxRc3Script=document.createElement('script');
 fxRc3Script.src='rc3-fixes.js?v=phone-audit-batch-04';
 fxRc3Script.async=false;
 fxRc3Script.onload=()=>{
  const fxRc4Script=document.createElement('script');
  fxRc4Script.src='rc4-fixes.js?v=rc4';
  fxRc4Script.async=false;
  fxRc4Script.onload=()=>{
   const fxRc5Script=document.createElement('script');
   fxRc5Script.src='rc5-fixes.js?v=category-card-single-detail-1';
   fxRc5Script.async=false;
   fxRc5Script.onload=()=>{
    const css=document.createElement('link');css.rel='stylesheet';css.href='rc6-fixes.css?v=bridge-gull-motion-2';document.head.append(css);
    const script=document.createElement('script');script.src='rc6-fixes.js?v=order-channel-location-1';
    script.onload=()=>{
     const addressScript=document.createElement('script');addressScript.src='rc7-address-map.js?v=order-channel-location-3';
     addressScript.onload=()=>{fxInstallEvents();setTimeout(async()=>{await fxInitialize();await rc6Initialize();window.rc7Initialize?.();},0);};
     addressScript.onerror=()=>console.error('RC7 주소·지도 검수 레이어를 불러오지 못했습니다.');
     document.head.append(addressScript);
    };
    script.onerror=()=>console.error('RC6 검수 수정 레이어를 불러오지 못했습니다.');document.head.append(script);
   };
   fxRc5Script.onerror=()=>console.error('RC5 검수 수정 레이어를 불러오지 못했습니다.');
   document.head.append(fxRc5Script);
  };
  fxRc4Script.onerror=()=>console.error('RC4 검수 수정 레이어를 불러오지 못했습니다.');
  document.head.append(fxRc4Script);
 };
 fxRc3Script.onerror=()=>console.error('RC3 검수 수정 레이어를 불러오지 못했습니다.');
 document.head.append(fxRc3Script);
};
fxRc2Script.onerror=()=>console.error('RC2 검수 수정 레이어를 불러오지 못했습니다.');
document.head.append(fxRc2Script);
