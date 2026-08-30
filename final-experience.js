'use strict';

/* Final local experience layer. Frozen store/order datasets remain read-only. */
const FX_REGION=window.DAEDONG_REGION||{code:'yeosu',shortName:'여수',mapName:'대동여수음식지도'};
const FX_REGION_NAME=FX_REGION.shortName||'여수';
const FX_MAP_NAME=FX_REGION.mapName||'대동여수음식지도';
const FX_YEOSU_ONLY_DATA_PATHS=new Set([
 'data/phone-order-runtime.json','data/brand-app-mapping.json','data/brand-app-missing-nine-supplement.json',
 'data/happyorder-channel-research.json','data/brand-photo-pools.json','data/naver-map-runtime.json',
 'data/store-coordinates.json','data/banner-targets.json','data/store-priority.json','data/hero-campaigns.json'
]);
const fxRegionFetchJsonBase=fetchJson;
if(FX_REGION.code==='goheung'){
 fetchJson=async(url,fallback)=>FX_YEOSU_ONLY_DATA_PATHS.has(String(url||'').split('?')[0])?fallback:fxRegionFetchJsonBase(url,fallback);
}
const FX_PHONE_URL='data/phone-order-runtime.json?v=channel-recovery-07-card-markers';
const FX_BRAND_URL='data/brand-app-mapping.json';
const FX_BRAND_SUPPLEMENT_URL='data/brand-app-missing-nine-supplement.json';
const FX_HAPPY_URL='data/happyorder-channel-research.json';
const FX_BRAND_PHOTO_POOL_URL='data/brand-photo-pools.json';
const FX_APPROVED_BRAND_PHOTO_ASSIGNMENTS={
 '066197a9443c3145':'assets/store-photos/485a846f6445df/02.webp','4059491d8dbb4159':'assets/photo-batch-3-refresh/card/bbq.webp','572e4a658f762cbe':'assets/notion-recovery-180/450856a6b5fd4846/01.png','e2645d79ef555a24':'assets/photo-batch-3-refresh/card/bbq.webp','c1df1c34732d2757':'assets/notion-recovery-180/450856a6b5fd4846/01.png','e32f28eff787161a':'assets/notion-recovery-180/450856a6b5fd4846/01.png','9cba7b46fed409a9':'assets/notion-recovery-180/450856a6b5fd4846/01.png','39f3c8acab504b00':'assets/store-photos/af8b15c5b69a94/01.webp','9ee73ce6168105ec':'assets/store-photos/e982b7aa80a2e4/02.webp'
};
const FX_BATTLE_SESSION='daedongNavalSuccessPlayedV1';
const FX_WEATHER_CACHE='daedongYeosuWeatherV1';
const FX_HOME_SHARE_URL=FX_REGION.code==='yeosu'?'https://daedongmap.com/':new URL(window.daedongRegionUrl?.(FX_REGION.code)||window.location.href,window.location.origin).href;
const FX_HOME_SHARE_TEXT=`${FX_REGION_NAME} 음식점과 이용 가능한 주문방법을 한눈에 확인해보세요.`;
const FX_STORE_SHARE_PARAM='store';
const FX_ORDER_METHOD_REENTRY='daedongOrderMethodReentryV1';
const FX_ORDER_METHOD_REENTRY_PARAM='__ddom';
const FX_APP_BROWSER_RETURN='daedongAppBrowserReturnV1';
const FX_HIDDEN_STORE_IDS=new Set([
 '6092aabddf5f7194', // 롯데리아 중앙점
 'e0c6949efb48f4b2' // 롯데리아 이마트점
]);
window.DAEDONG_WEATHER_CONFIG=window.DAEDONG_WEATHER_CONFIG||{enabled:false,proxyUrl:'',cacheMinutes:18};

let fxResolveLocationRankingReady;
window.daedongLocationRankingReady=new Promise(resolve=>{fxResolveLocationRankingReady=resolve;});
function fxFinishLocationRankingReady(value){fxResolveLocationRankingReady?.(value);fxResolveLocationRankingReady=null;}
window.setTimeout(()=>{
 if(!fxResolveLocationRankingReady)return;
 console.warn('위치 기반 정렬 준비 시간이 초과되어 기본 목록을 먼저 엽니다.');
 fxFinishLocationRankingReady(false);
},35000);

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

function fxVisible(store){return Boolean(store&&store.customerVisible!==false&&!FX_HIDDEN_STORE_IDS.has(String(store.id||store.store_id))&&normalize(store.name)!=='제목없음'&&normalize(store.name)!=='이름없는가게');}
function fxSvg(id,cls='ui-icon'){return `<svg class="${cls}" aria-hidden="true"><use href="assets/ui/ui-icons.svg#${id}"></use></svg>`;}
function fxPlatform(){const ua=navigator.userAgent||'';if(/iphone|ipad|ipod/i.test(ua))return'ios';if(/android/i.test(ua))return'android';return'other';}
function fxLowPower(){return Number(navigator.hardwareConcurrency||8)<=4||Number(navigator.deviceMemory||8)<=4;}
function fxReduced(){return matchMedia('(prefers-reduced-motion: reduce)').matches;}
function fxStoreById(id){return stores.find(store=>String(store.id)===String(id));}
function fxPhoto(store){return fxBrandPhotoPool.assignments?.[String(store?.id)]||FX_APPROVED_BRAND_PHOTO_ASSIGNMENTS[String(store?.id)]||photoResolver?.resolve(store)?.src||'';}
function fxCardPhoto(store){const src=fxPhoto(store);const options={deferred:false};return src?`<img ${photoSourceAttributes(src,options)} alt="${escapeHtml(store.name)}" loading="lazy" decoding="async">`:`<span class="app-browser-photo-placeholder">${fxSvg('food','category-local-icon')}</span>`;}
function fxDistance(store){return state.coords&&store.lat!==null&&store.lng!==null?haversine(state.coords,{lat:store.lat,lng:store.lng}):null;}

normalizedStore=function(raw,index){
 const store=fxOriginalNormalizedStore(raw,index);
 // The Yeosu customer catalog must never surface a card that only has menu
 // photos but no verified way to act on it.  The collector catalog's
 // channelKeys are the release gate: empty means no order app, telephone, or
 // trusted place route has survived synchronization yet.  Keep the server
 // record and menu assets intact for later verification, but hide it from all
 // customer-facing lists in the meantime.
 const hasCustomerRoute=FX_REGION.code!=='yeosu'||store.channelKeys.some(Boolean);
 store.customerVisible=hasCustomerRoute&&!FX_HIDDEN_STORE_IDS.has(String(store.id||store.store_id))&&normalize(raw.name)!=='제목없음';
 store.rawIndex=index;
 return store;
};
filteredStores=function(){return fxOriginalFilteredStores().filter(fxVisible);};
appRegisteredStores=function(key){return fxOriginalAppRegisteredStores(key).filter(fxVisible);};

function fxCategoryMarkup(name){return categoryButtonMarkup(name);}
renderCategories=renderCategoryGrid;

