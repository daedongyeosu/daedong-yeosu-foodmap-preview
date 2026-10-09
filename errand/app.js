const home = document.querySelector('#errandHome');
const policy = document.querySelector('#policyPreview');
const request = document.querySelector('#requestPreview');
const payment = document.querySelector('#paymentPreview');
const postcodePanel = document.querySelector('#postcodePanel');
const postcodeFrame = document.querySelector('#postcodeFrame');
const postcodeStatus = document.querySelector('#postcodeStatus');
const postcodeTarget = document.querySelector('#postcodeTarget');
const addressNext = document.querySelector('#addressNext');
const errandContent = document.querySelector('#errandContent');
const aiAssist = document.querySelector('#aiAssist');
const aiSuggestion = document.querySelector('#aiSuggestion');
const aiSuggestionText = document.querySelector('#aiSuggestionText');
const aiStatus = document.querySelector('#aiStatus');
const itemName = document.querySelector('#itemName');
const itemPhoto = document.querySelector('#itemPhoto');
const itemPhotoPreview = document.querySelector('#itemPhotoPreview');
const itemPhotoImage = document.querySelector('#itemPhotoImage');
const itemPhotoName = document.querySelector('#itemPhotoName');
const itemPhotoStatus = document.querySelector('#itemPhotoStatus');
const draftResume = document.querySelector('#draftResume');
const draftResumeTime = document.querySelector('#draftResumeTime');
const ERRAND_AI_ENDPOINT = 'https://daedong-yeosu-data-api-preview.sisakim.workers.dev/api/errand/assist';
const ERRAND_AI_CLIENT = 'daedong-preview-web-v1-20260804';
const ERRAND_DRAFT_KEY = 'matjidoErrandDraftV1';
const ERRAND_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const selectedAddresses = {pickup:null, dropoff:null};
let activeAddressKind = null;
let postcodePromise = null;
let aiDraftApplied = false;
let selectedItemKind = '';
let itemPhotoUrl = '';
let restoringDraft = false;
let draftSaveTimer = null;

function draftSnapshot(){
  return {
    version:1,
    updatedAt:Date.now(),
    addresses:{pickup:selectedAddresses.pickup,dropoff:selectedAddresses.dropoff},
    details:{
      pickup:document.querySelector('[data-address-detail="pickup"]')?.value.trim()||'',
      dropoff:document.querySelector('[data-address-detail="dropoff"]')?.value.trim()||'',
    },
    itemKind:selectedItemKind,
    itemName:itemName.value.trim(),
    itemScale:document.querySelector('[name="itemScale"]:checked')?.value||'',
    conditions:[...document.querySelectorAll('.extra-conditions input:checked')].map(input=>input.value),
    description:errandContent.value,
  };
}

function meaningfulDraft(draft){
  return Boolean(draft?.addresses?.pickup||draft?.addresses?.dropoff||draft?.itemKind||draft?.itemName||draft?.itemScale||draft?.conditions?.length||String(draft?.description||'').trim());
}

function showDraftResume(draft){
  if(!meaningfulDraft(draft)){draftResume.hidden=true;return;}
  draftResume.hidden=false;
  const saved=new Date(Number(draft.updatedAt)||Date.now());
  draftResumeTime.textContent=`${saved.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})} 임시 저장`;
}

function saveDraftNow(){
  if(restoringDraft)return;
  const draft=draftSnapshot();
  try{
    if(meaningfulDraft(draft))localStorage.setItem(ERRAND_DRAFT_KEY,JSON.stringify(draft));
    else localStorage.removeItem(ERRAND_DRAFT_KEY);
    showDraftResume(draft);
  }catch{}
}

function scheduleDraftSave(){
  clearTimeout(draftSaveTimer);
  draftSaveTimer=setTimeout(saveDraftNow,250);
}

function readDraft(){
  try{
    const draft=JSON.parse(localStorage.getItem(ERRAND_DRAFT_KEY)||'null');
    if(!draft||draft.version!==1||Date.now()-Number(draft.updatedAt)>ERRAND_DRAFT_TTL_MS){
      localStorage.removeItem(ERRAND_DRAFT_KEY);
      return null;
    }
    return meaningfulDraft(draft)?draft:null;
  }catch{
    try{localStorage.removeItem(ERRAND_DRAFT_KEY);}catch{}
    return null;
  }
}

