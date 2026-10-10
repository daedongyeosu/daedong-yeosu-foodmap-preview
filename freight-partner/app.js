const form=document.querySelector('#partnerForm');
const submitButton=document.querySelector('#reviewApplication');
const saveDraftButton=document.querySelector('#saveDraft');
const status=document.querySelector('#formStatus');
const review=document.querySelector('#applicationReview');
const summary=document.querySelector('#reviewSummary');
const DRAFT_KEY='matjidoFreightPartnerDraftV2';

function normalizePhone(value){
  const digits=String(value||'').replace(/\D/g,'').slice(0,11);
  if(digits.length<=3)return digits;
  if(digits.length<=7)return `${digits.slice(0,3)}-${digits.slice(3)}`;
  return `${digits.slice(0,3)}-${digits.slice(3,7)}-${digits.slice(7)}`;
}

function requiredReady(){
  const phone=document.querySelector('#contactPhone').value.replace(/\D/g,'');
  return Boolean(
    form.querySelector('[name="partnerType"]:checked')&&
    document.querySelector('#contactName').value.trim()&&
    /^01\d{8,9}$/.test(phone)&&
    document.querySelector('#vehicleType').value&&
    Number(document.querySelector('#payloadKg').value)>0&&
    document.querySelector('#serviceArea').value.trim()&&
    form.querySelector('[name="serviceWindow"]:checked')&&
    form.querySelector('[name="allDayAvailability"]:checked')&&
    document.querySelector('#hasQualification').checked&&
    document.querySelector('#hasCommercialVehicle').checked&&
    document.querySelector('#hasPermit').checked&&
    document.querySelector('#hasInsurance').checked&&
    document.querySelector('#truthAgreement').checked
  );
}

function updateReadiness(){
  const ready=requiredReady();
  submitButton.disabled=!ready;
  submitButton.textContent=ready?'입력내용 검토하기 →':'필수정보를 먼저 입력해 주세요';
  status.dataset.state=ready?'ready':'';
  status.textContent=ready?'필수조건이 확인됐습니다. 입력내용을 검토할 수 있습니다.':'필수정보와 자격 보유 여부를 입력해 주세요.';
}

function snapshot(){
  return {
    version:2,updatedAt:Date.now(),
    partnerType:form.querySelector('[name="partnerType"]:checked')?.value||'',
    contactName:document.querySelector('#contactName').value.trim(),
    contactPhone:document.querySelector('#contactPhone').value.trim(),
    businessName:document.querySelector('#businessName').value.trim(),
    vehicleType:document.querySelector('#vehicleType').value,
    payloadKg:document.querySelector('#payloadKg').value,
    vehicleFeatures:[...form.querySelectorAll('[name="vehicleFeature"]:checked')].map(input=>input.value),
    serviceArea:document.querySelector('#serviceArea').value.trim(),
    serviceWindows:[...form.querySelectorAll('[name="serviceWindow"]:checked')].map(input=>input.value),
    allDayAvailability:form.querySelector('[name="allDayAvailability"]:checked')?.value||'',
    longDistance:document.querySelector('#longDistance').value
  };
}

function restoreDraft(){
  try{
    const draft=JSON.parse(localStorage.getItem(DRAFT_KEY)||'null');
    if(!draft||draft.version!==2)return;
    const partnerType=form.querySelector(`[name="partnerType"][value="${CSS.escape(draft.partnerType||'')}"]`);
    if(partnerType)partnerType.checked=true;
    for(const id of ['contactName','contactPhone','businessName','vehicleType','payloadKg','serviceArea','longDistance']){
      const node=document.querySelector(`#${id}`);if(node)node.value=String(draft[id]||'');
    }
    const features=new Set(draft.vehicleFeatures||[]);
    form.querySelectorAll('[name="vehicleFeature"]').forEach(input=>{input.checked=features.has(input.value);});
    const windows=new Set(draft.serviceWindows||[]);
    form.querySelectorAll('[name="serviceWindow"]').forEach(input=>{input.checked=windows.has(input.value);});
    const allDay=form.querySelector(`[name="allDayAvailability"][value="${CSS.escape(draft.allDayAvailability||'')}"]`);
    if(allDay)allDay.checked=true;
    status.textContent='이 기기에 임시 저장했던 신청정보를 불러왔습니다. 자격 보유 여부를 다시 확인해 주세요.';
  }catch{}
}

document.querySelector('#contactPhone').addEventListener('input',event=>{event.target.value=normalizePhone(event.target.value);});
form.addEventListener('input',updateReadiness);
form.addEventListener('change',updateReadiness);
saveDraftButton.addEventListener('click',()=>{
  try{localStorage.setItem(DRAFT_KEY,JSON.stringify(snapshot()));status.dataset.state='ready';status.textContent='이 기기에 임시 저장했습니다. 자격·보험 확인 체크는 안전을 위해 저장하지 않습니다.';}
  catch{status.dataset.state='';status.textContent='이 브라우저에서는 임시 저장을 사용할 수 없습니다.';}
});
form.addEventListener('submit',event=>{
  event.preventDefault();if(!requiredReady())return updateReadiness();
  const data=snapshot();
  const rows=[['신청 유형',data.partnerType],['신청자',data.contactName],['연락처',data.contactPhone],['상호명',data.businessName||'해당 없음'],['차량',data.vehicleType],['최대적재량',`${Number(data.payloadKg).toLocaleString('ko-KR')}kg`],['차량 특성',data.vehicleFeatures.join(', ')||'없음'],['운행지역',data.serviceArea],['가능시간',data.serviceWindows.join(', ')],['24시간 긴급호출',data.allDayAvailability],['장거리',data.longDistance]];
  summary.innerHTML=rows.map(([key,value])=>`<div><dt>${key}</dt><dd>${String(value).replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]))}</dd></div>`).join('');
  review.hidden=false;review.scrollIntoView({behavior:'smooth',block:'start'});
});
document.querySelector('#editApplication').addEventListener('click',()=>{document.querySelector('#application').scrollIntoView({behavior:'smooth',block:'start'});});
restoreDraft();updateReadiness();