function fxRegisteredAppCardMarkup(store,key,isExternal=false){
 const meta=APP_META[key]||{label:key};
 const routeLabel=`${meta.label} 바로가기`;
 return `<article class="app-browser-card app-browser-direct-card"><button type="button" class="app-browser-direct-link glass-action" data-app-store-order="${escapeHtml(store.id)}" data-app-key="${escapeHtml(key)}">${appBrowserPhoto(store)}<span class="app-browser-info"><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area||FX_REGION_NAME)} · ${escapeHtml(store.cat)}</small><span><b class="app-browser-direct-label">${escapeHtml(routeLabel)}</b></span></span><b class="app-browser-direct-arrow" aria-hidden="true">›</b></button><button type="button" class="app-browser-info-button" data-app-store-info="${escapeHtml(store.id)}"><span><b>가게정보 더보기</b><small>음식보기 · 영업시간 · 쿠폰 등</small></span><b aria-hidden="true">›</b></button></article>`;
}
function fxRememberAppBrowserReturn(key,anchorStoreId=''){
 window.daedongMarkExternalAppDeparture?.();
 const modal=$('#modal'),card=modal?.querySelector('.modal-card'),content=$('#modalContent');
 const anchorCandidates=modal?[...modal.querySelectorAll('[data-app-store-order]')]:[];
 const anchorElement=anchorStoreId?anchorCandidates.find(element=>String(element.dataset.appStoreOrder||'')===String(anchorStoreId)):null;
 const anchor=window.daedongCaptureReturnAnchor?.(card,anchorElement)||null;
 const html=content?.innerHTML||'';
 const payload={key,category:modal?.dataset.appBrowserCategory||'추천',anchorStoreId:String(anchorStoreId||''),anchor,modalScroll:card?.scrollTop||0,pageScroll:Number(document.body.dataset.lockScrollY||window.scrollY||0),searchState:window.daedongStoreServiceInfo?.captureSearchState?.()||null,modalSnapshot:html&&html.length<=500000?{html}:null};
 if(window.daedongWriteExternalReturnState)window.daedongWriteExternalReturnState(FX_APP_BROWSER_RETURN,payload);
 else sessionStorage.setItem(FX_APP_BROWSER_RETURN,JSON.stringify({...payload,savedAt:Date.now()}));
}
function fxRestoreAppBrowserReturn(){
 let saved=window.daedongReadExternalReturnState?.(FX_APP_BROWSER_RETURN)||null;
 if(!saved){try{saved=JSON.parse(sessionStorage.getItem(FX_APP_BROWSER_RETURN)||'null');}catch{}}
 if(!saved||Date.now()-Number(saved.savedAt||0)>30*60*1000){window.daedongClearExternalReturnState?.(FX_APP_BROWSER_RETURN,saved);try{sessionStorage.removeItem(FX_APP_BROWSER_RETURN);}catch{}return false;}
 const modal=$('#modal');
 if(!['direct','mukkebi','ddangyo','ondongne','yogiyo','coupang','baemin'].includes(saved.key)){window.daedongClearExternalReturnState?.(FX_APP_BROWSER_RETURN,saved);return false;}
 const visibleSameApp=!modal?.hidden&&modal.dataset.appBrowserKey===saved.key;
 const restoredCards=visibleSameApp?modal.querySelectorAll('[data-app-store-order]').length:0;
 if(visibleSameApp&&restoredCards>0){window.daedongStabilizeReturnPosition?.(saved);window.daedongArmRestoredReturnLease?.(FX_APP_BROWSER_RETURN,saved);return true;}
 // Kakao may recreate this page after the order app was opened. In that cold
 // return, pageshow/focus can run before the catalog has finished loading. Do
 // not replace a missing snapshot with a false "no stores" result or consume
 // the one-shot return state; rc2Initialize retries after daedongCatalogReady.
 if(window.__daedongCatalogProgress?.complete!==true)return false;
 if(!modal?.hidden&&!visibleSameApp)hardClose({fromPop:true});
 window.scrollTo(0,Number(saved.pageScroll||0));
 openAppBrowser(saved.key,saved.category||'추천');
 if(modal?.hidden||modal.dataset.appBrowserKey!==saved.key)return false;
 window.daedongStabilizeReturnPosition?.(saved);
 window.daedongArmRestoredReturnLease?.(FX_APP_BROWSER_RETURN,saved);return true;
}
async function fxOpenRegisteredAppOrder(button){
 const store=fxStoreById(button.dataset.appStoreOrder),key=button.dataset.appKey;if(!store||!key)return;
 if(button.dataset.routeBusy==='true')return;
 button.dataset.routeBusy='true';button.setAttribute('aria-busy','true');
 try{
  if(store.__secureDetailReady!==true)await window.daedongSecureStoreDetail?.enrich?.(store,typeof normalizedStore==='function'?normalizedStore:undefined);
  const route=routeFor(store,key),href=route?safeHref(route.url):'#';
  if(!route||href==='#')throw new Error('order route unavailable');
  if(EXTERNAL_APP_KEYS.includes(key))rememberSelectedExternal(store,key);
  sendAnalyticsEvent('order_click',{storeId:store.id,storeName:store.name,channel:key,surface:'app_store_list'});
  fxRememberAppBrowserReturn(key,store.id);
  delete button.dataset.routeBusy;button.removeAttribute('aria-busy');
  if(typeof window.daedongLaunchMobileRoute==='function')await window.daedongLaunchMobileRoute(key,href);else if(key==='ddangyo')await openDdangyoRoute(href);else location.assign(href);
 }catch{window.alert(`${APP_META[key]?.label||'주문앱'} 주문주소를 불러오지 못했습니다. 잠시 후 다시 눌러 주세요.`);}finally{delete button.dataset.routeBusy;button.removeAttribute('aria-busy');}
}

function fxRestoreRegisteredAppButtons(){
 $$('[data-app-store-order]').forEach(button=>{button.disabled=false;delete button.dataset.routeBusy;button.removeAttribute('aria-busy');});
}

