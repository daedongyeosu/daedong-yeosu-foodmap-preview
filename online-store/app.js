const ONBOARD_KEY='matjido-store-onboarding-preview-v1';
const CART_KEY='matjido-customer-store-cart-v1';
const catalogBridge=globalThis.ShopStudioCatalog;
const catalogParams=new URLSearchParams(location.search);
const catalogMode=catalogParams.has('catalogStore');
const catalogStoreId=catalogBridge.id(catalogParams.get('catalogStore'));
const activeCartKey=catalogMode?`${CART_KEY}:store:${catalogStoreId}`:CART_KEY;
let focusedCatalogProduct=false;
const DELIVERY_QUOTE_ENDPOINT='https://daedong-yeosu-admin.sisakim.chatgpt.site/api/store-delivery-quote';
const STORE_ORDER_ENDPOINT='https://daedong-yeosu-admin.sisakim.chatgpt.site/api/store-orders/preview';
const PREVIEW_ORDER_KEY='matjido-customer-store-preview-order-v1';
const WATCH_KEY='matjido-live-market-watch-v1';
const MATJIDO_PUBLIC_CLIENT='daedong-preview-web-v1-20260804';
const fallbackProducts=[
  {id:'sample-1',name:'국산 고춧가루',price:12000,unit:'500g',stockMode:'판매 가능',category:'식료품',description:'국산 고추로 만든 고춧가루',livePricing:{enabled:true,mode:'cumulative',floorPrice:9900,endAt:new Date(Date.now()+18*60*60*1000).toISOString(),confirmedOrders:7,tiers:[{threshold:5,price:11500},{threshold:10,price:10800},{threshold:20,price:9900}],merchantControlled:true,competitorPricing:false}},
  {id:'sample-2',name:'배추',price:4500,unit:'1통',stockMode:'수량 관리',stockQuantity:6,category:'채소',description:'당일 상태를 확인한 뒤 준비해요',livePricing:{enabled:true,mode:'clearance',floorPrice:3300,endAt:new Date(Date.now()+4*60*60*1000).toISOString(),remainingStock:6,tiers:[{threshold:10,price:4200},{threshold:5,price:3800},{threshold:2,price:3300}],merchantControlled:true,competitorPricing:false}},
  {id:'sample-3',name:'공구 나사 세트',price:6900,unit:'1팩',stockMode:'수량 관리',stockQuantity:8,category:'생활·공구',description:'가정용 기본 나사 묶음'},
  {id:'sample-4',name:'생수',price:6500,unit:'1박스',stockMode:'판매 가능',category:'생활·공구',description:'2L 6병 한 묶음'}
];
const fallbackStore={storeName:'여수 동네상점 예시',category:'생활상점',address:'여수시 온라인 상점 프리뷰',theme:'실제 가게와 비슷하게',subsidy:0,minimumOrder:20000,products:fallbackProducts};
const previewStores={
  'hwangjeon-hanwoo-munsu':{
    storeId:'hwangjeon-hanwoo-munsu',
    storeName:'황전한우정육식당',
    pickupName:'황전한우정육식당',
    branchLabel:'문수점',
    category:'정육식당',
    address:'전라남도 여수시 문수7길 21',
    parcelAddress:'전라남도 여수시 문수동 457-2',
    phone:'010-2401-0067',
    landline:'061-652-0999',
    hours:'매일 16:00~22:00',
    directions:'문수동 부영9차 909동 옆, 성결교회 가는 길',
    introduction:'직접 손질한 한우암소 특수부위와 육사시미·육회를 만나는 문수동 정육식당입니다. 여수맛지도에서 주문하면 집까지 배달하고, 매장으로 오시면 갓 준비한 음식을 더 편하게 즐기실 수 있습니다.',
    highlights:['한우암소 특수부위 전문','육사시미·육회 매일 준비','포장·예약 가능','무료 주차·무료 발렛'],
    amenities:['단체 이용','포장','예약','무선 인터넷','남녀 화장실 구분','간편결제','무료 주차','무료 발렛'],
    naverPlaceId:'1044077495',
    naverMapUrl:'https://map.naver.com/p/search/%ED%99%A9%EC%A0%84%ED%95%9C%EC%9A%B0%EC%A0%95%EC%9C%A1%EC%8B%9D%EB%8B%B9/place/1044077495',
    heroIcon:'🥩',
    theme:'매장 그대로',
    subsidy:0,
    minimumOrder:0,
    products:[
      {id:'beef-sashimi',name:'육사시미',price:0,inquiryOnly:true,unit:'',stockMode:'당일 준비 여부 전화 확인',category:'육회·육사시미',description:'한우암소 우둔살로 준비하는 메뉴',image:'../assets/store-photos/79067fa62663ac/01.webp',imageLabel:'실제 메뉴 사진'},
      {id:'beef-yukhoe',name:'육회',price:0,inquiryOnly:true,unit:'',stockMode:'당일 준비 여부 전화 확인',category:'육회·육사시미',description:'한우암소 우둔살로 준비하는 메뉴',image:'../assets/store-photos/79067fa62663ac/01.webp',imageLabel:'실제 메뉴 사진'},
      {id:'beef-raw-takeout',name:'뭉티기·육사시미·육회 포장',price:30000,unit:'',stockMode:'당일 준비 여부 확인',category:'육회·육사시미',description:'당일 도축 한우암소 우둔살 포장 메뉴',image:'../assets/store-photos/79067fa62663ac/01.webp',imageLabel:'실제 메뉴 사진'},
      {id:'beef-hotpot',name:'한우암소 전골(야채불고기)',price:15000,unit:'',stockMode:'판매 가능',category:'식사·전골',description:'한우암소 갈비양지와 갈비뼈 육수로 준비하는 전골',image:'../assets/store-photos/79067fa62663ac/04.webp',imageLabel:'메뉴 연출 이미지'},
      {id:'beef-bulgogi',name:'한우야채불고기',price:15000,unit:'',stockMode:'판매 가능',category:'식사·전골',description:'한우암소로 준비하는 야채불고기'},
      {id:'yukhoe-bibimbap',name:'한우암소 육회비빔밥',price:15000,unit:'',stockMode:'판매 가능',category:'식사·전골',description:'한우암소 우둔살 육회를 올린 비빔밥'},
      {id:'bone-broth-ricecake',name:'사골떡국',price:15000,unit:'',stockMode:'판매 가능',category:'식사·전골',description:'한우암소 갈비뼈 사골과 직접 농사지은 쌀로 준비'},
      {id:'special-cuts',name:'한우암소 특수부위 모듬',price:0,inquiryOnly:true,unit:'',stockMode:'부위·중량별 당일 시세',category:'구이·정육',description:'갈비·살치·꽃살·안창·토시 등 당일 준비 부위',image:'../assets/store-photos/79067fa62663ac/03.webp',imageLabel:'메뉴 연출 이미지'},
      {id:'pork-belly',name:'생삼겹',price:12000,unit:'',stockMode:'판매 가능',category:'구이·정육',description:'구이용 생삼겹'},
      {id:'pork-neck',name:'생목살',price:12000,unit:'',stockMode:'판매 가능',category:'구이·정육',description:'구이용 생목살'},
      {id:'after-meal',name:'후식류',price:4000,unit:'',stockMode:'종류 확인 후 주문',category:'식사·전골',description:'냉면·된장국·누룽지·라면 등'},
      {id:'gift-set',name:'한우암소 선물세트',price:0,inquiryOnly:true,unit:'',stockMode:'구성·중량별 전화 문의',category:'선물·소매',description:'직접 손질한 한우암소 특수부위 선물세트'},
      {id:'retail-meat',name:'한우암소·한돈 소매',price:0,inquiryOnly:true,unit:'',stockMode:'부위·중량별 전화 문의',category:'선물·소매',description:'한우암소 갈비와 특수부위, 한돈 소매 판매'}
    ],
    catalogSource:'static',
    previewOnly:true
  }
};
let store=loadStore();
let products=normalizeProducts(store.products);
let cart=loadCart();
let selectedCategory='전체';
let liveFilter='all';
let watchedProducts=loadWatchedProducts();
let deliveryAddress=null;
let deliveryQuote=null;
let postcodePromise=null;
let quoteRequestId=0;
let trackingTimer=null;
let liveMarketTimer=null;
let serverPriceQuote=null;
let serverCatalogActive=false;

