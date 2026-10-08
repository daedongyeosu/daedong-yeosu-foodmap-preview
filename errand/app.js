const home = document.querySelector('#errandHome');
const request = document.querySelector('#requestPreview');
const postcodePanel = document.querySelector('#postcodePanel');
const postcodeFrame = document.querySelector('#postcodeFrame');
const postcodeStatus = document.querySelector('#postcodeStatus');
const postcodeTarget = document.querySelector('#postcodeTarget');
const addressNext = document.querySelector('#addressNext');
const selectedAddresses = {pickup:null, dropoff:null};
let activeAddressKind = null;
let postcodePromise = null;

function openRequest(){home.hidden=true;request.hidden=false;window.scrollTo({top:0,behavior:'smooth'});}
document.querySelector('#requestStart').addEventListener('click',openRequest);
document.querySelectorAll('[data-kind]').forEach(button=>button.addEventListener('click',openRequest));
document.querySelector('#backHome').addEventListener('click',()=>{request.hidden=true;home.hidden=false;window.scrollTo({top:0,behavior:'smooth'});});

function loadPostcode(){
  if(globalThis.daum?.Postcode)return Promise.resolve(globalThis.daum.Postcode);
  if(postcodePromise)return postcodePromise;
  postcodePromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';
    script.async=true;
    const timer=setTimeout(()=>{script.remove();reject(new Error('timeout'));},7000);
    script.onload=()=>{clearTimeout(timer);globalThis.daum?.Postcode?resolve(globalThis.daum.Postcode):reject(new Error('unavailable'));};
    script.onerror=()=>{clearTimeout(timer);reject(new Error('load'));};
    document.head.append(script);
  }).catch(error=>{postcodePromise=null;throw error;});
  return postcodePromise;
}

function isYeosuAddress(data,address){
  const sido=String(data.sido||'');
  const sigungu=String(data.sigungu||'');
  return (/전라남도|전남/.test(sido)&&/여수시/.test(sigungu))||/^(전라남도|전남)\s+여수시\s/.test(address);
}

function updateAddress(kind,data){
  const address=String(data.roadAddress||data.jibunAddress||data.address||'').trim();
  if(!address){postcodeStatus.textContent='선택한 주소를 확인하지 못했습니다. 다른 검색 결과를 선택해 주세요.';postcodeStatus.classList.add('is-error');return;}
  if(!isYeosuAddress(data,address)){postcodeStatus.textContent='현재는 여수시 주소만 접수할 수 있습니다. 여수시 주소를 선택해 주세요.';postcodeStatus.classList.add('is-error');return;}
  selectedAddresses[kind]={address,zonecode:String(data.zonecode||''),roadAddress:String(data.roadAddress||''),jibunAddress:String(data.jibunAddress||'')};
  document.querySelector(`[data-address-label="${kind}"]`).textContent=address;
  const verification=document.querySelector(`[data-address-verification="${kind}"]`);
  verification.textContent=`✓ 주소검색 확인 완료${data.zonecode?` · 우편번호 ${data.zonecode}`:''}`;
  verification.classList.add('is-verified');
  document.querySelector(`[data-address-detail-wrap="${kind}"]`).hidden=false;
  closePostcode();
  const ready=Boolean(selectedAddresses.pickup&&selectedAddresses.dropoff);
  addressNext.disabled=!ready;
  addressNext.textContent=ready?'확인된 주소로 다음 단계':'주소 두 곳을 먼저 확인해 주세요';
  document.querySelector(`[data-address-detail="${kind}"]`)?.focus();
}

async function openPostcode(kind){
  activeAddressKind=kind;
  request.hidden=true;
  postcodePanel.hidden=false;
  postcodeTarget.textContent=kind==='pickup'?'가져올 곳 주소':'가져다줄 곳 주소';
  postcodeStatus.hidden=false;
  postcodeStatus.classList.remove('is-error');
  postcodeStatus.textContent='주소검색을 불러오는 중입니다.';
  postcodeFrame.innerHTML='';
  window.scrollTo({top:0});
  try{
    const Postcode=await loadPostcode();
    postcodeStatus.hidden=true;
    new Postcode({width:'100%',height:'100%',oncomplete:data=>updateAddress(kind,data)}).embed(postcodeFrame,{autoClose:false});
  }catch{
    postcodeStatus.hidden=false;
    postcodeStatus.classList.add('is-error');
    postcodeStatus.textContent='주소검색을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.';
  }
}

function closePostcode(){
  postcodeFrame.innerHTML='';
  postcodePanel.hidden=true;
  request.hidden=false;
  activeAddressKind=null;
  window.scrollTo({top:0});
}

document.querySelectorAll('[data-address-open]').forEach(button=>button.addEventListener('click',()=>openPostcode(button.dataset.addressOpen)));
document.querySelector('#postcodeBack').addEventListener('click',closePostcode);
addressNext.addEventListener('click',()=>{
  if(!selectedAddresses.pickup||!selectedAddresses.dropoff)return;
  addressNext.textContent='주소 확인 완료 · 다음 단계 준비 중';
});
