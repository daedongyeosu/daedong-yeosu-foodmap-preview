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
let products=[];

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
  document.querySelector('#previewProductCount').textContent=`등록 상품 ${products.length}개`;
  document.querySelector('#previewProductNames').textContent=products.length?products.slice(0,5).map(product=>`${product.name} ${money(product.price)}/${product.unit}`).join(' · ')+(products.length>5?` 외 ${products.length-5}개`:''):'상품은 상점을 만든 뒤에도 추가할 수 있습니다.';
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
function productMethod(){return form.querySelector('[data-product-method]:checked')?.dataset.productMethod||'direct';}
function showProductMethod(){const method=productMethod();document.querySelectorAll('[data-product-panel]').forEach(panel=>{panel.hidden=panel.dataset.productPanel!==method;panel.classList.toggle('active',panel.dataset.productPanel===method);});}
function productUnit(){const base=document.querySelector('#productUnit').value;return base==='직접 입력'?document.querySelector('#customUnit').value.trim():base;}
function renderProducts(){
  const drafts=document.querySelector('#productDrafts');
  const count=document.querySelector('#productCount');
  count.textContent=`등록 ${products.length}개`;
  drafts.replaceChildren();
  if(!products.length){const empty=document.createElement('p');empty.className='empty-products';empty.textContent='아직 등록한 상품이 없습니다. 한 개만 먼저 올려도 상점을 시작할 수 있습니다.';drafts.append(empty);return;}
  products.forEach(product=>{const card=document.createElement('article');card.className='product-draft';const name=document.createElement('strong');name.textContent=product.name;const price=document.createElement('span');price.textContent=`${money(product.price)} / ${product.unit}`;const detail=document.createElement('small');detail.textContent=[product.stockMode,product.stockMode==='수량 관리'?`재고 ${product.stockQuantity}개`:'',product.hasPhoto?'사진 있음':'사진 없음',product.source==='csv'?'목록에서 불러옴':'직접 등록'].filter(Boolean).join(' · ');const remove=document.createElement('button');remove.type='button';remove.setAttribute('aria-label',`${product.name} 삭제`);remove.textContent='×';remove.addEventListener('click',()=>{products=products.filter(item=>item.id!==product.id);renderProducts();});card.append(name,price,detail,remove);drafts.append(card);});
}
function addDirectProduct(){
  const name=document.querySelector('#productName').value.trim();const price=Number(document.querySelector('#productPrice').value);const unit=productUnit();
  if(!name){document.querySelector('#productName').focus();return;}
  if(!(price>0)){document.querySelector('#productPrice').focus();return;}
  if(!unit){document.querySelector('#customUnit').focus();return;}
  const stockMode=document.querySelector('#stockMode').value;products.push({id:`product-${Date.now()}-${products.length}`,name,price,unit,stockMode,stockQuantity:stockMode==='수량 관리'?Math.max(0,Number(document.querySelector('#stockQuantity').value)||0):null,description:document.querySelector('#productDescription').value.trim(),hasPhoto:Boolean(document.querySelector('#productPhoto').files?.[0]),source:'direct'});
  document.querySelector('#productName').value='';document.querySelector('#productPrice').value='';document.querySelector('#productDescription').value='';document.querySelector('#productPhoto').value='';document.querySelector('#productPhotoStatus').textContent='사진은 이 기기에서만 미리 확인합니다.';renderProducts();document.querySelector('#productName').focus();
}
function parseCsvLine(line){const cells=[];let value='';let quoted=false;for(let index=0;index<line.length;index+=1){const char=line[index];if(char==='"'){if(quoted&&line[index+1]==='"'){value+='"';index+=1;}else quoted=!quoted;}else if(char===','&&!quoted){cells.push(value.trim());value='';}else value+=char;}cells.push(value.trim());return cells;}
function headerIndex(headers,candidates){return headers.findIndex(header=>candidates.includes(header.replace(/\s/g,'')));}
async function importProductSheet(event){
  const file=event.target.files?.[0];const status=document.querySelector('#sheetStatus');status.className='method-status';if(!file)return;
  if(!/\.csv$/i.test(file.name)){status.textContent='엑셀 원본은 서버 분석 기능을 연결한 뒤 지원합니다. 지금은 엑셀에서 CSV로 저장한 파일을 선택해 주세요.';status.classList.add('error');return;}
  try{const text=await file.text();const lines=text.replace(/^\uFEFF/,'').split(/\r?\n/).filter(line=>line.trim());if(lines.length<2)throw new Error('empty');const headers=parseCsvLine(lines[0]);const nameIndex=headerIndex(headers,['상품명','상품','품명','메뉴명']);const priceIndex=headerIndex(headers,['가격','판매가격','금액']);const unitIndex=headerIndex(headers,['단위','판매단위','규격']);const stockIndex=headerIndex(headers,['재고','수량','재고수량']);if(nameIndex<0||priceIndex<0)throw new Error('header');let added=0;lines.slice(1,501).forEach((line,row)=>{const cells=parseCsvLine(line);const name=String(cells[nameIndex]||'').trim();const price=Number(String(cells[priceIndex]||'').replace(/[^0-9.]/g,''));if(!name||!(price>0))return;const unit=String(cells[unitIndex]||'개').trim()||'개';const stockRaw=stockIndex>=0?Number(String(cells[stockIndex]||'').replace(/[^0-9.]/g,'')):NaN;products.push({id:`csv-${Date.now()}-${row}`,name,price,unit,stockMode:Number.isFinite(stockRaw)?'수량 관리':'판매 가능',stockQuantity:Number.isFinite(stockRaw)?Math.max(0,stockRaw):null,description:'',hasPhoto:false,source:'csv'});added+=1;});if(!added)throw new Error('rows');renderProducts();status.textContent=`${added}개 상품을 초안으로 불러왔습니다. 공개 전 상품명·가격·단위를 다시 확인해 주세요.`;status.classList.add('success');}
  catch{status.textContent='상품목록을 읽지 못했습니다. 첫 줄에 상품명과 가격 열이 있는 CSV인지 확인해 주세요.';status.classList.add('error');}
}
async function openPostcode(){
  const panel=document.querySelector('#postcodePanel');const status=document.querySelector('#postcodeStatus');const frame=document.querySelector('#postcodeFrame');
  panel.hidden=false;status.textContent='공식 주소검색을 불러오는 중입니다.';status.classList.remove('error');frame.replaceChildren();
  try{const Postcode=await loadPostcode();status.textContent='도로명·건물명·지번을 검색해 정확한 상점 주소를 선택하세요.';new Postcode({oncomplete(data){const address=String(data.roadAddress||data.jibunAddress||data.address||'').trim();if(!/(?:^|\s)여수시\s/.test(address)){status.textContent='현재 프리뷰는 여수시 상점만 등록할 수 있습니다.';status.classList.add('error');return;}addressInput.value=address;addressInput.dataset.zonecode=String(data.zonecode||'');addressStatus.textContent='공식 주소검색에서 확인한 여수시 주소입니다.';addressStatus.classList.add('verified');panel.hidden=true;updateNext();document.querySelector('#storeAddressDetail').focus();},width:'100%',height:'100%'}).embed(frame);}
  catch{status.textContent='주소검색을 불러오지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.';status.classList.add('error');}
}
function saveDraft(){
  const payload={storeName:document.querySelector('#storeName').value.trim(),category:document.querySelector('#storeCategory').value,address:addressInput.value,addressZonecode:String(addressInput.dataset.zonecode||''),addressDetail:document.querySelector('#storeAddressDetail').value.trim(),phone:document.querySelector('#ownerPhone').value,theme:selected('theme'),productMethod:selected('productMethod'),products:products.map(({id,name,price,unit,stockMode,stockQuantity,description,source})=>({id,name,price,unit,stockMode,stockQuantity,description,source})),subsidy:Number(selected('subsidy'))||0,minimumOrder:Number(document.querySelector('#minimumOrder').value)||0,savedAt:new Date().toISOString(),previewOnly:true};
  localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
  document.querySelector('#saveStatus').textContent='이 기기에 입점 준비내용을 저장했습니다. 실제 공개나 주문 접수는 발생하지 않았습니다.';
  saveButton.textContent='입점 준비내용 저장 완료';
}
function setRadio(name,value){document.querySelectorAll(`[name="${name}"]`).forEach(input=>{input.checked=input.value===String(value);});}
function loadDraft(){
  try{const payload=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!payload?.previewOnly)return;document.querySelector('#storeName').value=String(payload.storeName||'');document.querySelector('#storeCategory').value=String(payload.category||'');document.querySelector('#ownerPhone').value=formatPhone(payload.phone);addressInput.value=String(payload.address||'');addressInput.dataset.zonecode=String(payload.addressZonecode||'');document.querySelector('#storeAddressDetail').value=String(payload.addressDetail||'');if(addressInput.value){addressStatus.textContent='이 기기에 임시 저장한 여수시 공식 주소입니다.';addressStatus.classList.add('verified');}setRadio('theme',payload.theme);setRadio('productMethod',payload.productMethod);setRadio('subsidy',Number(payload.subsidy)||0);document.querySelector('#minimumOrder').value=String(Math.max(0,Number(payload.minimumOrder)||0));products=Array.isArray(payload.products)?payload.products.slice(0,500).filter(product=>product&&String(product.name||'').trim()&&Number(product.price)>0&&String(product.unit||'').trim()).map((product,index)=>({id:String(product.id||`restored-${index}`),name:String(product.name).trim(),price:Number(product.price),unit:String(product.unit).trim(),stockMode:String(product.stockMode||'판매 가능'),stockQuantity:product.stockQuantity==null?null:Math.max(0,Number(product.stockQuantity)||0),description:String(product.description||''),source:product.source==='csv'?'csv':'direct',hasPhoto:false})):[];document.querySelector('#saveStatus').textContent='이 기기에 저장된 입점 준비내용을 불러왔습니다.';}
  catch{localStorage.removeItem(STORAGE_KEY);}
}

