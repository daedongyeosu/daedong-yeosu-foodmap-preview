const STORAGE_KEY='matjido-store-onboarding-preview-v1';
const form=document.querySelector('#storeOnboarding');
const steps=[...document.querySelectorAll('[data-step]')];
const navButtons=[...document.querySelectorAll('[data-step-nav]')];
const nextButton=document.querySelector('#nextStep');
const previousButton=document.querySelector('#previousStep');
const addressInput=document.querySelector('#storeAddress');
const addressStatus=document.querySelector('#addressStatus');
const agreement=document.querySelector('#previewAgreement');
const saveButton=document.querySelector('#savePreview');
let currentStep=1;
let postcodePromise=null;

function money(value){return `${Math.max(0,Number(value)||0).toLocaleString('ko-KR')}원`;}
function selected(name){return form.querySelector(`[name="${name}"]:checked`)?.value||'';}
function digits(value){return String(value||'').replace(/\D/g,'').slice(0,11);}
function formatPhone(value){const raw=digits(value);if(raw.length<=3)return raw;if(raw.length<=7)return `${raw.slice(0,3)}-${raw.slice(3)}`;return `${raw.slice(0,3)}-${raw.slice(3,7)}-${raw.slice(7)}`;}
function stepOneReady(){return Boolean(document.querySelector('#storeCategory').value&&document.querySelector('#storeName').value.trim()&&digits(document.querySelector('#ownerPhone').value).length===11&&addressInput.value.trim());}
function updateNext(){
  if(currentStep===1){nextButton.disabled=!stepOneReady();nextButton.textContent=stepOneReady()?'가게 분위기 꾸미기 →':'가게 주소와 정보를 확인해 주세요';}
  else if(currentStep===2){nextButton.disabled=false;nextButton.textContent='상품과 배송 설정하기 →';}
  else if(currentStep===3){nextButton.disabled=false;nextButton.textContent='내 온라인 상점 미리보기 →';}
  previousButton.hidden=currentStep===1;
  nextButton.hidden=currentStep===4;
}
function showStep(number){
  currentStep=Math.max(1,Math.min(4,number));
  steps.forEach(step=>{const active=Number(step.dataset.step)===currentStep;step.hidden=!active;step.classList.toggle('active',active);});
  navButtons.forEach(button=>{const step=Number(button.dataset.stepNav);button.toggleAttribute('disabled',step>currentStep);button.classList.toggle('done',step<currentStep);if(step===currentStep)button.setAttribute('aria-current','step');else button.removeAttribute('aria-current');});
  if(currentStep===4)paintPreview();
  updateNext();
  scrollTo({top:0,behavior:'smooth'});
}
function updatePricePreview(){
  const subsidy=Number(selected('subsidy'))||0;
  document.querySelector('#subsidyPreview').textContent=subsidy?`-${money(subsidy)}`:'0원';
  document.querySelector('#customerTotal').textContent=money(20000+5000+500-subsidy);
  document.querySelector('#settlementPreview').textContent=subsidy?`상점은 선택한 배송지원 ${money(subsidy)}을 부담하여 상품대금 중 ${money(20000-subsidy)}을 정산받는 예시입니다.`:'상점은 상품대금 20,000원을 정산받는 예시입니다.';
}
function paintPreview(){
  const category=document.querySelector('#storeCategory').value||'상점 종류';
  const name=document.querySelector('#storeName').value.trim()||'내 상점';
  const detail=document.querySelector('#storeAddressDetail').value.trim();
  const subsidy=Number(selected('subsidy'))||0;
  document.querySelector('#previewCategory').textContent=category;
  document.querySelector('#previewName').textContent=name;
  document.querySelector('#previewAddress').textContent=`${addressInput.value||'주소 확인 전'}${detail?` · ${detail}`:''}`;
  document.querySelector('#previewTheme').textContent=selected('theme');
  document.querySelector('#previewProduct').textContent=selected('productMethod');
  document.querySelector('#previewSubsidy').textContent=subsidy?`주문 1건당 ${money(subsidy)} 지원`:'지원하지 않음';
}
function photoPreview(input,preview){
  const file=input.files?.[0];if(!file)return;
  if(!file.type.startsWith('image/')){input.value='';return;}
  const url=URL.createObjectURL(file);preview.src=url;preview.hidden=false;preview.onload=()=>URL.revokeObjectURL(url);
}
function loadPostcode(){
  if(globalThis.daum?.Postcode)return Promise.resolve(globalThis.daum.Postcode);
  if(postcodePromise)return postcodePromise;
  postcodePromise=new Promise((resolve,reject)=>{const script=document.createElement('script');script.src='https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js';script.onload=()=>globalThis.daum?.Postcode?resolve(globalThis.daum.Postcode):reject(new Error('postcode-unavailable'));script.onerror=()=>reject(new Error('postcode-load'));document.head.append(script);}).catch(error=>{postcodePromise=null;throw error;});
  return postcodePromise;
}
async function openPostcode(){
  const panel=document.querySelector('#postcodePanel');const status=document.querySelector('#postcodeStatus');const frame=document.querySelector('#postcodeFrame');
  panel.hidden=false;status.textContent='공식 주소검색을 불러오는 중입니다.';status.classList.remove('error');frame.replaceChildren();
  try{const Postcode=await loadPostcode();status.textContent='도로명·건물명·지번을 검색해 정확한 상점 주소를 선택하세요.';new Postcode({oncomplete(data){const address=String(data.roadAddress||data.jibunAddress||data.address||'').trim();if(!/(?:전라남도|전남)\s+여수시\s/.test(address)){status.textContent='현재 프리뷰는 여수시 상점만 등록할 수 있습니다.';status.classList.add('error');return;}addressInput.value=address;addressInput.dataset.zonecode=String(data.zonecode||'');addressStatus.textContent='공식 주소검색에서 확인한 여수시 주소입니다.';addressStatus.classList.add('verified');panel.hidden=true;updateNext();document.querySelector('#storeAddressDetail').focus();},width:'100%',height:'100%'}).embed(frame);}
  catch{status.textContent='주소검색을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.';status.classList.add('error');}
}
function saveDraft(){
  const payload={storeName:document.querySelector('#storeName').value.trim(),category:document.querySelector('#storeCategory').value,address:addressInput.value,addressDetail:document.querySelector('#storeAddressDetail').value.trim(),phone:document.querySelector('#ownerPhone').value,theme:selected('theme'),productMethod:selected('productMethod'),subsidy:Number(selected('subsidy'))||0,minimumOrder:Number(document.querySelector('#minimumOrder').value)||0,savedAt:new Date().toISOString(),previewOnly:true};
  localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
  document.querySelector('#saveStatus').textContent='이 기기에 입점 준비내용을 저장했습니다. 실제 공개나 주문 접수는 발생하지 않았습니다.';
  saveButton.textContent='입점 준비내용 저장 완료';
}