function fxThemeMatch(store,spec){const text=storeText(store);return spec.pattern?spec.pattern.test(text):true;}
function fxHasCustomerAction(store){
 const resolved=globalThis.resolveStoreChannels?.(store);
 if(resolved){
  const primary=Object.values(resolved.primaryOrder||{});
  const external=Object.values(resolved.externalOrder||{});
  return Boolean(resolved.utilities?.naverMap||resolved.happyOrder||[...primary,...external].some(Boolean));
 }
 const orderKeys=['direct','mukkebi','ddangyo','ondongne','phone','yogiyo','coupang','baemin'];
 return orderKeys.some(key=>storeHasChannel(store,key))||fxBrandByStore.has(String(store.id))||fxHappyByStore.has(String(store.id));
}
function fxRankStores(spec){return stores.filter(fxVisible).filter(fxHasCustomerAction).filter(store=>fxThemeMatch(store,spec)).map(store=>{const distance=fxDistance(store);const low=['direct','mukkebi','ddangyo','ondongne'].some(key=>storeHasChannel(store,key));let score=spec.pattern?80:20;if(distance!==null)score+=Math.max(0,32-distance*4);if(low)score+=12;if(store.managed)score+=8;else if(store.sharedManaged)score+=5;if(spec.kind==='near'&&distance!==null)score+=Math.max(0,120-distance*25);if(spec.kind==='local'&&low)score+=80;if(spec.kind==='new')score+=Number(store.rawIndex)||0;return{store,distance,score};}).sort((a,b)=>compareStoreBusinessStatus(a,b)||b.score-a.score||(a.distance??999)-(b.distance??999)||a.store.name.localeCompare(b.store.name,'ko')).map(item=>({...item.store,distance:item.distance}));}
const FX_RAIL_SPECS=[
 {id:'near',kind:'near',title:'지금 가까운 가게',desc:'선택한 위치를 먼저 반영해요'},
 {id:'local',kind:'local',title:`${FX_REGION_NAME}에 힘이 되는 주문`,desc:'지역 주문경로가 확인된 가게'},
 {id:'solo',title:'나 혼자 술 한잔',desc:'혼자 즐기기 좋은 안주와 소량 메뉴',pattern:/닭발|곱창|회|족발|보쌈|치킨|닭강정|국물|분식|야식|주점/},
 {id:'group',title:'오늘은 회식이다',desc:'여럿이 나누기 좋은 메뉴',pattern:/회|해산물|족발|보쌈|치킨|고기|삼겹|아귀|해물찜|찜닭|탕|전골/},
 {id:'warm',title:'왕후의 밥, 걸인의 찬',desc:'소박해도 마음까지 따뜻해지는 한 끼',pattern:/백반|집밥|국밥|찌개|죽|김치찜|도시락|반찬|한식/},
 {id:'appetite',title:'입맛 없을 때',desc:'매콤하고 새콤한 음식',pattern:/냉면|밀면|쫄면|비빔|마라|떡볶이|김치/},
 {id:'rain',title:'비 오는 날',desc:`현재 ${FX_REGION_NAME}에 비가 올 때 생각나는 음식`,pattern:/전|국밥|찌개|탕|수제비|칼국수|짬뽕|부침/},
 {id:'noodle',title:'면 음식이 당길 때',desc:'국수·면·짬뽕 한 그릇',pattern:/면|국수|짬뽕|짜장|파스타|우동|라멘/},
 {id:'sweet',title:'시원하고 달달한 것이 당길 때',desc:'카페·빙수·디저트',pattern:/카페|커피|디저트|빙수|아이스크림|베이커리|떡/},
 {id:'mood',title:'기분전환이 필요할 때',desc:'평소와 다른 메뉴',pattern:/피자|버거|치킨|마라|아시안|돈까스|일식/},
 {id:'new',kind:'new',title:'새로 들어온 가게',desc:'최근 지도에 등록된 가게'}
];
function fxSelectedRails(){const hour=new Date().getHours();const ids=fxRainState!=='clear'?['rain','near','local','warm','noodle','new']:hour>=17?['near','local','group','solo','mood','new']:['near','local','warm','appetite','sweet','new'];return ids.slice(0,6).map(id=>FX_RAIL_SPECS.find(spec=>spec.id===id));}
let fxRailRenderVersion=0;
function fxCommitRailsWithoutMovingActiveList(root,staging){
 root.replaceChildren(...staging.childNodes);
 root.removeAttribute('aria-busy');
 observeDeferredPhotos(root);
}
function fxRailMarkup(spec,used){
 const list=fxRankStores(spec).filter(store=>!used.has(String(store.id))).slice(0,8);
 list.forEach(store=>used.add(String(store.id)));
 const cards=list.map(store=>{const distance=spec.kind==='near'&&Number.isFinite(store.distance)?`약 ${store.distance<1?`${Math.round(store.distance*1000)}m`:`${store.distance.toFixed(1)}km`}`:'';const locationLabel=distance||store.proximityLabel||'';return `<button type="button" class="rail-card glass-action" data-rail-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span class="rail-card-copy"><h3>${escapeHtml(store.name)}</h3><p>${locationLabel?`${escapeHtml(locationLabel)} · `:''}${escapeHtml(store.area||FX_REGION_NAME)} · ${escapeHtml(store.cat)}</p></span></button>`}).join('');
 const empty=spec.kind==='near'?'주소에서 동네를 확인하면 가까운 권역의 가게를 보여드립니다.':'추천 가게를 확인 중입니다.';
 return `<section class="recommend-rail" data-rail="${spec.id}"><header class="recommend-rail-head"><div><h2>${escapeHtml(spec.title)}</h2><p>${escapeHtml(spec.desc)}</p></div></header><div class="recommend-track">${cards||`<p class="empty">${empty}</p>`}</div></section>`;
}
function fxRenderRails(){
 const root=$('#recommendRails');
 const version=++fxRailRenderVersion;
 if(!root)return;
 if(state.category!=='전체'||state.query||state.brandId){root.hidden=true;root.innerHTML='';root.removeAttribute('aria-busy');return;}
 root.hidden=false;
 root.setAttribute('aria-busy','true');
 const staging=document.createElement('div');
 const specs=fxSelectedRails(),used=new Set();
 let index=0;
 const renderNext=()=>{
  if(version!==fxRailRenderVersion||state.category!=='전체'||state.query||state.brandId)return;
  const spec=specs[index++];
  if(!spec){fxCommitRailsWithoutMovingActiveList(root,staging);return;}
  staging.insertAdjacentHTML('beforeend',fxRailMarkup(spec,used));
  window.setTimeout(renderNext,0);
 };
 window.setTimeout(renderNext,0);
}
renderStores=function(options={}){fxOriginalRenderStores(options);fxRenderRails();observeDeferredPhotos($('#recommendRails'));};

function fxAppBrowserMarkup(key,selectedCategory='추천'){
 const meta=APP_META[key],all=appRegisteredStores(key),cats=categoriesFromStores(all);const filtered=selectedCategory==='추천'?all:all.filter(store=>storeMatchesCategory(store,selectedCategory)),list=applyCategoryPriorityOverrides(filtered,selectedCategory);
 const isExternal=EXTERNAL_APP_KEYS.includes(key);
 const chips=`<nav class="app-browser-category-chips"><button type="button" data-app-category="추천" class="${selectedCategory==='추천'?'active':''}">추천</button>${cats.map(cat=>`<button type="button" data-app-category="${escapeHtml(cat)}" class="${selectedCategory===cat?'active':''}">${escapeHtml(cat)}</button>`).join('')}</nav>`;
 const cards=list.map(store=>fxRegisteredAppCardMarkup(store,key,isExternal)).join('');
 return `<section class="app-browser"><header class="app-browser-head${isExternal?' external-app-browser-head':''}">${isExternal?'':appIcon(key,'app-browser-head-icon')}<div><h2 id="modalTitle">${escapeHtml(meta.label)} 등록 가게</h2><p>실제 주문주소가 등록된 가게만 보여드립니다.</p></div></header>${chips}<div class="app-browser-list">${cards||'<div class="empty">해당 조건의 가게가 없습니다.</div>'}</div>${isExternal?externalAppNoticeMarkup():''}</section>`;
}
openAppBrowser=function(key,selectedCategory='추천'){if(!['direct','mukkebi','ddangyo','ondongne','yogiyo','coupang','baemin'].includes(key))return;openModal(fxAppBrowserMarkup(key,selectedCategory));$('#modal').dataset.appBrowserKey=key;$('#modal').dataset.appBrowserCategory=selectedCategory;};
globalExternalGuide=function(key){openAppBrowser(key);};

