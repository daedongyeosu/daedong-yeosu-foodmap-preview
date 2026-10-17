const STORAGE_KEY='matjido-store-onboarding-preview-v1';
const STORE_CATALOG_ENDPOINT='https://daedong-yeosu-admin.sisakim.chatgpt.site/api/store-orders/preview/catalog';
const PREVIEW_CLIENT='store-manager-preview';
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
let editingProductId='';
let productPhotoSrc='',photoReadId=0,photoBusy=false,productSaving=false;
let studioProductKey='';
let draftStoreId='';
let sourceStoreId='',onlineShopVersion=0,onlineShopBusy=false,serverShopDraft=null;
let deliveryCostSharing={mode:'ratio',customerPercent:100,stepWon:100};
let legacySharing=false;
let importingExisting=false;
let accessStoreId='';
let ownerCanRequest=false;
const SHARE_EXAMPLE_TOTAL=5500;
function sharingSupport(){return legacySharing?Number(selected('subsidy'))||0:globalThis.MatjidoDeliverySharing.split(SHARE_EXAMPLE_TOTAL,deliveryCostSharing).merchantWon;}
function paintSharing(){
  const share=globalThis.MatjidoDeliverySharing.split(SHARE_EXAMPLE_TOTAL,deliveryCostSharing);
  const values=globalThis.MatjidoDeliverySharing.choices(SHARE_EXAMPLE_TOTAL),slider=document.querySelector('#deliveryShare');
  slider.max=String(values.length-1);slider.value=String(values.findIndex(won=>won>=share.customerWon));
  slider.setAttribute('aria-valuetext',`고객 ${money(share.customerWon)}, 상점 ${money(share.merchantWon)}`);
  document.querySelector('#deliveryShareLabel').textContent=`고객 ${Math.round(share.customerPercent)}% · 상점 ${Math.round(100-share.customerPercent)}%`;
  document.querySelector('#deliveryShareEstimate').textContent=legacySharing?`기존 고정액 지원 ${money(Number(selected('subsidy'))||0)}을 유지 중입니다. 막대를 움직이면 비율 방식으로 바뀝니다.`:`예상 고객 부담 ${money(share.customerWon)} / 상점 부담 ${money(share.merchantWon)} (합계 ${money(share.totalWon)})`;
}
function ensureStoreId(previous){
  if(sourceStoreId)return draftStoreId='shop-'+sourceStoreId;
  if(!draftStoreId)draftStoreId=globalThis.MatjidoStoreContext.id(previous?.storeId)&&previous.storeId!=='demo-yeosu-store'?previous.storeId:`preview-${crypto.randomUUID()}`;
  return draftStoreId;
}
function updateSavedLinks(){
  try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!saved?.previewOnly||!globalThis.MatjidoStoreContext.id(saved.storeId))return;
    document.querySelector('.customer-preview-link[href^="../online-store/"]').href=`../online-store/index.html?catalogStore=${encodeURIComponent(saved.storeId)}`;
  }catch{}
}

