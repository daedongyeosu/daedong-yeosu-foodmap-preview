const home = document.querySelector('#errandHome');
const policy = document.querySelector('#policyPreview');
const request = document.querySelector('#requestPreview');
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
const ERRAND_AI_ENDPOINT = 'https://daedong-yeosu-data-api-preview.sisakim.workers.dev/api/errand/assist';
const ERRAND_AI_CLIENT = 'daedong-preview-web-v1-20260804';
const selectedAddresses = {pickup:null, dropoff:null};
let activeAddressKind = null;
let postcodePromise = null;
let aiDraftApplied = false;

function openRequest(){home.hidden=true;policy.hidden=false;request.hidden=true;window.scrollTo({top:0,behavior:'smooth'});}
document.querySelector('#requestStart').addEventListener('click',openRequest);
document.querySelectorAll('[data-kind]').forEach(button=>button.addEventListener('click',openRequest));
document.querySelector('#backHome').addEventListener('click',()=>{request.hidden=true;home.hidden=false;window.scrollTo({top:0,behavior:'smooth'});});
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

function updateAiAssist(){
  aiAssist.disabled=errandContent.value.trim().length<4;
  if(!aiAssist.disabled&&aiStatus.dataset.state==='hint')aiStatus.textContent='';
}

errandContent.addEventListener('input',()=>{
  updateAiAssist();
  if(!aiSuggestion.hidden){aiSuggestion.hidden=true;aiSuggestionText.textContent='';}
  if(aiDraftApplied){
    aiStatus.dataset.state='editing';
    aiStatus.textContent='AI 초안을 고객이 직접 수정하고 있습니다. [고객 확인 필요] 부분과 빠진 내용을 정확하게 고쳐주세요.';
  }
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
  errandContent.focus();
});

document.querySelector('#closeAiSuggestion').addEventListener('click',()=>{
  aiSuggestion.hidden=true;
  aiStatus.dataset.state='';
  aiStatus.textContent='원문을 그대로 유지했습니다.';
});

updateAiAssist();