function fxPhoneStores(category='추천'){let list=fxPhoneData.storeMappings.map(item=>({...item,store:fxStoreById(item.store_id)})).filter(item=>fxVisible(item.store));if(category!=='추천')list=list.filter(item=>storeMatchesCategory(item.store,category));return applyCategoryPriorityOverrides(list.sort((a,b)=>(fxDistance(a.store)??999)-(fxDistance(b.store)??999)||a.store.name.localeCompare(b.store.name,'ko')),category);}
function fxOpenPhoneDirectory(category='추천'){
 const all=fxPhoneStores(),cats=categoriesFromStores(all.map(item=>item.store));const list=fxPhoneStores(category);
 const chips=`<nav class="app-browser-category-chips"><button type="button" data-phone-category="추천" class="${category==='추천'?'active':''}">추천</button>${cats.map(cat=>`<button type="button" data-phone-category="${escapeHtml(cat)}" class="${category===cat?'active':''}">${escapeHtml(cat)}</button>`).join('')}</nav>`;
 const cards=list.map(({store})=>`<button type="button" class="phone-order-card glass-action" data-phone-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area||FX_REGION_NAME)} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`).join('');
 openModal(`<section class="phone-order-sheet"><h2 id="modalTitle">전화주문 가능한 가게</h2><p>가게를 선택해도 전화가 자동으로 걸리지 않습니다. 전화번호를 확인한 뒤 전화 걸기 버튼을 눌러주세요.</p>${chips}<div class="phone-order-list">${cards||'<p class="empty">확인 가능한 전화페이지가 없습니다.</p>'}</div></section>`);
}
function fxOpenPhoneConfirm(id){const item=fxPhoneByStore.get(String(id)),store=fxStoreById(id),phone=String(store?.phone||'').replace(/[^0-9]/g,'');const valid=/^02\d{7,8}$/.test(phone)||/^0(?:3[1-3]|4[1-4]|5[1-5]|6[1-4])\d{7,8}$/.test(phone)||/^01[016789]\d{7,8}$/.test(phone)||/^070\d{8}$/.test(phone);if(!item?.clickableTel||!store||!valid)return;openModal(`<section class="phone-order-confirm" data-store-id="${escapeHtml(store.id)}"><h2 id="modalTitle">${escapeHtml(store.name)} 전화주문</h2><div class="phone-confirm-photo">${fxCardPhoto(store)}</div><p>${escapeHtml(store.area||FX_REGION_NAME)} · ${escapeHtml(store.cat)}</p><p>가게를 선택해도 전화가 자동으로 걸리지 않습니다. 전화번호를 확인한 뒤 전화 걸기 버튼을 눌러주세요.</p><div class="phone-confirm-actions"><a class="phone-call-link" href="tel:${escapeHtml(phone)}">전화 걸기</a><button class="phone-cancel" type="button" data-phone-cancel>취소</button></div></section>`);$('#modal').dataset.activeStoreId=store.id;}

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
 if(view==='direct'){const cards=fxDirectBrands().map(brand=>`<button type="button" class="brand-app-tile glass-action" data-direct-brand="${escapeHtml(brand.name)}">${brand.icon?`<img src="${escapeHtml(mobilePhotoPath(brand.icon))}" alt="">`:fxSvg('store','order-svg')}<b>${escapeHtml(brand.name)}</b></button>`).join('');openModal(`<section class="brand-app-hub"><h2 id="modalTitle">직접 브랜드앱</h2><p>현재 검증된 링크는 Android Google Play입니다. iPhone은 자동 이동하지 않습니다.</p><div class="brand-app-grid">${cards}</div></section>`);return;}
 if(view==='direct-stores'){const brand=fxDirectBrands().find(item=>item.name===value);const cards=(brand?.stores||[]).map(fxStoreById).filter(fxVisible).map(store=>`<button type="button" class="channel-store-card glass-action" data-channel-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area||FX_REGION_NAME)} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`).join('');openModal(`<section class="brand-app-hub"><h2 id="modalTitle">${escapeHtml(value)}</h2><p>${escapeHtml(FX_MAP_NAME)}에 등록된 해당 브랜드 ${escapeHtml(FX_REGION_NAME)} 지점입니다.</p><div class="channel-store-list">${cards}</div></section>`);return;}
 if(view==='happy'){const cats=[...new Set((fxHappyData.currentScreenBrands||[]).map(item=>item.category).filter(Boolean))];openModal(`<section class="happyorder-hub"><h2 id="modalTitle">해피오더</h2><p>카테고리를 선택한 뒤 해피오더에서 확인된 브랜드와 여수 지점을 찾아보세요.</p><div class="brand-app-grid">${cats.map(cat=>`<button type="button" class="brand-app-tile glass-action" data-happy-category="${escapeHtml(cat)}">${fxSvg('food','order-svg')}<b>${escapeHtml(cat)}</b></button>`).join('')}</div></section>`);return;}
 if(view==='happy-brands'){const brands=(fxHappyData.currentScreenBrands||[]).filter(item=>item.category===value&&item.currentScreenConfirmed);openModal(`<section class="happyorder-hub"><h2 id="modalTitle">해피오더 · ${escapeHtml(value)}</h2><div class="happyorder-brand-grid">${brands.map(brand=>`<button type="button" class="happyorder-brand-tile glass-action" data-happy-brand="${escapeHtml(brand.brandName)}">${brand.brandSelectionImage?`<img src="${escapeHtml(mobilePhotoPath(brand.brandSelectionImage))}" alt="">`:`<img src="assets/order-channels/happyorder.png" alt="">`}<b>${escapeHtml(brand.brandName)}</b></button>`).join('')}</div></section>`);return;}
 if(view==='happy-stores'){const ids=[...fxHappyByStore].filter(([,item])=>item.brandName===value).map(([id])=>id);const cards=ids.map(fxStoreById).filter(fxVisible).map(store=>`<button type="button" class="channel-store-card glass-action" data-channel-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area||FX_REGION_NAME)} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`).join('');openModal(`<section class="happyorder-hub"><h2 id="modalTitle">해피오더 · ${escapeHtml(value)}</h2><p>주소 설정 후 주변 주문 가능 매장이 표시됩니다. 지역과 영업 상태에 따라 일부 매장은 표시되지 않을 수 있습니다.</p><div class="channel-store-list">${cards}</div></section>`);}
}
brandsModal=function(){fxOpenBrandHub('channels');};

function fxAppAction(item,type){const platform=fxPlatform(),isHappy=type==='happy';const label=isHappy?item.buttonLabel:'브랜드앱 설치·열기';const icon=escapeHtml(mobilePhotoPath(item.icon));if(platform==='ios')return `<div class="platform-note"><img src="${icon}" alt=""><span><b>${escapeHtml(label)}</b><small>현재 Android 앱만 확인됨</small></span><span>iPhone 안내</span></div>`;return `<a href="${escapeHtml(item.appLink)}" target="_blank" rel="noopener" data-final-app-channel="${type}"><img src="${icon}" alt=""><span><b>${escapeHtml(label)}</b><small>Android · 특정 지점 딥링크 아님</small></span><b>›</b></a>`;}
function fxEnhanceStoreDetail(store){const detail=$('#modalContent .store-detail');if(!detail)return;const brand=fxBrandByStore.get(String(store.id)),happy=fxHappyByStore.get(String(store.id));if(brand||happy){const target=detail.querySelector('.store-other-wrap')||detail.querySelector('.detail-personal-actions');const html=`<div class="brand-store-actions">${brand?fxAppAction(brand,'brand'):''}${happy?fxAppAction(happy,'happy'):''}</div>`;target?.insertAdjacentHTML('beforebegin',html);}const quick=detail.querySelectorAll('.detail-quick-link .quick-icon');quick.forEach(icon=>{const text=icon.parentElement.textContent;icon.innerHTML=text.includes('네이버')?fxSvg('map'):fxSvg('card');});const actions=detail.querySelector('.detail-personal-actions');if(actions){actions.classList.add('final-personal-actions');actions.insertAdjacentHTML('beforeend',`<button type="button" class="detail-personal-btn glass-action" data-share-store="${escapeHtml(store.id)}">공유하기</button>`);}}
openStore=async function(store){if(!fxVisible(store))return false;const opened=await fxOriginalOpenStore(store);if(opened===false)return false;fxEnhanceStoreDetail(store);return opened;};