function paintRestoredAddress(kind,address,detail=''){
  if(!address?.address)return;
  selectedAddresses[kind]={
    address:String(address.address),
    zonecode:String(address.zonecode||''),
    roadAddress:String(address.roadAddress||''),
    jibunAddress:String(address.jibunAddress||''),
  };
  document.querySelector(`[data-address-label="${kind}"]`).textContent=selectedAddresses[kind].address;
  const verification=document.querySelector(`[data-address-verification="${kind}"]`);
  verification.textContent=`✓ 임시 저장된 검색주소${selectedAddresses[kind].zonecode?` · 우편번호 ${selectedAddresses[kind].zonecode}`:''}`;
  verification.classList.add('is-verified');
  document.querySelector(`[data-address-detail-wrap="${kind}"]`).hidden=false;
  document.querySelector(`[data-address-detail="${kind}"]`).value=String(detail||'');
}

function restoreDraft(draft){
  restoringDraft=true;
  paintRestoredAddress('pickup',draft.addresses?.pickup,draft.details?.pickup);
  paintRestoredAddress('dropoff',draft.addresses?.dropoff,draft.details?.dropoff);
  selectedItemKind=String(draft.itemKind||'');
  document.querySelectorAll('[data-item-kind]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.itemKind===selectedItemKind)));
  itemName.value=String(draft.itemName||'');
  document.querySelectorAll('[name="itemScale"]').forEach(input=>{input.checked=input.value===draft.itemScale;});
  const conditions=new Set(Array.isArray(draft.conditions)?draft.conditions:[]);
  document.querySelectorAll('.extra-conditions input').forEach(input=>{input.checked=conditions.has(input.value);});
  errandContent.value=String(draft.description||'');
  restoringDraft=false;
  updateAiAssist();
  updateRequestReadiness();
  showDraftResume(draft);
}

function clearDraft(){
  clearTimeout(draftSaveTimer);
  try{localStorage.removeItem(ERRAND_DRAFT_KEY);}catch{}
  selectedAddresses.pickup=null;selectedAddresses.dropoff=null;selectedItemKind='';aiDraftApplied=false;
  document.querySelectorAll('[data-address-label]').forEach(label=>{label.textContent='도로명주소를 검색해 주세요';});
  document.querySelectorAll('[data-address-verification]').forEach(label=>{label.textContent='아직 확인된 주소가 없습니다.';label.classList.remove('is-verified');});
  document.querySelectorAll('[data-address-detail-wrap]').forEach(wrap=>{wrap.hidden=true;});
  document.querySelectorAll('[data-address-detail]').forEach(input=>{input.value='';});
  document.querySelectorAll('[data-item-kind]').forEach(button=>button.setAttribute('aria-pressed','false'));
  document.querySelectorAll('[name="itemScale"],.extra-conditions input').forEach(input=>{input.checked=false;});
  itemName.value='';errandContent.value='';draftResume.hidden=true;
  updateAiAssist();updateRequestReadiness();
}

function selectItemKind(kind){
  selectedItemKind=kind;
  document.querySelectorAll('[data-item-kind]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.itemKind===kind)));
  updateRequestReadiness();
  scheduleDraftSave();
}

function openRequest(kind=''){
  if(kind)selectItemKind(kind);
  home.hidden=true;policy.hidden=false;request.hidden=true;payment.hidden=true;window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelector('#requestStart').addEventListener('click',()=>openRequest());
document.querySelectorAll('[data-kind]').forEach(button=>button.addEventListener('click',()=>openRequest(button.dataset.kind)));
document.querySelectorAll('[data-item-kind]').forEach(button=>button.addEventListener('click',()=>selectItemKind(button.dataset.itemKind)));
document.querySelector('#backHome').addEventListener('click',()=>{request.hidden=true;payment.hidden=true;home.hidden=false;window.scrollTo({top:0,behavior:'smooth'});});
document.querySelector('#policyBack').addEventListener('click',()=>{policy.hidden=true;home.hidden=false;window.scrollTo({top:0,behavior:'smooth'});});

const policyChecks=[...document.querySelectorAll('[data-policy-check]')];
const policyContinue=document.querySelector('#policyContinue');
function updatePolicyGate(){
  const ready=policyChecks.every(input=>input.checked);
  policyContinue.disabled=!ready;
  policyContinue.textContent=ready?'동의하고 주소 입력하기 →':'필수 내용을 확인해 주세요';
}
policyChecks.forEach(input=>input.addEventListener('change',updatePolicyGate));
policyContinue.addEventListener('click',()=>{
  if(policyContinue.disabled)return;
  policy.hidden=true;
  request.hidden=false;
  window.scrollTo({top:0,behavior:'smooth'});
});

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
  updateRequestReadiness();
  scheduleDraftSave();
  document.querySelector(`[data-address-detail="${kind}"]`)?.focus();
}

function updateRequestReadiness(){
  const addressesReady=Boolean(selectedAddresses.pickup&&selectedAddresses.dropoff);
  const itemReady=Boolean(selectedItemKind&&itemName.value.trim()&&document.querySelector('[name="itemScale"]:checked'));
  const contentReady=errandContent.value.trim().length>=4;
  addressNext.disabled=!(addressesReady&&itemReady&&contentReady);
  if(!addressesReady)addressNext.textContent='주소 두 곳을 먼저 확인해 주세요';
  else if(!selectedItemKind)addressNext.textContent='물품 종류를 선택해 주세요';
  else if(!itemName.value.trim())addressNext.textContent='물품명과 수량을 적어주세요';
  else if(!document.querySelector('[name="itemScale"]:checked'))addressNext.textContent='배송 규모를 선택해 주세요';
  else if(!contentReady)addressNext.textContent='심부름 내용을 4글자 이상 적어주세요';
  else addressNext.textContent='요금·결제수단 확인하기 →';
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
  const itemScale=document.querySelector('[name="itemScale"]:checked')?.value;
  if(!selectedAddresses.pickup||!selectedAddresses.dropoff||!selectedItemKind||!itemName.value.trim()||!itemScale||errandContent.value.trim().length<4)return;
  const pickupDetail=document.querySelector('[data-address-detail="pickup"]')?.value.trim();
  const dropoffDetail=document.querySelector('[data-address-detail="dropoff"]')?.value.trim();
  const conditions=[...document.querySelectorAll('.extra-conditions input:checked')].map(input=>input.value);
  document.querySelector('#paymentPickup').textContent=`${selectedAddresses.pickup.address}${pickupDetail?` · ${pickupDetail}`:''}`;
  document.querySelector('#paymentDropoff').textContent=`${selectedAddresses.dropoff.address}${dropoffDetail?` · ${dropoffDetail}`:''}`;
  document.querySelector('#paymentItem').textContent=`${selectedItemKind} · ${itemName.value.trim()} · ${itemScale}`;
  document.querySelector('#paymentConditions').textContent=conditions.length?`추가 조건: ${conditions.join(' · ')}`:'추가 조건 없음';
  document.querySelector('#paymentRequest').textContent=errandContent.value.trim();
  request.hidden=true;
  payment.hidden=false;
  window.scrollTo({top:0,behavior:'smooth'});
});

document.querySelector('#paymentBack').addEventListener('click',()=>{
  payment.hidden=true;
  request.hidden=false;
  window.scrollTo({top:0,behavior:'smooth'});
});

function updateAiAssist(){
  aiAssist.disabled=errandContent.value.trim().length<4;
  if(!aiAssist.disabled&&aiStatus.dataset.state==='hint')aiStatus.textContent='';
}

errandContent.addEventListener('input',()=>{
  updateAiAssist();
  updateRequestReadiness();
  scheduleDraftSave();
  if(!aiSuggestion.hidden){aiSuggestion.hidden=true;aiSuggestionText.textContent='';}
  if(aiDraftApplied){
    aiStatus.dataset.state='editing';
    aiStatus.textContent='AI 초안을 고객이 직접 수정하고 있습니다. [고객 확인 필요] 부분과 빠진 내용을 정확하게 고쳐주세요.';
  }
});

itemName.addEventListener('input',()=>{updateRequestReadiness();scheduleDraftSave();});
document.querySelectorAll('[name="itemScale"],.extra-conditions input').forEach(input=>input.addEventListener('change',()=>{updateRequestReadiness();scheduleDraftSave();}));
document.querySelectorAll('[data-address-detail]').forEach(input=>input.addEventListener('input',scheduleDraftSave));
document.querySelector('#itemPhotoPick').addEventListener('click',()=>itemPhoto.click());
itemPhoto.addEventListener('change',()=>{
  const file=itemPhoto.files?.[0];
  if(!file)return;
  if(!file.type.startsWith('image/')){
    itemPhoto.value='';
    itemPhotoStatus.textContent='사진 파일만 선택할 수 있습니다.';
    return;
  }
  if(file.size>10*1024*1024){
    itemPhoto.value='';
    itemPhotoStatus.textContent='사진은 10MB 이하로 선택해 주세요.';
    return;
  }
  if(itemPhotoUrl)URL.revokeObjectURL(itemPhotoUrl);
  itemPhotoUrl=URL.createObjectURL(file);
  itemPhotoImage.src=itemPhotoUrl;
  itemPhotoName.textContent=file.name;
  itemPhotoPreview.hidden=false;
  itemPhotoStatus.textContent='사진을 선택했습니다. 실제 접수 단계에서는 주문과 함께 안전하게 전송됩니다.';
});
document.querySelector('#itemPhotoRemove').addEventListener('click',()=>{
  if(itemPhotoUrl)URL.revokeObjectURL(itemPhotoUrl);
  itemPhotoUrl='';
  itemPhoto.value='';
  itemPhotoImage.removeAttribute('src');
  itemPhotoPreview.hidden=true;
  itemPhotoStatus.textContent='사진을 삭제했습니다.';
});

aiAssist.addEventListener('click',async()=>{
  const original=errandContent.value.trim();
  if(original.length<4){
    aiStatus.dataset.state='hint';
    aiStatus.textContent='먼저 심부름 내용을 네 글자 이상 적어주세요.';
    errandContent.focus();
    return;
  }
  aiAssist.disabled=true;
  aiAssist.textContent='AI가 정리 중…';
  aiSuggestion.hidden=true;
  aiStatus.dataset.state='loading';
  aiStatus.textContent='고객이 적은 사실만 사용해 기사 전달 문장으로 정리하고 있습니다.';
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),15000);
  try{
    const response=await fetch(ERRAND_AI_ENDPOINT,{
      method:'POST',
      headers:{'Content-Type':'application/json','X-Daedong-Client':ERRAND_AI_CLIENT},
      body:JSON.stringify({text:original}),
      signal:controller.signal,
    });
    if(!response.ok)throw new Error(`assist_${response.status}`);
    const result=await response.json();
    const suggestion=String(result?.suggestion||'').trim();
    if(!suggestion)throw new Error('empty_assist');
    aiSuggestionText.textContent=suggestion;
    aiSuggestion.hidden=false;
    aiStatus.dataset.state='ready';
    aiStatus.textContent='AI 제안이 준비됐습니다. 원문과 비교해 확인해 주세요.';
    aiSuggestion.scrollIntoView({behavior:'smooth',block:'nearest'});
  }catch(error){
    aiStatus.dataset.state='error';
    aiStatus.textContent=error?.name==='AbortError'?'AI 응답이 늦어지고 있습니다. 잠시 후 다시 눌러주세요.':'AI 도움을 지금 불러오지 못했습니다. 원문은 그대로 보존되었습니다.';
  }finally{
    clearTimeout(timer);
    aiAssist.textContent='✨ AI에게 도움받기';
    updateAiAssist();
  }
});

