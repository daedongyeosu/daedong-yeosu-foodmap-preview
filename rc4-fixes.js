'use strict';

/* RC4 fixes only. Content data, photos, routes, brand-apps, HappyOrder and banners remain read-only. */
const RC4_CATEGORY_ICON_SPRITE=CATEGORY_ICON_SPRITE;
const RC4_POSTCODE_SCRIPT='https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
const RC4_CATEGORY_ICON_MAP=Object.freeze([
 [/^전체$/,'all'],[/마라|양꼬치/,'mala'],[/치킨|닭/,'chicken'],[/피자/,'pizza'],[/중식|짜장|짬뽕/,'chinese'],
 [/분식.*도시락|도시락.*분식/,'lunchbox'],[/분식|떡볶이/,'snack'],[/족발|보쌈/,'pork'],[/회|해산물|초밥|선어|수산/,'seafood'],
 [/국밥|찜|탕|찌개|조림/,'stew'],[/면|국수|냉면|우동|라멘/,'noodles'],[/고기|구이|삼겹|갈비/,'grill'],[/돈가스|돈까스|일식/,'japanese'],
 [/카페|디저트|빙수|아이스크림|커피/,'dessert'],[/야식|주점|술집/,'night'],[/햄버거|버거|샌드위치|토스트|핫도그/,'burger'],
 [/반찬/,'banchan'],[/베이커리|빵|떡/,'bakery'],[/한식/,'korean']
]);
let rc4PostcodePromise=null;

function rc4CategoryIconId(name){const value=String(name||'');return RC4_CATEGORY_ICON_MAP.find(([pattern])=>pattern.test(value))?.[1]||'other'}
function rc4CategoryIcon(name,className='rc4-category-icon'){return `<svg class="${className}" aria-hidden="true"><use href="${RC4_CATEGORY_ICON_SPRITE}#${rc4CategoryIconId(name)}"></use></svg>`}

fxCategoryMarkup=categoryButtonMarkup;
renderCategories=renderCategoryGrid;
allCategoriesModal=function(){const names=['전체',...categories.filter(name=>name!=='전체')];openModal(`<section class="category-modal"><h2 id="modalTitle">전체 음식 카테고리</h2><div class="all-category-list rc4-category-list">${names.map(name=>`<button type="button" data-modal-cat="${escapeHtml(name)}">${rc4CategoryIcon(name,'rc4-category-modal-icon')}<b>${escapeHtml(name)}</b></button>`).join('')}</div></section>`);requestAnimationFrame(()=>{const card=$('#modal .modal-card'),list=$('#modal .rc4-category-list');if(card)card.scrollTop=0;if(list)list.scrollTop=0})};

function rc4StoreHasRealCoordinates(store){return store?.coordinateSource==='store'&&Number.isFinite(store.lat)&&Number.isFinite(store.lng)}
function rc4Distance(store){return state.coords&&rc4StoreHasRealCoordinates(store)?haversine(state.coords,{lat:store.lat,lng:store.lng}):null}
fxDistance=rc4Distance;
function rc4BrandKey(store){return rc2BrandKey(store)||normalize(store?.name||'').replace(/여수|본점|점/g,'').slice(0,12)}
function rc4PhotoKey(store){return String(store?.photo||store?.photoFile||store?.image||'')}
function rc4Diversify(list){const first=[],later=[],brands=new Set(),photos=new Set();for(const store of list){const brand=rc4BrandKey(store),photo=rc4PhotoKey(store);if(photo&&photos.has(photo))continue;if(!brands.has(brand)){first.push(store);brands.add(brand);if(photo)photos.add(photo)}else later.push(store)}for(const store of later){const photo=rc4PhotoKey(store);if(photo&&photos.has(photo))continue;const same=rc4BrandKey(store),lastThree=first.slice(-3).map(rc4BrandKey);if(first.length>=4&&!lastThree.includes(same)){first.push(store);if(photo)photos.add(photo)}}return first}
function rc4LocationSort(list){const area=normalize(state.location||'');return [...list].sort((a,b)=>{const ad=rc4Distance(a),bd=rc4Distance(b);if(ad!==null||bd!==null)return ad===null?1:bd===null?-1:ad-bd;const am=area&&area!==normalize('여수시 전체')&&normalize(a.area).includes(area)?1:0,bm=area&&area!==normalize('여수시 전체')&&normalize(b.area).includes(area)?1:0;if(am!==bm)return bm-am;return 0})}
const rc4RankStoresBase=fxRankStores;
fxRankStores=function(spec){return rc4Diversify(rc4LocationSort(rc4RankStoresBase(spec)))};
function rc4CategoryList(){return rc4Diversify(rc4LocationSort(filteredStores().filter(store=>store.name!=='제목 없음')))}
function rc4CategoryResults(){const list=rc4CategoryList();$('#recommendRails').hidden=true;$('#recommendRails').innerHTML='';$('#recommendSection h2').textContent=`${state.category} 가게`;$('#resetCategoryBtn').hidden=false;const grid=$('#storeGrid');grid.className='store-grid rc4-category-result-track';grid.innerHTML=list.length?list.map(rc3RailCard).join(''):'<div class="empty">조건에 맞는 가게가 아직 없습니다.</div>';const more=$('#loadMoreBtn');more.hidden=!list.length;more.textContent='모든 가게 보기';more.dataset.rc4CategoryMore=state.category;renderCategories();$('#searchSummary').hidden=false;$('#searchSummary').innerHTML=`<span>${escapeHtml(state.category)}</span><button id="clearSearch" class="text-btn" type="button">카테고리 초기화</button>`}
const rc4RenderStoresBase=renderStores;
renderStores=function(options={}){if(state.category!=='전체'&&!state.query&&!state.brandId){rc4CategoryResults();if(options.scroll)$('#recommendSection').scrollIntoView({behavior:'smooth',block:'start'});return}const grid=$('#storeGrid');if(grid)grid.className='store-grid';const more=$('#loadMoreBtn');if(more)delete more.dataset.rc4CategoryMore;rc4RenderStoresBase(options)};
function rc4OpenCategoryAll(){const list=rc4CategoryList();openModal(`<section class="rc4-category-all"><h2 id="modalTitle">${escapeHtml(state.category)} 모든 가게</h2><div class="rc4-category-all-list">${list.map(storeCard).join('')||'<p class="empty">조건에 맞는 가게가 없습니다.</p>'}</div></section>`)}

