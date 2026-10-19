(() => {
  'use strict';
  const $=id=>document.getElementById(id),M=window.NeighborMarket,copy=value=>Array.isArray(value)?value.map(copy):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).map(([key,item])=>[key,copy(item)])):value;
  const sample=M.example(),basketIds=new Set(),past=[],future=[];
  let basketTouched=false,activeFace='main',makerFace='main',sceneGestures=null;
  function resetBasket(){basketIds.clear();basketTouched=false;$('basketDetails').hidden=true;$('basketToggle').setAttribute('aria-expanded','false');$('basketToggle').textContent='담은 물건 보기';$('basketFeedback').textContent='';}
  let own=null,view='example',selected='',detailId='',db=null,revision=0,readable=true,loading=true,saving=false,importing=false,dirty=false,customizing=false,entries=[],makerBase=null,makerAppend=false,makerOpener='',suppressClick=false;
  const current=()=>view==='own'&&own?own:sample;
  const showing=()=>M.face(current(),activeFace),editing=()=>M.face(own,activeFace);
  function changeFace(action){changed(()=>{const scene=editing();own=M.replaceFace(own,activeFace,action(scene)||scene);});}
  const busy=()=>loading||saving||importing;
  const money=n=>n===0?'무료 나눔':n.toLocaleString('ko-KR')+'원';
  const conditions={good:'상태 설명: 사용감이 적어요',used:'상태 설명: 사용감이 있어요',worn:'상태 설명: 사용 흔적이 뚜렷해요',unspecified:'상태 설명 미입력 · 실제 거래 전 하자·작동 여부를 확인해야 합니다.'};
  const decorLabels=Object.fromEntries(Object.entries(M.decorCatalog).map(([id,entry])=>[id,entry[0]]));
  function say(message,error=false){$('saveStatus').textContent=message;$('saveStatus').classList.toggle('error',error);}
  function changed(action){if(busy()||view!=='own'||sceneGestures?.active())return;const before=copy(own);try{action();}catch(error){own=before;throw error;}past.push(before);if(past.length>20)past.shift();future.length=0;dirty=true;render();say('꾸미는 중 · 아직 저장하지 않은 변경이 있습니다.');}
  function renderFaces(){const list=M.faces(current()),index=list.findIndex(entry=>entry.id===activeFace);document.body.classList.toggle('has-faces',list.length>1);$('faceNav').hidden=list.length===1;$('faceSelect').replaceChildren(...list.map((entry,i)=>new Option((i+1)+'/'+list.length+' '+(i===0?'첫 진열면':entry.scene.name)+' · '+entry.scene.items.length+'점',entry.id)));$('faceSelect').value=activeFace;$('facePrev').disabled=busy()||index<=0;$('faceNext').disabled=busy()||index>=list.length-1;$('faceSelect').disabled=busy();$('addFace').hidden=!customizing;$('addFace').disabled=busy()||list.length>=5;}
  function switchFace(id){if(busy()||!M.faces(current()).some(entry=>entry.id===id))return;sceneGestures?.cancel();activeFace=id;selected='';render();$('faceSelect').focus({preventScroll:true});}
  $('faceSelect').onchange=()=>switchFace($('faceSelect').value);
  for(const [id,step]of [['facePrev',-1],['faceNext',1]])$(id).onclick=()=>{const list=M.faces(current()),index=list.findIndex(entry=>entry.id===activeFace);if(list[index+step])switchFace(list[index+step].id);};
  $('addFace').onclick=()=>{if(!customizing||busy())return;sceneGestures?.cancel();try{changed(()=>{const id=crypto.randomUUID();own=M.addFace(own,id,editing());activeFace=id;selected='';});say('빈 진열면을 추가했습니다. 기존 면은 그대로예요. 사진을 추가하거나 선택한 물건을 옮겨보세요. 저장 전 변경입니다.');}catch(error){say(error.message,true);}};
  $('moveToFace').onclick=()=>{if(busy()||!customizing)return;try{changed(()=>{const target=$('moveFace').value;own=M.moveToFace(own,activeFace,target,selected);activeFace=target;});say('선택한 물건만 옮겼습니다. 사진·가격·크기는 그대로입니다. 위치는 이 면에서 조절해 주세요.');}catch(error){say(error.message,true);}};
  function fitOverlays(){
    const root=$('marketScene'),w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;
    for(const node of $('objects').children){const tag=node.querySelector('.price-tag');if(!tag)continue;tag.style.maxWidth=Math.max(20,w-4)+'px';tag.style.minWidth=Math.min(44,Math.max(20,w-4))+'px';tag.style.width=Math.max(node.offsetWidth,Math.min(76,w*.30))+'px';const x=Math.max(2,Math.min(w-tag.offsetWidth-2,node.offsetLeft+node.offsetWidth/2-tag.offsetWidth/2));tag.style.left=(x-node.offsetLeft)+'px';const selectedPrice=customizing&&node.classList.contains('selected')&&!node.classList.contains('is-locked');let top=selectedPrice?node.offsetHeight+24:node.offsetHeight*.94;if(selectedPrice&&top>h-node.offsetTop-tag.offsetHeight-2)top=-tag.offsetHeight-26;tag.style.top=Math.max(2-node.offsetTop,Math.min(top,h-node.offsetTop-tag.offsetHeight-2))+'px';}
    const item=customizing&&own&&[...editing().items,...editing().decor].find(entry=>entry.id===selected),node=[...root.querySelectorAll('[data-object-id]')].find(entry=>entry.dataset.objectId===selected),box=$('selectionBox');box.hidden=!item||item.locked||!node;if(box.hidden)return;
    const x=node.offsetLeft,y=node.offsetTop,width=node.offsetWidth,height=node.offsetHeight,outline=$('selectionOutline');Object.assign(outline.style,{left:x+'px',top:y+'px',width:width+'px',height:height+'px'});box.dataset.small=String(width<72);
    for(const handle of box.querySelectorAll('[data-resize]')){const corner=handle.dataset.resize;handle.style.left=Math.max(22,Math.min(w-22,x+(corner.includes('e')?width:0)))+'px';handle.style.top=Math.max(22,Math.min(h-22,y+(corner.includes('s')?height:0)))+'px';}
    const readout=$('sizeReadout');readout.textContent='크기 '+Math.round(item.size)+'%';readout.style.left=Math.max(2,Math.min(w-84,x+width/2-42))+'px';readout.style.top=Math.max(2,y-25)+'px';$('objectSize').value=item.size;
  }
  function openDB(){return new Promise((resolve,reject)=>{const r=indexedDB.open(M.DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('drafts');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);r.onblocked=()=>reject(Error('storage-blocked'));});}
  function read(){return new Promise((resolve,reject)=>{const r=db.transaction('drafts').objectStore('drafts').get(M.KEY);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
  async function save(candidate){
    if(sceneGestures?.active())throw Error('크기·위치 조절을 마친 뒤 저장해 주세요. 이전 저장본은 그대로입니다.');
    if(saving||importing)throw Error('사진을 준비하거나 저장 중입니다. 잠시만 기다려 주세요.');
    if(!db||!readable)throw Error('이 브라우저에서는 안전하게 저장할 수 없습니다. 임시 미리보기나 파일 보관을 이용해 주세요.');
    const clean=M.clean(candidate),expected=revision;saving=true;renderBusy();say('사진·가격·꾸미기를 이 기기에 저장 중입니다…');
    try{
      await new Promise((resolve,reject)=>{const tx=db.transaction('drafts','readwrite'),store=tx.objectStore('drafts'),r=store.get(M.KEY);let conflict=false;const storageMessage='저장 공간을 사용할 수 없습니다. 이전 저장본과 현재 입력은 유지합니다.';r.onsuccess=()=>{if((r.result?.revision??0)!==expected){conflict=true;tx.abort();return;}try{store.put({revision:expected+1,scene:clean},M.KEY);}catch{tx.abort();}};tx.oncomplete=resolve;tx.onerror=()=>reject(Error(storageMessage));tx.onabort=()=>reject(Error(conflict?'다른 창에서 장터를 변경했습니다. 현재 입력은 유지합니다. 파일로 보관하고 새로고침해 주세요.':storageMessage));});
      revision=expected+1;own=clean;view='own';dirty=false;say('이 기기에 저장 완료 · 다른 기기나 고객에게 공개되지 않았습니다.');return clean;
    }finally{saving=false;renderBusy();}
  }
  function renderBusy(){
    for(const id of ['startMarket','editMarket','customize','showExample','resumeMarket','closeMaker','choosePhotos','takePhoto','buildMarket','previewWithoutSave','keepDecorating','previewDecorating'])$(id).disabled=busy();
    for(const id of ['takeDecorPhoto','chooseDecorPhotos'])$(id).disabled=busy()||(own?editing().items.length:0)>=M.MAX;
    $('decorPhotoHint').textContent=(own?editing().items.length:0)>=M.MAX?'이 면은 20장으로 가득 찼어요. 진열면 ＋로 공간을 늘려보세요.':'사진은 이 면에만 추가돼요 · 기존 사진·꾸미기 유지';
    $('makerForm').querySelectorAll('input,select,textarea,.remove-entry').forEach(node=>node.disabled=saving||importing||loading);
    $('customTools').inert=busy();$('editToolbar').inert=busy();
    $('saveDecor').disabled=busy()||!db||!readable||!dirty;$('saveDecor').textContent=saving?'저장 중…':dirty?'저장하기':'저장됨';
    $('saveAndFinish').disabled=busy()||!db||!readable;$('saveAndFinish').textContent=saving?'저장 중…':'이 기기에 저장하고 닫기';
    updateMakerProgress();
  }
  function place(node,item){node.style.width=item.size+'%';node.style.left=item.x+'%';node.style.top=item.y+'%';}
  function render(){
    if(!M.faces(current()).some(entry=>entry.id===activeFace))activeFace='main';
    const scene=showing(),root=$('marketScene');root.style.setProperty('--wall',scene.wall);root.style.setProperty('--wood',scene.wood);root.style.setProperty('--point',scene.accent);root.style.filter='brightness('+scene.brightness/100+')';root.dataset.finish=scene.finish;
    root.dataset.backdrop=scene.backdrop;root.dataset.display=scene.display;root.dataset.season=scene.season;root.dataset.lighting=scene.lighting;
    for(const [id,kind,key]of [['backgroundArt','background',scene.backdrop],['displayArt','display',scene.display]]){const art=window.NeighborWorldArt.draw(document,kind,key,scene);$(id).replaceChildren(...(art?[art]:[]));}
    $('marketTitle').textContent=current().name;$('sceneTitle').textContent=scene.name;renderFaces();
    $('marketMode').textContent=view==='own'?'내 이웃장터 · 기기 안의 비공개 견본':'이웃 중고장터 · AI 사진 견본';
    $('marketSummary').textContent=view==='own'?'전체 사진 '+M.allItems(current()).length+'개 · '+(dirty?'아직 저장하지 않은 변경이 있어요.':'이 기기에 저장됨 · 꾸미기는 선택이에요.'):'잘 쓰던 물건 여섯 점을 모은 가상의 이웃 장터입니다.';
    $('editMarket').hidden=view!=='own';$('showExample').hidden=view!=='own';$('resumeMarket').hidden=!own||view==='own';$('customize').textContent=view==='own'?'내 취향대로 꾸미기 (선택)':own?'내 장터 꾸미기':'이 분위기로 꾸며보기';$('browseMarket').textContent=view==='own'?'내 장터 보기 ↓':'먼저 견본 구경하기 ↓';
    $('startMarket').textContent=own?'사진·가격으로 내 장터 이어 만들기':'사진으로 내 장터 만들기 ＋';
    $('objects').replaceChildren();$('decorations').replaceChildren();$('productList').replaceChildren();
    for(const item of M.allItems(current())){
      const node=document.createElement('button');node.type='button';node.className='market-object'+(item.sold?' is-sold':'')+(item.locked?' is-locked':'')+(selected===item.id?' selected':'');node.dataset.objectId=item.id;node.setAttribute('aria-label',item.name+' · '+money(item.price)+(customizing?' 선택·이동':' 살펴보기'));place(node,item);
      const img=document.createElement('img');img.src=item.src;img.alt='';img.draggable=false;node.append(img);
      if(scene.tags){const tag=document.createElement('span');tag.className='price-tag';const label=document.createElement('small'),amount=document.createElement('strong');label.textContent=item.name;amount.className='price-amount';amount.textContent=money(item.price);tag.append(label,amount);node.append(tag);}
      if(scene.items.some(entry=>entry.id===item.id))$('objects').append(node);
      const card=document.createElement('button');card.type='button';card.className='product-card';card.dataset.productId=item.id;const photo=document.createElement('div');photo.className='card-photo';const image=document.createElement('img');image.src=item.src;image.alt='';image.loading='lazy';photo.append(image);if(item.sold){const sold=document.createElement('span');sold.className='sold-badge';sold.textContent='판매완료 · 견본';photo.append(sold);}const title=document.createElement('h3');title.textContent=item.name;const amount=document.createElement('strong');amount.textContent=money(item.price);const hint=document.createElement('p');hint.className='small';hint.textContent=item.sample?'AI 견본 사진 · 예시 가격':'직접 올린 사진 · 아직 공개 전';card.append(photo,title,amount,hint);card.onclick=()=>showProduct(item.id);$('productList').append(card);
    }
    for(const item of scene.decor){const node=document.createElement('button');node.type='button';node.className='market-object market-decoration'+(selected===item.id?' selected':'');node.dataset.objectId=item.id;node.setAttribute('aria-label',decorLabels[item.type]+' 장식 선택·이동');node.setAttribute('aria-hidden',String(!customizing));node.tabIndex=customizing?0:-1;node.style.pointerEvents=customizing?'auto':'none';place(node,item);const svg=decorArt(item.type,scene,'neighbor-'+item.id);if(svg)node.append(svg);$('decorations').append(node);}
    $('emptyScene').hidden=scene.items.length>0;$('itemCount').textContent=M.allItems(current()).length+'개 · 모든 진열면 · 각 물건 1점';
    $('undo').disabled=!past.length||busy();$('redo').disabled=!future.length||busy();
    updateTools();renderBasket();renderBusy();fitScene();fitOverlays();
  }
  function updateTools(){
    if(!own)return;const scene=editing(),fields={faceName:'name',wallColor:'wall',woodColor:'wood',accentColor:'accent',finish:'finish',brightness:'brightness',backdrop:'backdrop',season:'season',displayStyle:'display',lighting:'lighting'};for(const [id,key] of Object.entries(fields))if(document.activeElement!==$(id))$(id).value=scene[key];if(document.activeElement!==$('decorName'))$('decorName').value=own.name;$('priceTags').checked=scene.tags;
    for(const button of $('themeChoices').children)button.setAttribute('aria-pressed',String(button.dataset.theme===scene.theme));
    for(const button of $('worldChoices').children){const preset=M.worlds[button.dataset.world];button.setAttribute('aria-pressed',String(['backdrop','season','display','lighting','wall','wood','accent'].every(key=>preset[key]===scene[key])));}
    const select=$('selectedObject');select.replaceChildren(new Option('사진·장식을 선택하세요',''));for(const item of scene.items)select.add(new Option('사진 · '+item.name,item.id));for(const item of scene.decor)select.add(new Option('장식 · '+decorLabels[item.type],item.id));select.value=selected;
    const item=[...scene.items,...scene.decor].find(value=>value.id===selected);$('selectionHint').textContent=item?(item.name||decorLabels[item.type])+(item.locked?' · 위치가 잠겨 있습니다.':' · 모서리를 끌거나 두 손가락으로 크기를 바꿔요.'):'사진·소품을 누르면 화면 위에 크기 손잡이가 나타나요.';
    $('objectSize').value=item?.size??24;$('objectLock').checked=item?.locked===true;for(const id of ['objectSize','moveLeft','moveUp','moveDown','moveRight'])$(id).disabled=!item||item.locked;$('objectLock').disabled=!item;$('removeDecoration').disabled=!scene.decor.some(d=>d.id===selected)||item?.locked===true;
    $('moveFace').replaceChildren(...M.faces(own).filter(entry=>entry.id!==activeFace).map((entry,index)=>new Option(entry.id==='main'?'첫 진열면':entry.scene.name,entry.id)));$('moveToFace').disabled=!item||item.locked||M.faces(own).length<2;
  }
  function selectObject(id){selected=id;document.querySelectorAll('[data-object-id]').forEach(node=>node.classList.toggle('selected',node.dataset.objectId===id));updateTools();fitOverlays();}
  function fitScene(){if(customizing){const viewport=$('sceneViewport');viewport.style.setProperty('--scene-size',Math.max(45,Math.min(viewport.clientWidth-24,viewport.clientHeight-24))+'px');}requestAnimationFrame(fitOverlays);}
  if(typeof ResizeObserver==='function')new ResizeObserver(fitScene).observe($('sceneViewport'));window.addEventListener('resize',fitScene);
  function setCustom(value){customizing=value;document.body.classList.toggle('customizing',value);$('customTools').hidden=!value;$('editToolbar').hidden=!value;$('sceneHint').textContent=value?'사진과 장식을 선택해 끌어 옮기세요. 잠긴 물건은 그대로 둡니다.':'물건을 눌러 상태·가격을 살펴보세요. 같은 물건은 하나뿐인 중고품으로 체험합니다.';render();if(value){scrollTo(0,0);requestAnimationFrame(fitScene);}else $('experience').scrollIntoView({block:'start'});}
  $('customize').onclick=()=>{if(busy())return;if(!own){own=copy(sample);own.name='나의 보물상자 · 견본';dirty=true;}view='own';resetBasket();setCustom(true);say(own.items.some(item=>item.sample)?'사진은 AI 견본입니다. 사진 찍기·앨범에서 사진 올리기로 내 사진을 추가해 보세요.':'직접 올린 사진과 가격은 그대로입니다. 사진도 추가하고 공간을 내 취향대로 꾸며보세요.');};
  $('finishDecorating').onclick=()=>{if(busy())return;if(!dirty){setCustom(false);return;}$('leaveDecorError').textContent=!db||!readable?'이 브라우저에서는 안전하게 저장할 수 없습니다. 임시로 둘러보거나 꾸미기를 계속해 파일로 보관해 주세요.':'';$('leaveDecorDialog').showModal();$('keepDecorating').focus();};
  function keepDecorating(){if(busy())return;$('leaveDecorDialog').close();$('finishDecorating').focus({preventScroll:true});}
  $('keepDecorating').onclick=keepDecorating;$('leaveDecorDialog').addEventListener('cancel',event=>{event.preventDefault();keepDecorating();});
  $('previewDecorating').onclick=()=>{if(busy())return;$('leaveDecorDialog').close();setCustom(false);say('저장 전 미리보기 · 꾸민 내용은 지금 열린 화면에만 남아 있습니다. 새로고침 전에 저장하거나 파일로 보관해 주세요.',true);};
  $('saveAndFinish').onclick=async()=>{if(busy())return;try{await save(own);$('leaveDecorDialog').close();setCustom(false);}catch(error){$('leaveDecorError').textContent=error.message;say(error.message,true);}};
  $('showExample').onclick=()=>{if(busy())return;view='example';selected='';resetBasket();render();say('원래 견본을 보고 있습니다. 내 장터의 사진·가격·꾸미기는 그대로 보관합니다.');};
  $('resumeMarket').onclick=()=>{view='own';selected='';resetBasket();render();say(dirty?'저장 전 변경이 남아 있는 내 장터입니다.':'이 기기의 내 장터를 이어봅니다.');};
  function showMaker(options={}){if(busy())return;makerFace=own&&view==='own'?activeFace:'main';makerAppend=options.append===true;makerOpener=makerAppend?options.opener:'';makerBase=own?copy(M.face(own,makerFace)):M.blank();const sampleOnly=!makerAppend&&makerBase.items.length>0&&makerBase.items.every(item=>item.sample);if(sampleOnly){makerBase.items=[];makerBase.name='나의 이웃장터';}entries=makerAppend?[]:copy(makerBase.items);$('marketName').value=makerBase.name;$('marketNameOption').open=false;$('makerTitle').textContent=makerAppend?'새 사진만 추가하기':'사진과 가격부터';$('makerIntro').textContent=makerAppend?'현재 진열면에 추가합니다. 새 사진의 가격만 적어 주세요. 다른 면과 기존 사진·배치·저장 전 꾸미기는 유지합니다.':'현재 진열면의 사진·가격을 수정합니다. 다른 진열면은 유지합니다. 이름·꾸미기는 나중에 해도 됩니다.';$('makerError').textContent='';$('uploadStatus').textContent=makerAppend?'기존 사진 '+makerBase.items.length+'장은 그대로 둡니다. 촬영·선택을 취소했으면 ×로 꾸미기로 돌아가세요.':sampleOnly?'꾸민 공간은 유지하고, AI 견본 사진 대신 내 사진으로 시작합니다.':entries.length?'기존 사진 '+entries.length+'장 · 가격을 수정해도 꾸민 배치는 유지합니다. 새 사진도 추가할 수 있어요.':'여러 장을 한 번에 선택할 수 있어요. 한 면 최대 20장 · 한 장당 15MB 이하.';$('previewWithoutSave').hidden=Boolean(db&&readable);renderEntries();$('makerDialog').showModal();$('makerDialog').scrollTop=0;$('choosePhotos').focus({preventScroll:true});}
  $('startMarket').onclick=showMaker;$('editMarket').onclick=showMaker;
  function addDecorPhoto(input,opener){if(busy()||!customizing||!own||editing().items.length>=M.MAX)return;showMaker({append:true,opener});$(input).click();}
  $('takeDecorPhoto').onclick=()=>addDecorPhoto('camera','takeDecorPhoto');$('chooseDecorPhotos').onclick=()=>addDecorPhoto('photos','chooseDecorPhotos');
  function sameEntries(a,b){return a.length===b.length&&a.every((item,index)=>{const other=b[index],keys=Object.keys(item);return keys.length===Object.keys(other).length&&keys.every(key=>item[key]===other[key]);});}
  function makerDirty(){return makerBase&&(makerAppend?entries.length>0:!sameEntries(entries,makerBase.items)||$('marketName').value!==makerBase.name);}
  function closeMaker(){if(busy())return;if(makerDirty()&&!confirm('닫으면 이번에 입력한 사진·가격은 취소합니다. 기존 사진과 꾸미던 내용은 그대로 둡니다. 닫을까요?'))return;$('makerDialog').close();if(makerOpener)$(makerOpener).focus({preventScroll:true});}
  $('closeMaker').onclick=closeMaker;$('makerDialog').addEventListener('cancel',event=>{event.preventDefault();closeMaker();});
  function entrySummary(items){return{total:items.length,complete:items.filter(item=>M.price(item.price)!==null).length};}
  function updateMakerProgress(){const {total,complete}=entrySummary(entries);$('makerProgress').textContent=importing?'사진을 준비하고 있어요…':!total?'① 앨범이나 카메라에서 사진을 선택해 주세요.':complete===total?'가격 '+total+'개 입력 완료 · 아래 버튼으로 진열하고 저장해요.':'사진 '+total+'장 · 가격 '+complete+'/'+total+'개 입력 · 빈 가격은 0원이 아닙니다.';$('buildMarket').textContent=saving?'기기에 저장 중…':makerAppend?'사진 추가하고 꾸민 장터 저장':'기본 진열로 만들고 저장';$('choosePhotos').textContent=total?'사진 더 추가하기':'앨범·파일에서 사진 선택';$('marketNameOption').hidden=makerAppend||!total;}
  $('makerForm').addEventListener('keydown',event=>{if(event.key!=='Enter'||event.isComposing||!event.target.matches('.price-input'))return;event.preventDefault();if(busy())return;const inputs=[...$('entryList').querySelectorAll('.price-input')],index=inputs.indexOf(event.target);if(M.price(entries[index]?.price)===null){$('makerError').textContent=(index+1)+'번째 가격을 숫자로 적어 주세요. 0원은 무료 나눔입니다.';event.target.setAttribute('aria-invalid','true');return;}const next=inputs[index+1];if(next)next.focus();else{event.target.blur();$('buildMarket').focus();}});
  function renderEntries(){
    $('entryList').replaceChildren();for(const [index,item] of entries.entries()){
      const row=document.createElement('section');row.className='entry-row';const photo=document.createElement('div');photo.className='entry-picture';const img=document.createElement('img');img.src=item.src;img.alt='등록할 사진 '+(index+1);photo.append(img);const fields=document.createElement('div');fields.className='entry-fields';
      function field(labelText,key,type='text'){const label=document.createElement('label');label.append(document.createTextNode(labelText));const input=document.createElement('input');input.type=type;input.value=item[key]??'';input.setAttribute('aria-label',(index+1)+'번째 '+labelText);input.oninput=()=>{item[key]=input.value;};label.append(input);return{label,input};}
      const p=field('가격 (원)','price'),amount=document.createElement('small');p.label.className='price-label';amount.className='price-feedback';amount.id='price-feedback-'+item.id;function updatePrice(){const value=M.price(item.price);amount.textContent=value===null?(String(item.price).trim()?'숫자로 입력해 주세요.':'0원은 무료 나눔'):money(value);amount.classList.toggle('error',value===null&&String(item.price).trim()!=='');p.input.setAttribute('aria-invalid',String(value===null&&String(item.price).trim()!==''));}p.input.inputMode='numeric';p.input.maxLength=8;p.input.className='price-input';p.input.placeholder='예: 12000';p.input.enterKeyHint=index===entries.length-1?'done':'next';p.input.setAttribute('aria-describedby',amount.id);p.input.oninput=()=>{item.price=p.input.value;updatePrice();$('makerError').textContent='';updateMakerProgress();};p.input.onfocus=()=>requestAnimationFrame(()=>p.input.scrollIntoView({block:'center',inline:'nearest'}));updatePrice();p.label.append(amount);fields.append(p.label);
      const details=document.createElement('details'),summary=document.createElement('summary');summary.textContent='이름·상태 더 적기 (선택)';details.append(summary);const n=field('물건 이름','name');n.input.maxLength=40;details.append(n.label);
      const condition=document.createElement('label');condition.append(document.createTextNode('사용감'));const select=document.createElement('select');for(const [value,label] of Object.entries(conditions))select.add(new Option(value==='unspecified'?'아직 적지 않았어요':label.replace('상태 설명: ',''),value));select.value=item.condition;select.setAttribute('aria-label',(index+1)+'번째 사용감');select.onchange=()=>{item.condition=select.value;};condition.append(select);details.append(condition);
      const note=document.createElement('label');note.append(document.createTextNode('흠집·작동·치수 등'));const textarea=document.createElement('textarea');textarea.rows=2;textarea.maxLength=300;textarea.value=item.note||'';textarea.setAttribute('aria-label',(index+1)+'번째 상태 설명');textarea.oninput=()=>{item.note=textarea.value;};note.append(textarea);details.append(note);
      const remove=document.createElement('button');remove.type='button';remove.className='remove-entry';remove.textContent='사진 빼기';remove.setAttribute('aria-label',(index+1)+'번째 사진 등록목록에서 빼기');remove.onclick=()=>{entries=entries.filter(value=>value.id!==item.id);renderEntries();};fields.append(details);photo.append(remove);row.append(photo,fields);$('entryList').append(row);
    }renderBusy();
  }
  async function imageData(file){
    if(!file.type.startsWith('image/')||file.size>15*1024*1024)throw Error('15MB 이하의 사진을 선택해 주세요.');let bitmap;
    try{bitmap=await createImageBitmap(file);}catch{throw Error('읽을 수 없습니다. JPG·PNG·WebP 사진을 선택해 주세요.');}
    try{
      const encode=(edge,quality)=>{const scale=Math.min(1,edge/Math.max(bitmap.width,bitmap.height)),canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);return canvas.toDataURL('image/webp',quality);};
      const src=encode(640,.82);if(!M.image(src))throw Error('사진이 너무 큽니다. 더 작은 사진을 선택해 주세요.');
      if(Math.max(bitmap.width,bitmap.height)<=640)return{src};
      for(const [edge,quality]of [[2048,.86],[2048,.7],[1536,.7],[1024,.7]]){const fullSrc=encode(edge,quality);if(M.image(fullSrc))return{src,fullSrc};}
      throw Error('확대용 사진을 준비하지 못했습니다. 더 작은 사진을 선택해 주세요.');
    }finally{bitmap.close();}
  }
  function newPhotoPosition(items){const slots=[];for(const y of [24,42,60,77])for(const x of [2,22,42,62,82])slots.push({x,y,size:16});const overlap=slot=>items.reduce((sum,item)=>sum+Math.max(0,Math.min(slot.x+slot.size,item.x+item.size)-Math.max(slot.x,item.x))*Math.max(0,Math.min(slot.y+slot.size*.9,item.y+item.size*.9)-Math.max(slot.y,item.y)),0);return slots.reduce((best,slot)=>overlap(slot)<overlap(best)?slot:best);}
  async function upload(files){if(busy())return;const available=M.MAX-entries.length-(makerAppend?makerBase.items.length:0);if(!available){$('uploadStatus').textContent='견본 장터에는 사진 20장까지 놓을 수 있습니다.';return;}importing=true;renderBusy();const errors=[];let added=0;try{for(const file of [...files].slice(0,available)){try{const photo=await imageData(file),index=entries.length+(makerAppend?makerBase.items.length:0),position=makerAppend?newPhotoPosition([...makerBase.items,...entries]):{size:24,x:[6,38,70][index%3],y:index<3?31:66};entries.push({id:crypto.randomUUID(),name:'내 물건 '+(index+1),...photo,price:'',condition:'unspecified',note:'',sample:false,sold:false,locked:false,...position});added++;}catch(error){errors.push(file.name+': '+error.message);}}}finally{importing=false;renderEntries();$('uploadStatus').textContent=added+'장 추가 · '+(errors.length?errors.join(' '):'사진 아래에 가격만 적으면 됩니다.')+(files.length>available?' 20장 한도로 일부 사진은 추가하지 않았습니다.':'');}}
  $('choosePhotos').onclick=()=>$('photos').click();$('takePhoto').onclick=()=>$('camera').click();for(const id of ['photos','camera'])$(id).onchange=async event=>{await upload(event.target.files);event.target.value='';};
  function candidate(){const valid=M.validateEntries(entries);let next={...copy(makerBase),name:makerAppend?makerBase.name:$('marketName').value.trim()||'나의 이웃장터',items:makerAppend?[...copy(makerBase.items),...copy(valid)]:copy(valid)};if(!makerAppend&&!makerBase.items.length)next=M.arrange(next);return M.clean(next);}
  async function build(temporary){
    if(busy())return;let validInput=false;
    try{
      const before=own&&copy(own),faceCandidate=candidate(),next=own?M.clean(M.replaceFace(own,makerFace,faceCandidate)):faceCandidate;validInput=true;
      if(temporary){own=next;view='own';dirty=true;say('임시 미리보기 · 저장되지 않았습니다. 창을 닫기 전에 파일로 보관해 주세요.',true);}else await save(next);
      activeFace=makerFace;resetBasket();
      if(makerAppend){if(before){past.push(before);if(past.length>20)past.shift();}future.length=0;}else{selected='';past.length=0;future.length=0;}
      $('makerDialog').close();render();
      if(makerAppend)($(makerOpener).disabled?$('finishDecorating'):$(makerOpener)).focus({preventScroll:true});else $('experience').scrollIntoView({block:'start'});
    }catch(error){
      $('makerError').textContent=error.message;$('previewWithoutSave').hidden=!validInput;
      const index=entries.findIndex(item=>M.price(item.price)===null);if(index>=0)$('entryList').querySelectorAll('.price-input')[index].focus();
      say(validInput?'장터를 저장하지 못했습니다. 입력한 사진·가격과 이전 저장본은 유지합니다.':'사진·가격을 확인해 주세요. 빈 가격을 0원으로 저장하지 않습니다.',true);
    }
  }
  $('makerForm').onsubmit=event=>{event.preventDefault();void build(false);};$('previewWithoutSave').onclick=()=>void build(true);
  $('decorName').onchange=()=>changed(()=>{own.name=$('decorName').value;});
  for(const [id,key] of Object.entries({faceName:'name',wallColor:'wall',woodColor:'wood',accentColor:'accent',finish:'finish',brightness:'brightness',backdrop:'backdrop',season:'season',displayStyle:'display',lighting:'lighting'}))$(id).onchange=()=>changeFace(scene=>{scene[key]=key==='brightness'?Number($(id).value):$(id).value;});$('priceTags').onchange=()=>changeFace(scene=>{scene.tags=$('priceTags').checked;});
  for(const [id,options]of [['backdrop',M.backdrops],['season',M.seasons],['displayStyle',M.displays],['lighting',M.lightings]])for(const [value,label]of Object.entries(options))$(id).add(new Option(label,value));
  function renderWorldChoices(){const filter=$('worldFilter').value;$('worldChoices').replaceChildren();for(const [id,scene]of Object.entries(M.worlds)){if(filter!=='all'&&scene.group!==filter)continue;const button=document.createElement('button'),thumb=document.createElement('span');button.type='button';button.dataset.world=id;thumb.className='world-thumb';for(const [kind,key]of [['background',scene.backdrop],['display',scene.display]]){const art=window.NeighborWorldArt.draw(document,kind,key,scene);if(art)thumb.append(art);}button.append(thumb,document.createTextNode(scene.label));button.onclick=()=>{changeFace(scene=>M.applyWorld(scene,id));say('이 면의 배경·진열대·색을 바꿨습니다. 사진·가격·배치·소품과 다른 면은 그대로입니다. 저장 전 변경입니다.');};$('worldChoices').append(button);}updateTools();}
  for(const group of new Set(Object.values(M.worlds).map(scene=>scene.group)))$('worldFilter').add(new Option(group,group));$('worldFilter').onchange=renderWorldChoices;renderWorldChoices();
  for(const [id,theme] of Object.entries(M.themes)){const button=document.createElement('button');button.type='button';button.textContent=theme.label;button.style.background=theme.wall;button.dataset.theme=id;button.onclick=()=>changeFace(scene=>M.applyTheme(scene,id));$('themeChoices').append(button);}
  function decorArt(type,scene,key){return window.NeighborWorldArt.draw(document,'decoration',type,scene)||window.ShopStudioFurnitureArt.draw(document,{type,color:scene.wood,accent:scene.wall,finish:scene.finish==='wood'?'wood':'plain'},key);}
  function renderDecorChoices(){const filter=$('decorFilter').value,query=$('decorSearch').value.normalize('NFKC').replace(/\s/g,'').toLowerCase();$('decorChoices').replaceChildren();for(const type of M.decorTypes){const [label,group]=M.decorCatalog[type];if(filter!=='all'&&filter!==group||query&&!label.replace(/\s/g,'').toLowerCase().includes(query))continue;const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',label+' ＋');const art=decorArt(type,showing(),'neighbor-tool-'+type);if(art)button.append(art);button.append(document.createTextNode(label+' ＋'));button.onclick=()=>{if(!own||busy())return;if(editing().decor.length>=12){say('이 면에는 장식 12개까지 놓을 수 있습니다.',true);return;}changeFace(scene=>{const id=crypto.randomUUID();scene.decor.push({id,type,size:type==='rug'?30:18,x:40,y:type==='pendant'?20:72,locked:false});selected=id;});};$('decorChoices').append(button);}$('decorResult').textContent=$('decorChoices').children.length?'소품 '+$('decorChoices').children.length+'종 · 눌러서 추가':'맞는 소품이 없어요. 다른 말이나 전체 종류로 찾아보세요.';}
  for(const group of new Set(Object.values(M.decorCatalog).map(entry=>entry[1])))$('decorFilter').add(new Option(group,group));$('decorFilter').onchange=renderDecorChoices;$('decorSearch').oninput=renderDecorChoices;renderDecorChoices();
  $('selectedObject').onchange=()=>selectObject($('selectedObject').value);
  $('objectSize').onchange=()=>changeFace(scene=>{const item=[...scene.items,...scene.decor].find(value=>value.id===selected);if(item&&!item.locked)Object.assign(item,M.position({...item,size:Number($('objectSize').value)}));});
  $('objectLock').onchange=()=>changeFace(scene=>{const item=[...scene.items,...scene.decor].find(value=>value.id===selected);if(item)item.locked=$('objectLock').checked;});
  function move(dx,dy){const item=own&&[...editing().items,...editing().decor].find(value=>value.id===selected);if(!item||item.locked)return;changed(()=>Object.assign(item,M.position({...item,x:item.x+dx,y:item.y+dy})));}
  for(const [id,x,y] of [['moveLeft',-2,0],['moveRight',2,0],['moveUp',0,-2],['moveDown',0,2]])$(id).onclick=()=>move(x,y);
  $('removeDecoration').onclick=()=>{if(own&&editing().decor.some(item=>item.id===selected&&!item.locked))changeFace(scene=>{scene.decor=scene.decor.filter(item=>item.id!==selected);selected='';});};
  $('arrange').onclick=()=>{try{changeFace(scene=>M.arrange(scene));}catch(error){say(error.message,true);}};
  function history(from,to){if(busy()||!own||!from.length)return;to.push(copy(own));own=from.pop();dirty=true;selected='';render();say('배치를 되돌렸습니다. 저장 전 변경입니다.');}$('undo').onclick=()=>history(past,future);$('redo').onclick=()=>history(future,past);
  $('saveDecor').onclick=async()=>{try{await save(own);render();}catch(error){say(error.message,true);}};
  $('exportDraft').onclick=()=>{if(!own)return;const blob=new Blob([JSON.stringify(M.clean(own))],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='맛지도_이웃장터_시안.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);say('사진·가격·꾸미기 시안 파일을 내려받았습니다. 공개나 판매는 하지 않았습니다.');};
  const root=$('marketScene');sceneGestures=window.NeighborSceneEditor.attach({root,enabled:()=>customizing&&!busy()&&view==='own',select:selectObject,item:()=>own&&[...editing().items,...editing().decor].find(value=>value.id===selected),snapshot:()=>copy(own),position:M.position,resize:M.resize,preview:item=>{const target=[...editing().items,...editing().decor].find(value=>value.id===selected);if(!target||target.locked)return;Object.assign(target,item);const node=[...root.querySelectorAll('[data-object-id]')].find(node=>node.dataset.objectId===selected);if(node)place(node,target);fitOverlays();},finish:(cancelled,before,moved)=>{if(cancelled){own=before;render();return;}if(moved){past.push(before);if(past.length>20)past.shift();future.length=0;dirty=true;suppressClick=true;setTimeout(()=>suppressClick=false,0);render();say('크기·위치를 바꿨습니다. 한 번에 되돌릴 수 있어요. 사진·가격은 그대로이며 저장 전 변경입니다.');}}});
  window.addEventListener('resize',()=>sceneGestures.cancel());
  root.addEventListener('click',event=>{if(suppressClick)return;const node=event.target.closest('[data-object-id]');if(!node)return;if(customizing)selectObject(node.dataset.objectId);else if(!node.classList.contains('market-decoration'))showProduct(node.dataset.objectId);});
  root.addEventListener('keydown',event=>{if(!customizing||event.target.closest('input,select,textarea'))return;const deltas={ArrowLeft:[-2,0],ArrowRight:[2,0],ArrowUp:[0,-2],ArrowDown:[0,2]};if(deltas[event.key]){event.preventDefault();const focused=event.target.closest('[data-object-id]');if(focused)selectObject(focused.dataset.objectId);const id=selected;move(...deltas[event.key]);[...root.querySelectorAll('[data-object-id]')].find(node=>node.dataset.objectId===id)?.focus({preventScroll:true});}});
  function showProduct(id){const item=M.allItems(current()).find(value=>value.id===id);if(!item)return;detailId=id;$('detailPhoto').src=item.src;$('detailPhoto').dataset.fullSrc=item.fullSrc||item.src;$('detailPhoto').alt=item.name;$('detailTitle').textContent=item.name;$('detailPrice').textContent=money(item.price);$('detailCondition').textContent=conditions[item.condition];$('detailNote').textContent=item.note||'아직 상태 설명을 적지 않았습니다.';$('detailSample').textContent=item.sample?'AI로 만든 견본 이미지 · 예시 가격 · 상태는 가상의 설명':'내가 올린 사진 · 이 기기에만 보관 · 판매 공개 전';$('toggleSold').hidden=view!=='own';$('toggleSold').textContent=item.sold?'판매중 표시로 되돌리기 (견본)':'판매완료 표시 체험';updateDetail();$('productDialog').showModal();document.querySelector('.product-detail-body').scrollTop=0;}
  function updateDetail(){
    const item=M.allItems(current()).find(value=>value.id===detailId),result=M.basket(current(),basketIds),added=basketIds.has(item?.id);
    $('addToBasket').disabled=!item||item.sold||added;$('addToBasket').textContent=item?.sold?'판매완료된 물건':added?'✓ 1점 담김':'체험 장바구니 담기';
    $('detailFeedback').textContent=item?.sold?'판매완료로 표시된 견본입니다. 장바구니에 담을 수 없습니다.':added?'이 물건 1점이 담겨 있어요. 전체 '+result.items.length+'점 · 상품 합계 '+money(result.total)+'. 각 물건은 1점뿐입니다.':'상태·가격을 확인하고 담아 주세요. 실제 구매·예약은 아닙니다.';
    $('reviewBasket').hidden=!result.items.length;$('reviewBasket').textContent='장바구니 보기 ('+result.items.length+'점)';
  }
  $('closeProduct').onclick=()=>$('productDialog').close();$('addToBasket').onclick=()=>{const item=M.allItems(current()).find(value=>value.id===detailId);if(!item||item.sold||basketIds.has(item.id))return;basketIds.add(item.id);basketTouched=true;$('basketFeedback').textContent='「'+item.name+'」 1점을 담았습니다. 실제 구매·예약은 아닙니다.';renderBasket();updateDetail();};
  function openBasket(open){$('basketDetails').hidden=!open;$('basketToggle').setAttribute('aria-expanded',String(open));$('basketToggle').textContent=open?'접기':'담은 물건 보기';}
  $('reviewBasket').onclick=()=>{$('productDialog').close();openBasket(true);$('basketToggle').focus({preventScroll:true});};
  $('toggleSold').onclick=()=>{if(view!=='own'||busy())return;changed(()=>{const item=M.allItems(own).find(value=>value.id===detailId);item.sold=!item.sold;if(item.sold)basketIds.delete(item.id);});const item=M.allItems(own).find(value=>value.id===detailId);$('toggleSold').textContent=item.sold?'판매중 표시로 되돌리기 (견본)':'판매완료 표시 체험';updateDetail();};
  function renderBasket(){
    const scene=current();for(const id of basketIds)if(!M.allItems(scene).some(item=>item.id===id&&!item.sold))basketIds.delete(id);
    const result=M.basket(scene,basketIds),visible=basketTouched||!!result.items.length;$('basketDock').hidden=!visible;document.body.classList.toggle('has-basket',visible);
    $('basketSummary').textContent='체험 '+result.items.length+'점 · '+(result.items.length?money(result.total):'0원');$('basketEmpty').hidden=!!result.items.length;$('basketItems').replaceChildren();
    for(const item of result.items){
      const row=document.createElement('div');row.className='basket-row';row.dataset.basketId=item.id;const label=document.createElement('span');label.textContent=item.name+' · 1점 · '+money(item.price);
      const remove=document.createElement('button');remove.type='button';remove.textContent='삭제';remove.setAttribute('aria-label',item.name+' 체험 장바구니에서 삭제');remove.onclick=()=>{basketIds.delete(item.id);renderBasket();updateDetail();$('basketFeedback').textContent='「'+item.name+'」 삭제 완료 · '+(basketIds.size?'다른 담은 물건은 그대로입니다.':'장바구니가 비었습니다.');$('basketToggle').focus({preventScroll:true});};row.append(label,remove);$('basketItems').append(row);
    }
    for(const node of document.querySelectorAll('#objects [data-object-id],#productList [data-product-id]')){
      const id=node.dataset.objectId||node.dataset.productId,added=basketIds.has(id),item=M.allItems(scene).find(value=>value.id===id);node.classList.toggle('in-basket',added);
      let badge=node.querySelector('.in-basket-badge');if(added&&!badge){badge=document.createElement('span');badge.className='in-basket-badge';badge.textContent='✓ 담김';node.append(badge);}else if(!added)badge?.remove();
      if(item)node.setAttribute('aria-label',item.name+' · '+money(item.price)+(added?' · 장바구니 1점 담김':'')+(customizing?' 선택·이동':' 살펴보기'));
    }
  }
  $('basketToggle').onclick=()=>openBasket($('basketDetails').hidden);
  $('continueShopping').onclick=()=>{openBasket(false);if(!basketIds.size)basketTouched=false;renderBasket();const target=[...$('productList').children].find(node=>node.dataset.productId===detailId)||$('productList').firstElementChild;if(target){target.focus({preventScroll:true});target.scrollIntoView({block:'center'});}};
  window.addEventListener('beforeunload',event=>{if(dirty||saving||importing||$('makerDialog').open&&makerDirty()){event.preventDefault();event.returnValue='';}});
  function entryMode(search){const params=new URLSearchParams(search);return params.get('action')==='create'?'create':params.get('view')==='example'?'example':'';}
  async function initialize(){try{db=await openDB();const stored=await read();if(stored){if(!Number.isSafeInteger(stored.revision)||stored.revision<1)throw Error('invalid-revision');own=M.clean(stored.scene);view='own';revision=stored.revision;say('이 기기에 보관한 내 장터의 사진·가격·꾸미기를 불러왔습니다. 고객 공개는 하지 않았습니다.');}}catch{readable=false;say('기기 저장을 사용할 수 없습니다. 이전 자료를 덮어쓰지 않으며 임시 미리보기만 가능합니다.',true);}loading=false;const mode=entryMode(location.search);if(mode==='example')view='example';render();if(mode==='create')showMaker();}
  void initialize();
})();