form.addEventListener('input',updateNext);
document.querySelector('#ownerPhone').addEventListener('input',event=>{event.target.value=formatPhone(event.target.value);updateNext();});
document.querySelector('#findAddress').addEventListener('click',openPostcode);
document.querySelector('#postcodeClose').addEventListener('click',()=>{document.querySelector('#postcodePanel').hidden=true;});
document.querySelector('#exteriorPhoto').addEventListener('change',event=>photoPreview(event.target,document.querySelector('#exteriorPreview')));
document.querySelector('#interiorPhoto').addEventListener('change',event=>photoPreview(event.target,document.querySelector('#interiorPreview')));
document.querySelectorAll('[name="subsidy"]').forEach(input=>input.addEventListener('change',updatePricePreview));
nextButton.addEventListener('click',()=>{if(currentStep===1&&!stepOneReady()){updateNext();return;}showStep(currentStep+1);});
previousButton.addEventListener('click',()=>showStep(currentStep-1));
navButtons.forEach(button=>button.addEventListener('click',()=>{const target=Number(button.dataset.stepNav);if(target<=currentStep)showStep(target);}));
agreement.addEventListener('change',()=>{saveButton.disabled=!agreement.checked;});
saveButton.addEventListener('click',saveDraft);
updatePricePreview();updateNext();