function fxDiversifySearchPhotos(items){const remaining=[...items],result=[];if(remaining.length)result.push(remaining.shift());while(remaining.length){const previous=fxPhoto(result.at(-1).store),counts=new Map();remaining.forEach(item=>counts.set(fxPhoto(item.store),(counts.get(fxPhoto(item.store))||0)+1));let index=-1,best=-1;remaining.forEach((item,i)=>{const photo=fxPhoto(item.store),count=counts.get(photo)||0;if(photo!==previous&&count>best){index=i;best=count;}});if(index<0)index=0;result.push(remaining.splice(index,1)[0]);}return result;}
function fxRankSearchMatches(matches){
 const groups=new Map();
 matches.forEach(item=>{if(!groups.has(item.score))groups.set(item.score,[]);groups.get(item.score).push(item);});
 return [...groups.entries()].sort((a,b)=>b[0]-a[0]).flatMap(([,group])=>{
  const byId=new Map(group.map(item=>[String(item.store.id),item]));
  const stores=group.map(item=>item.store).sort((a,b)=>a.name.localeCompare(b.name,'ko'));
  const ranked=typeof rc6RankCandidatesByCustomerLocation==='function'?rc6RankCandidatesByCustomerLocation(stores):stores;
  return ranked.map(store=>byId.get(String(store.id))).filter(Boolean);
 });
}
let fxSearchRenderToken=0;
function fxSearchCard({store}){return `<button type="button" class="app-browser-card glass-action" data-search-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span class="app-browser-info"><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area||FX_REGION_NAME)} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`;}
function fxRenderSearchResults(query=''){
 const target=$('#fxSearchResults');if(!target)return;const q=String(query).trim(),token=++fxSearchRenderToken;
 target.removeAttribute('aria-label');target.removeAttribute('aria-busy');
 if(!q){target.innerHTML='';return;}
 target.innerHTML='';target.setAttribute('aria-busy','true');
 let readinessChecks=0;const render=()=>{
  if(token!==fxSearchRenderToken||!target.isConnected)return;
  if(!searchableStores.length&&readinessChecks++<100){setTimeout(render,50);return;}
  const matches=searchableStores.map(store=>({store,score:relevance(store,q)})).filter(item=>item.score>0);
  const list=fxRankSearchMatches(matches);target.removeAttribute('aria-busy');if(!list.length){target.innerHTML='<p class="empty">검색 결과가 없습니다.</p>';return;}
  target.setAttribute('aria-label',`${list.length}개 검색 결과`);let index=0;
  const append=()=>{if(token!==fxSearchRenderToken||!target.isConnected)return;const next=list.slice(index,index+36);target.insertAdjacentHTML('beforeend',next.map(fxSearchCard).join(''));index+=next.length;if(index===next.length){const card=target.closest('.modal-card');if(card)card.scrollTop=0;}if(index<list.length)requestAnimationFrame(append);};append();
 };setTimeout(render,0);
}
function fxSearchModal(query=''){
 const q=String(query).trim(),current=$('#modal .search-popup');
 if(window.daedongStoreServiceInfo?.showOverview){window.daedongStoreServiceInfo.showOverview(document.activeElement,{query:q,focusQuery:true});return;}
 if(current&&!$('#modal').hidden){const input=$('#fxSearchInput');if(input)input.value=q;fxRenderSearchResults(q);setTimeout(()=>input?.focus(),0);return;}
 openModal(`<section class="app-browser search-popup"><h2 id="modalTitle">메뉴·가게명·동네 검색</h2><div class="searchbox"><input id="fxSearchInput" value="${escapeHtml(q)}" placeholder="메뉴, 가게명, 동네 검색" autocomplete="off"><button id="fxSearchRun" class="primary-btn" type="button">검색</button></div><div id="fxSearchResults" class="app-browser-list" aria-live="polite"></div></section>`);
 const input=$('#fxSearchInput'),run=$('#fxSearchRun');run?.addEventListener('click',()=>fxRenderSearchResults(input?.value||''));
 requestAnimationFrame(()=>{input?.focus();if(q)fxRenderSearchResults(q);});
}