const ORDER_STATUS={NEW:'상점 확인 전',ACCEPTED:'주문 수락',PREPARING:'상품 준비중',READY:'상품 준비완료',DELIVERY_REQUESTED:'배송요청 완료',REJECTED:'주문 거절'};
const ORDER_MESSAGE={NEW:'상점이 주문을 확인하고 있습니다.',ACCEPTED:'상점이 주문을 수락했습니다.',PREPARING:'상점에서 상품을 준비하고 있습니다.',READY:'상품 준비가 끝났습니다. 배송 요청을 기다립니다.',DELIVERY_REQUESTED:'배송 요청이 접수되었습니다.',REJECTED:'상점 사정으로 주문을 진행할 수 없습니다.'};
const ORDER_PROGRESS=['NEW','ACCEPTED','PREPARING','READY','DELIVERY_REQUESTED'];

function money(value){return `${Math.max(0,Number(value)||0).toLocaleString('ko-KR')}원`;}
function demoMode(){return new URLSearchParams(location.search).get('demo')==='1';}
function storeId(){return String(store.storeId||'demo-yeosu-store').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)||'demo-yeosu-store';}
function previewStore(){const key=new URLSearchParams(location.search).get('store');return previewStores[key]||null;}
function loadStore(){if(catalogMode){let saved=null;try{saved=globalThis.MatjidoStoreContext.matchingDraft(JSON.parse(localStorage.getItem(ONBOARD_KEY)||'null'),catalogStoreId);}catch{}return{storeId:catalogStoreId,storeName:saved?.storeName||'등록 상점 확인 중',products:[],...globalThis.MatjidoStoreContext.metadata(saved)};}const preset=previewStore();if(preset)return preset;if(demoMode())return fallbackStore;try{const saved=JSON.parse(localStorage.getItem(ONBOARD_KEY)||'null');return saved?.previewOnly?{...fallbackStore,...saved}:fallbackStore;}catch{return fallbackStore;}}
function normalizeProducts(list){return (Array.isArray(list)?list:fallbackProducts).slice(0,500).filter(item=>item&&String(item.name||'').trim()&&(Number(item.price)>0||item.inquiryOnly===true)).map((item,index)=>({id:String(item.id||`item-${index}`),name:String(item.name).trim(),price:Math.max(0,Number(item.price)||0),inquiryOnly:item.inquiryOnly===true,unit:item.unit==null?'개':String(item.unit),stockMode:String(item.stockMode||'판매 가능'),stockQuantity:item.stockQuantity==null?null:Math.max(0,Number(item.stockQuantity)||0),category:String(item.category||store.category||'등록상품'),description:String(item.description||''),image:String(item.image||''),imageLabel:String(item.imageLabel||''),livePricing:item.livePricing&&typeof item.livePricing==='object'?item.livePricing:null}));}
function loadCart(){if(demoMode())return{};try{const saved=JSON.parse(localStorage.getItem(activeCartKey)||'{}');return saved&&typeof saved==='object'&&!Array.isArray(saved)?saved:{};}catch{return {};}}
function saveCart(){if(!demoMode())try{localStorage.setItem(activeCartKey,JSON.stringify(cart));}catch{document.querySelector('#orderStatus').textContent='이 기기에 장바구니를 저장하지 못했습니다. 창을 닫으면 담은 상품이 사라질 수 있습니다.';}}
function loadWatchedProducts(){try{const saved=JSON.parse(localStorage.getItem(WATCH_KEY)||'[]');return new Set(Array.isArray(saved)?saved.map(String):[]);}catch{return new Set();}}
function saveWatchedProducts(){try{localStorage.setItem(WATCH_KEY,JSON.stringify([...watchedProducts]));}catch{}}
function priceState(product){return globalThis.MatjidoLiveCommerce.evaluate(product);}
function cartEntry(id){const raw=cart[id];return typeof raw==='number'?{quantity:Math.max(0,raw),lockedPrice:null}:raw&&typeof raw==='object'?{quantity:Math.max(0,Number(raw.quantity)||0),lockedPrice:Number(raw.lockedPrice)||null,mode:String(raw.mode||'')}:{quantity:0,lockedPrice:null,mode:''};}
function livePrice(product){return priceState(product).currentPrice;}
function iconFor(product){const text=`${product.name} ${product.category}`;if(/육회|육사시미|뭉티기/.test(text))return'🥩';if(/한우|고기|삼겹|목살|정육|특수부위/.test(text))return'🥩';if(/전골|불고기|떡국|비빔밥|후식/.test(text))return'🍲';if(/생수|음료|주스/.test(product.name))return'💧';if(/채소|배추|과일/.test(text))return'🥬';if(/고추|식료|반찬/.test(text))return'🌶️';if(/공구|철물|나사/.test(text))return'🔧';if(/꽃|선물/.test(text))return'🎁';return'🛍️';}
function applyStore(){const name=store.storeName||fallbackStore.storeName;document.querySelector('#storeName').textContent=name;document.querySelector('#cartStoreName').textContent=name;document.querySelector('#storeCategory').textContent=store.category||'동네상점';document.querySelector('#storeAddress').textContent=store.address||'여수시 온라인 상점';document.querySelector('#storeHero').style.setProperty('--store-hero-icon',`"${store.heroIcon||'🏪'}"`);const phone=document.querySelector('#storePhone');const digits=String(store.phone||'').replace(/\D/g,'');phone.hidden=!digits;phone.href=digits?`tel:${digits}`:'#';phone.textContent=digits?`전화 ${store.phone}`:'';document.title=`${name} | 여수맛지도 온라인 상점`;const subsidy=Math.max(0,Number(store.subsidy)||0);const badge=document.querySelector('#subsidyBadge');badge.hidden=!subsidy;badge.textContent=subsidy?`배송비 ${money(subsidy)} 지원`:'';const profile=document.querySelector('#storeProfile');const intro=document.querySelector('#storeIntroduction');const hours=document.querySelector('#storeHours');const directions=document.querySelector('#storeDirections');const highlights=document.querySelector('#storeHighlights');const map=document.querySelector('#storeMapLink');const details=[store.introduction,store.hours,store.directions,store.naverMapUrl,...(store.highlights||[])];profile.hidden=!details.some(Boolean);intro.textContent=store.introduction||'';intro.hidden=!store.introduction;hours.textContent=store.hours?`영업시간 ${store.hours}`:'';hours.hidden=!store.hours;directions.textContent=store.directions||'';directions.hidden=!store.directions;highlights.replaceChildren();(Array.isArray(store.highlights)?store.highlights:[]).forEach(value=>{const item=document.createElement('li');item.textContent=value;highlights.append(item);});map.hidden=!store.naverMapUrl;map.href=store.naverMapUrl||'#';}
function renderCategories(){const nav=document.querySelector('#categoryFilters');const values=['전체',...new Set(products.map(product=>product.category))];nav.replaceChildren();values.forEach(category=>{const button=document.createElement('button');button.type='button';button.textContent=category;button.setAttribute('aria-pressed',String(category===selectedCategory));button.addEventListener('click',()=>{selectedCategory=category;renderCategories();renderProducts();});nav.append(button);});}
function visibleProducts(){const query=document.querySelector('#productSearch').value.trim().toLocaleLowerCase('ko-KR');return products.filter(product=>(selectedCategory==='전체'||product.category===selectedCategory)&&(!query||`${product.name} ${product.description} ${product.unit}`.toLocaleLowerCase('ko-KR').includes(query)));}
function renderProducts(){const grid=document.querySelector('#productGrid');const items=visibleProducts();document.querySelector('#resultCount').textContent=`${items.length}개`;grid.replaceChildren();if(!items.length){const empty=document.createElement('p');empty.className='empty-catalog';empty.textContent=products.length?'찾는 상품이 없습니다. 다른 검색어나 분류를 선택해 주세요.':'상점 등록을 마쳤습니다. 판매 상품과 가격은 상점 확인 후 순서대로 등록합니다.';grid.append(empty);return;}items.forEach(product=>{const state=priceState(product);const card=document.createElement('article');card.className='product-card';const visual=document.createElement('div');visual.className='product-visual';if(product.image){const photo=document.createElement('img');photo.src=product.image;photo.alt=`${product.name} 사진`;photo.loading='lazy';visual.append(photo);if(product.imageLabel){const label=document.createElement('small');label.textContent=product.imageLabel;visual.append(label);}}else{visual.setAttribute('aria-hidden','true');visual.textContent=iconFor(product);}const copy=document.createElement('div');copy.className='product-copy';const category=document.createElement('small');category.textContent=product.category;const name=document.createElement('strong');name.textContent=product.name;const description=document.createElement('p');description.textContent=product.description;description.hidden=!product.description;const price=document.createElement('span');price.className='live-price-line';if(product.inquiryOnly){price.textContent='당일 시세 · 전화 문의';}else if(state.active){price.innerHTML=`<del>${money(state.basePrice)}</del><b>${money(state.currentPrice)}</b>${product.unit?`<small>/${product.unit}</small>`:''}`;}else price.textContent=`${money(product.price)}${product.unit?` / ${product.unit}`:''}`;const stock=document.createElement('em');stock.textContent=product.stockMode==='수량 관리'?`재고 ${product.stockQuantity}개`:product.stockMode;let action;if(product.inquiryOnly){action=document.createElement('a');action.href=`tel:${String(store.phone||'').replace(/\D/g,'')}`;action.textContent='전화로 부위·가격 확인';action.setAttribute('aria-label',`${product.name} 전화 문의`);}else{action=document.createElement('button');action.type='button';action.textContent=catalogMode&&!catalogBridge.available(product)?'현재 구매 불가':state.active?`${money(state.currentPrice)} 담기`:'장바구니 담기';action.disabled=catalogMode&&!catalogBridge.available(product);action.addEventListener('click',()=>addToCart(product));}copy.append(category,name,description);if(state.active&&!product.inquiryOnly){const badge=document.createElement('small');badge.className='live-price-badge';badge.textContent=`⚡ ${state.label} · ${state.discountRate}%`;copy.append(badge);}copy.append(price,stock,action);card.append(visual,copy);grid.append(card);});}
function renderLiveMarket(){
  const panel=document.querySelector('#liveMarket');const list=document.querySelector('#liveMarketList');const activeProducts=products.map(product=>({product,state:priceState(product)})).filter(item=>item.state.active);
  panel.hidden=!activeProducts.length;if(!activeProducts.length)return;
  document.querySelector('#liveMarketCount').textContent=`${activeProducts.length}개 진행 중`;
  const visible=activeProducts.filter(({product,state})=>liveFilter==='all'||state.mode===liveFilter||(liveFilter==='watch'&&watchedProducts.has(product.id)));
  list.replaceChildren();
  if(!visible.length){const empty=document.createElement('p');empty.className='live-market-empty';empty.textContent=liveFilter==='watch'?'아직 관심상품이 없습니다. 별표를 눌러 모아보세요.':'이 분류에서 진행 중인 상품이 없습니다.';list.append(empty);return;}
  visible.forEach(({product,state})=>{
    const card=document.createElement('article');card.className='live-market-card';const copy=document.createElement('span');const kicker=document.createElement('small');kicker.textContent=`${state.mode==='cumulative'?'함께 주문':'재고 할인'} · ${globalThis.MatjidoLiveCommerce.timeLeft(state.remainingMs)}`;const name=document.createElement('strong');name.textContent=product.name;copy.append(kicker,name);
    const price=document.createElement('span');price.className='live-market-price';price.innerHTML=`<del>${money(state.basePrice)}</del><b>${money(state.currentPrice)}</b>`;
    const progress=document.createElement('div');progress.className='live-market-progress';const bar=document.createElement('span');const fill=document.createElement('i');const progressValue=state.mode==='cumulative'?(state.nextTier?Math.min(100,state.signal/state.nextTier.threshold*100):100):Math.max(12,state.discountRate*4);fill.style.width=`${Math.max(8,progressValue)}%`;bar.append(fill);const progressText=document.createElement('small');progressText.textContent=globalThis.MatjidoLiveCommerce.describeNext(state);progress.append(bar,progressText);
    const meta=document.createElement('div');meta.className='live-market-meta';const signal=document.createElement('span');signal.textContent=state.mode==='cumulative'?`결제확인 ${state.signal}개`:`남은 재고 ${state.signal}개`;const floor=document.createElement('span');floor.textContent=`최저 ${money(state.floorPrice)}`;meta.append(signal,floor);
    const actions=document.createElement('div');actions.className='live-market-actions';const watch=document.createElement('button');watch.type='button';watch.className='live-market-watch';watch.setAttribute('aria-label',`${product.name} 관심상품`);watch.setAttribute('aria-pressed',String(watchedProducts.has(product.id)));watch.textContent=watchedProducts.has(product.id)?'★':'☆';watch.addEventListener('click',()=>{if(watchedProducts.has(product.id))watchedProducts.delete(product.id);else watchedProducts.add(product.id);saveWatchedProducts();renderLiveMarket();});const add=document.createElement('button');add.type='button';add.className='live-market-cart';add.textContent=catalogMode&&!catalogBridge.available(product)?'현재 구매 불가':`현재가 ${money(state.currentPrice)} 담기`;add.disabled=catalogMode&&!catalogBridge.available(product);add.addEventListener('click',()=>addToCart(product));actions.append(watch,add);card.append(copy,price,progress,meta,actions);list.append(card);
  });
}
function addToCart(product){if(catalogMode&&(!serverCatalogActive||!catalogBridge.available(product))){document.querySelector('#orderStatus').textContent='현재 판매 가능한 상품인지 다시 확인해 주세요.';return;}const entry=cartEntry(product.id);const limit=product.stockMode==='수량 관리'?Math.max(0,Number(product.stockQuantity)||0):99;if(entry.quantity>=limit)return;const state=priceState(product);cart[product.id]={quantity:entry.quantity+1,lockedPrice:globalThis.MatjidoLiveCommerce.bestLockedPrice(entry.lockedPrice,state.currentPrice,product.price),mode:state.mode||'',addedAt:new Date().toISOString()};serverPriceQuote=null;saveCart();deliveryQuote=null;renderCart();if(deliveryAddress)requestDeliveryQuote();}
function changeQuantity(id,change){const product=products.find(item=>item.id===id);if(!product)return;const entry=cartEntry(id);const limit=product.stockMode==='수량 관리'?Math.max(0,Number(product.stockQuantity)||0):99;if(catalogMode&&change>0&&(!serverCatalogActive||!catalogBridge.available(product)))return;const next=Math.max(0,Math.min(limit,entry.quantity+change));if(next){const current=livePrice(product);cart[id]={...entry,quantity:next,lockedPrice:globalThis.MatjidoLiveCommerce.bestLockedPrice(entry.lockedPrice,current,product.price)};}else delete cart[id];serverPriceQuote=null;saveCart();deliveryQuote=null;quoteRequestId++;renderCart();if(deliveryAddress&&cartLines().length)requestDeliveryQuote();}
function cartLines(){return products.map(product=>{const entry=cartEntry(product.id);const current=livePrice(product);const unitPrice=globalThis.MatjidoLiveCommerce.bestLockedPrice(entry.lockedPrice,current,product.price);return{product,quantity:entry.quantity,unitPrice,pricing:priceState(product)};}).filter(line=>line.quantity>0);}
async function refreshServerCatalog(){
  if(store.catalogSource==='static')return;
  if(catalogMode&&!document.querySelector('#orderReviewPanel').hidden)return;
  if(catalogMode){
    try{
      if(!catalogStoreId)throw new Error('store-invalid');
      const response=await fetch(`${catalogBridge.endpoint}?storeId=${encodeURIComponent(catalogStoreId)}`,{headers:{accept:'application/json'},credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw new Error('catalog-response');const result=await response.json();if(result.storeId&&result.storeId!==catalogStoreId)throw new Error('store-mismatch');products=normalizeProducts(catalogBridge.products(result));serverCatalogActive=true;
      store={...store,storeName:String(result.storeName||catalogStoreId)};applyStore();
      let cartAdjusted=false;
      for(const key of Object.keys(cart)){const product=products.find(value=>value.id===key);if(!catalogBridge.available(product)){delete cart[key];cartAdjusted=true;}else if(product.stockMode==='수량 관리'&&cartEntry(key).quantity>product.stockQuantity){cart[key]={...cartEntry(key),quantity:product.stockQuantity};cartAdjusted=true;}}
      if(cartAdjusted)document.querySelector('#orderStatus').textContent='판매 상태·재고가 바뀌어 담은 상품을 조정했습니다. 결제 전 장바구니를 다시 확인해 주세요.';
      saveCart();serverPriceQuote=null;renderCategories();renderProducts();renderLiveMarket();renderCart();
      const requested=catalogBridge.id(catalogParams.get('product')),entry=products.find(value=>value.id===requested);
      const notice=document.querySelector('#catalogSelectionStatus');notice.textContent=entry?`${entry.name} · 가격·재고를 확인하고 장바구니에 담아 주세요.`:requested?'선택한 상품을 찾을 수 없습니다. 상품이 삭제되었거나 판매가 종료되었을 수 있습니다.':'등록 상품을 확인했습니다.';
      if(entry&&!focusedCatalogProduct){document.querySelector('#productSearch').value=entry.name;selectedCategory='전체';renderProducts();document.querySelector('#productGrid').scrollIntoView({block:'start'});focusedCatalogProduct=true;}
    }catch{serverCatalogActive=false;products=[];serverPriceQuote=null;deliveryQuote=null;renderProducts();renderLiveMarket();renderCart();document.querySelector('#catalogSelectionStatus').textContent='등록 상품을 확인하지 못했습니다. 잠시 뒤 다시 시도해 주세요. 예시 상품으로 주문하지 않습니다.';}
    return;
  }
  try{const response=await fetch(`${STORE_ORDER_ENDPOINT}/catalog?storeId=${encodeURIComponent(storeId())}`,{headers:{'accept':'application/json'},credentials:'omit'});if(!response.ok)throw new Error(`catalog-${response.status}`);const result=await response.json();if(!Array.isArray(result.products)||!result.products.length)return;products=normalizeProducts(result.products);serverCatalogActive=true;if(result.storeName){store={...store,storeName:String(result.storeName),products};applyStore();}renderCategories();renderProducts();renderLiveMarket();renderCart();}
  catch{/* 이미 확인한 서버 상품은 유지하고 다음 자동 새로고침에서 다시 시도합니다. */}
}
async function requestServerPriceQuote(){
  if(catalogMode&&!serverCatalogActive)throw new Error('현재 가격·재고를 확인하지 못했습니다. 다시 시도해 주세요.');
  if(!serverCatalogActive)return null;const lines=cartLines();if(!lines.length)return null;
  const response=await fetch(`${STORE_ORDER_ENDPOINT}/quote`,{method:'POST',headers:{'content-type':'application/json','accept':'application/json'},credentials:'omit',body:JSON.stringify({previewOnly:true,storeId:storeId(),items:lines.map(({product,quantity})=>({id:product.id,quantity}))})});
  const result=await response.json();if(!response.ok||!result?.quote?.priceQuoteToken)throw new Error(result?.message||`price-quote-${response.status}`);serverPriceQuote=result.quote;
  result.quote.items.forEach(item=>{const entry=cartEntry(item.id);if(entry.quantity)cart[item.id]={...entry,lockedPrice:Number(item.priceWon),serverPrice:true};});saveCart();renderCart();return result.quote;
}
function renderCart(){
  const lines=cartLines(),count=lines.reduce((sum,line)=>sum+line.quantity,0),subtotal=lines.reduce((sum,line)=>sum+line.unitPrice*line.quantity,0);
  const subsidy=subtotal>=Math.max(0,Number(store.minimumOrder)||0)?Math.max(0,Number(store.subsidy)||0):0;
  const open=document.querySelector('#openCart');open.disabled=!count;document.querySelector('#cartCount').textContent=String(count);
  document.querySelector('#cartBarTotal').textContent=count?`${money(subtotal)} · 배송비 별도 · 이용금액 별도`:'상품을 담아주세요';
  document.querySelector('#productSubtotal').textContent=money(subtotal);document.querySelector('#storeSubsidy').textContent=subsidy?`-${money(subsidy)}`:'0원';
  const deliveryFee=deliveryQuote?.deliveryFee,platformFee=deliveryQuote?.platformFee,customerDelivery=Number.isFinite(deliveryFee)?Math.max(0,deliveryFee-subsidy):null;
  document.querySelector('#deliveryFee').textContent=deliveryFee==null?'주소 확인 후 계산':money(deliveryFee);
  document.querySelector('#customerDeliveryFee').textContent=customerDelivery==null?'주소 확인 후 계산':money(customerDelivery);
  document.querySelector('#platformFee').textContent=platformFee==null?'배송비와 함께 확인':money(platformFee);
  document.querySelector('#orderTotal').textContent=customerDelivery==null||platformFee==null?'배송비 계산 전':money(subtotal+customerDelivery+platformFee);
  const items=document.querySelector('#cartItems');items.replaceChildren();lines.forEach(({product,quantity,unitPrice,pricing})=>{const row=document.createElement('article');row.className='cart-item';const name=document.createElement('strong');name.textContent=product.name;const amount=document.createElement('span');amount.textContent=money(unitPrice*quantity);const unit=document.createElement('small');unit.textContent=`${money(unitPrice)} / ${product.unit}`;const controls=document.createElement('div');controls.className='quantity';const minus=document.createElement('button');minus.type='button';minus.setAttribute('aria-label',`${product.name} 수량 줄이기`);minus.textContent='−';minus.addEventListener('click',()=>changeQuantity(product.id,-1));const value=document.createElement('b');value.textContent=String(quantity);const plus=document.createElement('button');plus.type='button';plus.setAttribute('aria-label',`${product.name} 수량 늘리기`);plus.textContent='+';plus.addEventListener('click',()=>changeQuantity(product.id,1));controls.append(minus,value,plus);row.append(name,amount,unit,controls);if(pricing.active){const lock=document.createElement('p');lock.className='cart-price-lock';lock.textContent=pricing.settlement;row.append(lock);}items.append(row);});
}

function renderOrderReview(){
  const lines=cartLines();const subtotal=lines.reduce((sum,line)=>sum+line.unitPrice*line.quantity,0);const subsidy=subtotal>=Math.max(0,Number(store.minimumOrder)||0)?Math.max(0,Number(store.subsidy)||0):0;const deliveryFee=Number(deliveryQuote.deliveryFee);const platformFee=Number(deliveryQuote.platformFee);const customerDelivery=Math.max(0,deliveryFee-subsidy);
  document.querySelector('#reviewStoreName').textContent=store.storeName||fallbackStore.storeName;document.querySelector('#reviewAddress').textContent=deliveryAddress.address;const detail=document.querySelector('#addressDetail').value.trim();document.querySelector('#reviewAddressDetail').textContent=detail||'상세주소 없음';
  const items=document.querySelector('#reviewItems');items.replaceChildren();lines.forEach(({product,quantity,unitPrice,pricing})=>{const row=document.createElement('div');const name=document.createElement('span');name.textContent=`${product.name} · 수량 ${quantity} · ${product.unit}`;if(pricing.active){const note=document.createElement('small');note.className='review-price-note';note.textContent=`${pricing.label} 현재가 잠금`;name.append(note);}const amount=document.createElement('b');amount.textContent=money(unitPrice*quantity);row.append(name,amount);items.append(row);});
  document.querySelector('#reviewSubtotal').textContent=money(subtotal);document.querySelector('#reviewSubsidy').textContent=subsidy?`-${money(subsidy)}`:'0원';document.querySelector('#reviewDeliveryFee').textContent=money(deliveryFee);document.querySelector('#reviewCustomerDeliveryFee').textContent=money(customerDelivery);document.querySelector('#reviewPlatformFee').textContent=money(platformFee);document.querySelector('#reviewTotal').textContent=money(subtotal+customerDelivery+platformFee);
}

function orderPayload(){
  const lines=cartLines();const subtotal=serverPriceQuote?Number(serverPriceQuote.subtotalWon):lines.reduce((sum,line)=>sum+line.unitPrice*line.quantity,0);const merchantSupport=subtotal>=Math.max(0,Number(store.minimumOrder)||0)?Math.max(0,Number(store.subsidy)||0):0;const deliveryFee=Number(deliveryQuote.deliveryFee);const platformFee=Number(deliveryQuote.platformFee);const customerDelivery=Math.max(0,deliveryFee-merchantSupport);
  return {previewOnly:true,storeId:storeId(),storeName:store.storeName||fallbackStore.storeName,priceQuoteToken:serverPriceQuote?.priceQuoteToken||'',items:lines.map(({product,quantity,unitPrice})=>({id:product.id,name:product.name,unit:product.unit,quantity,priceWon:unitPrice})),subtotalWon:subtotal,deliveryFeeWon:deliveryFee,platformFeeWon:platformFee,merchantSupportWon:merchantSupport,totalWon:subtotal+customerDelivery+platformFee,destinationLabel:deliveryAddress.address,customerRequest:document.querySelector('#reviewRequest').value.trim()};
}

function saveTracking(value){try{localStorage.setItem(PREVIEW_ORDER_KEY,JSON.stringify(value));}catch{}}
function loadTracking(){try{const value=JSON.parse(localStorage.getItem(PREVIEW_ORDER_KEY)||'null');return value?.orderId&&value?.customerToken?value:null;}catch{return null;}}
function trackingClock(value){if(!value)return'';const date=new Date(value);if(Number.isNaN(date.getTime()))return'';return new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(date);}
function paintTracking(order,events=[]){
  const panel=document.querySelector('#orderTracking');const current=String(order.status||'NEW').toUpperCase();const activeIndex=ORDER_PROGRESS.indexOf(current);
  panel.hidden=false;panel.classList.toggle('is-rejected',current==='REJECTED');panel.setAttribute('aria-busy','false');
  document.querySelector('#trackingOrderId').textContent=order.id;document.querySelector('#trackingStatus').textContent=ORDER_STATUS[current]||current;document.querySelector('#trackingMessage').textContent=ORDER_MESSAGE[current]||'주문 진행상황을 확인하고 있습니다.';
  document.querySelectorAll('#trackingSteps li').forEach((step,index)=>{const complete=current!=='REJECTED'&&activeIndex>=index;step.classList.toggle('is-complete',complete);step.classList.toggle('is-current',current!=='REJECTED'&&activeIndex===index);});
  const latest=Array.isArray(events)&&events.length?events[events.length-1]?.createdAt:order.updatedAt;const stamp=trackingClock(latest);document.querySelector('#trackingUpdated').textContent=stamp?`최근 변경 ${stamp}`:'상점주 화면에서 처리하면 자동으로 바뀝니다.';
}
async function refreshTracking(){
  const saved=loadTracking();if(!saved)return;const panel=document.querySelector('#orderTracking');const button=document.querySelector('#refreshTracking');panel.hidden=false;panel.setAttribute('aria-busy','true');button.disabled=true;
  try{const response=await fetch(`${STORE_ORDER_ENDPOINT}/${encodeURIComponent(saved.orderId)}`,{headers:{'accept':'application/json','X-Matjido-Order-Token':saved.customerToken},credentials:'omit'});const result=await response.json();if(!response.ok)throw new Error(result?.message||`tracking-${response.status}`);paintTracking(result.order,result.events);}
  catch(error){panel.setAttribute('aria-busy','false');document.querySelector('#trackingOrderId').textContent=saved.orderId;document.querySelector('#trackingStatus').textContent='상태 확인 필요';document.querySelector('#trackingMessage').textContent=String(error?.message||'').includes('만료')?'테스트 주문 확인기간이 끝났습니다.':'연결이 원활하지 않습니다. 잠시 뒤 새로고침해 주세요.';document.querySelector('#trackingUpdated').textContent='자동 재확인 중';}
  finally{button.disabled=false;}
}
async function sendPreviewOrder(){
  const button=document.querySelector('#sendPreviewOrder');const status=document.querySelector('#reviewSubmitStatus');if(!deliveryAddress||!deliveryQuote||!cartLines().length)return;
  if(catalogMode&&(!serverCatalogActive||!serverPriceQuote?.priceQuoteToken)){status.textContent='가격·재고 확인이 필요합니다. 주문내용 확인을 다시 진행해 주세요.';return;}
  button.disabled=true;status.className='review-submit-status';status.textContent='상점주 테스트 주문함으로 보내는 중입니다…';
  try{const response=await fetch(STORE_ORDER_ENDPOINT,{method:'POST',mode:'cors',headers:{'content-type':'application/json','accept':'application/json'},credentials:'omit',body:JSON.stringify(orderPayload())});const result=await response.json();if(!response.ok||!result?.order?.id||!result?.customerToken)throw new Error(result?.message||`order-${response.status}`);saveTracking({orderId:result.order.id,customerToken:result.customerToken});paintTracking(result.order);status.textContent=result.order.pricingAuthority==='SERVER'?'서버가 가격·재고를 확정해 테스트 주문함에 전달했습니다. 실제 결제는 발생하지 않았습니다.':'테스트 주문이 상점주 주문접수 화면에 도착했습니다.';button.textContent='테스트 주문 전송 완료';cart={};serverPriceQuote=null;saveCart();renderCart();document.querySelector('#orderReviewPanel').hidden=true;document.querySelector('#cartPanel').hidden=true;if(catalogMode)void refreshServerCatalog();document.body.style.overflow='';document.querySelector('#orderTracking').scrollIntoView({behavior:'smooth',block:'start'});clearInterval(trackingTimer);trackingTimer=setInterval(refreshTracking,5000);}catch(error){serverPriceQuote=null;status.className='review-submit-status is-error';status.textContent=String(error?.message||'').includes('가격')||String(error?.message||'').includes('재고')?String(error.message):'테스트 주문을 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.';button.disabled=false;}
}

function loadPostcode(){
  if(globalThis.daum?.Postcode)return Promise.resolve(globalThis.daum.Postcode);
  if(postcodePromise)return postcodePromise;
  postcodePromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async=true;
    const timer=setTimeout(()=>{script.remove();reject(new Error('postcode-timeout'));},7000);
    script.onload=()=>{clearTimeout(timer);globalThis.daum?.Postcode?resolve(globalThis.daum.Postcode):reject(new Error('postcode-unavailable'));};
    script.onerror=()=>{clearTimeout(timer);reject(new Error('postcode-load'));};
    document.head.append(script);
  }).catch(error=>{postcodePromise=null;throw error;});
  return postcodePromise;
}