function rc4AddressStatus(message,error=false){const target=$('#addressSearchResults');if(!target)return;target.innerHTML=`<p class="rc4-address-status ${error?'address-search-error':''}">${escapeHtml(message)}</p>`}
function rc4LoadPostcode(){if(globalThis.daum?.Postcode)return Promise.resolve(globalThis.daum.Postcode);if(rc4PostcodePromise)return rc4PostcodePromise;rc4PostcodePromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=RC4_POSTCODE_SCRIPT;script.async=true;const timer=setTimeout(()=>{script.remove();reject(new Error('timeout'))},7000);script.onload=()=>{clearTimeout(timer);globalThis.daum?.Postcode?resolve(globalThis.daum.Postcode):reject(new Error('unavailable'))};script.onerror=()=>{clearTimeout(timer);reject(new Error('load'))};document.head.append(script)}).catch(error=>{rc4PostcodePromise=null;throw error});return rc4PostcodePromise}
async function rc4OpenPostcode(){rc4AddressStatus('우편번호·도로명 주소검색을 불러오는 중입니다.');try{const Postcode=await rc4LoadPostcode();new Postcode({oncomplete(data){const address=String(data.roadAddress||data.jibunAddress||data.address||'').trim();if(!address){rc4AddressStatus('선택한 주소를 확인하지 못했습니다.',true);return}chooseAddressBase(address,{area:addressAreaFor(address),coords:null,sortByDistance:false,type:'postcode'});const input=$('#addressSearchInput');if(input)input.value=address;rc4AddressStatus(`검색된 주소 선택: ${address}`);setTimeout(()=>$('#addressDetailInput')?.focus(),0)},onclose(closeState){if(closeState==='FORCE_CLOSE')rc4AddressStatus('주소검색을 닫았습니다. 다시 검색할 수 있습니다.')}}).open({popupTitle:'대동여수음식지도 주소검색'})}catch{rc4AddressStatus('주소검색을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.',true)}}

areaModal=function(){const saved=getSavedAddress();addressDraft=saved?{...saved,coords:saved.coords||null}:{address:state.addressLabel==='여수시 전체'?'':state.addressLabel,detail:'',area:state.location,coords:state.coords,sortByDistance:false,type:'recent'};openModal(`<section class="address-single-sheet" data-address-single><header><h2 id="modalTitle">배달 주소 설정</h2></header><div class="address-search-row"><div class="searchbox"><input id="addressSearchInput" readonly inputmode="none" aria-label="우편번호·도로명 주소검색" placeholder="주소를 검색해 주세요"><button id="clearAddressSearch" class="input-clear" type="button" hidden>×</button></div><button id="addressSearchBtn" type="button">주소검색</button></div><div id="addressSearchResults" class="address-search-results"><p class="rc4-address-status">검색된 주소 선택</p></div><button id="gpsLocationBtn" class="current-location-btn" type="button">⌖ <span>현재 위치 사용</span></button><div id="addressSelectedPreview" class="address-selected-preview"></div><label class="address-detail-label">상세주소<input id="addressDetailInput" value="${escapeHtml(addressDraft?.detail||'')}" placeholder="동·호수, 건물명" autocomplete="address-line2"></label><button id="addressConfirmBtn" class="address-confirm-btn" type="button">이 주소로 선택 완료</button></section>`);const input=$('#addressSearchInput');input.value=addressDraft?.address||'';input.addEventListener('click',rc4OpenPostcode);if(input.value)rc4AddressStatus(`검색된 주소 선택: ${input.value}`);renderAddressDraft()};

function rc4InstallEvents(){document.addEventListener('click',event=>{const search=event.target.closest('#addressSearchBtn');if(search){event.preventDefault();event.stopImmediatePropagation();rc4OpenPostcode();return}const more=event.target.closest('[data-rc4-category-more]');if(more){event.preventDefault();event.stopImmediatePropagation();rc4OpenCategoryAll()}},true);rc4LoadPostcode().catch(()=>{})}
const rc4InstallEventsBase=fxInstallEvents;
fxInstallEvents=function(){rc4InstallEventsBase();rc4InstallEvents()};