function fxRipple(x,y){if(fxReduced())return;for(let i=0;i<2;i++){const ring=document.createElement('i');ring.className=`ripple-ring ${i?'second':''}`;ring.style.left=`${x}px`;ring.style.top=`${y}px`;document.body.append(ring);setTimeout(()=>ring.remove(),480);}}
function fxFormation(){if(FX_REGION.code==='goheung')return;const lane=$('#navalLane');if(!lane)return;lane.querySelectorAll('.turtle-ship').forEach(node=>node.remove());[['',7],['escort',2],['escort two',13]].forEach(([cls,bottom])=>{const ship=document.createElement('i');ship.className=`turtle-ship ${cls}`;ship.style.left='18px';ship.style.bottom=`${bottom}px`;lane.append(ship);setTimeout(()=>ship.remove(),680);});}
function fxBridgeLight(){const layer=$('.bridge-light-layer');if(!layer)return;layer.classList.remove('active');void layer.offsetWidth;layer.classList.add('active');setTimeout(()=>layer.classList.remove('active'),620);}
function fxSuccessToast(){const layer=$('#microFxLayer');if(!layer)return;const toast=document.createElement('div');toast.className='success-toast';toast.textContent=`${FX_REGION_NAME}에 힘이 되는 주문길을 선택했어요`;layer.append(toast);setTimeout(()=>toast.remove(),1200);}
function fxBattle({phone=false}={}){if(FX_REGION.code==='goheung')return;fxFormation();fxBridgeLight();if(phone||fxReduced()||fxLowPower()||sessionStorage.getItem(FX_BATTLE_SESSION))return;sessionStorage.setItem(FX_BATTLE_SESSION,'1');const lane=$('#navalLane');if(!lane)return;for(const cls of ['enemy-ship','battle-smoke','cannon-flash','cannon-ball']){const node=document.createElement('i');node.className=cls;lane.append(node);setTimeout(()=>node.remove(),1250);}fxSuccessToast();}
function fxGull(target,favorite=false){if(fxReduced()||fxLowPower())return;const r=target.getBoundingClientRect(),g=document.createElement('i');g.className=`gull-fx ${favorite?'favorite':''}`;g.style.left=`${r.left+r.width/2}px`;g.style.top=`${r.top}px`;document.body.append(g);setTimeout(()=>g.remove(),520);}
function fxStoreShareUrl(store){
 const url=new URL(FX_HOME_SHARE_URL);
 url.searchParams.set(FX_STORE_SHARE_PARAM,String(store.id));
 return url.href;
}
function fxSetStoreShareStatus(message){
 const status=document.querySelector('[data-store-share-status]');
 if(status)status.textContent=message;
}
function fxOpenStoreShare(store,target){
 fxGull(target,false);
 const url=fxStoreShareUrl(store),photo=fxPhoto(store);
 const mobileShare=fxPlatform()!=='other'&&Boolean(navigator.share);
 openModal(`<section class="home-share-sheet store-share-sheet" data-store-share-id="${escapeHtml(store.id)}">
  <h2 id="modalTitle">${escapeHtml(store.name)} 공유하기</h2>
  <p>가게 주소를 복사해 카카오톡·문자 등으로 공유해보세요.</p>
  <div class="home-share-preview store-share-preview">${photo?`<img src="${escapeHtml(photo)}" alt="${escapeHtml(store.name)}">`:`<img src="assets/app-icons/daedong-app-icon-512.png?v=official-brand-20260830-1" alt="${escapeHtml(FX_MAP_NAME)}">`}<span><b>${escapeHtml(store.name)}</b><small>가게를 바로 여는 ${escapeHtml(FX_MAP_NAME)} 주소</small></span></div>
  <label class="store-share-url-label" for="storeShareUrl">가게 공유주소</label>
  <div class="store-share-url-row">
   <input id="storeShareUrl" class="store-share-url" type="text" readonly value="${escapeHtml(url)}" data-store-share-url>
   <button class="store-share-copy glass-action" type="button" data-store-share-copy="${escapeHtml(store.id)}">링크 복사</button>
  </div>
  <div class="home-share-actions">${mobileShare?`<button class="home-share-secondary glass-action" type="button" data-store-share-action="${escapeHtml(store.id)}">휴대폰 공유창 열기</button>`:''}</div>
  <p class="home-share-status" role="status" aria-live="polite" data-store-share-status>링크 복사 버튼을 누르면 가게 주소가 복사됩니다.</p>
 </section>`);
 requestAnimationFrame(()=>document.querySelector('[data-store-share-url]')?.select());
}
async function fxCopyStoreShareUrl(storeId){
 const store=fxStoreById(storeId);
 if(!store)return;
 const url=fxStoreShareUrl(store);
 try{
  if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(url);
  else{
   const input=document.querySelector('[data-store-share-url]');
   input?.select();
   const copied=document.execCommand('copy');
   if(!copied)throw new Error('copy failed');
  }
  fxSetStoreShareStatus('가게 링크를 복사했습니다. 원하는 곳에 붙여넣어 공유해 주세요.');
  fxShareToast(`${store.name} 가게 링크를 복사했습니다.`);
 }catch{
  document.querySelector('[data-store-share-url]')?.select();
  fxSetStoreShareStatus('자동 복사가 차단되었습니다. 위 주소를 직접 복사해 주세요.');
 }
}
async function fxShareStore(storeId,target){
 const store=fxStoreById(storeId);
 if(!store)return;
 const url=fxStoreShareUrl(store),title=`${store.name} · ${FX_MAP_NAME}`;
 const payload={title,text:`${store.name} 가게 정보를 ${FX_MAP_NAME}에서 확인해보세요.`,url};
 if(!navigator.share||(navigator.canShare&&!navigator.canShare(payload))){
  await fxCopyStoreShareUrl(store.id);
  return;
 }
 try{
  if(target)target.disabled=true;
  fxSetStoreShareStatus('휴대폰 공유창을 여는 중입니다…');
  await navigator.share(payload);
  fxSetStoreShareStatus('공유가 완료되었습니다.');
 }catch(error){
  if(error?.name==='AbortError')fxSetStoreShareStatus('공유를 취소했습니다. 가게 주소는 위에서 언제든 복사할 수 있습니다.');
  else await fxCopyStoreShareUrl(store.id);
 }finally{
  if(target?.isConnected)target.disabled=false;
 }
}
function fxShare(store,target){fxOpenStoreShare(store,target);}
function fxShareToast(message){
 document.querySelector('.home-share-toast')?.remove();
 const toast=document.createElement('div');toast.className='home-share-toast';toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');toast.textContent=message;
 document.body.append(toast);setTimeout(()=>toast.remove(),1800);
}
function fxSetHomeShareStatus(message){
 const status=document.querySelector('[data-home-share-status]');
 if(status)status.textContent=message;
}
async function fxCopyHomeShareUrl(){
 try{
  if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(FX_HOME_SHARE_URL);
  else{
   const input=document.createElement('textarea');input.value=FX_HOME_SHARE_URL;input.setAttribute('readonly','');input.style.position='fixed';input.style.opacity='0';
   document.body.append(input);input.select();const copied=document.execCommand('copy');input.remove();if(!copied)throw new Error('copy failed');
  }
  fxSetHomeShareStatus('링크를 복사했습니다. 원하는 대화방에 붙여넣어 주세요.');
  fxShareToast(`${FX_MAP_NAME} 링크를 복사했습니다.`);
 }catch{
  fxSetHomeShareStatus('복사가 차단되었습니다. 아래 주소를 길게 눌러 복사해 주세요.');
  fxShareToast('공유 링크: daedongmap.com');
 }
}
function fxOpenHomeShare(target){
 fxGull(target,false);
 openModal(`<section class="home-share-sheet">
  <h2 id="modalTitle">${escapeHtml(FX_MAP_NAME)} 공유하기</h2>
  <p>가게 한 곳이 아니라 ${escapeHtml(FX_MAP_NAME)} 홈 전체를 가족·지인에게 알려주세요.</p>
  <div class="home-share-preview"><img src="assets/app-icons/daedong-app-icon-512.png?v=official-brand-20260830-1" alt=""><span><b>${escapeHtml(FX_MAP_NAME)}</b><small>${FX_HOME_SHARE_URL}</small></span></div>
  <div class="home-share-actions">
   <button class="home-share-action glass-action" type="button" data-home-share-action>${escapeHtml(FX_MAP_NAME)} 공유하기</button>
  </div>
  <p class="home-share-status" role="status" aria-live="polite" data-home-share-status>휴대폰 공유창을 지원하지 않으면 링크가 자동으로 복사됩니다.</p>
 </section>`);
}
async function fxShareHome(target){
 if(target?.disabled)return;
 fxGull(target,false);
 const payload={title:FX_MAP_NAME,text:FX_HOME_SHARE_TEXT,url:FX_HOME_SHARE_URL};
 if(!navigator.share||(navigator.canShare&&!navigator.canShare(payload))){
  fxSetHomeShareStatus('이 브라우저는 휴대폰 공유창을 지원하지 않아 링크를 복사합니다.');
  await fxCopyHomeShareUrl();
  return;
 }
 target.disabled=true;
 fxSetHomeShareStatus('휴대폰 공유창을 여는 중입니다…');
 try{
  await navigator.share(payload);
  fxSetHomeShareStatus('공유가 완료되었습니다.');
 }catch(error){
  if(error?.name==='AbortError')fxSetHomeShareStatus('공유를 취소했습니다. 버튼을 누르면 다시 공유할 수 있습니다.');
  else await fxCopyHomeShareUrl();
 }finally{
  if(target.isConnected)target.disabled=false;
 }
}
function fxRequestedSharedStoreId(){
 const value=new URLSearchParams(location.search).get(FX_STORE_SHARE_PARAM);
 return value?String(value).trim():'';
}
function fxSharedStoreHomeUrl(){
 const url=new URL(location.href);
 url.searchParams.delete(FX_STORE_SHARE_PARAM);
 const query=url.searchParams.toString();
 return `${url.pathname}${query?`?${query}`:''}${url.hash}`;
}
function fxPendingOrderMethodReentry(storeId){
 const saved=window.daedongPendingOrderMethodReentry;
 const token=new URLSearchParams(location.search).get(FX_ORDER_METHOD_REENTRY_PARAM)||'';
 const age=Date.now()-Number(saved?.savedAt||0);
 return saved&&age>=0&&age<2*60*1000&&String(saved.storeId||'')===String(storeId||'')&&String(saved.token||'')===token?saved:null;
}
function fxPrepareOrderMethodReentryUrl(saved){
 if(!saved)return false;
 try{
  const url=new URL(location.href);
  url.searchParams.delete(FX_ORDER_METHOD_REENTRY_PARAM);
  history.replaceState(history.state,'',`${url.pathname}${url.search}${url.hash}`);
  return true;
 }catch{return false;}
}
function fxFinishOrderMethodReentry(saved,{restorePosition=false}={}){
 if(!saved)return;
 if(restorePosition){
  const card=document.querySelector('#modal:not([hidden]) .modal-card');
  const align=()=>{if(card)card.scrollTop=Math.max(0,Number(saved.modalScroll||0));};
  align();requestAnimationFrame(()=>{align();requestAnimationFrame(align);});
 }
 try{sessionStorage.removeItem(FX_ORDER_METHOD_REENTRY);}catch{}
 window.daedongPendingOrderMethodReentry=null;
 // The store detail was built normally behind the opaque boot cover. Give its
 // native hit-test surface two painted frames before removing that cover.
 requestAnimationFrame(()=>requestAnimationFrame(()=>window.daedongFinishExternalReturnBoot?.()));
}
async function fxOpenSharedStoreFromUrl(){
 const storeId=fxRequestedSharedStoreId();
 if(!storeId)return false;
 const orderMethodReentry=fxPendingOrderMethodReentry(storeId);
 // URL mutation after openStore() leaves correct pixels but a dead native
 // button surface in Samsung Kakao WebView. Strip the one-time marker before
 // the modal DOM exists; every later history entry is then already clean.
 fxPrepareOrderMethodReentryUrl(orderMethodReentry);
 const sharedStoreUrl=`${location.pathname}${location.search}${location.hash}`;
 for(let attempt=0;attempt<50;attempt+=1){
  const store=fxStoreById(storeId);
  if(store&&fxVisible(store)){
   history.replaceState(history.state,'',fxSharedStoreHomeUrl());
   const opened=await openStore(store);
   if(opened===false){fxFinishOrderMethodReentry(orderMethodReentry);return false;}
   if(history.state?.daedongModal)history.replaceState(history.state,'',sharedStoreUrl);
   fxFinishOrderMethodReentry(orderMethodReentry,{restorePosition:true});
   return true;
  }
  await new Promise(resolve=>setTimeout(resolve,100));
 }
 console.warn('공유된 가게를 찾지 못했습니다.',storeId);
 fxFinishOrderMethodReentry(orderMethodReentry);
 return false;
}
function fxHandleHomeShareClick(event){
 const homeShare=event.target.closest('[data-share-home]');
 if(homeShare){event.preventDefault();event.stopImmediatePropagation();fxOpenHomeShare(homeShare);return;}
 const homeShareAction=event.target.closest('[data-home-share-action]');
 if(homeShareAction){event.preventDefault();event.stopImmediatePropagation();fxShareHome(homeShareAction);}
 const storeShareCopy=event.target.closest('[data-store-share-copy]');
 if(storeShareCopy){event.preventDefault();event.stopImmediatePropagation();fxCopyStoreShareUrl(storeShareCopy.dataset.storeShareCopy);return;}
 const storeShareAction=event.target.closest('[data-store-share-action]');
 if(storeShareAction){event.preventDefault();event.stopImmediatePropagation();fxShareStore(storeShareAction.dataset.storeShareAction,storeShareAction);}
}
document.addEventListener('click',fxHandleHomeShareClick,true);

