const KAKAO_MAPS_APP_KEY='60e2b8ba2516a035006f7c300e0f9ff2';
const KAKAO_MAPS_SDK_URL=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAPS_APP_KEY}&libraries=services&autoload=false`;
const FREIGHT_ROUTE_QUOTE_ENDPOINT='https://daedong-yeosu-admin.sisakim.chatgpt.site/api/errand/quote';
const PUBLIC_CLIENT_HEADER='daedong-preview-web-v1-20260804';
const CUSTOMER_ORDER_KEY='matjidoFreightCustomerActiveOrderIdV1';
const form=document.querySelector('#freightForm');
const submit=form.querySelector('button[type="submit"]');
const postcodePanel=document.querySelector('#postcodePanel');
const postcodeFrame=document.querySelector('#postcodeFrame');
const postcodeStatus=document.querySelector('#postcodeStatus');
let selected={pickup:null,dropoff:null};
let routeQuote=null;
let activeCustomerOrderId=localStorage.getItem(CUSTOMER_ORDER_KEY)||'';
let activeKind='';let postcodePromise=null;let kakaoPromise=null;

function loadPostcode(){
  if(globalThis.daum?.Postcode)return Promise.resolve(globalThis.daum.Postcode);if(postcodePromise)return postcodePromise;
  postcodePromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';script.async=true;const timer=setTimeout(()=>{script.remove();reject(new Error('timeout'));},7000);script.onload=()=>{clearTimeout(timer);globalThis.daum?.Postcode?resolve(globalThis.daum.Postcode):reject(new Error('unavailable'));};script.onerror=()=>{clearTimeout(timer);reject(new Error('load'));};document.head.append(script);}).catch(error=>{postcodePromise=null;throw error;});return postcodePromise;
}
function loadKakao(){
  if(globalThis.kakao?.maps?.services)return Promise.resolve(globalThis.kakao.maps.services);if(kakaoPromise)return kakaoPromise;
  kakaoPromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=KAKAO_MAPS_SDK_URL;script.async=true;const timer=setTimeout(()=>{script.remove();reject(new Error('timeout'));},8000);script.onload=()=>{clearTimeout(timer);if(!globalThis.kakao?.maps){reject(new Error('unavailable'));return;}globalThis.kakao.maps.load(()=>globalThis.kakao?.maps?.services?resolve(globalThis.kakao.maps.services):reject(new Error('services')));};script.onerror=()=>{clearTimeout(timer);reject(new Error('load'));};document.head.append(script);}).catch(error=>{kakaoPromise=null;throw error;});return kakaoPromise;
}
const isYeosu=address=>/(?:^|\s)여수시(?:\s|$)/.test(String(address||''));
const areaOf=value=>{const matches=String(value).match(/[가-힣0-9]+(?:동|읍|면|리)(?=\s|$)/g);return matches?.at(-1)||String(value).split(' ').slice(-2).join(' ');};
function updateReady(){const ready=Boolean(selected.pickup&&selected.dropoff);submit.disabled=!ready;submit.textContent=ready?'무료로 견적 요청해보기':'출발지와 도착지를 먼저 확인해 주세요';}
const km=meters=>`${(Number(meters||0)/1000).toFixed(1)}km`;
const duration=seconds=>{const minutes=Math.round(Number(seconds||0)/60);const hours=Math.floor(minutes/60);return hours?`${hours}시간 ${minutes%60}분`:`${minutes}분`;};
const won=value=>`${Number(value||0).toLocaleString('ko-KR')}원`;
function resetRouteQuote(){
  routeQuote=null;const panel=document.querySelector('#routeQuote');const detail=document.querySelector('#routeQuoteDetail');const button=document.querySelector('#routeQuoteButton');
  panel.hidden=!(selected.pickup&&selected.dropoff);detail.hidden=true;detail.replaceChildren();button.disabled=false;if(panel.hidden)return;
  if(isYeosu(selected.dropoff.address)){document.querySelector('#routeQuoteBadge').textContent='여수 시내';document.querySelector('#routeQuoteMessage').textContent='여수 안쪽 배송은 관리자 화면에서 실제 내비거리와 현장 조건을 확인해 견적합니다.';button.hidden=true;}
  else{document.querySelector('#routeQuoteBadge').textContent='왕복 계산';document.querySelector('#routeQuoteMessage').textContent='갈 때와 빈차로 돌아올 때의 실제 자동차 경로·시간·통행료를 함께 계산합니다.';button.hidden=false;button.textContent='왕복 도로거리·예상견적 계산';}
}
function showRouteQuote(payload){
  routeQuote=payload;const detail=document.querySelector('#routeQuoteDetail');detail.innerHTML=`<dt>갈 때</dt><dd>${km(payload.outbound.distance)} · ${duration(payload.outbound.duration)}</dd><dt>빈차 회송</dt><dd>${km(payload.inbound.distance)} · ${duration(payload.inbound.duration)}</dd><dt>왕복 합계</dt><dd>${km(payload.quote.distanceMeters)} · ${duration(payload.quote.durationSeconds)}</dd><dt>왕복 통행료</dt><dd>${won(payload.quote.tollWon)}</dd><dt>참고견적</dt><dd class="total">${won(payload.quote.totalWon)}</dd>`;detail.hidden=false;document.querySelector('#routeQuoteBadge').textContent='도로거리 확인';document.querySelector('#routeQuoteMessage').textContent='카카오 자동차 경로로 왕복 운행을 계산했습니다. 최종 금액은 관리자가 확정합니다.';
}
async function requestRouteQuote(){
  const button=document.querySelector('#routeQuoteButton');button.disabled=true;button.textContent='실제 도로경로 계산 중…';document.querySelector('#routeQuoteMessage').textContent='카카오 자동차 길찾기로 갈 때와 돌아올 때를 각각 확인하고 있습니다.';
  try{const response=await fetch(FREIGHT_ROUTE_QUOTE_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Daedong-Client':PUBLIC_CLIENT_HEADER},body:JSON.stringify({pickupAddress:selected.pickup.address,dropoffAddress:selected.dropoff.address})});const payload=await response.json().catch(()=>({}));if(!response.ok||!payload.available)throw new Error(payload.reason||'route_lookup_failed');showRouteQuote(payload);button.textContent='도로거리·견적 다시 계산';}
  catch(error){routeQuote=null;document.querySelector('#routeQuoteBadge').textContent='관리자 확인';document.querySelector('#routeQuoteMessage').textContent=error.message==='route_provider_not_configured'?'자동 경로계산을 준비 중입니다. 주소는 그대로 저장되며 관리자가 실제 내비거리와 통행료를 확인해 견적합니다.':'도로경로를 자동 확인하지 못했습니다. 관리자가 실제 내비거리와 통행료를 확인해 견적합니다.';button.textContent='다시 계산';}
  finally{button.disabled=false;}
}
function renderCustomerDispatch(state=window.MatjidoFreightStore.read()){
  if(!activeCustomerOrderId)return;const order=state.orders.find(item=>item.id===activeCustomerOrderId);if(!order)return;
  const seconds=window.MatjidoFreightStore.offerSecondsRemaining(order);const offeredMessage=order.boostEligible?'아직 수락한 기사가 없습니다. 급하면 기사에게 전달할 금액을 직접 올릴 수 있습니다.':Number(order.boostTotal||0)>=window.MatjidoFreightStore.MAX_BOOST_WON?'빠른 배차 추가금이 최대 금액에 도달했습니다. 기사 수락을 기다리고 있습니다.':`현재 수행료 ${won(order.driverPayout)}으로 기사에게 알리는 중입니다. ${seconds}초 뒤에도 미수락이면 추가금 선택이 열립니다.`;
  const offerCopy=order.recoveryPriority?'기존 기사의 수행이 어려워져 고객 추가비용 없이 다른 기사를 긴급 배차하고 있습니다.':offeredMessage;const copy={QUOTING:['견적 검토 중','관리자가 차량과 작업조건을 확인하고 있습니다.'],PAID:['결제 확인·배차 준비','결제 확인 후 조건에 맞는 기사에게 알립니다.'],OFFERED:[order.recoveryPriority?'긴급 재배차 중':'기사 배차 중',offerCopy],ASSIGNED:['기사 배차 완료','기사가 픽업 약속을 확인하고 수락했습니다.'],ARRIVED:['기사가 출발지에 도착','물품 인수를 준비하고 있습니다.'],PICKED_UP:['배송 중','기사가 물품을 인수해 이동 중입니다.'],SETTLEMENT_PENDING:['배송 완료','완료 증빙을 확인하고 있습니다.'],REFUND_PENDING:['전액환불 처리 중','약속을 지킬 대체기사를 구하지 못해 결제금액 전액을 환불합니다.']}[order.status]||['진행상태 확인 중','주문 상태를 확인하고 있습니다.'];
  document.querySelector('#dispatchStatus').textContent=copy[0];document.querySelector('#dispatchMessage').textContent=copy[1];document.querySelector('#boostBox').hidden=!(order.status==='OFFERED'&&order.boostEligible&&!order.assignedDriverId&&!order.recoveryPriority);
}
function addBoost(amount){
  const result=window.MatjidoFreightStore.addCustomerBoost(activeCustomerOrderId,amount);if(!result.ok){alert(result.reason==='INVALID_AMOUNT'?'추가금은 1,000원 단위이며 누적 100,000원까지 가능합니다.':'이미 기사가 수락했거나 추가금 접수 시간이 종료됐습니다.');return;}document.querySelector('#customBoost').value='';renderCustomerDispatch();
}
function chooseAddress(kind,value){
  if(kind==='pickup'&&!isYeosu(value.address)){alert('가져올 곳은 현재 여수시 주소만 선택할 수 있습니다.');return;}
  selected[kind]=value;document.querySelector(`[data-address-label="${kind}"]`).textContent=`${value.placeName?`${value.placeName} · `:''}${value.address}`;const verification=document.querySelector(`[data-address-verification="${kind}"]`);verification.textContent=value.source==='kakao_places'?'✓ 카카오 공식 장소검색에서 선택했습니다.':`✓ 공식 주소검색 확인 완료${value.zonecode?` · 우편번호 ${value.zonecode}`:''}`;verification.classList.add('verified');document.querySelector(`[data-address-detail-wrap="${kind}"]`).hidden=false;const results=document.querySelector(`[data-place-results="${kind}"]`);results.hidden=true;results.replaceChildren();updateReady();resetRouteQuote();document.querySelector(`[data-address-detail="${kind}"]`)?.focus();
}
function searchKeyword(places,query){return new Promise((resolve,reject)=>places.keywordSearch(query,(data,status)=>{if(status===globalThis.kakao.maps.services.Status.OK)resolve(data);else if(status===globalThis.kakao.maps.services.Status.ZERO_RESULT)resolve([]);else reject(new Error('search'));}));}
async function searchPlaces(kind){
  const input=document.querySelector(`[data-place-query="${kind}"]`);const query=String(input.value||'').trim();const box=document.querySelector(`[data-place-results="${kind}"]`);box.hidden=false;if(query.length<2){box.innerHTML='<p>가게나 건물 이름을 두 글자 이상 입력해 주세요.</p>';return;}box.innerHTML='<p>카카오 공식 장소검색에서 찾는 중입니다…</p>';
  try{const services=await loadKakao();const places=new services.Places();const rows=await searchKeyword(places,kind==='pickup'?`여수 ${query}`:query);const filtered=kind==='pickup'?rows.filter(row=>isYeosu(row.road_address_name||row.address_name)):rows;box.replaceChildren();const summary=document.createElement('p');summary.textContent=filtered.length?`공식 장소검색 결과 ${Math.min(filtered.length,15)}개`:'일치하는 장소가 없습니다. 아래 주소찾기를 이용해 주세요.';box.append(summary);filtered.slice(0,15).forEach(place=>{const address=String(place.road_address_name||place.address_name||'').trim();const button=document.createElement('button');button.type='button';button.className='place-result';button.innerHTML=`<span><b></b><small></small></span><strong>선택</strong>`;button.querySelector('b').textContent=place.place_name;button.querySelector('small').textContent=address;button.addEventListener('click',()=>chooseAddress(kind,{address,roadAddress:String(place.road_address_name||''),jibunAddress:String(place.address_name||''),placeName:String(place.place_name||''),placeId:String(place.id||''),latitude:Number(place.y),longitude:Number(place.x),source:'kakao_places'}));box.append(button);});}catch{box.innerHTML='<p>장소검색을 불러오지 못했습니다. 아래 공식 주소찾기를 이용해 주세요.</p>';}
}
async function coordinatesFor(address){try{const services=await loadKakao();const geocoder=new services.Geocoder();return await new Promise(resolve=>geocoder.addressSearch(address,(rows,status)=>{if(status===globalThis.kakao.maps.services.Status.OK&&rows[0])resolve({latitude:Number(rows[0].y),longitude:Number(rows[0].x)});else resolve({latitude:null,longitude:null});}));}catch{return {latitude:null,longitude:null};}}
async function completePostcode(kind,data){
  const address=String(data.roadAddress||data.jibunAddress||data.address||'').trim();if(!address){postcodeStatus.textContent='선택한 주소를 확인하지 못했습니다.';postcodeStatus.classList.add('error');return;}if(kind==='pickup'&&!isYeosu(address)){postcodeStatus.textContent='가져올 곳은 현재 여수시 주소만 선택할 수 있습니다.';postcodeStatus.classList.add('error');return;}const coords=await coordinatesFor(address);chooseAddress(kind,{address,zonecode:String(data.zonecode||''),roadAddress:String(data.roadAddress||''),jibunAddress:String(data.jibunAddress||''),placeName:'',placeId:'',source:'daum_postcode',...coords});closePostcode();
}
async function openPostcode(kind){activeKind=kind;postcodePanel.hidden=false;document.querySelector('#postcodeTarget').textContent=kind==='pickup'?'가져올 곳 · 여수시 주소':'가져다줄 곳 · 전국 주소';postcodeStatus.hidden=false;postcodeStatus.classList.remove('error');postcodeStatus.textContent='주소검색을 불러오는 중입니다.';postcodeFrame.innerHTML='';window.scrollTo({top:0});try{const Postcode=await loadPostcode();postcodeStatus.hidden=true;new Postcode({width:'100%',height:'100%',oncomplete:data=>completePostcode(kind,data)}).embed(postcodeFrame,{autoClose:false});}catch{postcodeStatus.hidden=false;postcodeStatus.classList.add('error');postcodeStatus.textContent='주소검색을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.';}}
function closePostcode(){activeKind='';postcodePanel.hidden=true;postcodeFrame.innerHTML='';}

document.querySelectorAll('[data-place-search]').forEach(button=>button.addEventListener('click',()=>searchPlaces(button.dataset.placeSearch)));
document.querySelectorAll('[data-place-query]').forEach(input=>input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchPlaces(input.dataset.placeQuery);}}));
document.querySelectorAll('[data-address-open]').forEach(button=>button.addEventListener('click',()=>openPostcode(button.dataset.addressOpen)));
document.querySelector('#postcodeBack').addEventListener('click',closePostcode);
document.querySelector('#routeQuoteButton').addEventListener('click',requestRouteQuote);
document.querySelectorAll('[data-boost]').forEach(button=>button.addEventListener('click',()=>addBoost(Number(button.dataset.boost))));
document.querySelector('#customBoostButton').addEventListener('click',()=>addBoost(Number(document.querySelector('#customBoost').value||0)));
form.addEventListener('submit',event=>{
  event.preventDefault();if(!selected.pickup||!selected.dropoff)return;const data=new FormData(form);const pickupDetail=document.querySelector('[data-address-detail="pickup"]').value.trim();const dropoffDetail=document.querySelector('[data-address-detail="dropoff"]').value.trim();const pickup=`${selected.pickup.address}${pickupDetail?` · ${pickupDetail}`:''}`;const dropoff=`${selected.dropoff.address}${dropoffDetail?` · ${dropoffDetail}`:''}`;const feature=String(data.get('feature')||'');
  const order=window.MatjidoFreightStore.createRequest({route:`${areaOf(selected.pickup.address)} → ${areaOf(selected.dropoff.address)}`,pickupArea:areaOf(selected.pickup.address),dropoffArea:areaOf(selected.dropoff.address),pickup,dropoff,pickupLocation:selected.pickup,dropoffLocation:selected.dropoff,routeQuote,distance:routeQuote?Number(routeQuote.quote.distanceMeters||0)/1000:0,item:String(data.get('item')).trim(),weight:Number(data.get('weight')),fleetClass:String(data.get('fleetClass')||''),required:feature?[feature]:[],contact:String(data.get('contact')).trim(),requestedAt:String(data.get('requestedAt')||''),note:String(data.get('note')||'').trim()});
  activeCustomerOrderId=order.id;localStorage.setItem(CUSTOMER_ORDER_KEY,order.id);document.querySelector('#requestId').textContent=`요청번호 ${order.id}`;document.querySelector('#result').hidden=false;renderCustomerDispatch();document.querySelector('#result').scrollIntoView({behavior:'smooth',block:'center'});submit.disabled=true;
});
window.MatjidoFreightStore.subscribe(renderCustomerDispatch);
setInterval(()=>{window.MatjidoFreightStore.checkAssignmentCommitments();window.MatjidoFreightStore.expireUnacceptedOffers();renderCustomerDispatch();},1000);
if(activeCustomerOrderId&&window.MatjidoFreightStore.read().orders.some(order=>order.id===activeCustomerOrderId)){document.querySelector('#requestId').textContent=`요청번호 ${activeCustomerOrderId}`;document.querySelector('#result').hidden=false;renderCustomerDispatch();}