function isYeosuAddress(data,address){const sido=String(data.sido||'');const sigungu=String(data.sigungu||'');return(/전라남도|전남/.test(sido)&&/여수시/.test(sigungu))||/^(전라남도|전남)\s+여수시\s/.test(address);}
function closePostcode(){document.querySelector('#postcodePanel').hidden=true;document.querySelector('#postcodeFrame').replaceChildren();document.body.style.overflow='hidden';}
async function openPostcode(){
  const panel=document.querySelector('#postcodePanel');const status=document.querySelector('#postcodeStatus');const frame=document.querySelector('#postcodeFrame');
  panel.hidden=false;status.hidden=false;status.classList.remove('error');status.textContent='주소검색을 불러오는 중입니다.';frame.replaceChildren();document.body.style.overflow='hidden';
  try{
    const Postcode=await loadPostcode();status.hidden=true;
    new Postcode({width:'100%',height:'100%',oncomplete:data=>selectDeliveryAddress(data)}).embed(frame,{autoClose:false});
  }catch{status.hidden=false;status.classList.add('error');status.textContent='공식 주소검색을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.';}
}
function selectDeliveryAddress(data){
  const address=String(data.roadAddress||data.jibunAddress||data.address||'').trim();const status=document.querySelector('#postcodeStatus');
  if(!address){status.hidden=false;status.classList.add('error');status.textContent='선택한 주소를 확인하지 못했습니다. 다른 결과를 선택해 주세요.';return;}
  if(!isYeosuAddress(data,address)){status.hidden=false;status.classList.add('error');status.textContent='현재 온라인 상점 배송은 여수시 공식 주소만 선택할 수 있습니다.';return;}
  deliveryAddress={address,roadAddress:String(data.roadAddress||''),jibunAddress:String(data.jibunAddress||''),zonecode:String(data.zonecode||''),source:'daum_postcode'};
  document.querySelector('#deliveryAddressTitle').textContent=address;const verification=document.querySelector('#deliveryAddressVerification');verification.textContent=`✓ 공식 주소 확인 완료${deliveryAddress.zonecode?` · 우편번호 ${deliveryAddress.zonecode}`:''}`;verification.classList.add('is-verified');document.querySelector('#addressDetailWrap').hidden=false;document.querySelector('#openAddress').textContent='주소 변경';closePostcode();requestDeliveryQuote();document.querySelector('#addressDetail').focus();
}
function quotePayload(){
  const lines=cartLines();const subtotal=lines.reduce((sum,line)=>sum+line.unitPrice*line.quantity,0);
  return {version:1,channel:'online_store',pickup:{address:String(store.address||''),zonecode:String(store.addressZonecode||''),detail:String(store.addressDetail||'')},dropoff:{...deliveryAddress,detail:document.querySelector('#addressDetail').value.trim()},order:{subtotal,itemCount:lines.reduce((sum,line)=>sum+line.quantity,0),deliveryClass:'standard',items:lines.map(({product,quantity})=>({productId:product.id,name:product.name,unit:product.unit,quantity}))},merchantDeliverySupport:subtotal>=Math.max(0,Number(store.minimumOrder)||0)?Math.max(0,Number(store.subsidy)||0):0};
}
async function requestDeliveryQuote(){
  if(!deliveryAddress||!cartLines().length)return;
  if(catalogMode&&(!serverCatalogActive||!store.address)){deliveryQuote=null;renderCart();document.querySelector('#quoteStatus').textContent='이 상점의 픽업 주소를 확인하지 못했습니다. 가게 정보 연결 후 배송비를 계산할 수 있습니다.';return;}
  const requestId=++quoteRequestId;const status=document.querySelector('#quoteStatus');deliveryQuote=null;renderCart();status.className='quote-status is-loading';status.textContent='공식 주소를 확인했습니다. 실제 도로거리 배송비를 계산하는 중입니다…';
  try{
    const response=await fetch(DELIVERY_QUOTE_ENDPOINT,{method:'POST',mode:'cors',headers:{'content-type':'application/json','accept':'application/json','X-Daedong-Client':MATJIDO_PUBLIC_CLIENT},credentials:'omit',body:JSON.stringify(quotePayload())});
    if(!response.ok)throw new Error(`quote-${response.status}`);const result=await response.json();const deliveryFee=Number(result.deliveryFee);const platformFee=Number(result.platformFee);const roadDistanceMeters=Number(result.roadDistanceMeters);
    if(result.available!==true||!Number.isFinite(deliveryFee)||deliveryFee<0||!Number.isFinite(platformFee)||platformFee<0||!Number.isFinite(roadDistanceMeters)||roadDistanceMeters<=0)throw new Error('quote-invalid');if(requestId!==quoteRequestId)return;
    deliveryQuote={quoteId:String(result.quoteId||''),deliveryFee,platformFee,roadDistanceMeters,expiresAt:String(result.expiresAt||''),policyVersion:String(result.policyVersion||'')};status.className='quote-status is-ready';status.textContent='배송비 계산이 완료되었습니다.';renderCart();
  }catch{if(requestId!==quoteRequestId)return;status.className='quote-status is-error';status.textContent='공식 주소는 확인됐습니다. 현재 프리뷰에는 실제 도로거리 견적 서버가 아직 연결되지 않았습니다.';renderCart();}
}

