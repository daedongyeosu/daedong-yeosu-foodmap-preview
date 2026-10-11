const ONBOARD_KEY='matjido-store-onboarding-preview-v1';
const CART_KEY='matjido-customer-store-cart-v1';
const DELIVERY_QUOTE_ENDPOINT='https://daedong-yeosu-admin.sisakim.chatgpt.site/api/store-delivery-quote';
const MATJIDO_PUBLIC_CLIENT='daedong-preview-web-v1-20260804';
const DEFAULT_PLATFORM_FEE=500;
const fallbackProducts=[
  {id:'sample-1',name:'국산 고춧가루',price:12000,unit:'500g',stockMode:'판매 가능',category:'식료품',description:'국산 고추로 만든 고춧가루'},
  {id:'sample-2',name:'배추',price:4500,unit:'1통',stockMode:'주문 후 확인',category:'채소',description:'당일 상태를 확인한 뒤 준비해요'},
  {id:'sample-3',name:'공구 나사 세트',price:6900,unit:'1팩',stockMode:'수량 관리',stockQuantity:8,category:'생활·공구',description:'가정용 기본 나사 묶음'},
  {id:'sample-4',name:'생수',price:6500,unit:'1박스',stockMode:'판매 가능',category:'생활·공구',description:'2L 6병 한 묶음'}
];
const fallbackStore={storeName:'여수 동네상점 예시',category:'생활상점',address:'여수시 온라인 상점 프리뷰',theme:'실제 가게와 비슷하게',subsidy:0,minimumOrder:20000,products:fallbackProducts};
let store=loadStore();
let products=normalizeProducts(store.products);
let cart=loadCart();
let selectedCategory='전체';
let deliveryAddress=null;
let deliveryQuote=null;
let postcodePromise=null;
let quoteRequestId=0;

