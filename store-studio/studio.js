(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const scene=$('scene'), itemsRoot=$('items'), status=$('saveStatus');
  const layout=window.ShopStudioLayout;
  const links=window.ShopStudioCustomerLinks;
  const catalog=window.ShopStudioCatalog;
  const design=window.ShopStudioDesign,examples=window.ShopStudioExamples;
  const params=new URLSearchParams(location.search),exampleId=params.has('published')?'':params.get('example')||'',sample=examples.get(exampleId);
  const publicView=params.has('published');
  if(exampleId&&!sample){location.replace('../store-alley/index.html');return;}
  const exampleMode=Boolean(sample),draftKey=examples.draftKey(exampleId),templateId=params.get('template')||'';
  let selectedDecorId='',decorGesture=null,browseSection='전체';
  let libraryLimit=8;
  let compositionIds=new Set(),savedCompositions=[],setsBusy=false,setsReadable=true,setsRevision='null';
  const composition=window.ShopStudioComposition;
  function renderCompositions(){
    compositionIds=new Set([...compositionIds].filter(id=>state.decor.some(item=>item.id===id)));
    $('compositionCount').textContent=`함께 선택한 가구 ${compositionIds.size}개 · 내 세트 ${savedCompositions.length}/12개 · 끌어서 이동하거나 방향 버튼을 사용하세요.`;
    for(const id of ['compositionLeft','compositionRight','compositionUp','compositionDown','compositionDuplicate','compositionClear','compositionSave'])$(id).disabled=loading||importing||previewing||setsBusy||!compositionIds.size;
    $('compositionSave').disabled=$('compositionSave').disabled||compositionIds.size>20||savedCompositions.length>=12;
    $('compositionExport').disabled=loading||importing||previewing||setsBusy||!savedCompositions.length;$('compositionImport').disabled=loading||importing||previewing||setsBusy;
    $('compositionLibrary').replaceChildren();
    for(const [set,builtin] of [...composition.builtins.map(s=>[s,true]),...savedCompositions.map(s=>[s,false])]){
      const row=document.createElement('div'),button=document.createElement('button');button.type='button';button.textContent=`${builtin?'견본 · ':''}${set.name} (${set.decor.length}개) 추가`;button.disabled=loading||importing||previewing||state.decor.length+set.decor.length>60;button.onclick=()=>addComposition(set);row.append(button);
      if(!builtin){const remove=document.createElement('button');remove.type='button';remove.textContent='삭제';remove.setAttribute('aria-label',set.name+' 보관함에서 삭제');remove.disabled=setsBusy||loading||importing||previewing;remove.onclick=()=>{if(confirm('보관함에서 이 세트를 삭제할까요? 이미 배치한 가구는 그대로 남습니다.'))void storeCompositions(savedCompositions.filter(s=>s.id!==set.id));};row.append(remove);}
      $('compositionLibrary').append(row);
    }
  }
  async function storeCompositions(next){
    if(setsBusy||loading||importing||previewing)return;if(!setsReadable){$('compositionStatus').textContent='보관함 읽기에 문제가 있어 기존 자료를 보호하기 위해 저장을 중지했습니다. 새로고침하거나 보관한 파일을 확인해 주세요.';return;}if(!db){$('compositionStatus').textContent='이 브라우저에서는 세트를 보관할 수 없습니다.';return;}
    setsBusy=true;renderCompositions();try{await new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),read=store.get('furniture-sets-v1');let conflict=false;read.onsuccess=()=>{if(JSON.stringify(read.result??null)!==setsRevision){conflict=true;tx.abort();}else store.put(next,'furniture-sets-v1');};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(Error(conflict?'다른 화면에서 보관함을 변경했습니다. 새로고침한 뒤 다시 확인해 주세요.':'저장 공간 문제로 보관하지 못했습니다. 이전 보관함과 현재 배치는 유지합니다.'));});savedCompositions=next;setsRevision=JSON.stringify(next);$('compositionStatus').textContent='세트 보관함을 이 기기에 저장했습니다. 배치한 가구와 상품은 바꾸지 않았습니다.';}catch(error){$('compositionStatus').textContent=error?.message||'보관하지 못했습니다. 이전 보관함은 유지합니다.';}finally{setsBusy=false;renderCompositions();}
  }
  async function loadCompositions(){
    try{const sets=await new Promise((resolve,reject)=>{const r=db.transaction('drafts').objectStore('drafts').get('furniture-sets-v1');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});setsRevision=JSON.stringify(sets??null);if(sets==null)return;if(!Array.isArray(sets)||sets.length>12)throw Error('invalid-sets');savedCompositions=sets.map(set=>composition.clean(set,crypto.randomUUID()));}
    catch{setsReadable=false;$('compositionStatus').textContent='보관함을 읽지 못했습니다. 기존 보관함을 보호하기 위해 저장하지 않습니다.';}
  }
  function addComposition(set){if(loading||importing||previewing)return;if(state.decor.length+set.decor.length>60){say('세트를 놓을 공간이 부족합니다. 가구는 60개까지 배치합니다.',true);return;}change(()=>{const pieces=composition.instantiate(set,()=>crypto.randomUUID());state.decor.push(...pieces);compositionIds=new Set(pieces.map(item=>item.id));selectedDecorId=pieces[0].id;selectedId='';});}
  function renderLibrary(){
    const matches=design.findDecor($('decorSearch').value,$('decorGroup').value),container=$('decorLibrary');container.replaceChildren();
    $('decorLibraryCount').textContent=`${matches.length}종 도구 · 현재 ${state.decor.length}/60개 배치`;
    for(const item of matches.slice(0,libraryLimit)){
      const button=document.createElement('button');button.type='button';button.className='decor-card';button.setAttribute('aria-label',item.label+' 추가');button.disabled=loading||importing||previewing||state.decor.length>=60;
      const thumbnail=document.createElement('div');thumbnail.className='decor-thumbnail';const svg=window.ShopStudioFurnitureArt.draw(document,item,'library-'+item.type);
      if(svg)thumbnail.append(svg);else{const legacy=document.createElement('div');legacy.className='decor-preview decor-'+item.type;legacy.style.setProperty('--decor-color',item.color);thumbnail.append(legacy);}
      const label=document.createElement('span');label.textContent=item.label;button.append(thumbnail,label);button.onclick=()=>addFurniture(item.type);container.append(button);
    }
    if(!matches.length){const hint=document.createElement('p');hint.textContent='일치하는 도구가 없습니다. 검색어를 지우거나 다른 업종을 선택해 주세요.';container.append(hint);}
    $('decorMore').hidden=matches.length<=libraryLimit;$('decorMore').disabled=loading||importing||previewing;
  }
  const sampleCart=new Map();
  let catalogItems=[],catalogStoreId='',catalogRequest=0,catalogBusy=false;
  const businessDefaults={intro:'',address:'',hours:'',phone:'',mapUrl:'',orderUrl:'',delivery:'',realPhoto:''};
  const businessFields={businessIntro:'intro',businessAddress:'address',businessHours:'hours',businessPhone:'phone',businessMapUrl:'mapUrl',businessOrderUrl:'orderUrl',businessDelivery:'delivery'};
  const defaults={preset:'cafe',shopTitle:'나의 작은 카페',zones:1,shelves:3,wall:'#eadfce',shelfColor:'#805735',material:'plain',light:100,catalogStoreId:'',appearance:design.appearance(),decor:[],business:{...businessDefaults},items:[]};
  const presets={
    cafe:{wall:'#eadfce',shelfColor:'#805735',material:'wood',light:105},
    modern:{wall:'#e4ebed',shelfColor:'#4e5a60',material:'plain',light:110},
    market:{wall:'#f0dfbf',shelfColor:'#7e4c2a',material:'brick',light:100},
    boutique:{wall:'#eee0e1',shelfColor:'#9e7c67',material:'plain',light:105},
    hardware:{wall:'#dae0db',shelfColor:'#4c5652',material:'tile',light:110},
    playful:{wall:'#f3e2af',shelfColor:'#9676a3',material:'tile',light:115}
  };
  const initialPreset=new URLSearchParams(location.search).get('style');
  let state={...defaults,...(presets[initialPreset]||{}),preset:presets[initialPreset]?initialPreset:'cafe',items:[]};
  let selectedId='',previewProductId='',previewing=false,loading=true,importing=false,gesture=null,db=null,saveChain=Promise.resolve();
  const past=[],future=[];
  const clone=value=>JSON.parse(JSON.stringify(value));
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));
  const selected=()=>state.items.find(item=>item.id===selectedId);
  function say(message,error=false){status.textContent=message;status.classList.toggle('error',error);}
  function checkpoint(){past.push(clone(state));if(past.length>20)past.shift();future.length=0;}
  function storageOpen(){return new Promise((resolve,reject)=>{
    const request=indexedDB.open('matjido-shop-studio-v1',1);
    request.onupgradeneeded=()=>request.result.createObjectStore('drafts');
    request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
    request.onblocked=()=>reject(new Error('storage-blocked'));
  });}
  function readDraft(){return new Promise((resolve,reject)=>{const request=db.transaction('drafts').objectStore('drafts').get(draftKey);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
  function persist(){
    if(!db){say('현재 시안을 저장할 수 없습니다. 창을 닫거나 새로고침하면 변경사항이 사라질 수 있습니다.',true);return;}
    const snapshot=clone(state);
    saveChain=saveChain.catch(()=>{}).then(()=>new Promise((resolve,reject)=>{
      const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(snapshot,draftKey);
      tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
    })).then(()=>say('사진과 배치를 이 기기에 저장했습니다.')).catch(()=>say('저장 공간이 부족하거나 사용할 수 없습니다. 현재 시안은 보이지만 새로고침하면 변경사항이 사라질 수 있습니다.',true));
  }
  function bounded(item){Object.assign(item,layout.bounded(item));}
  function position(node,item){node.style.left=`${item.x}%`;node.style.top=`${item.y}%`;node.style.width=`${item.size}%`;node.style.transform=`rotate(${item.rotation}deg)`;}
  function setCustomerLink(id,href,missingId){
    const node=$(id);node.hidden=!href;
    if(href)node.setAttribute('href',href);else node.removeAttribute('href');
    if(missingId)$(missingId).hidden=Boolean(href);
  }
  function renderCustomer(){
    const business=state.business;
    document.body.classList.toggle('studio-customer-preview',previewing);
    $('customerBusiness').hidden=!previewing;$('virtualSpaceLabel').hidden=!previewing;$('customerQuickActions').hidden=!previewing;
    for(const [id,key] of Object.entries(businessFields))$(id).value=business[key];
    const warnings=[];
    for(const [id,value,validator,label] of [
      ['businessMapUrl',business.mapUrl,links.map,'지도 링크는 네이버·카카오지도에서 공유한 HTTPS 링크를 입력해 주세요.'],
      ['businessOrderUrl',business.orderUrl,links.https,'주문 링크는 https://로 시작하는 이 가게의 주문 화면 주소를 입력해 주세요.'],
      ['businessPhone',business.phone,links.phone,'전화번호를 확인해 주세요.']
    ]){const invalid=Boolean(value.trim()&&!validator(value));$(id).setAttribute('aria-invalid',String(invalid));if(invalid)warnings.push(label);}
    $('businessValidation').textContent=warnings.join(' ');
    $('removeRealPhoto').disabled=!business.realPhoto||loading||importing||previewing;
    $('customerIntro').textContent=business.intro;$('customerIntro').hidden=!business.intro;
    $('customerAddress').textContent=business.address||'매장 주소를 준비하고 있습니다.';
    $('customerHours').textContent=business.hours||'영업시간은 방문 전 확인해 주세요.';
    $('customerDelivery').textContent=business.delivery||'배달·포장 가능 여부는 주문 화면이나 전화로 확인해 주세요.';
    $('realPhotoFigure').hidden=!business.realPhoto;
    if(business.realPhoto)$('customerRealPhoto').src=business.realPhoto;else $('customerRealPhoto').removeAttribute('src');
    setCustomerLink('customerMap',links.map(business.mapUrl),'customerMapMissing');
    setCustomerLink('customerPhone',links.phone(business.phone),'customerPhoneMissing');
    setCustomerLink('customerOrder',links.https(business.orderUrl),'customerOrderMissing');
    if(exampleMode){$('customerQuickActions').hidden=true;$('customerBusiness').hidden=true;}
    const product=previewing?state.items.find(item=>item.id===previewProductId&&!item.hidden):null;
    $('productDetails').hidden=!product;
    $('sampleAdd').hidden=!exampleMode||!product?.demoSku;
    if(product){
      $('productInfo').textContent=product.name;$('customerProductPhoto').src=product.src;$('customerProductPhoto').alt=product.name;
      $('customerProductDescription').textContent=product.description||'상품의 자세한 내용은 주문 화면에서 확인해 주세요.';
      const action=links.product(product,business);$('customerProductOrder').textContent=action.label;setCustomerLink('customerProductOrder',action.href,'productOrderMissing');
      $('customerCatalogInfo').textContent='';
      if(product.catalogProductId){
        const entry=catalogStoreId===state.catalogStoreId?catalogItems.find(value=>value.id===product.catalogProductId):null;
        $('productInfo').textContent=entry?.name||product.name;
        $('customerProductDescription').textContent=entry?.description||'상품정보를 확인해 주세요.';
        $('customerCatalogInfo').textContent=entry?`${entry.price.toLocaleString('ko-KR')}원${entry.unit?' / '+entry.unit:''} · ${entry.stockMode==='수량 관리'?'재고 '+entry.stockQuantity+'개':entry.stockMode}`:'상품정보를 확인하지 못했습니다. 사장님이 등록 상품을 새로고침해야 합니다.';
        const href=catalog.available(entry)?catalog.route(state.catalogStoreId,entry.id,location.href):'';
        $('customerProductOrder').textContent='이 상품 확인하고 장바구니 담기';setCustomerLink('customerProductOrder',href,'productOrderMissing');
        $('productOrderMissing').textContent=entry?'현재 구매할 수 없는 상품입니다. 가격·판매 상태를 확인해 주세요.':'등록 상품 연결을 확인하고 있습니다.';
      }else $('productOrderMissing').textContent='이 상품의 주문 연결을 준비하고 있습니다.';
      if(exampleMode){setCustomerLink('customerProductOrder','','productOrderMissing');$('productOrderMissing').textContent='시범매장 상품입니다. 아래 체험 장바구니에 담아볼 수 있습니다.';$('customerCatalogInfo').textContent=product.demoPrice?`예시 가격 ${product.demoPrice.toLocaleString('ko-KR')}원 · AI 연출 이미지`:'';}
    }else{$('productInfo').textContent='';$('customerProductPhoto').removeAttribute('src');}
  }
  function renderDesign(){
    const a=state.appearance;
    $('exampleNotice').hidden=!exampleMode;document.body.classList.toggle('bakery-example',exampleMode);
    document.body.dataset.example=exampleId;
    if(exampleMode){$('exampleNotice').querySelector('b').textContent=`${sample.name} · 가상 ${sample.category} 시범매장`;$('useExampleStyle').href=`index.html?template=${exampleId}`;$('backToAlley').href=`../store-alley/index.html#shop-${exampleId}`;document.title=`${sample.name} | 맛지도 시범 골목`;}
    const template=examples.get(templateId);$('templateNotice').hidden=exampleMode||!template;if(template)$('templateName').textContent=template.name;
    document.querySelector('.example-entry').hidden=exampleMode;$('backupTools').hidden=previewing;
    if(exampleMode)$('catalogSettings').hidden=true;
    $('previewHelp').textContent=exampleMode?'가상 상점을 둘러보는 체험 화면입니다. 상품을 선택해 체험 장바구니에 담아보세요. 실제 주문·결제는 발생하지 않습니다.':'공개 전 확인하는 고객 화면입니다. 등록한 방문·주문 링크는 열 수 있으며, 주문·결제는 연결된 화면에서 진행합니다.';
    scene.style.setProperty('--sign-color',a.signColor);scene.style.setProperty('--sign-background',a.signBackground);scene.style.setProperty('--floor',a.floor);scene.dataset.font=a.font;
    $('sceneAwning').hidden=!a.awning;$('shelfLines').hidden=!a.showShelves;$('dividers').hidden=!a.showShelves;
    for(const [id,key] of [['designFont','font'],['designSignColor','signColor'],['designSignBackground','signBackground'],['designFloor','floor']])$(id).value=a[key];
    for(const [id,key] of [['designAwning','awning'],['designShelves','showShelves'],['designTags','showTags']])$(id).checked=a[key];
    $('zoneLabels').replaceChildren();$('zoneLabels').style.gridTemplateColumns=`repeat(${state.zones},minmax(0,1fr))`;
    $('sectionSuggestions').replaceChildren();for(const name of a.zoneNames.slice(0,state.zones))$('sectionSuggestions').append(new Option(name,name));
    for(let i=0;i<3;i++){$(`zoneName${i+1}`).value=a.zoneNames[i];$(`zoneName${i+1}`).closest('label').hidden=i>=state.zones;if(i<state.zones){const label=document.createElement('span');label.textContent=a.zoneNames[i];$('zoneLabels').append(label);}}
    $('decorRoot').replaceChildren();$('decorList').replaceChildren();
    for(const item of state.decor){
      const node=document.createElement('button');node.type='button';node.className=`decor decor-${item.type}${item.id===selectedDecorId?' decor-selected':''}${compositionIds.has(item.id)?' decor-multi':''}${item.hidden?' decor-hidden':''}`;node.dataset.decorId=item.id;node.setAttribute('aria-label',`${item.text} 가구 선택`);node.tabIndex=previewing?-1:0;
      for(const key of ['x','y','width','height'])node.style[{x:'left',y:'top',width:'width',height:'height'}[key]]=item[key]+'%';node.style.setProperty('--decor-color',item.color);
      if(design.catalog[item.type]?.modern){node.classList.add('decor-vector');node.append(window.ShopStudioFurnitureArt.draw(document,item,'scene-'+item.id));}
      const label=document.createElement('span');label.textContent=item.text;label.hidden=item.showLabel===false;node.append(label);
      if(['rack','glass'].includes(item.type))for(const level of [36,68,100]){const shelf=document.createElement('i');shelf.style.top=level+'%';node.append(shelf);}
      if(!previewing||!item.hidden)$('decorRoot').append(node);
      const entry=document.createElement('button');entry.type='button';entry.textContent=`${design.types[item.type]} · ${item.text}${item.locked?' 🔒':''}${item.hidden?' (숨김)':''}`;entry.disabled=loading||importing||previewing;entry.setAttribute('aria-pressed',String(item.id===selectedDecorId));entry.onclick=()=>{selectedDecorId=item.id;selectedId='';render();$('decorTools').scrollIntoView({block:'nearest'});};$('decorList').append(entry);
      const checkLabel=document.createElement('label');checkLabel.className='composition-check';const check=document.createElement('input');check.type='checkbox';check.dataset.groupId=item.id;check.checked=compositionIds.has(item.id);check.disabled=loading||importing||previewing;check.setAttribute('aria-label',item.text+' 함께 선택');check.onchange=()=>{check.checked?compositionIds.add(item.id):compositionIds.delete(item.id);render();[...$('decorList').querySelectorAll('input')].find(node=>node.dataset.groupId===item.id)?.focus({preventScroll:true});};checkLabel.append(check,document.createTextNode('묶음에 포함'));$('decorList').append(checkLabel);
    }
    const item=state.decor.find(value=>value.id===selectedDecorId);$('decorTools').hidden=!item||previewing;
    if(item){for(const [id,key] of [['decorText','text'],['decorColor','color'],['decorWidth','width'],['decorHeight','height'],['decorX','x'],['decorY','y']])$(id).value=item[key];$('decorLocked').checked=item.locked;$('decorHidden').checked=item.hidden;}
    $('decorAccent').value=item?.accent||'#ead9ba';$('decorFinish').value=item?.finish||'plain';$('decorShowLabel').checked=item?.showLabel!==false;
    for(const id of ['decorAccent','decorFinish'])$(id).closest('label').hidden=!design.catalog[item?.type]?.modern;
    $('cabinetSettings').hidden=!design.cabinetTypes.includes(item?.type);$('cabinetEnabled').checked=!!item?.cabinet;$('cabinetFields').hidden=!item?.cabinet;
    const cabinet=item?.cabinet||{rows:3,columns:2,doors:'none',handle:'bar',back:true};for(const [id,key] of [['cabinetRows','rows'],['cabinetColumns','columns'],['cabinetDoors','doors'],['cabinetHandle','handle']])$(id).value=cabinet[key];$('cabinetBack').checked=cabinet.back;
    for(const id of ['decorWidth','decorHeight','decorX','decorY','removeDecor'])$(id).disabled=!item||item.locked||loading||importing||previewing;
    for(const id of ['exportScene','importScene'])$(id).disabled=loading||importing;
  }
  function renderBrowse(){
    $('customerBrowse').hidden=!previewing;$('sampleCart').hidden=!previewing||!exampleMode;
    const seen=new Set(),items=state.items.filter(item=>{const key=item.demoSku||item.catalogProductId||item.id;if(item.hidden||seen.has(key))return false;seen.add(key);return true;});
    const sections=['전체',...new Set(items.map(item=>item.section||'기타 상품'))];if(!sections.includes(browseSection))browseSection='전체';
    $('browseSections').replaceChildren();for(const section of sections){const button=document.createElement('button');button.textContent=section;button.setAttribute('aria-pressed',String(browseSection===section));button.onclick=()=>{browseSection=section;renderBrowse();};$('browseSections').append(button);}
    $('browseProducts').replaceChildren();for(const item of items.filter(value=>browseSection==='전체'||(value.section||'기타 상품')===browseSection)){
      const button=document.createElement('button');button.className='browse-product';const img=document.createElement('img');img.src=item.src;img.alt='';img.loading='lazy';const label=document.createElement('strong');label.textContent=item.name;const note=document.createElement('small');note.textContent=exampleMode?`예시 ${Number(item.demoPrice||0).toLocaleString('ko-KR')}원`:'사진을 눌러 상품 확인';button.append(img,label,note);button.onclick=()=>{selectedId=item.id;previewProductId=item.id;renderCustomer();$('productDetails').scrollIntoView({behavior:'smooth',block:'nearest'});};$('browseProducts').append(button);
    }
    $('sampleCartItems').replaceChildren();let total=0,count=0;
    for(const [sku,quantity] of sampleCart){const product=sample.products.find(value=>value.sku===sku);if(!product)continue;count+=quantity;total+=quantity*product.price;const row=document.createElement('div');row.className='sample-cart-row';const label=document.createElement('span');label.textContent=product.name;row.append(label);for(const [text,delta,title] of [['−',-1,'줄이기'],['+',1,'늘리기'],['빼기',-quantity,'삭제']]){const button=document.createElement('button');button.textContent=text;button.setAttribute('aria-label',`${product.name} ${title}`);button.onclick=()=>sampleQuantity(sku,delta);if(delta===1)button.disabled=quantity>=20;row.append(button);if(delta===-1){const value=document.createElement('b');value.textContent=quantity;row.append(value);}}$('sampleCartItems').append(row);}
    $('sampleCartCount').textContent=count;$('sampleCartTotal').textContent=`상품 합계(예시) ${total.toLocaleString('ko-KR')}원`;$('sampleCartClear').disabled=!count;
  }
  function sampleQuantity(sku,delta){if(!exampleMode||!sample.products.some(value=>value.sku===sku))return;const count=Math.max(0,Math.min(20,(sampleCart.get(sku)||0)+delta));count?sampleCart.set(sku,count):sampleCart.delete(sku);$('sampleFeedback').textContent=count?`${sample.products.find(value=>value.sku===sku).name} ${count}개를 체험 장바구니에 담았습니다.`:'체험 장바구니에서 상품을 뺐습니다.';renderBrowse();}
  $('sampleAdd').onclick=()=>{const item=state.items.find(value=>value.id===previewProductId);if(item?.demoSku)sampleQuantity(item.demoSku,1);};$('sampleCartClear').onclick=()=>{sampleCart.clear();renderBrowse();};
  function render(){
    state.appearance=design.appearance(state.appearance);state.decor=Array.isArray(state.decor)?state.decor:[];
    scene.style.setProperty('--wall',state.wall);scene.style.setProperty('--shelf',state.shelfColor);scene.style.setProperty('--light',state.light/100);scene.dataset.material=state.material;
    scene.classList.toggle('previewing',previewing);$('sign').textContent=state.shopTitle||'내 상점';
    for(const key of ['preset','shopTitle','zones','shelves','wall','shelfColor','material','light'])$(key).value=state[key];
    $('dividers').replaceChildren();for(let i=1;i<state.zones;i++){const line=document.createElement('i');line.className='divider';line.style.left=`${i*100/state.zones}%`;$('dividers').append(line);}
    $('shelfLines').replaceChildren();for(const level of layout.shelfLevels(state.shelves)){const line=document.createElement('i');line.className='shelf-line';line.style.top=`${level}%`;$('shelfLines').append(line);}
    renderDesign();
    itemsRoot.replaceChildren();$('itemList').replaceChildren();
    for(const item of state.items){
      const node=document.createElement('button');node.type='button';node.className=`scene-item${item.shadow?' has-shadow':''}${item.locked?' is-locked':''}${item.hidden?' is-hidden':''}${item.id===selectedId&&!previewing?' selected':''}`;node.dataset.itemId=item.id;node.setAttribute('aria-label',`${item.name} ${previewing?'보기':'선택·이동'}`);node.style.aspectRatio='1';position(node,item);
      const img=document.createElement('img');img.src=item.src;img.alt='';img.draggable=false;img.style.height='100%';
      node.append(img);if(state.appearance.showTags){const tag=document.createElement('span');tag.className='scene-label';tag.textContent=item.name;node.append(tag);}if(!previewing||!item.hidden)itemsRoot.append(node);
      const listButton=document.createElement('button');listButton.type='button';listButton.disabled=previewing||loading||importing;listButton.setAttribute('aria-label',`${item.name} 목록에서 선택`);listButton.setAttribute('aria-pressed',String(item.id===selectedId));
      const thumbnail=document.createElement('img');thumbnail.src=item.src;thumbnail.alt='';const label=document.createElement('span');label.textContent=item.name;const flags=document.createElement('small');flags.textContent=[item.locked?'위치 잠금':'',item.hidden?'숨김':''].filter(Boolean).join(' · ');listButton.append(thumbnail,label,flags);
      listButton.onclick=()=>{selectedDecorId='';selectedId=item.id;render();scene.scrollIntoView({block:'center'});};$('itemList').append(listButton);
    }
    $('emptyScene').hidden=previewing?state.items.some(item=>!item.hidden):state.items.length>0;
    const item=selected();$('itemTools').hidden=!item||previewing;
    if(item){$('itemName').value=item.name;$('itemDescription').value=item.description||'';$('itemProductUrl').value=item.productUrl||'';$('itemSize').value=item.size;$('itemRotation').value=item.rotation;$('itemShadow').checked=item.shadow;$('itemLocked').checked=Boolean(item.locked);$('itemHidden').checked=Boolean(item.hidden);}
    $('itemSection').value=item?.section||'';
    $('itemDecor').replaceChildren(new Option('사진만 따로 이동',''));for(const value of state.decor)$('itemDecor').add(new Option(value.text,value.id));$('itemDecor').value=item?.decorId||'';
    $('catalogStore').value=state.catalogStoreId;
    const picker=$('itemCatalogProduct');picker.replaceChildren(new Option('상품 연결 안 함',''));
    if(catalogStoreId===state.catalogStoreId)for(const product of catalogItems)picker.add(new Option(`${product.name} · ${product.price.toLocaleString('ko-KR')}원`,product.id));
    if(item?.catalogProductId&&(catalogStoreId!==state.catalogStoreId||!catalogItems.some(product=>product.id===item.catalogProductId)))picker.add(new Option('연결한 상품 확인 필요',item.catalogProductId));
    picker.value=item?.catalogProductId||'';picker.disabled=loading||importing||previewing||catalogBusy||!item;
    $('itemProductUrl').disabled=Boolean(item?.catalogProductId);
    $('itemCatalogStatus').textContent=item?.catalogProductId?'등록 상품의 가격·재고를 사용합니다. 같은 상품을 여러 사진에 연결해도 장바구니는 하나로 합쳐집니다.':'상품을 불러온 뒤 이 사진에 연결하세요.';
    for(const id of ['replacePhoto','retakePhoto'])$(id).disabled=!item||loading||importing||previewing;
    $('registerPhotoProduct').hidden=exampleMode;
    $('registerPhotoHelp').hidden=exampleMode;
    $('registerPhotoProduct').disabled=!item||Boolean(item.catalogProductId)||loading||importing||previewing;
    $('registerPhotoHelp').textContent=item?.catalogProductId?'이미 등록된 상품과 연결되어 있습니다. 사진 교체는 가격·재고를 변경하지 않습니다.':'사진·이름·설명을 상품등록 화면으로 가져갑니다. 가격·단위·재고를 확인한 뒤 직접 저장하세요. 사진은 이 기기에만 보관되며 아직 공개 판매되지 않습니다.';
    const badProductLink=Boolean(item?.productUrl?.trim()&&!links.https(item.productUrl));$('itemProductUrl').setAttribute('aria-invalid',String(badProductLink));
    $('itemLinkStatus').textContent=badProductLink?'상품 주문 링크를 확인해 주세요. https://로 시작하는 주소가 필요합니다.':'비워두면 가게 주문 화면으로 연결합니다. 상품명만으로 주문 링크를 만들지 않습니다.';
    $('lockedHelp').hidden=!item?.locked;
    for(const id of ['itemSize','itemRotation','moveLeft','moveRight','moveUp','moveDown','snapSelected','remove'])$(id).disabled=!item||Boolean(item.locked)||loading||importing||previewing;
    $('undo').disabled=loading||importing||!past.length||previewing;$('redo').disabled=loading||importing||!future.length||previewing;
    $('preview').textContent=previewing?'꾸미기로 돌아가기':'고객처럼 보기';
    $('previewHelp').hidden=!previewing;
    $('arrangeTools').hidden=previewing;
    $('arrangeAll').disabled=loading||importing||!state.items.some(item=>!item.locked&&!item.hidden&&!item.decorId);
    $('snapSelected').disabled=$('snapSelected').disabled||Boolean(item?.decorId)||!state.appearance.showShelves;
    document.querySelectorAll('.tools input,.tools select,.tools button').forEach(node=>node.disabled=loading||importing||previewing);
    $('loadCatalog').disabled=loading||importing||previewing||catalogBusy;
    $('removeRealPhoto').disabled=!state.business.realPhoto||loading||importing||previewing;
    renderCustomer();
    renderBrowse();
    renderLibrary();
    renderCompositions();
    window.ShopStudioCloud?.refresh();
  }
  function change(action){if(loading||importing||previewing)return;checkpoint();action();render();persist();}
  $('applyTemplate').onclick=()=>{const template=examples.template(templateId);if(!template||exampleMode)return;if(!confirm('기존 상품사진·가게정보·주문 연결은 유지하고 가구·색·간판 스타일을 바꿉니다. 사진의 기존 진열대 연결은 해제됩니다. 적용할까요?'))return;change(()=>{state={...state,...template,shopTitle:state.shopTitle,business:state.business,catalogStoreId:state.catalogStoreId,items:state.items.map(item=>({...item,decorId:''}))};selectedId='';selectedDecorId='';});say('디자인을 적용했습니다. 기존 상품과 가게정보는 유지했습니다. 되돌리기로 이전 디자인을 복원할 수 있습니다.');};
  for(const [id,key] of [['designFont','font'],['designSignColor','signColor'],['designSignBackground','signBackground'],['designFloor','floor'],['designAwning','awning'],['designShelves','showShelves'],['designTags','showTags']])$(id).addEventListener('change',event=>change(()=>{state.appearance[key]=event.target.type==='checkbox'?event.target.checked:event.target.value;}));
  for(let i=0;i<3;i++)$(`zoneName${i+1}`).addEventListener('change',event=>change(()=>{state.appearance.zoneNames[i]=event.target.value.trim().slice(0,24)||`구역 ${i+1}`;}));
  $('itemSection').addEventListener('change',event=>change(()=>{if(selected())selected().section=event.target.value.trim().slice(0,24);}));
  $('itemDecor').addEventListener('change',event=>change(()=>{if(selected())selected().decorId=state.decor.some(item=>item.id===event.target.value)?event.target.value:'';}));
  function placeDecor(item,x,y,ids=[]){if(ids.length>1){const result=design.translateMany(state.decor,state.items,ids,x-item.x,y-item.y,layout);if(result.blocked){say('묶음의 가구 또는 연결된 상품의 위치 잠금을 먼저 풀어 주세요.',true);return false;}state.decor=result.fixtures;state.items=result.items;return true;}const result=design.translate(item,state.items,x-item.x,y-item.y,layout);if(result.blocked){say('가구 또는 연결된 상품의 위치 잠금을 먼저 풀어 주세요.',true);return false;}Object.assign(item,result.fixture);state.items=result.items;return true;}
  function addFurniture(type){if(state.decor.length>=60){say('가구·장식은 60개까지 배치할 수 있습니다.',true);return;}change(()=>{const item=design.createDecor(type,crypto.randomUUID());state.decor.push(item);selectedDecorId=item.id;selectedId='';});}
  $('addDecor').onclick=()=>addFurniture($('decorType').value);
  $('decorSearch').oninput=()=>{libraryLimit=8;renderLibrary();};$('decorGroup').onchange=()=>{libraryLimit=8;renderLibrary();};$('decorMore').onclick=()=>{libraryLimit+=8;renderLibrary();};
  $('cabinetEnabled').onchange=event=>change(()=>{const item=state.decor.find(i=>i.id===selectedDecorId);if(item&&design.cabinetTypes.includes(item.type))item.cabinet=event.target.checked?{rows:3,columns:2,doors:'none',handle:'bar',back:true}:null;});
  for(const [id,key] of [['cabinetRows','rows'],['cabinetColumns','columns'],['cabinetDoors','doors'],['cabinetHandle','handle'],['cabinetBack','back']])$(id).onchange=event=>change(()=>{const item=state.decor.find(i=>i.id===selectedDecorId);if(!item?.cabinet)return;item.cabinet=design.cabinet({...item.cabinet,[key]:event.target.type==='checkbox'?event.target.checked:event.target.type==='number'?Number(event.target.value):event.target.value});});
  function moveComposition(dx,dy){if(!compositionIds.size)return;const result=design.translateMany(state.decor,state.items,[...compositionIds],dx,dy,layout);if(result.blocked){say('묶음의 가구 또는 연결된 상품의 위치 잠금을 먼저 풀어 주세요.',true);return;}change(()=>{state.decor=result.fixtures;state.items=result.items;});}
  for(const [id,dx,dy] of [['compositionLeft',-2,0],['compositionRight',2,0],['compositionUp',0,-2],['compositionDown',0,2]])$(id).onclick=()=>moveComposition(dx,dy);
  $('compositionClear').onclick=()=>{compositionIds.clear();render();};
  $('compositionDuplicate').onclick=()=>{const pieces=state.decor.filter(i=>compositionIds.has(i.id));if(!pieces.length)return;if(state.decor.length+pieces.length>60){say('묶음 전체를 복제하려면 가구 60개 한도 안에 여유가 있어야 합니다.',true);return;}change(()=>{const copies=pieces.map(i=>design.decor({...i,id:crypto.randomUUID(),locked:false,hidden:false})),moved=design.translateMany(copies,[],copies.map(i=>i.id),4,3,layout).fixtures;state.decor.push(...moved);compositionIds=new Set(moved.map(i=>i.id));selectedDecorId=moved[0].id;selectedId='';});};
  $('compositionSave').onclick=()=>{try{if(savedCompositions.length>=12)throw Error('내 세트는 12개까지 보관합니다.');const set=composition.create($('compositionName').value,state.decor,[...compositionIds],crypto.randomUUID());void storeCompositions([...savedCompositions,set]);}catch(error){$('compositionStatus').textContent=error.message;}};
  $('compositionExport').onclick=()=>{if(!savedCompositions.length||previewing)return;const blob=new Blob([JSON.stringify({format:'matjido-furniture-sets',version:1,sets:savedCompositions},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='맛지도-내-가구세트.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
  $('compositionImport').onclick=()=>$('compositionFile').click();
  $('compositionFile').onchange=async event=>{const file=event.target.files?.[0];event.target.value='';if(!file||loading||importing||previewing||setsBusy)return;try{if(file.size>256*1024)throw Error('256KB 이하의 세트 파일을 선택해 주세요.');const added=composition.importFile(JSON.parse(await file.text()),()=>crypto.randomUUID());if(savedCompositions.length+added.length>12)throw Error('보관함은 12개까지입니다. 먼저 필요 없는 세트를 정리해 주세요.');if(confirm(`${added.length}개 세트를 보관함에 추가할까요? 현재 배치는 바꾸지 않습니다.`))await storeCompositions([...savedCompositions,...added]);}catch(error){$('compositionStatus').textContent=error instanceof SyntaxError?'세트 파일을 읽지 못했습니다. 맛지도 세트 JSON 파일을 선택해 주세요.':error.message;}};
  for(const [id,key,numeric] of [['decorText','text',false],['decorColor','color',false],['decorAccent','accent',false],['decorFinish','finish',false],['decorShowLabel','showLabel',false],['decorWidth','width',true],['decorHeight','height',true],['decorX','x',true],['decorY','y',true],['decorLocked','locked',false],['decorHidden','hidden',false]])$(id).addEventListener('change',event=>change(()=>{const item=state.decor.find(value=>value.id===selectedDecorId);if(!item||item.locked&&numeric)return;if(key==='x'||key==='y'){placeDecor(item,key==='x'?Number(event.target.value):item.x,key==='y'?Number(event.target.value):item.y);return;}item[key]=event.target.type==='checkbox'?event.target.checked:numeric?Number(event.target.value):event.target.value;Object.assign(item,design.decor(item));}));
  $('removeDecor').onclick=()=>{const item=state.decor.find(value=>value.id===selectedDecorId);if(!item||item.locked)return;change(()=>{state.decor=state.decor.filter(value=>value.id!==item.id);state.items.forEach(value=>{if(value.decorId===item.id)value.decorId='';});selectedDecorId='';});};
  $('duplicateDecor').onclick=()=>{if(state.decor.length>=60)return;change(()=>{const item=state.decor.find(value=>value.id===selectedDecorId);if(!item)return;const copy=design.decor({...item,id:crypto.randomUUID(),x:item.x+3,y:item.y+3,locked:false,hidden:false});state.decor.push(copy);selectedDecorId=copy.id;});};
  function reorderDecor(front){change(()=>{const item=state.decor.find(value=>value.id===selectedDecorId);if(!item)return;state.decor=state.decor.filter(value=>value.id!==item.id);front?state.decor.push(item):state.decor.unshift(item);});}
  $('decorFront').onclick=()=>reorderDecor(true);$('decorBack').onclick=()=>reorderDecor(false);
  $('decorRoot').addEventListener('pointerdown',event=>{const node=event.target.closest('[data-decor-id]');if(!node||previewing||loading||importing||event.button!==0)return;selectedDecorId=node.dataset.decorId;selectedId='';render();const item=state.decor.find(value=>value.id===selectedDecorId);if(item.locked)return;const fresh=$('decorRoot').querySelector(`[data-decor-id="${item.id}"]`);fresh.setPointerCapture(event.pointerId);decorGesture={node:fresh,pointerId:event.pointerId,before:clone(state),ids:compositionIds.has(item.id)?[...compositionIds]:[item.id],rect:scene.getBoundingClientRect(),startX:item.x,startY:item.y,x:event.clientX,y:event.clientY,moved:false};event.preventDefault();});
  $('decorRoot').addEventListener('pointermove',event=>{const g=decorGesture;if(!g||g.pointerId!==event.pointerId)return;const dx=event.clientX-g.x,dy=event.clientY-g.y;if(Math.abs(dx)+Math.abs(dy)<4&&!g.moved)return;g.moved=true;const item=state.decor.find(value=>value.id===selectedDecorId);if(!placeDecor(item,g.startX+dx/g.rect.width*100,g.startY+dy/g.rect.height*100,g.ids))return;for(const fixture of state.decor.filter(i=>g.ids.includes(i.id))){const node=$('decorRoot').querySelector(`[data-decor-id="${fixture.id}"]`);if(node){node.style.left=fixture.x+'%';node.style.top=fixture.y+'%';}}for(const linked of state.items.filter(value=>g.ids.includes(value.decorId))){const node=itemsRoot.querySelector(`[data-item-id="${linked.id}"]`);if(node)position(node,linked);}});
  for(const type of ['pointerup','pointercancel'])$('decorRoot').addEventListener(type,event=>{const g=decorGesture;if(!g||g.pointerId!==event.pointerId)return;decorGesture=null;if(type==='pointercancel')state=g.before;else if(g.moved){past.push(g.before);if(past.length>20)past.shift();future.length=0;persist();}render();});
  $('zoomScene').onclick=()=>{const active=$('sceneViewport').classList.toggle('zoomed');$('zoomScene').setAttribute('aria-pressed',String(active));$('zoomScene').textContent=active?'공간 전체 보기':'가까이 보기';};
  $('exportScene').onclick=()=>{const file=new Blob([JSON.stringify({format:'matjido-studio',version:1,example:exampleMode,exampleId,scene:state})],{type:'application/json'}),url=URL.createObjectURL(file),link=document.createElement('a');link.href=url;link.download=exampleMode?`맛지도_${sample.name}_시안.json`:'맛지도_내상점_시안.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('시안 파일을 내려받았습니다. 사진과 배치가 들어 있으니 안전한 곳에 보관하세요.');};
  $('importScene').onclick=()=>$('sceneFile').click();
  $('sceneFile').onchange=async event=>{const file=event.target.files?.[0];if(!file)return;try{if(file.size>20*1024*1024)throw new Error('20MB 이하의 시안 파일을 선택해 주세요.');const value=JSON.parse(await file.text()),draft=design.validateImport(value);if(Boolean(value.example)!==exampleMode||(exampleMode&&(value.exampleId||'bakery')!==exampleId))throw new Error('내 상점과 시범매장 시안은 해당 화면에서 각각 불러와 주세요.');if(!confirm('현재 시안을 불러온 파일로 바꿀까요? 먼저 시안 파일로 보관할 수 있으며, 불러온 뒤 되돌리기도 가능합니다.'))return;change(()=>{state=restoreScene(draft);selectedId='';selectedDecorId='';});catalogRequest++;catalogItems=[];catalogStoreId='';if(state.catalogStoreId)void loadCatalog();}catch(error){say(error instanceof SyntaxError?'시안 파일을 읽지 못했습니다. 맛지도에서 보관한 JSON 파일을 선택해 주세요.':error.message,true);}finally{event.target.value='';}};
  $('catalogStore').addEventListener('change',event=>{
    const value=event.target.value.trim();if(!catalog.id(value)&&value){$('catalogStatus').textContent='상점번호는 영문·숫자·밑줄·하이픈으로 입력해 주세요.';return;}
    if(value===state.catalogStoreId)return;
    if(state.items.some(item=>item.catalogProductId)&&!confirm('상점을 바꾸면 기존 사진의 상품 연결이 해제됩니다. 계속할까요?')){render();return;}
    catalogRequest++;catalogItems=[];catalogStoreId='';catalogBusy=false;
    change(()=>{state.catalogStoreId=value;state.items.forEach(item=>delete item.catalogProductId);});$('catalogStatus').textContent='등록 상품 불러오기를 눌러 주세요.';
  });
  $('itemCatalogProduct').addEventListener('change',event=>change(()=>{const item=selected();if(item)item.catalogProductId=catalog.id(event.target.value);}));
  async function loadCatalog(){
    if(exampleMode)return;
    if(!catalog.id(state.catalogStoreId)){$('catalogStatus').textContent='등록한 온라인 상점번호를 입력해 주세요.';return;}
    const request=++catalogRequest,storeId=state.catalogStoreId;catalogItems=[];catalogStoreId='';catalogBusy=true;render();$('catalogStatus').textContent='등록 상품을 확인하고 있습니다…';
    try{
      const response=await fetch(`${catalog.endpoint}?storeId=${encodeURIComponent(storeId)}`,{headers:{accept:'application/json'},credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(12000)});
      if(!response.ok)throw new Error('catalog-response');const result=await response.json();if(result.storeId&&result.storeId!==storeId)throw new Error('store-mismatch');const items=catalog.products(result);
      if(request!==catalogRequest)return;catalogItems=items;catalogStoreId=storeId;$('catalogStatus').textContent=`${String(result.storeName||storeId)} · ${items.length}개 상품을 확인했습니다. 사진을 선택해 상품을 연결하세요.`;
    }catch{if(request!==catalogRequest)return;$('catalogStatus').textContent='등록 상품을 불러오지 못했습니다. 상점번호와 연결 상태를 확인하고 다시 시도해 주세요.';}
    finally{if(request===catalogRequest){catalogBusy=false;render();}}
  }
  $('loadCatalog').onclick=loadCatalog;
  for(const key of ['shopTitle','zones','shelves','wall','shelfColor','material','light'])$(key).addEventListener('change',event=>change(()=>{state[key]=['zones','shelves','light'].includes(key)?Number(event.target.value):event.target.value;}));
  $('preset').addEventListener('change',event=>change(()=>{const preset=event.target.value;Object.assign(state,presets[preset],{preset});}));
  for(const [id,key] of Object.entries(businessFields))$(id).addEventListener('change',event=>change(()=>{state.business={...state.business,[key]:event.target.value.trim().slice(0,event.target.maxLength)};}));
  $('realStorePhoto').addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file||loading||importing||previewing)return;
    importing=true;render();say('실제 매장 사진을 준비하고 있습니다…');
    try{const src=await imageData(file);importing=false;change(()=>{state.business={...state.business,realPhoto:src};});}
    catch(error){importing=false;render();say(error.message,true);}
    finally{event.target.value='';}
  });
  $('removeRealPhoto').onclick=()=>change(()=>{state.business={...state.business,realPhoto:''};});
  $('choosePhotos').onclick=()=>$('photos').click();$('takePhoto').onclick=()=>$('camera').click();
  let replacementId='';
  function chooseReplacement(id){if(loading||importing||previewing||!selected())return;replacementId=selectedId;$(id).click();}
  $('replacePhoto').onclick=()=>chooseReplacement('replacementPhoto');
  $('retakePhoto').onclick=()=>chooseReplacement('replacementCamera');
  for(const id of ['replacementPhoto','replacementCamera'])$(id).onchange=async event=>{
    const input=event.target,file=input.files?.[0],targetId=replacementId;
    input.value='';if(!file||loading||importing||previewing)return;
    importing=true;render();say('새 사진을 준비하고 있습니다…');
    try{const src=await imageData(file);const item=state.items.find(value=>value.id===targetId);if(!item)throw new Error('사진을 바꿀 대상을 다시 선택해 주세요.');checkpoint();item.src=src;selectedId=targetId;persist();await saveChain;}
    catch(error){say(error.message,true);}
    finally{importing=false;render();}
  };
  $('registerPhotoProduct').onclick=async()=>{
    const item=selected();if(exampleMode||!item||item.catalogProductId||loading||importing||previewing)return;
    try{
      if(!db)throw new Error('시안을 저장할 수 없어 이동하지 않았습니다. 시안 파일을 보관하거나 저장 가능한 브라우저에서 다시 시도해 주세요.');
      const transfer=window.ShopStudioProductHandoff,nonce=crypto.randomUUID();
      const value=transfer.read({version:1,createdAt:Date.now(),storeId:state.catalogStoreId,name:item.name,description:item.description,src:item.src});
      if(!value)throw new Error('직접 올린 사진을 선택해 주세요. 견본 사진은 판매상품으로 등록하지 않습니다.');
      let saved;try{saved=JSON.parse(localStorage.getItem('matjido-store-onboarding-preview-v1')||'null');}catch{}
      if(value.storeId&&(!saved?.previewOnly||saved.storeId!==value.storeId))throw new Error('이 기기의 입점 상점과 연결 상점이 다릅니다. 같은 상점인지 먼저 확인해 주세요.');
      importing=true;render();await saveChain;
      // Wait for the actual write, not the status-only save chain which handles errors.
      await new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(clone(state),draftKey);tx.oncomplete=resolve;tx.onerror=()=>reject(new Error('시안을 저장하지 못해 이동하지 않았습니다.'));tx.onabort=tx.onerror;});
      sessionStorage.setItem(transfer.key(nonce),JSON.stringify(value));
      location.assign('../store-partner/index.html?studioProduct='+encodeURIComponent(nonce));
    }catch(error){say(error.message||'상품등록 화면으로 이동하지 못했습니다. 저장 공간을 확인해 주세요.',true);}
    finally{importing=false;render();}
  };
  async function imageData(file){
    if(!file.type.startsWith('image/')||file.size>15*1024*1024)throw new Error('15MB 이하의 사진 파일을 선택해 주세요.');
    let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw new Error('이 사진을 읽을 수 없습니다. JPG·PNG·WebP로 저장한 사진을 선택해 주세요.');}
    const scale=Math.min(1,640/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    // Transparent cutouts may include large margins. Trim only transparent
    // pixels so the visible product, rather than its empty canvas, rests on a shelf.
    const pixels=canvas.getContext('2d').getImageData(0,0,canvas.width,canvas.height).data;
    let left=canvas.width,top=canvas.height,right=-1,bottom=-1;
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++)if(pixels[(y*canvas.width+x)*4+3]>10){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
    if(right<left)throw new Error('사진이 완전히 투명합니다. 물건이 보이는 사진을 선택해 주세요.');
    if(left||top||right<canvas.width-1||bottom<canvas.height-1){
      const trimmed=document.createElement('canvas');trimmed.width=right-left+1;trimmed.height=bottom-top+1;trimmed.getContext('2d').drawImage(canvas,left,top,trimmed.width,trimmed.height,0,0,trimmed.width,trimmed.height);return trimmed.toDataURL('image/webp',.85);
    }
    return canvas.toDataURL('image/webp',.85);
  }
  async function importPhotos(files){
    if(loading||importing||previewing)return;
    const available=40-state.items.length;if(available<=0){say('이 시안에는 사진을 40개까지 배치할 수 있습니다.',true);return;}
    importing=true;render();say('사진을 준비하고 있습니다…');const added=[],errors=[];
    for(const file of [...files].slice(0,available)){
      try{const src=await imageData(file);const i=state.items.length+added.length;added.push({id:crypto.randomUUID(),name:file.name.replace(/\.[^.]+$/,'').slice(0,50)||'상품',src,x:8+(i%4)*21,y:30+Math.floor(i%12/4)*21,size:18,rotation:0,shadow:true});}catch(error){errors.push(`${file.name}: ${error.message}`);}
    }
    importing=false;if(added.length){checkpoint();state.items.push(...added);selectedId=added.at(-1).id;render();persist();}else render();
    await saveChain;
    if(errors.length)say(`${added.length}개 추가. ${errors.join(' ')}`,true);
    else if(files.length>available)say(`${added.length}개 추가했습니다. 시안당 사진은 40개까지 지원합니다.`);
  }
  for(const id of ['photos','camera'])$(id).addEventListener('change',async event=>{await importPhotos(event.target.files);event.target.value='';});
  scene.addEventListener('dragover',event=>{event.preventDefault();if(!previewing)scene.classList.add('drag-over');});
  scene.addEventListener('dragleave',()=>scene.classList.remove('drag-over'));
  scene.addEventListener('drop',event=>{event.preventDefault();scene.classList.remove('drag-over');void importPhotos(event.dataTransfer.files);});
  itemsRoot.addEventListener('pointerdown',event=>{
    const node=event.target.closest('[data-item-id]');if(!node||previewing||loading||importing||event.button!==0)return;
    selectedDecorId='';selectedId=node.dataset.itemId;render();const fresh=itemsRoot.querySelector(`[data-item-id="${selectedId}"]`),item=selected(),rect=itemsRoot.getBoundingClientRect();
    if(item.locked||item.hidden)return;
    fresh.setPointerCapture(event.pointerId);fresh.focus({preventScroll:true});gesture={pointerId:event.pointerId,node:fresh,before:clone(state),x:event.clientX,y:event.clientY,startX:item.x,startY:item.y,rect,moved:false};event.preventDefault();
  });
  itemsRoot.addEventListener('pointermove',event=>{
    if(!gesture||gesture.pointerId!==event.pointerId)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;if(Math.abs(dx)+Math.abs(dy)<4&&!gesture.moved)return;
    gesture.moved=true;const item=selected();item.x=gesture.startX+dx/gesture.rect.width*100;item.y=gesture.startY+dy/gesture.rect.height*100;bounded(item);position(gesture.node,item);
  });
  function endGesture(event){if(!gesture||gesture.pointerId!==event.pointerId)return;const current=gesture;gesture=null;
    if(event.type==='pointercancel'){state=current.before;render();return;}
    if(current.moved){
      const item=selected();if($('snapShelves').checked&&state.appearance.showShelves&&!item.decorId){const snapped=layout.onShelf(item,state.shelves);if(Math.abs(item.y-snapped.y)<=4)Object.assign(item,snapped);}
      past.push(current.before);if(past.length>20)past.shift();future.length=0;render();persist();
    }
  }
  itemsRoot.addEventListener('pointerup',endGesture);itemsRoot.addEventListener('pointercancel',endGesture);
  itemsRoot.addEventListener('click',event=>{const node=event.target.closest('[data-item-id]');if(!node)return;selectedDecorId='';selectedId=node.dataset.itemId;if(previewing)previewProductId=selectedId;render();});
  for(const [id,key,limit] of [['itemDescription','description',300],['itemProductUrl','productUrl',2048]])$(id).addEventListener('change',event=>change(()=>{const item=selected();if(item)item[key]=event.target.value.trim().slice(0,limit);}));
  for(const [id,key,numeric] of [['itemName','name',false],['itemSize','size',true],['itemRotation','rotation',true],['itemShadow','shadow',false],['itemLocked','locked',false],['itemHidden','hidden',false]])$(id).addEventListener('change',event=>{
    if(selected()?.locked&&numeric)return;
    change(()=>{const item=selected();if(!item)return;item[key]=event.target.type==='checkbox'?event.target.checked:numeric?Number(event.target.value):event.target.value.trim().slice(0,50)||'상품';bounded(item);});
  });
  function move(dx,dy){if(selected()?.locked||selected()?.hidden)return;change(()=>{const item=selected();if(item){item.x+=dx;item.y+=dy;bounded(item);}});}
  for(const [id,dx,dy] of [['moveLeft',-2,0],['moveRight',2,0],['moveUp',0,-2],['moveDown',0,2]])$(id).onclick=()=>move(dx,dy);
  scene.addEventListener('keydown',event=>{if(previewing||!selected())return;const moves={ArrowLeft:[-2,0],ArrowRight:[2,0],ArrowUp:[0,-2],ArrowDown:[0,2]};if(moves[event.key]){event.preventDefault();move(...moves[event.key]);itemsRoot.querySelector(`[data-item-id="${selectedId}"]`)?.focus({preventScroll:true});}});
  $('duplicate').onclick=()=>{if(state.items.length>=40){say('이 시안에는 사진을 40개까지 배치할 수 있습니다.',true);return;}change(()=>{const item=selected();if(!item)return;const copy={...item,id:crypto.randomUUID(),locked:false,hidden:false,x:item.x+4,y:item.y+3};bounded(copy);state.items.push(copy);selectedId=copy.id;});};
  $('remove').onclick=()=>{if(selected()?.locked)return;change(()=>{state.items=state.items.filter(item=>item.id!==selectedId);selectedId='';});};
  $('snapSelected').onclick=()=>{const item=selected();if(!item||item.locked||item.hidden||item.decorId||!state.appearance.showShelves)return;change(()=>Object.assign(item,layout.onShelf(item,state.shelves)));};
  $('arrangeAll').onclick=()=>{const result=layout.arrange(state.items.map(item=>item.decorId?{...item,locked:true}:item),state.zones,state.shelves);if(!result.ok){say(result.message,true);return;}change(()=>{state.items=result.items.map(item=>({...item,locked:state.items.find(value=>value.id===item.id)?.locked===true}));});};
  function reorder(front){if(!selected())return;change(()=>{const item=selected();state.items=state.items.filter(other=>other.id!==item.id);front?state.items.push(item):state.items.unshift(item);});}
  $('bringFront').onclick=()=>reorder(true);$('sendBack').onclick=()=>reorder(false);
  $('focusMode').onclick=()=>{const focus=document.body.classList.toggle('studio-focused');$('focusMode').setAttribute('aria-pressed',String(focus));$('focusMode').textContent=focus?'전체 도구 보기':'진열장에 집중';if(focus)scene.scrollIntoView({block:'center'});};
  function history(from,to){if(loading||importing||previewing||!from.length)return;to.push(clone(state));state=from.pop();selectedId='';selectedDecorId='';render();persist();}
  $('undo').onclick=()=>history(past,future);$('redo').onclick=()=>history(future,past);
  document.addEventListener('keydown',event=>{
    if(loading||importing||previewing||event.target.closest('input,textarea,select')||!(event.ctrlKey||event.metaKey))return;
    const key=event.key.toLowerCase();
    if(key==='z'){event.preventDefault();event.shiftKey?history(future,past):history(past,future);}
    else if(key==='y'){event.preventDefault();history(future,past);}
  });
  $('preview').onclick=()=>{previewing=!previewing;previewProductId='';render();if(previewing&&state.catalogStoreId)void loadCatalog();};
  function restoreScene(raw){
    const next={...defaults,...raw,appearance:design.appearance(raw.appearance),decor:[],items:[]};
    const ids=new Set();
    const safeId=value=>{const result=/^[a-z0-9-]{3,80}$/i.test(value)&&!ids.has(value)?value:crypto.randomUUID();ids.add(result);return result;};
    next.items=(Array.isArray(raw.items)?raw.items:[]).slice(0,40).filter(item=>item&&design.image(item.src)).map(item=>{
      const product=exampleMode?sample.products.find(value=>value.sku===item.demoSku):null;
      return layout.bounded({...item,id:safeId(item.id),name:String(item.name||'상품').slice(0,50),description:String(item.description||'').slice(0,300),productUrl:exampleMode?'':String(item.productUrl||'').slice(0,2048),catalogProductId:exampleMode?'':catalog.id(item.catalogProductId),section:String(item.section||'').slice(0,24),demoSku:product?.sku||'',demoPrice:product?.price||0,locked:item.locked===true,hidden:item.hidden===true});
    });
    next.decor=(Array.isArray(raw.decor)?raw.decor:[]).slice(0,60).filter(item=>item&&typeof item==='object').map(item=>design.decor({...item,id:safeId(item.id)}));
    for(const item of next.items)item.decorId=next.decor.some(value=>value.id===item.decorId)?item.decorId:'';
    next.zones=clamp(Number(next.zones)||1,1,3);next.shelves=clamp(Number(next.shelves)||3,2,4);next.light=clamp(Number(next.light)||100,75,125);next.shopTitle=String(next.shopTitle||'내 상점').slice(0,40);
    if(!presets[next.preset])next.preset='cafe';if(!['plain','wood','brick','tile'].includes(next.material))next.material='plain';
    for(const key of ['wall','shelfColor'])next[key]=design.color(next[key],defaults[key]);
    const business=next.business&&typeof next.business==='object'?next.business:{};
    next.business=Object.fromEntries(Object.keys(businessDefaults).map(key=>[key,String(business[key]||'').slice(0,key==='realPhoto'?2000000:2048)]));
    if(!/^data:image\/(webp|png|jpeg);base64,/.test(next.business.realPhoto))next.business.realPhoto='';
    next.catalogStoreId=exampleMode?'':catalog.id(next.catalogStoreId);next.sampleOnly=exampleMode;
    return next;
  }
  async function initialize(){
    for(const [key,label] of Object.entries(design.groups))if(key!=='all')$('decorGroup').add(new Option(label,key));
    for(const [type,label] of Object.entries(design.types))if(![...$('decorType').options].some(option=>option.value===type))$('decorType').add(new Option(label,type));
    if(publicView){
      document.body.classList.add('studio-public');$('cloudPublicNotice').hidden=false;$('cloudPublicNotice').textContent='공개 상점을 불러오고 있습니다…';document.querySelector('.workspace').hidden=true;
      document.querySelector('header b').textContent='온라인 상점';document.title='온라인 상점 | 맛지도 PREVIEW';
      try{const scene=await window.ShopStudioCloud.publicScene(params.get('published'));state=restoreScene(scene);previewing=true;loading=false;render();document.querySelector('.workspace').hidden=false;$('cloudPublicNotice').textContent='사장님이 공개한 온라인 공간입니다. 가격·재고·배달 가능 여부는 연결된 주문 화면에서 확인해 주세요.';if(state.catalogStoreId)void loadCatalog();}
      catch(error){$('cloudPublicNotice').textContent=error.message||'공개 상점을 불러오지 못했습니다. 잠시 뒤 다시 열어 주세요.';}
      return;
    }
    if(exampleMode)state=restoreScene(sample.create());
    render();try{db=await storageOpen();const draft=await readDraft();if(draft&&Array.isArray(draft.items)){state=restoreScene(draft);say('이 기기에 저장한 사진과 배치를 불러왔습니다.');}await loadCompositions();}
    catch{say('이 브라우저에서는 시안을 저장할 수 없습니다. 창을 닫거나 새로고침하면 변경사항이 사라질 수 있습니다.',true);}
    if(!exampleMode&&!state.catalogStoreId)try{const saved=JSON.parse(localStorage.getItem('matjido-store-onboarding-preview-v1')||'null');if(saved?.previewOnly)state.catalogStoreId=catalog.id(saved.storeId);}catch{}
    previewing=exampleMode&&new URLSearchParams(location.search).get('view')==='customer';
    loading=false;render();if(state.catalogStoreId)void loadCatalog();
    window.ShopStudioCloud.bind({sample:exampleMode,blocked:()=>loading||importing||previewing,snapshot:()=>clone(state),restore:scene=>change(()=>{state=restoreScene(scene);selectedId='';selectedDecorId='';catalogRequest++;catalogItems=[];catalogStoreId='';if(state.catalogStoreId)void loadCatalog();})});
  }
  void initialize();
})();