function fxRainCount(level){return level==='light'?15:level==='moderate'?27:40;}
function fxApplyRain(level){const next=['light','moderate','strong'].includes(level)?level:'clear',selectionChanged=next!==fxRainState;fxRainState=next;const shell=$('.yeosu-night-shell'),layer=$('.weather-layer');if(!shell||!layer)return;shell.dataset.weather=fxRainState;layer.className='weather-layer';layer.innerHTML='';if(fxRainState==='clear'){if(selectionChanged)fxRenderRails();return;}layer.classList.add('rain');const count=Math.max(6,Math.round(fxRainCount(fxRainState)*(fxLowPower()?.5:1)));for(let i=0;i<count;i++){const d=document.createElement('i');d.className='rain-drop';d.style.left=`${(i*37)%101}%`;d.style.animationDelay=`-${(i*83)%760}ms`;d.style.setProperty('--rain-speed',fxRainState==='strong'?'430ms':fxRainState==='moderate'?'590ms':'780ms');d.style.setProperty('--rain-opacity',fxRainState==='strong'?'.72':fxRainState==='moderate'?'.6':'.43');layer.append(d);}if(selectionChanged)fxRenderRails();}
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
  const appStoreInfo=event.target.closest('[data-app-store-info]');if(appStoreInfo){const store=fxStoreById(appStoreInfo.dataset.appStoreInfo);if(store)openStore(store);return;}
  const appStoreOrder=event.target.closest('[data-app-store-order]');if(appStoreOrder){event.preventDefault();event.stopImmediatePropagation();void fxOpenRegisteredAppOrder(appStoreOrder);return;}
  const channelStore=event.target.closest('[data-channel-store-id]');if(channelStore){const store=fxStoreById(channelStore.dataset.channelStoreId);if(store)openStore(store);return;}
  const searchStore=event.target.closest('[data-search-store-id]');if(searchStore){const store=fxStoreById(searchStore.dataset.searchStoreId);if(store)openStore(store);return;}
  const share=event.target.closest('[data-share-store]');if(share){const store=fxStoreById(share.dataset.shareStore);if(store)fxShare(store,share);return;}
  const favorite=event.target.closest('[data-favorite-store]');if(favorite)fxGull(favorite,true);
  const finalLocal=event.target.closest('.detail-route[data-route-key="direct"],.detail-route[data-route-key="mukkebi"],.detail-route[data-route-key="ddangyo"],.detail-route[data-route-key="ondongne"],.community-choice-link');if(finalLocal)fxBattle();
 },true);
 document.addEventListener('keydown',event=>{if(event.key==='Enter'&&event.target.id==='fxSearchInput'){event.preventDefault();fxSearchModal(event.target.value);}});
 window.addEventListener('pageshow',()=>{fxRestoreRegisteredAppButtons();fxRestoreAppBrowserReturn();});
 document.addEventListener('visibilitychange',()=>{document.documentElement.classList.toggle('page-hidden',document.hidden);if(!document.hidden)fxRestoreRegisteredAppButtons();});
}

async function fxInitialize(){
 const [brand,supplement,happy,phone,brandPhotos]=await Promise.all([fetchJson(FX_BRAND_URL,{stores:[],brands:[]}),fetchJson(FX_BRAND_SUPPLEMENT_URL,{storeMappings:[],directApps:[]}),fetchJson(FX_HAPPY_URL,{candidateStoreMappings:[],currentScreenBrands:[],categories:[]}),fetchJson(FX_PHONE_URL,{storeMappings:[]}),fetchJson(FX_BRAND_PHOTO_POOL_URL,{brands:{},assignments:{}})]);
 fxBrandData=brand;fxSupplement=supplement;fxHappyData=happy;fxPhoneData=phone;fxBrandPhotoPool=brandPhotos;fxBuildIndexes();
 APP_META.phone.icon='assets/ui/phone.svg';
 fxRenderRails();
 await fxInitWeather();
 fxRestoreAppBrowserReturn();
}

function fxRenderRailsWithoutMovingActiveList(){
 fxRenderRails();
}

const fxRc2Style=document.createElement('link');
fxRc2Style.rel='stylesheet';
fxRc2Style.href='rc2-fixes.css?v=phone-route-restoration-1-daylight-effects-cleanup-1';
document.head.append(fxRc2Style);
const fxRc3Style=document.createElement('link');
fxRc3Style.rel='stylesheet';
fxRc3Style.href='rc3-fixes.css?v=selected-category-label-1-popup-utility-links-1-selected-store-top-1-order-methods-return-touch-5-inline-order-methods-1-restored-external-route-direct-touch-1';
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

// Register this bridge before the dynamically loaded return layers. Samsung
// Kakao WebView can resume a history entry with the restored store DOM visible
// while a later delegated click listener is still behind a native resume
// event. The shared tap action completes on pointerup/touchend, so the first
// real tap opens the order-method sheet without depending on a synthetic click.
window.installDaedongTapAction?.({
 selector:'[data-rc3-other-methods]',
 activate(target,event){
  // Use the same ghost-click guard as the button's direct and inline paths.
  // Without it, one physical pointerup can open two identical sheets, leaving
  // a hidden duplicate in the modal history when the customer goes back.
  const activate=window.daedongActivateOrderMethodsFallback;
  return typeof activate==='function'?activate(target,event):false;
 }
});
window.installDaedongTapAction?.({
 selector:'[data-rc3-order-methods-close]',
 activate(target,event){
  const close=window.daedongCloseInlineOrderMethods;
  return typeof close==='function'?close(target,event):false;
 }
});
window.installDaedongTapAction?.({
 selector:'[data-rc3-external-route]',
 activate(target,event){
  const activate=window.daedongActivateExternalOrderRouteFallback;
  return typeof activate==='function'?activate(target,event):false;
 }
});