form.addEventListener('input',updateNext);
document.querySelector('#ownerPhone').addEventListener('input',event=>{event.target.value=formatPhone(event.target.value);updateNext();});
document.querySelector('#findAddress').addEventListener('click',openPostcode);
document.querySelector('#postcodeClose').addEventListener('click',()=>{document.querySelector('#postcodePanel').hidden=true;});
document.querySelector('#exteriorPhoto').addEventListener('change',event=>photoPreview(event.target,document.querySelector('#exteriorPreview')));
document.querySelector('#interiorPhoto').addEventListener('change',event=>photoPreview(event.target,document.querySelector('#interiorPreview')));
document.querySelectorAll('[data-product-method]').forEach(input=>input.addEventListener('change',showProductMethod));
document.querySelector('#productUnit').addEventListener('change',event=>{document.querySelector('#customUnitField').hidden=event.target.value!=='직접 입력';});
document.querySelector('#stockMode').addEventListener('change',event=>{document.querySelector('#stockQuantityField').hidden=event.target.value!=='수량 관리';});
document.querySelector('#productPhoto').addEventListener('change',event=>{document.querySelector('#productPhotoStatus').textContent=event.target.files?.[0]?`${event.target.files[0].name} · 실제 등록 전 사진 검토가 필요합니다.`:'사진은 이 기기에서만 미리 확인합니다.';});
document.querySelector('#addProduct').addEventListener('click',addDirectProduct);
document.querySelector('#productSheet').addEventListener('change',importProductSheet);
document.querySelector('#priceBoardPhoto').addEventListener('change',event=>{const preview=document.querySelector('#priceBoardPreview');const status=document.querySelector('#photoAiStatus');const file=event.target.files?.[0];if(!file)return;const url=URL.createObjectURL(file);preview.src=url;preview.hidden=false;preview.onload=()=>URL.revokeObjectURL(url);status.textContent='사진을 이 기기에서 미리 표시했습니다. AI 서버 연결 전에는 분석하거나 외부로 전송하지 않습니다.';status.className='method-status success';});
document.querySelectorAll('[name="subsidy"]').forEach(input=>input.addEventListener('change',updatePricePreview));
nextButton.addEventListener('click',()=>{if(currentStep===1&&!stepOneReady()){updateNext();return;}showStep(currentStep+1);});
previousButton.addEventListener('click',()=>showStep(currentStep-1));
navButtons.forEach(button=>button.addEventListener('click',()=>{const target=Number(button.dataset.stepNav);if(target<=currentStep)showStep(target);}));
agreement.addEventListener('change',()=>{saveButton.disabled=!agreement.checked;});
saveButton.addEventListener('click',saveDraft);
loadDraft();showProductMethod();renderProducts();updatePricePreview();updateNext();
