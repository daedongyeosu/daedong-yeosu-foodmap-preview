const home = document.querySelector('#errandHome');
const policy = document.querySelector('#policyPreview');
const request = document.querySelector('#requestPreview');
const payment = document.querySelector('#paymentPreview');
const tracking = document.querySelector('#trackingPreview');
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
const itemValue = document.querySelector('#itemValue');
const itemValueUnknown = document.querySelector('#itemValueUnknown');
const riskQuestions = document.querySelector('#riskQuestions');
const riskDecision = document.querySelector('#riskDecision');
const itemPhotoRequirement = document.querySelector('#itemPhotoRequirement');
const itemPhoto = document.querySelector('#itemPhoto');
const itemPhotoPreview = document.querySelector('#itemPhotoPreview');
const itemPhotoImage = document.querySelector('#itemPhotoImage');
const itemPhotoName = document.querySelector('#itemPhotoName');
const itemPhotoStatus = document.querySelector('#itemPhotoStatus');
const draftResume = document.querySelector('#draftResume');
const draftResumeTime = document.querySelector('#draftResumeTime');
const customerName = document.querySelector('#customerName');
const customerPhone = document.querySelector('#customerPhone');
const contactStatus = document.querySelector('#contactStatus');
const previewAgreement = document.querySelector('#previewAgreement');
const previewSubmit = document.querySelector('#previewSubmit');
const ERRAND_AI_ENDPOINT = 'https://daedong-yeosu-data-api-preview.sisakim.workers.dev/api/errand/assist';
const ERRAND_AI_CLIENT = 'daedong-preview-web-v1-20260804';
const KAKAO_MAPS_APP_KEY = '60e2b8ba2516a035006f7c300e0f9ff2';
const KAKAO_MAPS_SDK_URL = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_MAPS_APP_KEY}&libraries=services&autoload=false`;
const ERRAND_DRAFT_KEY = 'matjidoErrandDraftV1';
const ERRAND_DRAFT_TTL_MS = 24 * 60 * 60 * 1000;
const ERRAND_PREVIEW_ORDER_KEY = 'matjidoErrandPreviewOrderV1';
const ERRAND_ORDER_ENDPOINT = 'https://daedong-yeosu-admin.sisakim.chatgpt.site/api/errand/orders';
const previewSubmitStatus = document.querySelector('#previewSubmitStatus');
const selectedAddresses = {pickup:null, dropoff:null};
let activeAddressKind = null;
let postcodePromise = null;
let kakaoPlacesPromise = null;
let aiDraftApplied = false;
let selectedItemKind = '';
let itemPhotoUrl = '';
let restoringDraft = false;
let draftSaveTimer = null;

const ERRAND_BLOCKED_RULES = [
  {pattern:/(현금(?!영수증)|수표|상품권|유가증권|귀금속|금괴|통장|신용카드|체크카드)/u,reason:'현금·유가증권·귀금속·결제수단은 현재 운송하지 않습니다.'},
  {pattern:/(마약|불법\s*약물|장물|총포|권총|소총|탄약|폭발물|휘발유|경유|부탄가스|농약|염산|황산|독극물)/u,reason:'불법 물품·무기·폭발성·인화성·유해 물질은 접수할 수 없습니다.'},
  {pattern:/(살아\s*있는\s*(동물|강아지|고양이|생물)|반려동물\s*(배송|운송)|사람\s*(배송|운송))/u,reason:'사람과 살아 있는 동물은 현재 운송하지 않습니다.'},
  {pattern:/(담배|전자담배|주류|소주|맥주|양주|와인)/u,reason:'담배와 주류는 판매·연령확인 운영기준이 확정되기 전까지 접수하지 않습니다.'},
];

const ERRAND_RISK_RULES = {
  fragile:/(케이크|꽃|화분|유리|도자기|그릇|액자|거울|만년필|파손|깨지|눌림|기울)/u,
  liquid:/(액체|국물|음료|커피|물병|유리병|누수|새는|기름|잉크)/u,
  electronics:/(노트북|태블릿|컴퓨터|모니터|휴대폰|스마트폰|카메라|전자기기|게임기|액정)/u,
  temperature:/(냉장|냉동|아이스크림|생선|육류|회\s|신선|온도|보냉)/u,
  deadline:/(정해진\s*시간|마감|행사|시험|계약서|원본\s*서류|시간\s*필수)/u,
};

function showErrandStep(step){
  home.hidden=step!=='home';
  policy.hidden=step!=='policy';
  request.hidden=step!=='request';
  payment.hidden=step!=='payment';
  tracking.hidden=step!=='tracking';
  postcodePanel.hidden=step!=='postcode';
  if(step!=='postcode')postcodeFrame.innerHTML='';
  window.scrollTo({top:0,behavior:'smooth'});
}

function pushErrandStep(step,url=location.href){
  history.pushState({errandStep:step},'',url);
}

function currentErrandStep(){
  if(!postcodePanel.hidden)return 'postcode';
  if(!tracking.hidden)return 'tracking';
  if(!payment.hidden)return 'payment';
  if(!request.hidden)return 'request';
  if(!policy.hidden)return 'policy';
  return 'home';
}

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
    packingStatus:document.querySelector('[name="packingStatus"]:checked')?.value||'',
    declaredValue:itemValue.value,
    valueUnknown:itemValueUnknown.checked,
    riskConfirmations:[...document.querySelectorAll('[data-risk-question] input:checked')].map(input=>input.value),
    description:errandContent.value,
  };
}

function meaningfulDraft(draft){
  return Boolean(draft?.addresses?.pickup||draft?.addresses?.dropoff||draft?.itemKind||draft?.itemName||draft?.itemScale||draft?.conditions?.length||draft?.packingStatus||draft?.declaredValue||draft?.valueUnknown||String(draft?.description||'').trim());
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
    placeName:String(address.placeName||''),
    placeId:String(address.placeId||''),
    addressSource:String(address.addressSource||''),
    latitude:Number.isFinite(Number(address.latitude))?Number(address.latitude):null,
    longitude:Number.isFinite(Number(address.longitude))?Number(address.longitude):null,
  };
  document.querySelector(`[data-address-label="${kind}"]`).textContent=formatSelectedAddress(selectedAddresses[kind]);
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
  document.querySelectorAll('[name="packingStatus"]').forEach(input=>{input.checked=input.value===draft.packingStatus;});
  itemValue.value=String(draft.declaredValue||'');
  itemValueUnknown.checked=Boolean(draft.valueUnknown);
  itemValue.disabled=itemValueUnknown.checked;
  const riskConfirmations=new Set(Array.isArray(draft.riskConfirmations)?draft.riskConfirmations:[]);
  document.querySelectorAll('[data-risk-question] input').forEach(input=>{input.checked=riskConfirmations.has(input.value);});
  errandContent.value=String(draft.description||'');
  restoringDraft=false;
  updateRiskAssessment();
  updateAiAssist();
  updateRequestReadiness();
  showDraftResume(draft);
}

function clearDraft(){
  clearTimeout(draftSaveTimer);
  try{localStorage.removeItem(ERRAND_DRAFT_KEY);}catch{}
  selectedAddresses.pickup=null;selectedAddresses.dropoff=null;selectedItemKind='';aiDraftApplied=false;
  document.querySelectorAll('[data-address-label]').forEach(label=>{label.textContent='가게가 안 나오면 도로명주소로 찾기';});
  document.querySelectorAll('[data-address-verification]').forEach(label=>{label.textContent='아직 확인된 주소가 없습니다.';label.classList.remove('is-verified');});
  document.querySelectorAll('[data-address-detail-wrap]').forEach(wrap=>{wrap.hidden=true;});
  document.querySelectorAll('[data-address-detail]').forEach(input=>{input.value='';});
  document.querySelectorAll('[data-item-kind]').forEach(button=>button.setAttribute('aria-pressed','false'));
  document.querySelectorAll('[name="itemScale"],[name="packingStatus"],.extra-conditions input,[data-risk-question] input').forEach(input=>{input.checked=false;});
  itemValue.value='';itemValue.disabled=false;itemValueUnknown.checked=false;
  itemName.value='';errandContent.value='';draftResume.hidden=true;
  updateAiAssist();updateRiskAssessment();updateRequestReadiness();
}

function selectItemKind(kind){
  selectedItemKind=kind;
  document.querySelectorAll('[data-item-kind]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.itemKind===kind)));
  updateRiskAssessment();
  updateRequestReadiness();
  scheduleDraftSave();
}

function openRequest(kind=''){
  if(kind)selectItemKind(kind);
  showErrandStep('policy');
  pushErrandStep('policy');
}
document.querySelector('#requestStart').addEventListener('click',()=>openRequest());
document.querySelectorAll('[data-kind]').forEach(button=>button.addEventListener('click',()=>openRequest(button.dataset.kind)));
document.querySelectorAll('[data-item-kind]').forEach(button=>button.addEventListener('click',()=>selectItemKind(button.dataset.itemKind)));
document.querySelector('#backHome').addEventListener('click',()=>{showErrandStep('home');pushErrandStep('home');});
document.querySelector('#policyBack').addEventListener('click',()=>{showErrandStep('home');pushErrandStep('home');});

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
  showErrandStep('request');
  pushErrandStep('request');
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

function formatSelectedAddress(address){
  if(!address)return '';
  return `${address.placeName?`${address.placeName} · `:''}${address.address}`;
}

function loadKakaoPlaces(){
  if(globalThis.kakao?.maps?.services?.Places)return Promise.resolve(new globalThis.kakao.maps.services.Places());
  if(kakaoPlacesPromise)return kakaoPlacesPromise;
  kakaoPlacesPromise=new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src=KAKAO_MAPS_SDK_URL;
    script.async=true;
    const timer=setTimeout(()=>{script.remove();reject(new Error('kakao-timeout'));},8000);
    script.onload=()=>{
      clearTimeout(timer);
      if(!globalThis.kakao?.maps){reject(new Error('kakao-unavailable'));return;}
      globalThis.kakao.maps.load(()=>{
        if(globalThis.kakao?.maps?.services?.Places)resolve(new globalThis.kakao.maps.services.Places());
        else reject(new Error('kakao-places-unavailable'));
      });
    };
    script.onerror=()=>{clearTimeout(timer);reject(new Error('kakao-load'));};
    document.head.append(script);
  }).catch(error=>{kakaoPlacesPromise=null;throw error;});
  return kakaoPlacesPromise;
}

function isYeosuPlace(place){
  return /(?:^|\s)여수시(?:\s|$)/.test(String(place.road_address_name||place.address_name||''));
}

function keywordSearch(places,keyword){
  return new Promise((resolve,reject)=>{
    places.keywordSearch(keyword,(data,status)=>{
      if(status===globalThis.kakao.maps.services.Status.OK){
        const filtered=data.filter(isYeosuPlace);
        resolve({places:filtered,total:filtered.length});
        return;
      }
      if(status===globalThis.kakao.maps.services.Status.ZERO_RESULT){resolve({places:[],total:0});return;}
      reject(new Error('kakao-search'));
    });
  });
}

function selectKakaoPlace(kind,place){
  const address=String(place.road_address_name||place.address_name||'').trim();
  if(!address||!isYeosuPlace(place))return;
  selectedAddresses[kind]={
    address,
    zonecode:'',
    roadAddress:String(place.road_address_name||''),
    jibunAddress:String(place.address_name||''),
    placeName:String(place.place_name||''),
    placeId:String(place.id||''),
    addressSource:'kakao_places',
    latitude:Number.isFinite(Number(place.y))?Number(place.y):null,
    longitude:Number.isFinite(Number(place.x))?Number(place.x):null,
  };
  document.querySelector(`[data-address-label="${kind}"]`).textContent=formatSelectedAddress(selectedAddresses[kind]);
  const verification=document.querySelector(`[data-address-verification="${kind}"]`);
  verification.textContent='✓ 카카오 공식 장소검색에서 선택한 주소입니다.';
  verification.classList.add('is-verified');
  document.querySelector(`[data-address-detail-wrap="${kind}"]`).hidden=false;
  const results=document.querySelector(`[data-place-results="${kind}"]`);
  results.hidden=true;
  results.replaceChildren();
  updateRequestReadiness();
  scheduleDraftSave();
  document.querySelector(`[data-address-detail="${kind}"]`)?.focus();
}

function renderPlaceResults(kind,places,total){
  const container=document.querySelector(`[data-place-results="${kind}"]`);
  container.replaceChildren();
  container.hidden=false;
  const summary=document.createElement('p');
  summary.className='place-result-summary';
  summary.textContent=places.length?`카카오 공식 장소검색 결과 ${places.length}개${total>places.length?` · 여수시 결과만 표시`:''}`:'여수시에서 일치하는 장소를 찾지 못했습니다.';
  container.append(summary);
  if(!places.length){
    const help=document.createElement('p');
    help.className='place-result-help';
    help.textContent='아래 공식 주소 찾기에서 도로명·건물명·지번으로 검색해 주세요.';
    container.append(help);
    return;
  }
  places.forEach(place=>{
    const row=document.createElement('button');
    row.type='button';
    row.className='place-result';
    const text=document.createElement('span');
    const name=document.createElement('b');
    name.textContent=place.place_name;
    const meta=document.createElement('small');
    meta.textContent=place.road_address_name||place.address_name;
    text.append(name,meta);
    const action=document.createElement('strong');
    action.textContent='이 주소 선택';
    row.append(text,action);
    row.addEventListener('click',()=>selectKakaoPlace(kind,place));
    container.append(row);
  });
}

async function searchPlaces(kind){
  const queryInput=document.querySelector(`[data-place-query="${kind}"]`);
  const query=String(queryInput?.value||'').trim();
  const container=document.querySelector(`[data-place-results="${kind}"]`);
  if(query.length<2){
    container.hidden=false;
    container.innerHTML='<p class="place-result-summary">가게명이나 동네명을 두 글자 이상 입력해 주세요.</p>';
    queryInput?.focus();
    return;
  }
  container.hidden=false;
  container.innerHTML='<p class="place-result-summary">카카오 공식 장소검색에서 찾는 중입니다…</p>';
  try{
    const places=await loadKakaoPlaces();
    const result=await keywordSearch(places,`여수 ${query}`);
    renderPlaceResults(kind,result.places.slice(0,15),result.total);
  }catch{
    container.innerHTML='<p class="place-result-summary is-error">카카오 공식 장소검색을 불러오지 못했습니다. 아래 공식 도로명주소 찾기를 이용해 주세요.</p>';
  }
}

function updateAddress(kind,data){
  const address=String(data.roadAddress||data.jibunAddress||data.address||'').trim();
  if(!address){postcodeStatus.textContent='선택한 주소를 확인하지 못했습니다. 다른 검색 결과를 선택해 주세요.';postcodeStatus.classList.add('is-error');return;}
  if(!isYeosuAddress(data,address)){postcodeStatus.textContent='현재는 여수시 주소만 접수할 수 있습니다. 여수시 주소를 선택해 주세요.';postcodeStatus.classList.add('is-error');return;}
  selectedAddresses[kind]={address,zonecode:String(data.zonecode||''),roadAddress:String(data.roadAddress||''),jibunAddress:String(data.jibunAddress||''),placeName:'',placeId:'',addressSource:'daum_postcode',latitude:null,longitude:null};
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

function currentRiskAssessment(){
  const conditions=[...document.querySelectorAll('.extra-conditions input:checked')].map(input=>input.value);
  const text=`${selectedItemKind} ${itemName.value} ${errandContent.value} ${conditions.join(' ')}`.toLowerCase();
  if(!selectedItemKind||!itemName.value.trim())return {level:'waiting',flags:[],requiresPhoto:false,title:'물품 정보를 입력하면 접수 가능 여부를 확인합니다.',description:'접수 전에 예상 처리방식과 필요한 준비를 알려드려요.'};
  const blocked=ERRAND_BLOCKED_RULES.find(rule=>rule.pattern.test(text));
  if(blocked)return {level:'blocked',flags:[],requiresPhoto:false,title:'현재 접수할 수 없는 요청입니다.',description:blocked.reason};
  const flags=[];
  for(const [flag,pattern] of Object.entries(ERRAND_RISK_RULES))if(pattern.test(text))flags.push(flag);
  if(conditions.includes('파손 주의')||conditions.includes('기울이면 안 됨'))flags.push('fragile');
  if(conditions.includes('액체·누수 가능'))flags.push('liquid');
  if(conditions.includes('전자기기'))flags.push('electronics');
  if(conditions.includes('냉장·냉동 유지'))flags.push('temperature');
  if(conditions.includes('정해진 시간 필수'))flags.push('deadline');
  const uniqueFlags=[...new Set(flags)];
  const scale=document.querySelector('[name="itemScale"]:checked')?.value||'';
  const packing=document.querySelector('[name="packingStatus"]:checked')?.value||'';
  const value=Number(itemValue.value||0);
  const needsReview=scale==='큰 짐·여러 박스'||scale==='크기를 잘 모르겠음'||packing==='포장 확인 필요'||value>=500000||itemValueUnknown.checked;
  const requiresPhoto=uniqueFlags.some(flag=>['fragile','electronics'].includes(flag))||scale==='큰 짐·여러 박스'||value>=500000;
  if(needsReview)return {level:'review',flags:uniqueFlags,requiresPhoto,title:'운영자 확인 후 견적을 안내합니다.',description:'크기·포장·물품가액을 확인한 뒤 적합한 차량과 요금을 결정해요.'};
  if(uniqueFlags.length)return {level:'special',flags:uniqueFlags,requiresPhoto,title:'특별취급 조건으로 접수합니다.',description:'추가 확인을 마치면 기사에게 주의사항이 함께 전달돼요.'};
  return {level:'standard',flags:uniqueFlags,requiresPhoto:false,title:'일반 전달 심부름으로 접수할 수 있어요.',description:'포장과 물품가액을 확인하면 예상요금을 볼 수 있어요.'};
}

function updateRiskAssessment(){
  const assessment=currentRiskAssessment();
  const activeFlags=new Set(assessment.flags);
  let visibleQuestions=0;
  document.querySelectorAll('[data-risk-question]').forEach(label=>{
    const active=activeFlags.has(label.dataset.riskQuestion);
    label.hidden=!active;
    if(active)visibleQuestions+=1;
    else label.querySelector('input').checked=false;
  });
  riskQuestions.hidden=visibleQuestions===0;
  riskDecision.dataset.level=assessment.level;
  riskDecision.querySelector('b').textContent=assessment.title;
  riskDecision.querySelector('span').textContent=assessment.description;
  itemPhotoRequirement.textContent=assessment.requiresPhoto?'필수 · 픽업 전 상태와 포장을 확인합니다.':'선택 · 크기 판단에 도움이 됩니다.';
  return assessment;
}

function riskIntakeReady(assessment=currentRiskAssessment()){
  if(assessment.level==='blocked'||assessment.level==='waiting')return false;
  const packingReady=Boolean(document.querySelector('[name="packingStatus"]:checked'));
  const valueReady=itemValueUnknown.checked||Number(itemValue.value)>0;
  const activeQuestions=[...document.querySelectorAll('[data-risk-question]')].filter(label=>!label.hidden);
  const questionsReady=activeQuestions.every(label=>label.querySelector('input').checked);
  const photoReady=!assessment.requiresPhoto||Boolean(itemPhoto.files?.[0]);
  return packingReady&&valueReady&&questionsReady&&photoReady;
}

function updateRequestReadiness(){
  const addressesReady=Boolean(selectedAddresses.pickup&&selectedAddresses.dropoff);
  const assessment=updateRiskAssessment();
  const itemReady=Boolean(selectedItemKind&&itemName.value.trim()&&document.querySelector('[name="itemScale"]:checked')&&riskIntakeReady(assessment));
  const contentReady=errandContent.value.trim().length>=4;
  addressNext.disabled=!(addressesReady&&itemReady&&contentReady);
  if(!addressesReady)addressNext.textContent='주소 두 곳을 먼저 확인해 주세요';
  else if(!selectedItemKind)addressNext.textContent='물품 종류를 선택해 주세요';
  else if(!itemName.value.trim())addressNext.textContent='물품명과 수량을 적어주세요';
  else if(!document.querySelector('[name="itemScale"]:checked'))addressNext.textContent='배송 규모를 선택해 주세요';
  else if(assessment.level==='blocked')addressNext.textContent='현재 접수할 수 없는 물품입니다';
  else if(!document.querySelector('[name="packingStatus"]:checked'))addressNext.textContent='포장 상태를 선택해 주세요';
  else if(!itemValueUnknown.checked&&Number(itemValue.value)<=0)addressNext.textContent='물품가액을 입력해 주세요';
  else if([...document.querySelectorAll('[data-risk-question]')].some(label=>!label.hidden&&!label.querySelector('input').checked))addressNext.textContent='물품별 안전 확인을 완료해 주세요';
  else if(assessment.requiresPhoto&&!itemPhoto.files?.[0])addressNext.textContent='물품과 포장 사진을 등록해 주세요';
  else if(!contentReady)addressNext.textContent='심부름 내용을 4글자 이상 적어주세요';
  else addressNext.textContent=assessment.level==='review'?'검토·견적 화면 확인하기 →':'요금·결제수단 확인하기 →';
}

async function openPostcode(kind){
  activeAddressKind=kind;
  request.hidden=true;
  postcodePanel.hidden=false;
  pushErrandStep('postcode');
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
  activeAddressKind=null;
  if(history.state?.errandStep==='postcode')history.back();
  else showErrandStep('request');
}

document.querySelectorAll('[data-address-open]').forEach(button=>button.addEventListener('click',()=>openPostcode(button.dataset.addressOpen)));
document.querySelectorAll('[data-place-search]').forEach(button=>button.addEventListener('click',()=>searchPlaces(button.dataset.placeSearch)));
document.querySelectorAll('[data-place-query]').forEach(input=>input.addEventListener('keydown',event=>{if(event.key==='Enter'){event.preventDefault();searchPlaces(input.dataset.placeQuery);}}));
document.querySelector('#postcodeBack').addEventListener('click',closePostcode);
addressNext.addEventListener('click',()=>{
  const itemScale=document.querySelector('[name="itemScale"]:checked')?.value;
  const assessment=currentRiskAssessment();
  if(!selectedAddresses.pickup||!selectedAddresses.dropoff||!selectedItemKind||!itemName.value.trim()||!itemScale||!riskIntakeReady(assessment)||errandContent.value.trim().length<4)return;
  const pickupDetail=document.querySelector('[data-address-detail="pickup"]')?.value.trim();
  const dropoffDetail=document.querySelector('[data-address-detail="dropoff"]')?.value.trim();
  const conditions=[...document.querySelectorAll('.extra-conditions input:checked')].map(input=>input.value);
  const packingStatus=document.querySelector('[name="packingStatus"]:checked')?.value||'';
  const declaredValue=itemValueUnknown.checked?'가격 산정 어려움':`${Number(itemValue.value).toLocaleString('ko-KR')}원`;
  document.querySelector('#paymentPickup').textContent=`${formatSelectedAddress(selectedAddresses.pickup)}${pickupDetail?` · ${pickupDetail}`:''}`;
  document.querySelector('#paymentDropoff').textContent=`${formatSelectedAddress(selectedAddresses.dropoff)}${dropoffDetail?` · ${dropoffDetail}`:''}`;
  document.querySelector('#paymentItem').textContent=`${selectedItemKind} · ${itemName.value.trim()} · ${itemScale}`;
  document.querySelector('#paymentConditions').textContent=`${conditions.length?`추가 조건: ${conditions.join(' · ')} · `:''}포장: ${packingStatus} · 물품가액: ${declaredValue}`;
  const paymentRisk=document.querySelector('#paymentRisk');
  paymentRisk.dataset.level=assessment.level;
  paymentRisk.querySelector('b').textContent=assessment.title;
  paymentRisk.querySelector('span').textContent=assessment.description;
  document.querySelector('#paymentRequest').textContent=errandContent.value.trim();
  request.hidden=true;
  payment.hidden=false;
  pushErrandStep('payment');
  window.scrollTo({top:0,behavior:'smooth'});
});

document.querySelector('#paymentBack').addEventListener('click',()=>{
  history.back();
});

function normalizedPhone(value){
  return String(value||'').replace(/\D/g,'').slice(0,11);
}

function formattedPhone(value){
  const digits=normalizedPhone(value);
  if(digits.length<=3)return digits;
  if(digits.length<=7)return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
}

function maskedPhone(value){
  const digits=normalizedPhone(value);
  return digits.length===11?`${digits.slice(0,3)}-****-${digits.slice(7)}`:'번호 확인 전';
}

function updatePreviewReadiness(){
  const nameReady=customerName.value.trim().length>=2;
  const phoneReady=/^01[016789]\d{7,8}$/.test(normalizedPhone(customerPhone.value));
  const ready=nameReady&&phoneReady&&previewAgreement.checked;
  previewSubmit.disabled=!ready;
  if(!nameReady)previewSubmit.textContent='신청자 이름을 입력해 주세요';
  else if(!phoneReady)previewSubmit.textContent='휴대전화번호를 확인해 주세요';
  else if(!previewAgreement.checked)previewSubmit.textContent='최종 확인 항목에 동의해 주세요';
  else previewSubmit.textContent='미리보기 접수함에 저장하기 →';
  contactStatus.dataset.state=phoneReady?'ready':'';
  contactStatus.textContent=phoneReady?'형식이 확인됐습니다. 실제 접수에서는 문자 인증을 추가합니다.':'실제 접수에서는 문자 인증을 거친 번호만 사용합니다.';
}

customerName.addEventListener('input',updatePreviewReadiness);
customerPhone.addEventListener('input',()=>{
  const caretAtEnd=customerPhone.selectionStart===customerPhone.value.length;
  customerPhone.value=formattedPhone(customerPhone.value);
  if(caretAtEnd)customerPhone.setSelectionRange(customerPhone.value.length,customerPhone.value.length);
  updatePreviewReadiness();
});
previewAgreement.addEventListener('change',updatePreviewReadiness);

function previewOrderPayload(){
  const pickupDetail=document.querySelector('[data-address-detail="pickup"]')?.value.trim();
  const dropoffDetail=document.querySelector('[data-address-detail="dropoff"]')?.value.trim();
  const itemScale=document.querySelector('[name="itemScale"]:checked')?.value||'';
  const assessment=currentRiskAssessment();
  return {
    previewOnly:true,
    agreementAccepted:previewAgreement.checked,
    customer:{name:customerName.value.trim(),phone:customerPhone.value.trim()},
    pickup:{...selectedAddresses.pickup,detail:pickupDetail},
    dropoff:{...selectedAddresses.dropoff,detail:dropoffDetail},
    item:{
      kind:selectedItemKind,
      name:itemName.value.trim(),
      scale:itemScale,
      conditions:[...document.querySelectorAll('.extra-conditions input:checked')].map(input=>input.value),
      packingStatus:document.querySelector('[name="packingStatus"]:checked')?.value||'',
      declaredValue:itemValueUnknown.checked?null:Number(itemValue.value),
      declaredValueUnknown:itemValueUnknown.checked,
      riskLevel:assessment.level,
      riskFlags:assessment.flags,
      safetyConfirmations:[...document.querySelectorAll('[data-risk-question] input:checked')].map(input=>input.value),
      pickupPhotoSelected:Boolean(itemPhoto.files?.[0]),
    },
    description:errandContent.value.trim(),
    policyVersion:'preview-2026-10-11-risk-v1',
  };
}

function storedOrder(receipt){
  const order=receipt.order;
  return {version:2,trackingToken:receipt.trackingToken,orderId:order.id,status:order.status,
    createdAt:Date.parse(order.createdAt)||Date.now(),expiresAt:Number(order.expiresAt)*1000,
    pickup:order.pickupAddress,dropoff:order.dropoffAddress,item:order.itemName,
    contact:`${customerName.value.trim()} · ${order.customerPhone}`,description:order.description};
}

const TRACKING_STATUS_LABELS={
  INTAKE_RECEIVED:'운영자 확인 전',REVIEWING:'운영자가 내용을 확인 중',QUOTE_PENDING:'견적 확인 중',
  PAYMENT_PENDING:'결제 안내 대기',ON_HOLD:'추가 확인이 필요함',REJECTED:'현재 조건으로 접수 어려움',
};

function paintTracking(order){
  document.querySelector('#trackingOrderId').textContent=order.orderId;
  document.querySelector('#trackingPickup').textContent=order.pickup;
  document.querySelector('#trackingDropoff').textContent=order.dropoff;
  document.querySelector('#trackingItem').textContent=order.item;
  document.querySelector('#trackingContact').textContent=order.contact;
  document.querySelector('#trackingLiveStatus').textContent=`현재 상태: ${TRACKING_STATUS_LABELS[order.status]||'운영자 확인 전'} · 실제 결제와 기사 호출은 잠겨 있습니다.`;
}

function showTracking(order){
  paintTracking(order);
  home.hidden=true;policy.hidden=true;request.hidden=true;payment.hidden=true;postcodePanel.hidden=true;tracking.hidden=false;
  history.pushState({errandStep:'tracking'},'',`${location.pathname}?preview-order=${encodeURIComponent(order.orderId)}`);
  window.scrollTo({top:0,behavior:'smooth'});
}

function readPreviewOrder(){
  try{
    const order=JSON.parse(localStorage.getItem(ERRAND_PREVIEW_ORDER_KEY)||'null');
    if(!order||order.version!==2||Date.now()>Number(order.expiresAt)){
      localStorage.removeItem(ERRAND_PREVIEW_ORDER_KEY);
      return null;
    }
    return order;
  }catch{
    try{localStorage.removeItem(ERRAND_PREVIEW_ORDER_KEY);}catch{}
    return null;
  }
}

previewSubmit.addEventListener('click',async()=>{
  updatePreviewReadiness();
  if(previewSubmit.disabled||!selectedAddresses.pickup||!selectedAddresses.dropoff)return;
  previewSubmit.disabled=true;
  previewSubmit.textContent='접수함에 안전하게 저장 중…';
  previewSubmitStatus.dataset.state='';
  previewSubmitStatus.textContent='창을 닫지 말고 잠시만 기다려 주세요.';
  try{
    const response=await fetch(ERRAND_ORDER_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json','X-Daedong-Client':ERRAND_AI_CLIENT},body:JSON.stringify(previewOrderPayload())});
    const receipt=await response.json();
    if(!response.ok)throw new Error(receipt?.error||'접수 서버에 저장하지 못했습니다.');
    const order=storedOrder(receipt);
    try{localStorage.setItem(ERRAND_PREVIEW_ORDER_KEY,JSON.stringify(order));}catch{}
    try{localStorage.removeItem(ERRAND_DRAFT_KEY);}catch{}
    showTracking(order);
  }catch(error){
    previewSubmitStatus.dataset.state='error';
    previewSubmitStatus.textContent=error instanceof Error?error.message:'접수 서버에 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.';
    updatePreviewReadiness();
  }
});

async function refreshTracking(){
  const order=readPreviewOrder();
  if(!order)return;
  const button=document.querySelector('#trackingRefresh');
  button.disabled=true;button.textContent='확인상태 불러오는 중…';
  try{
    const response=await fetch(`${ERRAND_ORDER_ENDPOINT}/${encodeURIComponent(order.orderId)}`,{headers:{'X-Daedong-Client':ERRAND_AI_CLIENT,'X-Matjido-Order-Token':order.trackingToken}});
    const result=await response.json();
    if(!response.ok)throw new Error(result?.error||'상태를 확인하지 못했습니다.');
    order.status=result.order.status;order.expiresAt=Number(result.order.expiresAt)*1000;
    localStorage.setItem(ERRAND_PREVIEW_ORDER_KEY,JSON.stringify(order));paintTracking(order);
  }catch(error){document.querySelector('#trackingLiveStatus').textContent=error instanceof Error?error.message:'상태를 확인하지 못했습니다.';}
  finally{button.disabled=false;button.textContent='운영자 확인상태 새로고침';}
}

document.querySelector('#trackingRefresh').addEventListener('click',()=>void refreshTracking());

document.querySelector('#trackingReview').addEventListener('click',()=>{
  history.back();
});
document.querySelector('#trackingHome').addEventListener('click',()=>{
  showErrandStep('home');history.pushState({errandStep:'home'},'',location.pathname);
});

document.querySelector('#errandBack').addEventListener('click',()=>{
  if(currentErrandStep()==='home')location.href='../';
  else history.back();
});

window.addEventListener('popstate',event=>{
  showErrandStep(event.state?.errandStep||'home');
});

function updateAiAssist(){
  aiAssist.disabled=errandContent.value.trim().length<4;
  if(!aiAssist.disabled&&aiStatus.dataset.state==='hint')aiStatus.textContent='';
}

errandContent.addEventListener('input',()=>{
  updateAiAssist();
  updateRiskAssessment();
  updateRequestReadiness();
  scheduleDraftSave();
  if(!aiSuggestion.hidden){aiSuggestion.hidden=true;aiSuggestionText.textContent='';}
  if(aiDraftApplied){
    aiStatus.dataset.state='editing';
    aiStatus.textContent='AI 초안을 고객이 직접 수정하고 있습니다. [고객 확인 필요] 부분과 빠진 내용을 정확하게 고쳐주세요.';
  }
});

itemName.addEventListener('input',()=>{updateRiskAssessment();updateRequestReadiness();scheduleDraftSave();});
document.querySelectorAll('[name="itemScale"],[name="packingStatus"],.extra-conditions input,[data-risk-question] input').forEach(input=>input.addEventListener('change',()=>{updateRiskAssessment();updateRequestReadiness();scheduleDraftSave();}));
itemValue.addEventListener('input',()=>{updateRiskAssessment();updateRequestReadiness();scheduleDraftSave();});
itemValueUnknown.addEventListener('change',()=>{
  itemValue.disabled=itemValueUnknown.checked;
  if(itemValueUnknown.checked)itemValue.value='';
  updateRiskAssessment();updateRequestReadiness();scheduleDraftSave();
});
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
  updateRequestReadiness();
});
document.querySelector('#itemPhotoRemove').addEventListener('click',()=>{
  if(itemPhotoUrl)URL.revokeObjectURL(itemPhotoUrl);
  itemPhotoUrl='';
  itemPhoto.value='';
  itemPhotoImage.removeAttribute('src');
  itemPhotoPreview.hidden=true;
  itemPhotoStatus.textContent='사진을 삭제했습니다.';
  updateRequestReadiness();
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
updateRiskAssessment();

let initialErrandStep='home';
if(new URLSearchParams(location.search).has('payment')){
  home.hidden=true;
  policy.hidden=true;
  request.hidden=true;
  payment.hidden=false;
  initialErrandStep='payment';
}

const previewOrderId=new URLSearchParams(location.search).get('preview-order');
const savedPreviewOrder=previewOrderId?readPreviewOrder():null;
if(savedPreviewOrder&&savedPreviewOrder.orderId===previewOrderId){
  paintTracking(savedPreviewOrder);
  showErrandStep('tracking');
  initialErrandStep='tracking';
}

history.replaceState({errandStep:initialErrandStep},'',location.href);

updatePreviewReadiness();