function money(value){return `${Math.max(0,Number(value)||0).toLocaleString('ko-KR')}원`;}
function demoMode(){return new URLSearchParams(location.search).get('demo')==='1';}
function loadStore(){if(demoMode())return fallbackStore;try{const saved=JSON.parse(localStorage.getItem(ONBOARD_KEY)||'null');return saved?.previewOnly?{...fallbackStore,...saved}:fallbackStore;}catch{return fallbackStore;}}
function normalizeProducts(list){return (Array.isArray(list)&&list.length?list:fallbackProducts).slice(0,500).filter(item=>item&&String(item.name||'').trim()&&Number(item.price)>0).map((item,index)=>({id:String(item.id||`item-${index}`),name:String(item.name).trim(),price:Number(item.price),unit:String(item.unit||'개'),stockMode:String(item.stockMode||'판매 가능'),stockQuantity:item.stockQuantity==null?null:Math.max(0,Number(item.stockQuantity)||0),category:String(item.category||store.category||'등록상품'),description:String(item.description||'')}));}
function loadCart(){if(demoMode())return{};try{const saved=JSON.parse(localStorage.getItem(CART_KEY)||'{}');return saved&&typeof saved==='object'?saved:{};}catch{return {};}}
function saveCart(){if(!demoMode())localStorage.setItem(CART_KEY,JSON.stringify(cart));}
function iconFor(product){const text=`${product.name} ${product.category}`;if(/생수|음료|주스/.test(product.name))return'💧';if(/채소|배추|과일/.test(text))return'🥬';if(/고추|식료|반찬/.test(text))return'🌶️';if(/공구|철물|나사/.test(text))return'🔧';if(/꽃|선물/.test(text))return'💐';return'🛍️';}
function applyStore(){document.querySelector('#storeName').textContent=store.storeName||fallbackStore.storeName;document.querySelector('#cartStoreName').textContent=store.storeName||fallbackStore.storeName;document.querySelector('#storeCategory').textContent=store.category||'동네상점';document.querySelector('#storeAddress').textContent=store.address||'여수시 온라인 상점';const subsidy=Math.max(0,Number(store.subsidy)||0);const badge=document.querySelector('#subsidyBadge');badge.hidden=!subsidy;badge.textContent=subsidy?`배송비 ${money(subsidy)} 지원`:'';}
function renderCategories(){const nav=document.querySelector('#categoryFilters');const values=['전체',...new Set(products.map(product=>product.category))];nav.replaceChildren();values.forEach(category=>{const button=document.createElement('button');button.type='button';button.textContent=category;button.setAttribute('aria-pressed',String(category===selectedCategory));button.addEventListener('click',()=>{selectedCategory=category;renderCategories();renderProducts();});nav.append(button);});}
function visibleProducts(){const query=document.querySelector('#productSearch').value.trim().toLocaleLowerCase('ko-KR');return products.filter(product=>(selectedCategory==='전체'||product.category===selectedCategory)&&(!query||`${product.name} ${product.description} ${product.unit}`.toLocaleLowerCase('ko-KR').includes(query)));}
function renderProducts(){const grid=document.querySelector('#productGrid');const items=visibleProducts();document.querySelector('#resultCount').textContent=`${items.length}개`;grid.replaceChildren();if(!items.length){const empty=document.createElement('p');empty.className='empty-catalog';empty.textContent='찾는 상품이 없습니다. 다른 검색어나 분류를 선택해 주세요.';grid.append(empty);return;}items.forEach(product=>{const card=document.createElement('article');card.className='product-card';const visual=document.createElement('div');visual.className='product-visual';visual.setAttribute('aria-hidden','true');visual.textContent=iconFor(product);const copy=document.createElement('div');copy.className='product-copy';const category=document.createElement('small');category.textContent=product.category;const name=document.createElement('strong');name.textContent=product.name;const price=document.createElement('span');price.textContent=`${money(product.price)} / ${product.unit}`;const stock=document.createElement('em');stock.textContent=product.stockMode==='수량 관리'?`재고 ${product.stockQuantity}개`:product.stockMode;const add=document.createElement('button');add.type='button';add.textContent='장바구니 담기';add.addEventListener('click',()=>addToCart(product));copy.append(category,name,price,stock,add);card.append(visual,copy);grid.append(card);});}
function addToCart(product){const current=Math.max(0,Number(cart[product.id])||0);const limit=product.stockMode==='수량 관리'?Math.max(0,Number(product.stockQuantity)||0):99;if(current>=limit)return;cart[product.id]=current+1;saveCart();deliveryQuote=null;renderCart();if(deliveryAddress)requestDeliveryQuote();}
function changeQuantity(id,change){const product=products.find(item=>item.id===id);if(!product)return;const limit=product.stockMode==='수량 관리'?Math.max(0,Number(product.stockQuantity)||0):99;const next=Math.max(0,Math.min(limit,(Number(cart[id])||0)+change));if(next)cart[id]=next;else delete cart[id];saveCart();deliveryQuote=null;renderCart();if(deliveryAddress&&next)requestDeliveryQuote();}
function cartLines(){return products.map(product=>({product,quantity:Math.max(0,Number(cart[product.id])||0)})).filter(line=>line.quantity>0);}
function renderCart(){const lines=cartLines();const count=lines.reduce((sum,line)=>sum+line.quantity,0);const subtotal=lines.reduce((sum,line)=>sum+line.product.price*line.quantity,0);const subsidy=subtotal>=Math.max(0,Number(store.minimumOrder)||0)?Math.max(0,Number(store.subsidy)||0):0;const open=document.querySelector('#openCart');open.disabled=!count;document.querySelector('#cartCount').textContent=String(count);document.querySelector('#cartBarTotal').textContent=count?`${money(subtotal)} · 배송비 별도`:'상품을 담아주세요';document.querySelector('#productSubtotal').textContent=money(subtotal);document.querySelector('#storeSubsidy').textContent=subsidy?`-${money(subsidy)}`:'0원';const deliveryFee=deliveryQuote?.deliveryFee;const platformFee=deliveryQuote?.platformFee??DEFAULT_PLATFORM_FEE;const customerDelivery=Number.isFinite(deliveryFee)?Math.max(0,deliveryFee-subsidy):null;document.querySelector('#deliveryFee').textContent=deliveryFee==null?'주소 확인 후 계산':money(deliveryFee);document.querySelector('#customerDeliveryFee').textContent=customerDelivery==null?'주소 확인 후 계산':money(customerDelivery);document.querySelector('#platformFee').textContent=money(platformFee);document.querySelector('#orderTotal').textContent=customerDelivery==null?'배송비 계산 전':money(subtotal+customerDelivery+platformFee);const items=document.querySelector('#cartItems');items.replaceChildren();lines.forEach(({product,quantity})=>{const row=document.createElement('article');row.className='cart-item';const name=document.createElement('strong');name.textContent=product.name;const amount=document.createElement('span');amount.textContent=money(product.price*quantity);const unit=document.createElement('small');unit.textContent=`${money(product.price)} / ${product.unit}`;const controls=document.createElement('div');controls.className='quantity';const minus=document.createElement('button');minus.type='button';minus.setAttribute('aria-label',`${product.name} 수량 줄이기`);minus.textContent='−';minus.addEventListener('click',()=>changeQuantity(product.id,-1));const value=document.createElement('b');value.textContent=String(quantity);const plus=document.createElement('button');plus.type='button';plus.setAttribute('aria-label',`${product.name} 수량 늘리기`);plus.textContent='+';plus.addEventListener('click',()=>changeQuantity(product.id,1));controls.append(minus,value,plus);row.append(name,amount,unit,controls);items.append(row);});}

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
  const lines=cartLines();const subtotal=lines.reduce((sum,line)=>sum+line.product.price*line.quantity,0);
  return {version:1,channel:'online_store',pickup:{address:String(store.address||''),zonecode:String(store.addressZonecode||''),detail:String(store.addressDetail||'')},dropoff:{...deliveryAddress,detail:document.querySelector('#addressDetail').value.trim()},order:{subtotal,itemCount:lines.reduce((sum,line)=>sum+line.quantity,0),deliveryClass:'standard',items:lines.map(({product,quantity})=>({productId:product.id,name:product.name,unit:product.unit,quantity}))},merchantDeliverySupport:subtotal>=Math.max(0,Number(store.minimumOrder)||0)?Math.max(0,Number(store.subsidy)||0):0};
}
async function requestDeliveryQuote(){
  if(!deliveryAddress||!cartLines().length)return;
  const requestId=++quoteRequestId;const status=document.querySelector('#quoteStatus');deliveryQuote=null;renderCart();status.className='quote-status is-loading';status.textContent='공식 주소를 확인했습니다. 실제 도로거리 배송비를 계산하는 중입니다…';
  try{
    const response=await fetch(DELIVERY_QUOTE_ENDPOINT,{method:'POST',mode:'cors',headers:{'content-type':'application/json','accept':'application/json','X-Daedong-Client':MATJIDO_PUBLIC_CLIENT},credentials:'omit',body:JSON.stringify(quotePayload())});
    if(!response.ok)throw new Error(`quote-${response.status}`);const result=await response.json();const deliveryFee=Number(result.deliveryFee);const platformFee=Number(result.platformFee);const roadDistanceMeters=Number(result.roadDistanceMeters);
    if(result.available!==true||!Number.isFinite(deliveryFee)||deliveryFee<0||!Number.isFinite(platformFee)||platformFee<0||!Number.isFinite(roadDistanceMeters)||roadDistanceMeters<=0)throw new Error('quote-invalid');if(requestId!==quoteRequestId)return;
    deliveryQuote={quoteId:String(result.quoteId||''),deliveryFee,platformFee,roadDistanceMeters,expiresAt:String(result.expiresAt||''),policyVersion:String(result.policyVersion||'')};status.className='quote-status is-ready';status.textContent='배송비 계산이 완료되었습니다.';renderCart();
  }catch{if(requestId!==quoteRequestId)return;status.className='quote-status is-error';status.textContent='공식 주소는 확인됐습니다. 현재 프리뷰에는 실제 도로거리 견적 서버가 아직 연결되지 않았습니다.';renderCart();}
}

document.querySelector('#productSearch').addEventListener('input',renderProducts);
document.querySelector('#openCart').addEventListener('click',()=>{document.querySelector('#cartPanel').hidden=false;document.body.style.overflow='hidden';});
document.querySelector('#closeCart').addEventListener('click',()=>{document.querySelector('#cartPanel').hidden=true;document.body.style.overflow='';});
document.querySelector('#openAddress').addEventListener('click',openPostcode);
document.querySelector('#postcodeClose').addEventListener('click',closePostcode);
document.querySelector('#addressDetail').addEventListener('change',()=>{if(deliveryAddress)requestDeliveryQuote();});
document.querySelector('#previewOrder').addEventListener('click',()=>{const status=document.querySelector('#orderStatus');if(!deliveryAddress){status.textContent='배송받을 공식 주소를 먼저 선택해 주세요.';return;}if(!deliveryQuote){status.textContent='실제 도로거리 배송비가 확정된 뒤 주문내용을 확인할 수 있습니다.';return;}status.textContent='주소·상품·배송비를 확인했습니다. 실제 결제와 상점 주문접수는 결제 서버 연결 후 가능합니다.';});
applyStore();renderCategories();renderProducts();renderCart();
