(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const scene=$('scene'), itemsRoot=$('items'), status=$('saveStatus');
  const layout=window.ShopStudioLayout;
  const links=window.ShopStudioCustomerLinks;
  const catalog=window.ShopStudioCatalog;
  let catalogItems=[],catalogStoreId='',catalogRequest=0,catalogBusy=false;
  const businessDefaults={intro:'',address:'',hours:'',phone:'',mapUrl:'',orderUrl:'',delivery:'',realPhoto:''};
  const businessFields={businessIntro:'intro',businessAddress:'address',businessHours:'hours',businessPhone:'phone',businessMapUrl:'mapUrl',businessOrderUrl:'orderUrl',businessDelivery:'delivery'};
  const defaults={preset:'cafe',shopTitle:'나의 작은 카페',zones:1,shelves:3,wall:'#eadfce',shelfColor:'#805735',material:'plain',light:100,catalogStoreId:'',business:{...businessDefaults},items:[]};
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
  function readDraft(){return new Promise((resolve,reject)=>{const request=db.transaction('drafts').objectStore('drafts').get('scene');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
  function persist(){
    if(!db){say('현재 시안을 저장할 수 없습니다. 창을 닫거나 새로고침하면 변경사항이 사라질 수 있습니다.',true);return;}
    const snapshot=clone(state);
    saveChain=saveChain.catch(()=>{}).then(()=>new Promise((resolve,reject)=>{
      const tx=db.transaction('drafts','readwrite');tx.objectStore('drafts').put(snapshot,'scene');
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
    const product=previewing?state.items.find(item=>item.id===previewProductId&&!item.hidden):null;
    $('productDetails').hidden=!product;
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
    }else{$('productInfo').textContent='';$('customerProductPhoto').removeAttribute('src');}
  }
  function render(){
    scene.style.setProperty('--wall',state.wall);scene.style.setProperty('--shelf',state.shelfColor);scene.style.setProperty('--light',state.light/100);scene.dataset.material=state.material;
    scene.classList.toggle('previewing',previewing);$('sign').textContent=state.shopTitle||'내 상점';
    for(const key of ['preset','shopTitle','zones','shelves','wall','shelfColor','material','light'])$(key).value=state[key];
    $('dividers').replaceChildren();for(let i=1;i<state.zones;i++){const line=document.createElement('i');line.className='divider';line.style.left=`${i*100/state.zones}%`;$('dividers').append(line);}
    $('shelfLines').replaceChildren();for(const level of layout.shelfLevels(state.shelves)){const line=document.createElement('i');line.className='shelf-line';line.style.top=`${level}%`;$('shelfLines').append(line);}
    itemsRoot.replaceChildren();$('itemList').replaceChildren();
    for(const item of state.items){
      const node=document.createElement('button');node.type='button';node.className=`scene-item${item.shadow?' has-shadow':''}${item.locked?' is-locked':''}${item.hidden?' is-hidden':''}${item.id===selectedId&&!previewing?' selected':''}`;node.dataset.itemId=item.id;node.setAttribute('aria-label',`${item.name} ${previewing?'보기':'선택·이동'}`);node.style.aspectRatio='1';position(node,item);
      const img=document.createElement('img');img.src=item.src;img.alt='';img.draggable=false;img.style.height='100%';
      node.append(img);if(!previewing||!item.hidden)itemsRoot.append(node);
      const listButton=document.createElement('button');listButton.type='button';listButton.disabled=previewing||loading||importing;listButton.setAttribute('aria-label',`${item.name} 목록에서 선택`);listButton.setAttribute('aria-pressed',String(item.id===selectedId));
      const thumbnail=document.createElement('img');thumbnail.src=item.src;thumbnail.alt='';const label=document.createElement('span');label.textContent=item.name;const flags=document.createElement('small');flags.textContent=[item.locked?'위치 잠금':'',item.hidden?'숨김':''].filter(Boolean).join(' · ');listButton.append(thumbnail,label,flags);
      listButton.onclick=()=>{selectedId=item.id;render();scene.scrollIntoView({block:'center'});};$('itemList').append(listButton);
    }
    $('emptyScene').hidden=previewing?state.items.some(item=>!item.hidden):state.items.length>0;
    const item=selected();$('itemTools').hidden=!item||previewing;
    if(item){$('itemName').value=item.name;$('itemDescription').value=item.description||'';$('itemProductUrl').value=item.productUrl||'';$('itemSize').value=item.size;$('itemRotation').value=item.rotation;$('itemShadow').checked=item.shadow;$('itemLocked').checked=Boolean(item.locked);$('itemHidden').checked=Boolean(item.hidden);}
    $('catalogStore').value=state.catalogStoreId;
    const picker=$('itemCatalogProduct');picker.replaceChildren(new Option('상품 연결 안 함',''));
    if(catalogStoreId===state.catalogStoreId)for(const product of catalogItems)picker.add(new Option(`${product.name} · ${product.price.toLocaleString('ko-KR')}원`,product.id));
    if(item?.catalogProductId&&(catalogStoreId!==state.catalogStoreId||!catalogItems.some(product=>product.id===item.catalogProductId)))picker.add(new Option('연결한 상품 확인 필요',item.catalogProductId));
    picker.value=item?.catalogProductId||'';picker.disabled=loading||importing||previewing||catalogBusy||!item;
    $('itemProductUrl').disabled=Boolean(item?.catalogProductId);
    $('itemCatalogStatus').textContent=item?.catalogProductId?'등록 상품의 가격·재고를 사용합니다. 같은 상품을 여러 사진에 연결해도 장바구니는 하나로 합쳐집니다.':'상품을 불러온 뒤 이 사진에 연결하세요.';
    const badProductLink=Boolean(item?.productUrl?.trim()&&!links.https(item.productUrl));$('itemProductUrl').setAttribute('aria-invalid',String(badProductLink));
    $('itemLinkStatus').textContent=badProductLink?'상품 주문 링크를 확인해 주세요. https://로 시작하는 주소가 필요합니다.':'비워두면 가게 주문 화면으로 연결합니다. 상품명만으로 주문 링크를 만들지 않습니다.';
    $('lockedHelp').hidden=!item?.locked;
    for(const id of ['itemSize','itemRotation','moveLeft','moveRight','moveUp','moveDown','snapSelected','remove'])$(id).disabled=!item||Boolean(item.locked)||loading||importing||previewing;
    $('undo').disabled=loading||importing||!past.length||previewing;$('redo').disabled=loading||importing||!future.length||previewing;
    $('preview').textContent=previewing?'꾸미기로 돌아가기':'고객처럼 보기';
    $('previewHelp').hidden=!previewing;
    $('arrangeTools').hidden=previewing;$('arrangeAll').disabled=loading||importing||!state.items.some(item=>!item.locked&&!item.hidden);
    document.querySelectorAll('.tools input,.tools select,.tools button').forEach(node=>node.disabled=loading||importing||previewing);
    $('loadCatalog').disabled=loading||importing||previewing||catalogBusy;
    $('removeRealPhoto').disabled=!state.business.realPhoto||loading||importing||previewing;
    renderCustomer();
  }
  function change(action){if(loading||importing||previewing)return;checkpoint();action();render();persist();}
  $('catalogStore').addEventListener('change',event=>{
    const value=event.target.value.trim();if(!catalog.id(value)&&value){$('catalogStatus').textContent='상점번호는 영문·숫자·밑줄·하이픈으로 입력해 주세요.';return;}
    if(value===state.catalogStoreId)return;
    if(state.items.some(item=>item.catalogProductId)&&!confirm('상점을 바꾸면 기존 사진의 상품 연결이 해제됩니다. 계속할까요?')){render();return;}
    catalogRequest++;catalogItems=[];catalogStoreId='';catalogBusy=false;
    change(()=>{state.catalogStoreId=value;state.items.forEach(item=>delete item.catalogProductId);});$('catalogStatus').textContent='등록 상품 불러오기를 눌러 주세요.';
  });
  $('itemCatalogProduct').addEventListener('change',event=>change(()=>{const item=selected();if(item)item.catalogProductId=catalog.id(event.target.value);}));
  async function loadCatalog(){
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
    selectedId=node.dataset.itemId;render();const fresh=itemsRoot.querySelector(`[data-item-id="${selectedId}"]`),item=selected(),rect=itemsRoot.getBoundingClientRect();
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
      const item=selected();if($('snapShelves').checked){const snapped=layout.onShelf(item,state.shelves);if(Math.abs(item.y-snapped.y)<=4)Object.assign(item,snapped);}
      past.push(current.before);if(past.length>20)past.shift();future.length=0;render();persist();
    }
  }
  itemsRoot.addEventListener('pointerup',endGesture);itemsRoot.addEventListener('pointercancel',endGesture);
  itemsRoot.addEventListener('click',event=>{const node=event.target.closest('[data-item-id]');if(!node)return;selectedId=node.dataset.itemId;if(previewing)previewProductId=selectedId;render();});
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
  $('snapSelected').onclick=()=>{const item=selected();if(!item||item.locked||item.hidden)return;change(()=>Object.assign(item,layout.onShelf(item,state.shelves)));};
  $('arrangeAll').onclick=()=>{const result=layout.arrange(state.items,state.zones,state.shelves);if(!result.ok){say(result.message,true);return;}change(()=>{state.items=result.items;});};
  function reorder(front){if(!selected())return;change(()=>{const item=selected();state.items=state.items.filter(other=>other.id!==item.id);front?state.items.push(item):state.items.unshift(item);});}
  $('bringFront').onclick=()=>reorder(true);$('sendBack').onclick=()=>reorder(false);
  $('focusMode').onclick=()=>{const focus=document.body.classList.toggle('studio-focused');$('focusMode').setAttribute('aria-pressed',String(focus));$('focusMode').textContent=focus?'전체 도구 보기':'진열장에 집중';if(focus)scene.scrollIntoView({block:'center'});};
  function history(from,to){if(loading||importing||previewing||!from.length)return;to.push(clone(state));state=from.pop();selectedId='';render();persist();}
  $('undo').onclick=()=>history(past,future);$('redo').onclick=()=>history(future,past);
  document.addEventListener('keydown',event=>{
    if(loading||importing||previewing||event.target.closest('input,textarea,select')||!(event.ctrlKey||event.metaKey))return;
    const key=event.key.toLowerCase();
    if(key==='z'){event.preventDefault();event.shiftKey?history(future,past):history(past,future);}
    else if(key==='y'){event.preventDefault();history(future,past);}
  });
  $('preview').onclick=()=>{previewing=!previewing;previewProductId='';render();if(previewing&&state.catalogStoreId)void loadCatalog();};
  async function initialize(){
    render();try{db=await storageOpen();const draft=await readDraft();if(draft&&Array.isArray(draft.items)){
      state={...state,...draft,items:draft.items.slice(0,40).filter(item=>item&&typeof item.src==='string'&&/^data:image\/(webp|png|jpeg);base64,/.test(item.src)).map(item=>layout.bounded({...item,id:/^[a-z0-9-]{12,80}$/i.test(item.id)?item.id:crypto.randomUUID(),name:String(item.name||'상품').slice(0,50),description:String(item.description||'').slice(0,300),productUrl:String(item.productUrl||'').slice(0,2048),locked:item.locked===true,hidden:item.hidden===true}))};
      state.zones=clamp(Number(state.zones)||1,1,3);state.shelves=clamp(Number(state.shelves)||3,2,4);state.light=clamp(Number(state.light)||100,75,125);
      if(!presets[state.preset])state.preset='cafe';if(!['plain','wood','brick','tile'].includes(state.material))state.material='plain';
      for(const key of ['wall','shelfColor'])if(!/^#[a-f0-9]{6}$/i.test(state[key]))state[key]=defaults[key];
      const business=state.business&&typeof state.business==='object'?state.business:{};
      state.business=Object.fromEntries(Object.keys(businessDefaults).map(key=>[key,String(business[key]||'').slice(0,key==='realPhoto'?2000000:2048)]));
      if(!/^data:image\/(webp|png|jpeg);base64,/.test(state.business.realPhoto))state.business.realPhoto='';
      say('이 기기에 저장한 사진과 배치를 불러왔습니다.');
    }}catch{say('이 브라우저에서는 시안을 저장할 수 없습니다. 창을 닫거나 새로고침하면 변경사항이 사라질 수 있습니다.',true);}
    state.catalogStoreId=catalog.id(state.catalogStoreId);loading=false;render();if(state.catalogStoreId)void loadCatalog();
  }
  void initialize();
})();
