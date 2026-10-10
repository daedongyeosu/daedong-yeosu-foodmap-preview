const KAKAO_MAPS_APP_KEY='60e2b8ba2516a035006f7c300e0f9ff2';
const KAKAO_MAPS_SDK_URL=`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAPS_APP_KEY}&libraries=services&autoload=false`;
const form=document.querySelector('#freightForm');
const submit=form.querySelector('button[type="submit"]');
const postcodePanel=document.querySelector('#postcodePanel');
const postcodeFrame=document.querySelector('#postcodeFrame');
const postcodeStatus=document.querySelector('#postcodeStatus');
let selected={pickup:null,dropoff:null};
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
function chooseAddress(kind,value){
  if(kind==='pickup'&&!isYeosu(value.address)){alert('가져올 곳은 현재 여수시 주소만 선택할 수 있습니다.');return;}
  selected[kind]=value;document.querySelector(`[data-address-label="${kind}"]`).textContent=`${value.placeName?`${value.placeName} · `:''}${value.address}`;const verification=document.querySelector(`[data-address-verification="${kind}"]`);verification.textContent=value.source==='kakao_places'?'✓ 카카오 공식 장소검색에서 선택했습니다.':`✓ 공식 주소검색 확인 완료${value.zonecode?` · 우편번호 ${value.zonecode}`:''}`;verification.classList.add('verified');document.querySelector(`[data-address-detail-wrap="${kind}"]`).hidden=false;const results=document.querySelector(`[data-place-results="${kind}"]`);results.hidden=true;results.replaceChildren();updateReady();document.querySelector(`[data-address-detail="${kind}"]`)?.focus();
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
form.addEventListener('submit',event=>{
  event.preventDefault();if(!selected.pickup||!selected.dropoff)return;const data=new FormData(form);const pickupDetail=document.querySelector('[data-address-detail="pickup"]').value.trim();const dropoffDetail=document.querySelector('[data-address-detail="dropoff"]').value.trim();const pickup=`${selected.pickup.address}${pickupDetail?` · ${pickupDetail}`:''}`;const dropoff=`${selected.dropoff.address}${dropoffDetail?` · ${dropoffDetail}`:''}`;const feature=String(data.get('feature')||'');
  const order=window.MatjidoFreightStore.createRequest({route:`${areaOf(selected.pickup.address)} → ${areaOf(selected.dropoff.address)}`,pickupArea:areaOf(selected.pickup.address),dropoffArea:areaOf(selected.dropoff.address),pickup,dropoff,pickupLocation:selected.pickup,dropoffLocation:selected.dropoff,item:String(data.get('item')).trim(),weight:Number(data.get('weight')),required:feature?[feature]:[],contact:String(data.get('contact')).trim(),requestedAt:String(data.get('requestedAt')||''),note:String(data.get('note')||'').trim()});
  document.querySelector('#requestId').textContent=`요청번호 ${order.id}`;document.querySelector('#result').hidden=false;document.querySelector('#result').scrollIntoView({behavior:'smooth',block:'center'});submit.disabled=true;
});