function money(value){return `${Math.max(0,Number(value)||0).toLocaleString('ko-KR')}원`;}
function selected(name){return form.querySelector(`[name="${name}"]:checked`)?.value||'';}
function digits(value){return String(value||'').replace(/\D/g,'').slice(0,11);}
function formatPhone(value){const raw=digits(value);if(raw.length<=3)return raw;if(raw.length<=7)return `${raw.slice(0,3)}-${raw.slice(3)}`;return `${raw.slice(0,3)}-${raw.slice(3,7)}-${raw.slice(7)}`;}
function stepOneReady(){const length=digits(document.querySelector('#ownerPhone').value).length;return Boolean(document.querySelector('#storeCategory').value&&document.querySelector('#storeName').value.trim()&&(length===11||sourceStoreId&&length>=9)&&addressInput.value.trim());}
function updateNext(){
  document.querySelector('#requestOwnerAccess').disabled=!ownerCanRequest||!document.querySelector('#storeName').value.trim();
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
  if(currentStep===4){paintPreview();document.querySelector('#customerStorePreview').hidden=true;document.querySelector('#customerPreviewHelp').textContent='아래에서 준비내용을 저장한 뒤 이 가게의 고객 화면을 확인할 수 있습니다.';}
  updateNext();
  scrollTo({top:0,behavior:'smooth'});
}
function updatePricePreview(){
  paintSharing();
  const subsidy=sharingSupport();
  document.querySelector('#subsidyPreview').textContent=subsidy?`-${money(subsidy)}`:'0원';
  document.querySelector('#customerTotal').textContent=money(20000+5000+500-subsidy);
  document.querySelector('#settlementPreview').textContent=subsidy?`상점은 선택한 배송지원 ${money(subsidy)}을 부담하여 상품대금 중 ${money(20000-subsidy)}을 정산받는 예시입니다.`:'상점은 상품대금 20,000원을 정산받는 예시입니다.';
}
function paintPreview(){
  const category=document.querySelector('#storeCategory').value||'상점 종류';
  const name=document.querySelector('#storeName').value.trim()||'내 상점';
  const detail=document.querySelector('#storeAddressDetail').value.trim();
  const subsidy=sharingSupport();
  document.querySelector('#previewCategory').textContent=category;
  document.querySelector('#previewName').textContent=name;
  document.querySelector('#previewAddress').textContent=`${addressInput.value||'주소 확인 전'}${detail?` · ${detail}`:''}`;
  document.querySelector('#previewTheme').textContent=selected('theme');
  document.querySelector('#previewProduct').textContent=selected('productMethod');
  document.querySelector('#previewSubsidy').textContent=subsidy?`주문 1건당 ${money(subsidy)} 지원`:'지원하지 않음';
  document.querySelector('#previewProductCount').textContent=`등록 상품 ${products.length}개`;
  document.querySelector('#previewProductNames').textContent=products.length?products.slice(0,5).map(product=>`${product.name} ${product.price>0?money(product.price):'가격 미설정 · 판매 전'}/${product.unit}`).join(' · ')+(products.length>5?` 외 ${products.length-5}개`:''):'상품은 상점을 만든 뒤에도 추가할 수 있습니다.';
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
function livePricingModeLabel(mode){return mode==='clearance'?'남은 재고 실시간 할인':'함께 주문할수록 할인';}
function defaultLiveEnd(){const date=new Date(Date.now()+24*60*60*1000);date.setMinutes(date.getMinutes()-date.getTimezoneOffset());return date.toISOString().slice(0,16);}
function showLivePricing(){
  const enabled=document.querySelector('#livePricingEnabled').checked;const mode=document.querySelector('#livePricingMode').value;
  document.querySelector('#livePricingFields').hidden=!enabled;
  document.querySelector('#livePricingHelp').textContent=mode==='clearance'?'현재 재고가 기준 수량 이하로 내려갈 때만 단계별 할인가가 적용됩니다. 경쟁 가게 가격과는 연결하지 않습니다.':'결제 확인된 누적 주문수만 계산합니다. 경쟁 가게 가격을 따라 자동으로 내리지 않습니다.';
  if(enabled&&!document.querySelector('#livePricingEndAt').value)document.querySelector('#livePricingEndAt').value=defaultLiveEnd();
}
function readLivePricing(basePrice,stockMode,stockQuantity){
  if(!document.querySelector('#livePricingEnabled').checked)return null;
  const status=document.querySelector('#livePricingStatus');const mode=document.querySelector('#livePricingMode').value;const floorPrice=Number(document.querySelector('#livePricingFloor').value);const endAt=document.querySelector('#livePricingEndAt').value;
  const tiers=[1,2,3].map(index=>({threshold:Number(document.querySelector(`#liveTier${index}Threshold`).value),price:Number(document.querySelector(`#liveTier${index}Price`).value)})).filter(tier=>tier.threshold>0&&tier.price>0);
  status.classList.remove('error');
  if(!(floorPrice>0&&floorPrice<basePrice)){status.textContent='최저 판매가격은 정상 판매가격보다 낮게 입력해 주세요.';status.classList.add('error');document.querySelector('#livePricingFloor').focus();return false;}
  if(!tiers.length){status.textContent='할인 단계를 한 개 이상 입력해 주세요.';status.classList.add('error');document.querySelector('#liveTier1Threshold').focus();return false;}
  if(tiers.some(tier=>tier.price<floorPrice||tier.price>=basePrice)){status.textContent='각 단계 가격은 최저 판매가격 이상, 정상 판매가격 미만이어야 합니다.';status.classList.add('error');return false;}
  if(mode==='clearance'&&stockMode!=='수량 관리'){status.textContent='재고소진 할인은 재고 방식을 수량 관리로 선택해야 합니다.';status.classList.add('error');document.querySelector('#stockMode').focus();return false;}
  const sorted=[...tiers].sort((a,b)=>mode==='clearance'?b.threshold-a.threshold:a.threshold-b.threshold);
  for(let index=1;index<sorted.length;index+=1){if(sorted[index].price>sorted[index-1].price){status.textContent='할인 단계가 진행될수록 가격이 같거나 더 낮아야 합니다.';status.classList.add('error');return false;}}
  status.textContent='사장님이 정한 단계와 최저가격만 사용합니다. 경쟁 가게 가격과 자동 연동하지 않습니다.';
  return{enabled:true,mode,floorPrice,endAt:endAt?new Date(endAt).toISOString():'',tiers:sorted,confirmedOrders:0,remainingStock:mode==='clearance'?Math.max(0,Number(stockQuantity)||0):null,merchantControlled:true,competitorPricing:false};
}
function resetLivePricingEditor(){document.querySelector('#livePricingEnabled').checked=false;document.querySelector('#livePricingFields').hidden=true;['livePricingFloor','liveTier1Threshold','liveTier1Price','liveTier2Threshold','liveTier2Price','liveTier3Threshold','liveTier3Price'].forEach(id=>{document.querySelector(`#${id}`).value='';});document.querySelector('#livePricingEndAt').value='';document.querySelector('#livePricingMode').value='cumulative';document.querySelector('#livePricingStatus').textContent='가격은 입력한 최저가격 아래로 내려가지 않습니다. 행사 상품은 최저가 순서만으로 노출하지 않습니다.';}
function editorStatus(message,error=false){const node=document.querySelector('#productEditorStatus');node.textContent=message;node.classList.toggle('error',error);}
function pendingProduct(){return Boolean(editingProductId||document.querySelector('#productName').value.trim()||document.querySelector('#productPrice').value||document.querySelector('#productDescription').value.trim()||document.querySelector('#productPhoto').files.length);}
function finishProductEdit(){photoReadId++;productPhotoSrc='';photoBusy=false;editingProductId='';document.querySelector('#productName').value='';document.querySelector('#productPrice').value='';document.querySelector('#productDescription').value='';document.querySelector('#productPhoto').value='';document.querySelector('#productPhotoStatus').textContent='사진은 이 기기에 보관하며 서버에는 전송하지 않습니다.';document.querySelector('#studioProductPhoto').hidden=true;document.querySelector('#addProduct').textContent='상품 초안에 추가하기';document.querySelector('#cancelProductEdit').hidden=true;resetLivePricingEditor();}
function editProduct(product){
  if(productSaving)return;
  if(pendingProduct()){editorStatus('작성 중인 상품을 먼저 추가하거나, 수정 중이라면 적용·취소해 주세요.',true);document.querySelector('#productName').focus();return;}
  editingProductId=product.id;document.querySelector('[data-product-method="direct"]').checked=true;showProductMethod();
  productPhotoSrc=product.image||'';document.querySelector('#studioProductPhoto').hidden=!productPhotoSrc;if(productPhotoSrc)document.querySelector('#studioProductPhoto').src=productPhotoSrc;document.querySelector('#productPhotoStatus').textContent=productPhotoSrc?'보관한 상품사진입니다. 새 파일을 선택해 교체할 수 있습니다.':'사진·파일에서 상품사진을 선택하세요.';
  document.querySelector('#productName').value=product.name;document.querySelector('#productPrice').value=String(product.price);document.querySelector('#productDescription').value=product.description||'';
  const unit=document.querySelector('#productUnit'),known=[...unit.options].some(option=>option.value===product.unit&&option.value!=='직접 입력');unit.value=known?product.unit:'직접 입력';document.querySelector('#customUnit').value=known?'':product.unit;document.querySelector('#customUnitField').hidden=known;
  document.querySelector('#stockMode').value=product.stockMode;document.querySelector('#stockQuantity').value=String(product.stockQuantity??0);document.querySelector('#stockQuantityField').hidden=product.stockMode!=='수량 관리';
  resetLivePricingEditor();if(product.livePricing?.enabled){const pricing=product.livePricing;document.querySelector('#livePricingEnabled').checked=true;document.querySelector('#livePricingMode').value=pricing.mode;document.querySelector('#livePricingFloor').value=String(pricing.floorPrice);const end=new Date(pricing.endAt);if(Number.isFinite(end.getTime())){end.setMinutes(end.getMinutes()-end.getTimezoneOffset());document.querySelector('#livePricingEndAt').value=end.toISOString().slice(0,16);}pricing.tiers.slice(0,3).forEach((tier,index)=>{document.querySelector(`#liveTier${index+1}Threshold`).value=String(tier.threshold);document.querySelector(`#liveTier${index+1}Price`).value=String(tier.price);});showLivePricing();}
  document.querySelector('#addProduct').textContent='수정내용 적용하기';document.querySelector('#cancelProductEdit').hidden=false;editorStatus(`${product.name} 수정 중입니다. 적용 후 마지막 단계에서 저장하면 고객 화면에 반영됩니다.`);
  document.querySelector('#productName').scrollIntoView({block:'center'});document.querySelector('#productName').focus({preventScroll:true});
}
function productReadyToLeave(){if(!pendingProduct())return true;editorStatus('입력 중인 상품이 있습니다. 먼저 초안에 추가하거나 수정내용을 적용·취소해 주세요.',true);document.querySelector('#addProduct').scrollIntoView({block:'center'});document.querySelector('#addProduct').focus({preventScroll:true});return false;}
function renderProducts(){
  const drafts=document.querySelector('#productDrafts');
  const count=document.querySelector('#productCount');
  count.textContent=`등록 ${products.length}개`;
  drafts.replaceChildren();
  if(!products.length){const empty=document.createElement('p');empty.className='empty-products';empty.textContent='아직 등록한 상품이 없습니다. 한 개만 먼저 올려도 상점을 시작할 수 있습니다.';drafts.append(empty);return;}
  products.forEach(product=>{const card=document.createElement('article');card.className='product-draft';const name=document.createElement('strong');name.textContent=product.name;const price=document.createElement('span');price.textContent=`${money(product.price)} / ${product.unit}`;const detail=document.createElement('small');detail.textContent=[product.stockMode,product.stockMode==='수량 관리'?`재고 ${product.stockQuantity}개`:'',product.hasPhoto?'사진 있음':'사진 없음',product.source==='csv'?'목록에서 불러옴':'직접 등록'].filter(Boolean).join(' · ');const remove=document.createElement('button');remove.type='button';remove.className='remove-product';remove.setAttribute('aria-label',`${product.name} 삭제`);remove.textContent='×';remove.addEventListener('click',()=>{if(editingProductId===product.id)finishProductEdit();products=products.filter(item=>item.id!==product.id);renderProducts();});const edit=document.createElement('button');edit.type='button';edit.className='edit-product';edit.dataset.productEdit=product.id;edit.setAttribute('aria-label',`${product.name} 수정`);edit.textContent='수정';edit.onclick=()=>editProduct(product);card.append(name,price,detail);if(product.livePricing?.enabled){const summary=document.createElement('small');summary.className='live-program-summary';summary.textContent=`⚡ ${livePricingModeLabel(product.livePricing.mode)} · 최저 ${money(product.livePricing.floorPrice)} · ${product.livePricing.tiers.length}단계`;card.append(summary);}card.append(edit,remove);drafts.append(card);});
  for(const button of drafts.querySelectorAll('[data-product-edit]')){const product=products.find(item=>item.id===button.dataset.productEdit);if(product?.image){const photo=document.createElement('img');photo.className='product-draft-photo';photo.src=product.image;photo.alt=product.name+' 보관한 사진';button.parentElement.prepend(photo);}}
  addImportedPrices();
}
async function addDirectProduct(){
  if(photoBusy||productSaving)return;
  const name=document.querySelector('#productName').value.trim();const price=Number(document.querySelector('#productPrice').value);const unit=productUnit();
  if(!name){editorStatus('상품명을 입력해 주세요.',true);document.querySelector('#productName').focus();return;}
  if(!Number.isSafeInteger(price)||price<=0){editorStatus('판매가격을 1원 이상의 정수로 입력해 주세요.',true);document.querySelector('#productPrice').focus();return;}
  if(!unit){editorStatus('판매단위를 입력해 주세요.',true);document.querySelector('#customUnit').focus();return;}
  const stockMode=document.querySelector('#stockMode').value;const stockQuantity=stockMode==='수량 관리'?Number(document.querySelector('#stockQuantity').value):null;if(stockMode==='수량 관리'&&(!Number.isSafeInteger(stockQuantity)||stockQuantity<0)){editorStatus('재고 수량을 0 이상의 정수로 입력해 주세요.',true);document.querySelector('#stockQuantity').focus();return;}const livePricing=readLivePricing(price,stockMode,stockQuantity);if(livePricing===false)return;
  const existing=products.find(product=>product.id===editingProductId);if(editingProductId&&!existing){editorStatus('수정할 상품을 다시 선택해 주세요.',true);return;}const product={...existing,id:existing?.id||`product-${crypto.randomUUID()}`,name,price,unit,stockMode,stockQuantity,description:document.querySelector('#productDescription').value.trim(),livePricing,hasPhoto:Boolean(document.querySelector('#productPhoto').files?.[0])||Boolean(existing?.hasPhoto),source:existing?.source||'direct'};
  if(product.livePricing&&existing?.livePricing)product.livePricing={...existing.livePricing,...product.livePricing,confirmedOrders:existing.livePricing.confirmedOrders||0};
  if(productPhotoSrc.startsWith('data:')){productSaving=true;document.querySelector('#addProduct').disabled=true;try{await globalThis.MatjidoProductPhotos.put(ensureStoreId(JSON.parse(localStorage.getItem(STORAGE_KEY)||'null')),product.id,productPhotoSrc);product.image=productPhotoSrc;product.hasPhoto=true;}catch(error){editorStatus(error.message||'사진을 보관하지 못했습니다. 다시 적용해 주세요.',true);return;}finally{productSaving=false;document.querySelector('#addProduct').disabled=false;}}
  if(existing)products=products.map(item=>item.id===existing.id?product:item);else products.push(product);
  finishProductEdit();renderProducts();editorStatus(`${name} ${existing?'수정내용을 적용했습니다':'상품을 초안에 추가했습니다'}. 마지막 단계에서 저장해 주세요.`);document.querySelector('#productName').focus();
  document.querySelector('#studioProductPhoto').hidden=true;
  if(studioProductKey){sessionStorage.removeItem(studioProductKey);studioProductKey='';const url=new URL(location.href);url.searchParams.delete('studioProduct');history.replaceState(history.state,'',url);document.querySelector('#studioProductNotice').textContent='상품 초안에 추가했습니다. 마지막 단계에서 저장한 뒤, 꾸미기 화면의 등록 상품 불러오기에서 사진과 연결하세요. 아직 실제 공개·결제는 발생하지 않습니다.';}
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
async function syncServerCatalog(payload){
  const response=await fetch(STORE_CATALOG_ENDPOINT,{method:'PUT',mode:'cors',headers:{'content-type':'application/json','accept':'application/json','X-Matjido-Preview-Client':PREVIEW_CLIENT},credentials:'omit',body:JSON.stringify(payload)});
  const result=await response.json();if(!response.ok)throw new Error(result?.message||`catalog-${response.status}`);return result;
}
async function saveDraft(){
  if(pendingProduct()){showStep(3);productReadyToLeave();return;}
  if(!stepOneReady()){showStep(1);document.querySelector('#saveStatus').textContent='먼저 가게 이름·주소·전화번호와 종류를 확인해 주세요.';return;}
  const previous=(()=>{try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch{return null;}})();
  const payload=shopSnapshot(previous);
  localStorage.setItem(STORAGE_KEY,JSON.stringify(payload));
  if(sourceStoreId){document.querySelector('#saveStatus').textContent='이 기기에 준비내용을 저장했습니다. 아래에서 상점주 권한을 확인하고 서버 저장·공개를 진행하세요.';document.querySelector('#publicationPanel').hidden=false;return;}
  if(products.some(product=>!(product.price>0))){document.querySelector('#saveStatus').textContent='가격 미설정 메뉴를 저장했습니다. 판매 전 가격을 확인해 주세요.';return;}
  document.querySelector('#customerStorePreview').hidden=true;
  saveButton.disabled=true;document.querySelector('#saveStatus').textContent='이 기기에 저장했고 서버의 테스트 가격·재고와 맞추는 중입니다…';
  try{await syncServerCatalog(payload);updateSavedLinks();document.querySelector('#customerStorePreview').hidden=false;document.querySelector('#customerPreviewHelp').textContent='테스트 상품 저장을 확인했습니다. 아래에서 이 가게의 상품·장바구니를 확인해 보세요. 실제 공개·결제는 아닙니다.';document.querySelector('#saveStatus').textContent='저장 완료: 서버가 테스트 가격·재고·누적 주문수를 관리합니다. 실제 결제나 공개 판매는 발생하지 않습니다.';saveButton.textContent='서버 연결 저장 완료';}
  catch(error){document.querySelector('#saveStatus').textContent=`기기에는 저장됐지만 서버 동기화가 필요합니다. ${String(error?.message||'잠시 뒤 다시 저장해 주세요.')}`;saveButton.textContent='서버 동기화 다시 시도';}
  finally{saveButton.disabled=!agreement.checked;}
}
function setRadio(name,value){document.querySelectorAll(`[name="${name}"]`).forEach(input=>{input.checked=input.value===String(value);});}
function loadDraft(){
  try{const payload=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!payload?.previewOnly)return;document.querySelector('#storeName').value=String(payload.storeName||'');document.querySelector('#storeCategory').value=String(payload.category||'');document.querySelector('#ownerPhone').value=formatPhone(payload.phone);addressInput.value=String(payload.address||'');addressInput.dataset.zonecode=String(payload.addressZonecode||'');document.querySelector('#storeAddressDetail').value=String(payload.addressDetail||'');if(addressInput.value){addressStatus.textContent='이 기기에 임시 저장한 여수시 공식 주소입니다.';addressStatus.classList.add('verified');}setRadio('theme',payload.theme);setRadio('productMethod',payload.productMethod);setRadio('subsidy',Number(payload.subsidy)||0);document.querySelector('#minimumOrder').value=String(Math.max(0,Number(payload.minimumOrder)||0));products=Array.isArray(payload.products)?payload.products.slice(0,500).filter(product=>product&&String(product.name||'').trim()&&Number(product.price)>0&&String(product.unit||'').trim()).map((product,index)=>({id:String(product.id||`restored-${index}`),name:String(product.name).trim(),price:Number(product.price),unit:String(product.unit).trim(),stockMode:String(product.stockMode||'판매 가능'),stockQuantity:product.stockQuantity==null?null:Math.max(0,Number(product.stockQuantity)||0),description:String(product.description||''),livePricing:product.livePricing&&typeof product.livePricing==='object'?product.livePricing:null,source:product.source==='csv'?'csv':'direct',hasPhoto:false})):[];document.querySelector('#saveStatus').textContent='이 기기에 저장된 입점 준비내용을 불러왔습니다.';}
  catch{document.querySelector('#saveStatus').textContent='기기 초안을 읽지 못했습니다. 기존 자료를 보존했습니다.';}
}

function shopSnapshot(previous){
  return {storeId:ensureStoreId(previous),sourceStoreId,storeName:document.querySelector('#storeName').value.trim(),category:document.querySelector('#storeCategory').value,address:addressInput.value,addressZonecode:String(addressInput.dataset.zonecode||''),addressDetail:document.querySelector('#storeAddressDetail').value.trim(),phone:document.querySelector('#ownerPhone').value,theme:selected('theme'),productMethod:selected('productMethod'),products:products.map(product=>({...product,image:globalThis.MatjidoOnlineShop.image(product.image,document.baseURI)})),subsidy:legacySharing?Number(selected('subsidy'))||0:0,deliveryCostSharing:legacySharing?null:deliveryCostSharing,minimumOrder:Number(document.querySelector('#minimumOrder').value)||0,savedAt:new Date().toISOString(),previewOnly:true};
}
function restoreExtendedDraft(){
  try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(!saved?.previewOnly)return;
    sourceStoreId=globalThis.MatjidoOnlineShop.id(saved.sourceStoreId);
    if(sourceStoreId&&!document.querySelector('#storeCategory').value){document.querySelector('#storeCategory').add(new Option(saved.category,saved.category,true,true));}
    deliveryCostSharing=saved.deliveryCostSharing?.mode==='ratio'?saved.deliveryCostSharing:{mode:'ratio',customerPercent:100,stepWon:100};
    try{globalThis.MatjidoDeliverySharing.split(SHARE_EXAMPLE_TOTAL,deliveryCostSharing);}catch{deliveryCostSharing={mode:'ratio',customerPercent:100,stepWon:100};}
    legacySharing=!saved.deliveryCostSharing&&Number(saved.subsidy)>0;
    // Preserve unpriced imported menus, original IDs/descriptions and public photo URLs.
    if(sourceStoreId&&Array.isArray(saved.products))products=saved.products.filter(p=>p&&globalThis.MatjidoOnlineShop.id(p.id)&&p.name).map(p=>({...p,image:globalThis.MatjidoOnlineShop.image(p.image,document.baseURI),price:p.price==null?null:Number(p.price)}));
    if(sourceStoreId)document.querySelector('#publicationPanel').hidden=false;
    addImportedPrices();
  }catch{document.querySelector('#saveStatus').textContent='저장 내용을 확인하지 못했습니다. 기존 자료는 삭제하지 않았습니다.';}
}
function addImportedPrices(){
  if(!sourceStoreId)return;
  products.forEach(product=>{
    const edit=[...document.querySelectorAll('[data-product-edit]')].find(node=>node.dataset.productEdit===product.id);if(!edit||edit.parentElement.querySelector('.imported-price'))return;
    const label=document.createElement('label');label.textContent='매장 판매가격';const input=document.createElement('input');input.type='number';input.className='imported-price';input.min='1';input.step='1';input.inputMode='numeric';input.placeholder='가격 미설정';input.value=product.price>0?String(product.price):'';input.setAttribute('aria-label',product.name+' 매장 판매가격');
    input.oninput=()=>{const value=input.valueAsNumber;product.price=Number.isSafeInteger(value)&&value>0?value:null;product.priceConfirmed=product.price!==null;const text=edit.parentElement.querySelector('span');if(text)text.textContent=product.price?`${money(product.price)} / ${product.unit}`:'가격 미설정 · 판매 전';};
    label.append(input);edit.parentElement.append(label);
    if(product.price==null){const text=edit.parentElement.querySelector('span');if(text)text.textContent='가격 미설정 · 판매 전';}
  });
}
async function beginExistingStore(){
  const id=globalThis.MatjidoOnlineShop.id(new URLSearchParams(location.search).get('sourceStore'));if(!id&&!sourceStoreId)return;
  const target=id||sourceStoreId,panel=document.querySelector('#existingStorePanel'),status=document.querySelector('#existingStoreStatus'),button=document.querySelector('#importExistingStore');panel.hidden=false;document.querySelector('#publicationPanel').hidden=false;
  accessStoreId=target;void connectOwnerAccount();
  status.textContent=sourceStoreId===target?'저장한 내 가게 초안을 이어서 수정할 수 있습니다. 다시 가져오기는 기존 편집내용을 덮어쓰므로 확인 후 진행합니다.':'기존 가게의 메뉴·사진을 가져오고 매장가격만 확인해 시작하세요. 아직 고객에게 공개되지 않습니다.';
  const importExisting=async(includeMenu)=>{
    if(importingExisting)return;
    let saved;try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch{}
    if((saved||pendingProduct()||document.querySelector('#storeName').value.trim())&&!confirm('이 기기의 작성 중인 초안을 교체할까요? 현재 초안은 가게별 보관함에 남기고 선택한 가게 자료를 가져옵니다.'))return;
    importingExisting=true;button.disabled=true;status.textContent='이 가게의 메뉴와 사진을 확인하고 있습니다…';
    try{
      const detail=await globalThis.daedongDataApi.detail(target);
      const menu=includeMenu?await globalThis.daedongDataApi.menu(target):{storeId:target,items:[]};
      const assetBase=location.origin===globalThis.MatjidoOnlineShop.host?'https://preview.daedongmap.com/':new URL('../',location.href).href;
      const next=globalThis.MatjidoOnlineShop.importStore(target,detail,menu,assetBase);
      if(saved)localStorage.setItem(STORAGE_KEY+':store:'+saved.storeId,JSON.stringify(saved));
      const old=localStorage.getItem(STORAGE_KEY+':store:'+next.storeId);const resumed=old?JSON.parse(old):next;
      localStorage.setItem(STORAGE_KEY,JSON.stringify(resumed));draftStoreId='';finishProductEdit();loadDraft();restoreExtendedDraft();renderProducts();addImportedPrices();updatePricePreview();updateNext();
      const select=document.querySelector('#storeCategory');if(!select.value){const option=new Option(resumed.category,resumed.category,true,true);select.add(option);}
      status.textContent=products.length?`${next.storeName} · ${products.length}개 메뉴를 준비했습니다. 가격 미설정 메뉴는 판매되지 않습니다.`:`${next.storeName} 기본정보를 준비했습니다. 판매할 상품을 직접 추가해 주세요.`;
      onlineShopVersion=0;void refreshPublication();
    }catch(error){status.textContent=error.message||'가게 자료를 불러오지 못했습니다. 기존 초안은 그대로입니다.';}finally{importingExisting=false;button.disabled=false;}
  };
  button.onclick=()=>importExisting(true);
  document.querySelector('#importExistingStoreBasics').onclick=()=>importExisting(false);
  void refreshPublication();
}
async function connectOwnerAccount(){
  const api=globalThis.MatjidoOnlineShop,local=['127.0.0.1','localhost'].includes(location.hostname),status=document.querySelector('#ownerAccessStatus');
  document.querySelector('#ownerAccessPanel').hidden=false;
  const signIn=document.querySelector('#ownerEntrySignIn');signIn.href=api.host+'/signin-with-chatgpt?returnTo='+encodeURIComponent('/store-partner/index.html?sourceStore='+accessStoreId);
  if(location.origin!==api.host&&!local){status.textContent='상점 저장·공개는 관리자 호스트에서 로그인하고 진행합니다. 이 기기의 초안이 자동으로 다른 주소에 복사되지는 않습니다.';signIn.href=api.ownerRoute(accessStoreId,document.baseURI);signIn.textContent='상점주 관리화면으로 이동';return;}
  try{const response=await fetch('/api/online-shops/session',{credentials:'same-origin',cache:'no-store'});if(!response.ok)throw Error();const session=await response.json();signIn.hidden=session.signedIn;ownerCanRequest=session.canRequestVerification===true;updateNext();status.textContent=session.signedIn?'로그인했습니다. 상점주 확인 전에도 초안을 준비할 수 있고, 확인 후 저장·공개할 수 있습니다.':'먼저 로그인해 주세요. 로그인했다고 다른 가게를 수정할 수 있는 것은 아닙니다.';}catch{status.textContent='계정 연결 서버를 확인하지 못했습니다. 초안은 유지합니다.';}
}
async function shopRequest(action,method='GET',body){
  const api=globalThis.MatjidoOnlineShop;
  if(location.origin!==api.host&&!['127.0.0.1','localhost'].includes(location.hostname))throw Error('서버 저장·공개는 관리자 사이트에서 로그인한 뒤 진행할 수 있습니다.');
  const response=await fetch('/api/online-shops/manage/'+(sourceStoreId||accessStoreId)+(action?'/'+action:''),{method,credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined});
  const result=await response.json();if(!response.ok)throw Error(result.message||'상점주 권한과 서버 연결을 확인해 주세요.');return result;
}
async function refreshPublication(){
  if(!sourceStoreId&&!accessStoreId)return;
  const signIn=document.querySelector('#ownerSignIn');signIn.href=globalThis.MatjidoOnlineShop.host+'/signin-with-chatgpt?returnTo='+encodeURIComponent('/store-partner/index.html?sourceStore='+sourceStoreId);signIn.hidden=false;
  try{const result=await shopRequest('');onlineShopVersion=result.version;serverShopDraft=result.shop;document.querySelector('#loadOnlineShop').hidden=!serverShopDraft;document.querySelector('#publishOnlineShop').disabled=!result.version||!sourceStoreId;document.querySelector('#unpublishOnlineShop').hidden=!result.published;document.querySelector('#publicationStatus').textContent=!sourceStoreId&&serverShopDraft?'다른 기기에 저장한 서버 초안이 있습니다. 서버 초안 불러오기로 사진과 상품을 이어서 수정하세요.':result.published?'현재 고객에게 공개 중입니다. 수정사항은 서버 저장 후 다시 공개해야 반영됩니다.':'현재 비공개입니다. 서버에 저장하고 공개하기를 눌러 주세요.';}catch(error){document.querySelector('#publicationStatus').textContent=error.message;}
}
async function publicationAction(action){
  if(onlineShopBusy||!sourceStoreId)return;
  const status=document.querySelector('#publicationStatus');
  if(action!=='save'&&!confirm(action==='publish'?'마지막 서버 저장 내용을 고객에게 공개할까요?':'고객에게 보이는 온라인 상점을 비공개로 바꿀까요?'))return;
  onlineShopBusy=true;const controls=[...form.querySelectorAll('input,select,textarea,button')].map(node=>[node,node.disabled]);controls.forEach(([node])=>node.disabled=true);form.setAttribute('aria-busy','true');
  try{
    if(action==='save'&&(pendingProduct()||photoBusy||productSaving))throw Error('작성 중인 상품을 먼저 적용하거나 취소해 주세요.');
    const snapshot=action==='save'?shopSnapshot():null,uploaded=[];
    if(snapshot){const photos=products.filter(p=>globalThis.MatjidoProductPhotos.valid(p.image));for(const [index,product] of photos.entries()){
      status.textContent=`상품사진 ${index+1}/${photos.length}장을 서버에 보관하고 있습니다… 공개는 아직 하지 않습니다.`;
      const saved=await shopRequest('photos','POST',{dataUrl:product.image});
      const image=globalThis.MatjidoOnlineShop.image(saved.image,document.baseURI),expected=new URL('/api/online-shops/public/'+sourceStoreId+'/photos/',location.href);
      if(!image||new URL(image).origin!==expected.origin||!new URL(image).pathname.startsWith(expected.pathname))throw Error('서버 사진 주소를 확인하지 못했습니다. 기기 사진은 유지했습니다.');
      snapshot.products.find(p=>p.id===product.id).image=image;uploaded.push([product,image]);
    }}
    const result=await shopRequest(action,'POST',{version:onlineShopVersion,...(snapshot?{shop:snapshot}:{})});onlineShopVersion=result.version;
    status.textContent=action==='save'?'서버에 초안을 저장했습니다. 상품사진도 보관했습니다. 공개 전까지 고객에게 보이지 않습니다.':action==='publish'?'공개했습니다. 기존 가게카드를 다시 열면 온라인 상점 보기 버튼이 나타납니다.':'공개를 중지했습니다.';
    document.querySelector('#unpublishOnlineShop').hidden=!result.published;
    if(snapshot){for(const [product,image] of uploaded){product.image=image;product.hasPhoto=true;}renderProducts();serverShopDraft=snapshot;document.querySelector('#loadOnlineShop').hidden=false;try{localStorage.setItem(STORAGE_KEY,JSON.stringify(snapshot));}catch{status.textContent+=' 이 기기 저장 공간이 부족하므로 다음에는 서버 초안을 불러오세요.';}}
  }catch(error){status.textContent=error.message;}finally{onlineShopBusy=false;controls.forEach(([node,disabled])=>node.disabled=disabled);form.removeAttribute('aria-busy');document.querySelector('#publishOnlineShop').disabled=!onlineShopVersion;}
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
document.querySelector('#livePricingEnabled').addEventListener('change',showLivePricing);
document.querySelector('#livePricingMode').addEventListener('change',showLivePricing);
document.querySelector('#productPhoto').addEventListener('change',async event=>{
  const file=event.target.files?.[0];if(!file)return;const request=++photoReadId;photoBusy=true;document.querySelector('#addProduct').disabled=true;document.querySelector('#productPhotoStatus').textContent='사진을 준비하고 있습니다…';
  try{const src=await globalThis.MatjidoProductPhotos.fromFile(file);if(request!==photoReadId)return;productPhotoSrc=src;document.querySelector('#studioProductPhoto').src=src;document.querySelector('#studioProductPhoto').hidden=false;document.querySelector('#productPhotoStatus').textContent=`${file.name} · 적용하면 이 기기에 보관합니다. 서버 전송은 아닙니다.`;}
  catch(error){if(request!==photoReadId)return;event.target.value='';document.querySelector('#productPhotoStatus').textContent=error.message;editorStatus('새 사진을 적용하지 못했습니다. 기존 사진과 상품은 그대로입니다.',true);}
  finally{if(request===photoReadId){photoBusy=false;document.querySelector('#addProduct').disabled=false;}}
});
document.querySelector('#addProduct').addEventListener('click',addDirectProduct);
document.querySelector('#cancelProductEdit').addEventListener('click',()=>{if(productSaving)return;finishProductEdit();document.querySelector('#addProduct').disabled=false;editorStatus('수정을 취소했습니다. 기존 상품 초안은 그대로입니다.');document.querySelector('#productName').focus();});
document.querySelector('#productSheet').addEventListener('change',importProductSheet);
document.querySelector('#priceBoardPhoto').addEventListener('change',event=>{const preview=document.querySelector('#priceBoardPreview');const status=document.querySelector('#photoAiStatus');const file=event.target.files?.[0];if(!file)return;const url=URL.createObjectURL(file);preview.src=url;preview.hidden=false;preview.onload=()=>URL.revokeObjectURL(url);status.textContent='사진을 이 기기에서 미리 표시했습니다. AI 서버 연결 전에는 분석하거나 외부로 전송하지 않습니다.';status.className='method-status success';});
document.querySelectorAll('[name="subsidy"]').forEach(input=>input.addEventListener('change',()=>{legacySharing=true;updatePricePreview();}));
document.querySelector('#deliveryShare').addEventListener('input',event=>{legacySharing=false;deliveryCostSharing=globalThis.MatjidoDeliverySharing.policy(SHARE_EXAMPLE_TOTAL,globalThis.MatjidoDeliverySharing.choices(SHARE_EXAMPLE_TOTAL)[Number(event.target.value)]);updatePricePreview();});
document.querySelectorAll('[data-share-percent]').forEach(button=>button.onclick=()=>{legacySharing=false;deliveryCostSharing={mode:'ratio',customerPercent:Number(button.dataset.sharePercent),stepWon:100};updatePricePreview();});
document.querySelector('#saveOnlineShop').onclick=()=>publicationAction('save');
document.querySelector('#requestOwnerAccess').onclick=async()=>{const button=document.querySelector('#requestOwnerAccess'),status=document.querySelector('#ownerAccessStatus');button.disabled=true;try{const response=await fetch('/api/online-shops/manage/'+accessStoreId+'/claim',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({storeName:document.querySelector('#storeName').value.trim()})});const result=await response.json();if(!response.ok)throw Error(result.message||'상점주 확인을 요청하지 못했습니다.');status.textContent=result.verified?'이미 확인된 내 가게입니다. 준비한 초안을 저장할 수 있습니다.':result.message;void refreshPublication();}catch(error){status.textContent=error.message;}finally{button.disabled=false;}};
document.querySelector('#loadOnlineShop').onclick=async()=>{if(onlineShopBusy)return;if(!confirm('이 기기의 편집내용 대신 마지막 서버 초안을 불러올까요? 현재 내용은 가게별 보관함에 남깁니다.'))return;try{const result=await shopRequest('');if(!result.shop)throw Error('서버에 저장한 초안이 없습니다.');const current=shopSnapshot();localStorage.setItem(STORAGE_KEY+':store:'+current.storeId,JSON.stringify(current));localStorage.setItem(STORAGE_KEY,JSON.stringify({...result.shop,previewOnly:true}));finishProductEdit();loadDraft();restoreExtendedDraft();renderProducts();updatePricePreview();updateNext();onlineShopVersion=result.version;document.querySelector('#publicationStatus').textContent='마지막 서버 초안을 불러왔습니다. 수정 후 저장하고 다시 공개할 수 있습니다.';}catch(error){document.querySelector('#publicationStatus').textContent=error.message;}};
document.querySelector('#publishOnlineShop').onclick=()=>publicationAction('publish');
document.querySelector('#unpublishOnlineShop').onclick=()=>publicationAction('unpublish');
nextButton.addEventListener('click',()=>{if(currentStep===1&&!stepOneReady()){updateNext();return;}if(currentStep===3&&!productReadyToLeave())return;showStep(currentStep+1);});
previousButton.addEventListener('click',()=>showStep(currentStep-1));
navButtons.forEach(button=>button.addEventListener('click',()=>{const target=Number(button.dataset.stepNav);if(target<=currentStep)showStep(target);}));
agreement.addEventListener('change',()=>{saveButton.disabled=!agreement.checked;});
saveButton.addEventListener('click',saveDraft);
loadDraft();restoreExtendedDraft();showProductMethod();renderProducts();addImportedPrices();updatePricePreview();updateNext();void beginExistingStore();
updateSavedLinks();