document.querySelector('#useAiSuggestion').addEventListener('click',()=>{
  const suggestion=aiSuggestionText.textContent.trim();
  if(!suggestion)return;
  errandContent.value=suggestion;
  aiDraftApplied=true;
  errandContent.classList.add('is-ai-draft');
  aiSuggestion.hidden=true;
  aiStatus.dataset.state='applied';
  aiStatus.textContent='AI 초안을 입력칸에 넣었습니다. [고객 확인 필요] 부분과 나머지 문장을 직접 수정할 수 있습니다.';
  updateAiAssist();
  scheduleDraftSave();
  errandContent.focus();
});

document.querySelector('#closeAiSuggestion').addEventListener('click',()=>{
  aiSuggestion.hidden=true;
  aiStatus.dataset.state='';
  aiStatus.textContent='원문을 그대로 유지했습니다.';
});

document.querySelector('#draftContinue').addEventListener('click',()=>openRequest());
document.querySelector('#draftDelete').addEventListener('click',clearDraft);

const savedDraft=readDraft();
if(savedDraft)restoreDraft(savedDraft);

updateAiAssist();

if(new URLSearchParams(location.search).has('payment')){
  home.hidden=true;
  policy.hidden=true;
  request.hidden=true;
  payment.hidden=false;
}