document.querySelector('#productSearch').addEventListener('input',renderProducts);
document.querySelectorAll('[data-live-filter]').forEach(button=>button.addEventListener('click',()=>{liveFilter=button.dataset.liveFilter;document.querySelectorAll('[data-live-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));renderLiveMarket();}));
document.querySelector('#openCart').addEventListener('click',()=>{document.querySelector('#cartPanel').hidden=false;document.body.style.overflow='hidden';});
document.querySelector('#closeCart').addEventListener('click',()=>{document.querySelector('#cartPanel').hidden=true;document.body.style.overflow='';});
document.querySelector('#openAddress').addEventListener('click',openPostcode);
document.querySelector('#postcodeClose').addEventListener('click',closePostcode);
document.querySelector('#addressDetail').addEventListener('change',()=>{if(deliveryAddress)requestDeliveryQuote();});
document.querySelector('#previewOrder').addEventListener('click',async()=>{const status=document.querySelector('#orderStatus');if(!deliveryAddress){status.textContent='배송받을 공식 주소를 먼저 선택해 주세요.';return;}if(!deliveryQuote){status.textContent='실제 도로거리 배송비가 확정된 뒤 주문내용을 확인할 수 있습니다.';return;}status.textContent=serverCatalogActive?'서버에서 현재 가격과 재고를 확정하는 중입니다…':'';try{await requestServerPriceQuote();renderOrderReview();document.querySelector('#orderReviewPanel').hidden=false;status.textContent=serverCatalogActive?'서버 가격·재고 확인 완료 · 실제 결제 전 테스트입니다.':'';}catch(error){serverPriceQuote=null;status.textContent=String(error?.message||'가격이나 재고가 변경되었습니다. 다시 확인해 주세요.');await refreshServerCatalog();}});
document.querySelector('#closeOrderReview').addEventListener('click',()=>{document.querySelector('#orderReviewPanel').hidden=true;});
document.querySelector('#sendPreviewOrder').addEventListener('click',sendPreviewOrder);
document.querySelector('#refreshTracking').addEventListener('click',refreshTracking);
applyStore();renderCategories();renderProducts();renderLiveMarket();renderCart();refreshTracking();refreshServerCatalog();trackingTimer=setInterval(refreshTracking,5000);liveMarketTimer=setInterval(()=>{renderProducts();renderLiveMarket();renderCart();refreshServerCatalog();},30000);