function updateStudioLink(){
  const styles={'실제 가게와 비슷하게':'market','따뜻하고 정겨운 가게':'cafe','깔끔하고 현대적인 가게':'modern','캐릭터가 있는 재미있는 가게':'playful'};
  document.querySelector('#studioLink').href='../store-studio/?style='+encodeURIComponent(styles[selected('theme')]||'cafe');
}
document.querySelectorAll('[name="theme"]').forEach(input=>input.addEventListener('change',updateStudioLink));
updateStudioLink();

function restoreStudioProduct(){
  const transfer=globalThis.ShopStudioProductHandoff,nonce=new URLSearchParams(location.search).get('studioProduct');
  if(!nonce)return;
  const notice=document.querySelector('#studioProductNotice');notice.hidden=false;
  try{
    const key=transfer.key(nonce),value=key&&transfer.read(JSON.parse(sessionStorage.getItem(key)||'null'));
    if(!value)throw new Error('가져올 상품사진이 없거나 30분이 지났습니다. 꾸미기 화면에서 다시 시작해 주세요.');
    let saved;try{saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');}catch{}
    if(value.storeId&&(!saved?.previewOnly||saved.storeId!==value.storeId))throw new Error('꾸미기 상점과 이 기기의 입점 상점이 다릅니다. 상품정보를 가져오지 않았습니다.');
    const bytes=Uint8Array.from(atob(value.src.split(',')[1]),char=>char.charCodeAt(0)),mime=value.src.match(/^data:([^;]+)/)[1];
    const files=new DataTransfer();files.items.add(new File([bytes],'상점-상품사진.'+(mime==='image/jpeg'?'jpg':mime.split('/')[1]),{type:mime}));
    document.querySelector('#productPhoto').files=files.files;
    document.querySelector('#productName').value=value.name;document.querySelector('#productDescription').value=value.description;
    document.querySelector('#studioProductPhoto').src=value.src;document.querySelector('#studioProductPhoto').hidden=false;
    productPhotoSrc=value.src;
    document.querySelector('#productPhotoStatus').textContent='꾸미기에서 가져온 사진 · 이 기기에만 표시하며 서버에는 아직 보관하지 않습니다.';
    document.querySelector('[data-product-method="direct"]').checked=true;showProductMethod();studioProductKey=key;
    notice.textContent='사진·이름·설명을 가져왔습니다. 가격·단위·재고를 확인해 상품 초안에 추가하세요. 기존 상품은 유지합니다. 공개 판매나 자동 저장은 하지 않습니다.';
  }catch(error){notice.textContent=error.message;}
  showStep(3);
}
async function restoreProductPhotos(){
  document.querySelector('#addProduct').disabled=true;
  try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(saved?.storeId){const photos=await globalThis.MatjidoProductPhotos.list(saved.storeId);for(const product of products)if(!product.image&&photos[product.id]){product.image=photos[product.id];product.hasPhoto=true;}}}
  catch{editorStatus('보관한 상품사진을 읽지 못했습니다. 기존 자료를 지우지 않았습니다. 다시 열어 확인해 주세요.',true);}
  finally{renderProducts();document.querySelector('#addProduct').disabled=false;restoreStudioProduct();}
}
void restoreProductPhotos();