const fxRc2Script=document.createElement('script');
fxRc2Script.src='rc2-fixes.js?v=selected-category-label-2-store-share-deep-link-1-multi-category-1-hamburger-priority-1-pizza-priority-2-external-app-text-1-rail-cross-section-dedupe-1-yogiyo-same-tab-return-1-rail-local-repeat-fallback-3-rail-adjacent-visual-dedupe-1-secure-detail-await-1-app-list-direct-order-1-all-app-return-state-1-location-stable-newest-1-simple-app-return-1-direct-return-no-home-1-nearby-status-final-1-external-return-fast-1-instant-store-snapshot-1-all-order-app-exact-return-1-managed-region-priority-3-goheung-isolation-2-goheung-launch-1-sequential-app-return-1-instant-external-interaction-1-daylight-effects-cleanup-1-mobile-photo-delivery-1-brand-key-cache-1-ranked-input-1-order-methods-return-stable-dom-1-yogiyo-history-return-2-mobile-customer-qa-1-kakao-fresh-entry-token-1-order-app-confirmed-resume-1-kakao-external-history-guard-1-android-distinct-history-guard-1-back-forward-departure-marker-1-durable-return-cookie-1-store-card-intent-2-android-system-back-return-1-repeated-selected-app-return-1-selected-original-direct-launch-1-single-entry-return-1-anchor-lease-1-return-first-tap-2-return-activation-atomic-1-return-intent-cancel-1-return-early-tap-bridge-1-restored-button-direct-touch-1-visible-return-rebind-1-visible-return-detail-rebuild-1-visible-return-modal-reset-1-return-document-reload-1-return-document-navigation-1-reentered-order-method-surface-1-physical-order-reentry-document-1-stable-separated-order-return-1-direct-order-app-one-tap-1-detached-kakao-order-return-1-yogiyo-live-preview-task-1-yogiyo-kakao-https-return-1-yogiyo-kakao-web-return-1-yogiyo-native-bypass-form-1-yogiyo-android-browser-form-1-restored-open-order-methods-1-restored-open-order-methods-ready-1-catalog-refresh-route-fallback-1-yogiyo-native-app-return-1-manual-carousels-1';
fxRc2Script.async=false;
fxRc2Script.onload=()=>{
 fxInstallEvents();
 const fxRc3Script=document.createElement('script');
 fxRc3Script.src='rc3-fixes.js?v=selected-category-label-1-phone-route-restoration-3-phone-card-markers-2-physical-map-recovery-2-multi-category-1-hamburger-priority-1-pizza-priority-2-external-app-text-1-popup-utility-links-1-selected-store-top-1-rail-use-counts-1-secure-detail-await-1-card-channel-keys-1-store-popup-native-order-1-recommend-status-final-1-release-readiness-1-managed-region-priority-3-goheung-isolation-2-other-order-method-touch-1-order-methods-return-touch-5-mobile-photo-delivery-1-single-rank-per-rail-1-progressive-rails-1-single-yogiyo-cta-1-trusted-naver-place-1-direct-phone-link-1-mobile-order-selection-ghost-2-order-method-copy-1-restored-inline-fallback-1-inline-order-methods-1-external-route-return-touch-1-stable-separated-order-return-2-direct-order-app-one-tap-1-keep-order-app-list-on-return-1-restored-open-order-methods-1-restored-open-order-methods-ready-1-catalog-refresh-route-fallback-1';
 fxRc3Script.src+='-atomic-rail-refresh-1-store-card-intent-2-return-activation-atomic-1-return-intent-cancel-1-return-early-tap-bridge-1-order-sheet-before-history-1-restored-button-direct-touch-1';
 fxRc3Script.src+='-restored-external-route-direct-touch-1';
 fxRc3Script.async=false;
 fxRc3Script.onload=()=>{
  const fxRc4Script=document.createElement('script');
  fxRc4Script.src='rc4-fixes.js?v=category-first-paint-1-postcode-on-demand-1-brand-key-cache-1';
  fxRc4Script.async=false;
  fxRc4Script.onload=()=>{
   const fxRc5Script=document.createElement('script');
   fxRc5Script.src='rc5-fixes.js?v=category-first-paint-1-category-more-card-touch-1-brand-key-cache-1-postcode-touch-back-1';
   fxRc5Script.async=false;
   fxRc5Script.onload=()=>{
    const css=document.createElement('link');css.rel='stylesheet';css.href='rc6-fixes.css?v=location-store-hero-1-handsu-copy-spacing-1-hero-clean-controls-1-hero-order-footer-2';document.head.append(css);
    const script=document.createElement('script');script.src='rc6-fixes.js?v=hero-store-direct-1-multi-category-1-hamburger-priority-1-pizza-priority-2-kongsanso-store-family-1-store-badge-removed-1-handsu-copy-spacing-1-hero-card-cta-removed-1-rain-mode-admin-1-local-channel-marker-1-location-coordinate-merge-1-business-status-ranking-1-release-readiness-1-hero-open-only-1-hero-area-label-removed-1-three-main-ads-restored-1-notion-hero-return-1-goheung-isolation-2-instant-hero-loading-1-keep-placeholder-1-coordinate-yield-1-pager-stable-refresh-1-hero-photo-recovery-1-store-campaign-nine-2-hero-stable-height-1-manual-carousels-1';
    script.onload=()=>{
     const addressScript=document.createElement('script');addressScript.src='rc7-address-map.js?v=address-home-return-1-coarse-region-1-inapp-location-recovery-1-outside-yeosu-full-list-1-saved-address-first-1-release-readiness-1-step-touch-back-1';
     addressScript.onload=()=>{fxInstallEvents();setTimeout(async()=>{window.__daedongDeferRailRender=true;try{await window.daedongCatalogReady;await fxInitialize();await rc6Initialize();window.__daedongDeferRailRender=false;fxRenderRailsWithoutMovingActiveList();window.rc7Initialize?.();await fxOpenSharedStoreFromUrl();fxFinishLocationRankingReady(true);}catch(error){window.__daedongDeferRailRender=false;fxRenderRailsWithoutMovingActiveList();console.error('위치 기반 가게 정렬을 초기화하지 못했습니다.',error);fxFinishLocationRankingReady(false);}},0);};
     addressScript.onerror=()=>{console.error('RC7 주소·지도 검수 레이어를 불러오지 못했습니다.');fxFinishLocationRankingReady(false);};
     document.head.append(addressScript);
    };
    script.onerror=()=>{console.error('RC6 검수 수정 레이어를 불러오지 못했습니다.');fxFinishLocationRankingReady(false);};document.head.append(script);
   };
   fxRc5Script.onerror=()=>{console.error('RC5 검수 수정 레이어를 불러오지 못했습니다.');fxFinishLocationRankingReady(false);};
   document.head.append(fxRc5Script);
  };
  fxRc4Script.onerror=()=>{console.error('RC4 검수 수정 레이어를 불러오지 못했습니다.');fxFinishLocationRankingReady(false);};
  document.head.append(fxRc4Script);
 };
 fxRc3Script.onerror=()=>{console.error('RC3 검수 수정 레이어를 불러오지 못했습니다.');fxFinishLocationRankingReady(false);};
 document.head.append(fxRc3Script);
};
fxRc2Script.onerror=()=>{console.error('RC2 검수 수정 레이어를 불러오지 못했습니다.');fxFinishLocationRankingReady(false);};
document.head.append(fxRc2Script);
