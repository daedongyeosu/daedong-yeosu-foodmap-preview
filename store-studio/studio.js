(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const scene=$('scene'), itemsRoot=$('items'), status=$('saveStatus');
  const defaults={preset:'cafe',shopTitle:'나의 작은 카페',zones:1,shelves:3,wall:'#eadfce',shelfColor:'#805735',material:'plain',light:100,items:[]};
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
  let selectedId='',previewing=false,loading=true,importing=false,gesture=null,db=null,saveChain=Promise.resolve();
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
  function bounded(item){
    const rect=scene.getBoundingClientRect(),heightPercent=item.size*rect.width/rect.height;
    item.x=clamp(item.x,0,100-item.size);item.y=clamp(item.y,20,Math.max(20,98-heightPercent));
  }
  function position(node,item){node.style.left=`${item.x}%`;node.style.top=`${item.y}%`;node.style.width=`${item.size}%`;node.style.transform=`rotate(${item.rotation}deg)`;}
  function render(){
    scene.style.setProperty('--wall',state.wall);scene.style.setProperty('--shelf',state.shelfColor);scene.style.setProperty('--light',state.light/100);scene.dataset.material=state.material;
    scene.classList.toggle('previewing',previewing);$('sign').textContent=state.shopTitle||'내 상점';
    for(const key of ['preset','shopTitle','zones','shelves','wall','shelfColor','material','light'])$(key).value=state[key];
    $('dividers').replaceChildren();for(let i=1;i<state.zones;i++){const line=document.createElement('i');line.className='divider';line.style.left=`${i*100/state.zones}%`;$('dividers').append(line);}
    $('shelfLines').replaceChildren();for(let i=1;i<=state.shelves;i++){const line=document.createElement('i');line.className='shelf-line';line.style.top=`${26+i*68/state.shelves}%`;$('shelfLines').append(line);}
    itemsRoot.replaceChildren();$('itemList').replaceChildren();
    for(const item of state.items){
      const node=document.createElement('button');node.type='button';node.className=`scene-item${item.shadow?' has-shadow':''}${item.id===selectedId&&!previewing?' selected':''}`;node.dataset.itemId=item.id;node.setAttribute('aria-label',`${item.name} ${previewing?'보기':'선택·이동'}`);node.style.aspectRatio='1';position(node,item);
      const img=document.createElement('img');img.src=item.src;img.alt='';img.draggable=false;img.style.height='100%';
      node.append(img);itemsRoot.append(node);
      const listButton=document.createElement('button');listButton.type='button';listButton.textContent=item.name;listButton.disabled=previewing||loading||importing;listButton.setAttribute('aria-label',`${item.name} 목록에서 선택`);listButton.onclick=()=>{selectedId=item.id;render();$('itemTools').scrollIntoView({block:'nearest'});};$('itemList').append(listButton);
    }
    $('emptyScene').hidden=state.items.length>0;
    const item=selected();$('itemTools').hidden=!item||previewing;
    if(item){$('itemName').value=item.name;$('itemSize').value=item.size;$('itemRotation').value=item.rotation;$('itemShadow').checked=item.shadow;}
    $('undo').disabled=loading||importing||!past.length||previewing;$('redo').disabled=loading||importing||!future.length||previewing;
    $('preview').textContent=previewing?'꾸미기로 돌아가기':'고객처럼 보기';
    $('previewHelp').hidden=!previewing;
    document.querySelectorAll('.tools input,.tools select,.tools button').forEach(node=>node.disabled=loading||importing||previewing);
  }
  function change(action){if(loading||importing||previewing)return;checkpoint();action();render();persist();}
  for(const key of ['shopTitle','zones','shelves','wall','shelfColor','material','light'])$(key).addEventListener('change',event=>change(()=>{state[key]=['zones','shelves','light'].includes(key)?Number(event.target.value):event.target.value;}));
  $('preset').addEventListener('change',event=>change(()=>{const preset=event.target.value;Object.assign(state,presets[preset],{preset});}));
  $('choosePhotos').onclick=()=>$('photos').click();$('takePhoto').onclick=()=>$('camera').click();
  async function imageData(file){
    if(!file.type.startsWith('image/')||file.size>15*1024*1024)throw new Error('15MB 이하의 사진 파일을 선택해 주세요.');
    let bitmap;try{bitmap=await createImageBitmap(file);}catch{throw new Error('이 사진을 읽을 수 없습니다. JPG·PNG·WebP로 저장한 사진을 선택해 주세요.');}
    const scale=Math.min(1,640/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
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
    selectedId=node.dataset.itemId;render();const fresh=itemsRoot.querySelector(`[data-item-id="${selectedId}"]`),item=selected(),rect=scene.getBoundingClientRect();
    fresh.setPointerCapture(event.pointerId);fresh.focus({preventScroll:true});gesture={pointerId:event.pointerId,node:fresh,before:clone(state),x:event.clientX,y:event.clientY,startX:item.x,startY:item.y,rect,moved:false};event.preventDefault();
  });
  itemsRoot.addEventListener('pointermove',event=>{
    if(!gesture||gesture.pointerId!==event.pointerId)return;
    const dx=event.clientX-gesture.x,dy=event.clientY-gesture.y;if(Math.abs(dx)+Math.abs(dy)<4&&!gesture.moved)return;
    gesture.moved=true;const item=selected();item.x=gesture.startX+dx/gesture.rect.width*100;item.y=gesture.startY+dy/gesture.rect.height*100;bounded(item);position(gesture.node,item);
  });
  function endGesture(event){if(!gesture||gesture.pointerId!==event.pointerId)return;const current=gesture;gesture=null;
    if(event.type==='pointercancel'){state=current.before;render();return;}
    if(current.moved){past.push(current.before);if(past.length>20)past.shift();future.length=0;render();persist();}
  }
  itemsRoot.addEventListener('pointerup',endGesture);itemsRoot.addEventListener('pointercancel',endGesture);
  itemsRoot.addEventListener('click',event=>{const node=event.target.closest('[data-item-id]');if(!node)return;selectedId=node.dataset.itemId;if(previewing)$('productInfo').textContent=selected().name;else render();});
  for(const [id,key,numeric] of [['itemName','name',false],['itemSize','size',true],['itemRotation','rotation',true],['itemShadow','shadow',false]])$(id).addEventListener('change',event=>change(()=>{const item=selected();if(!item)return;item[key]=id==='itemShadow'?event.target.checked:numeric?Number(event.target.value):event.target.value.trim().slice(0,50)||'상품';bounded(item);}));
  function move(dx,dy){change(()=>{const item=selected();if(item){item.x+=dx;item.y+=dy;bounded(item);}});}
  for(const [id,dx,dy] of [['moveLeft',-2,0],['moveRight',2,0],['moveUp',0,-2],['moveDown',0,2]])$(id).onclick=()=>move(dx,dy);
  scene.addEventListener('keydown',event=>{if(previewing||!selected())return;const moves={ArrowLeft:[-2,0],ArrowRight:[2,0],ArrowUp:[0,-2],ArrowDown:[0,2]};if(moves[event.key]){event.preventDefault();move(...moves[event.key]);itemsRoot.querySelector(`[data-item-id="${selectedId}"]`)?.focus({preventScroll:true});}});
  $('duplicate').onclick=()=>{if(state.items.length>=40){say('이 시안에는 사진을 40개까지 배치할 수 있습니다.',true);return;}change(()=>{const item=selected();if(!item)return;const copy={...item,id:crypto.randomUUID(),x:item.x+4,y:item.y+3};bounded(copy);state.items.push(copy);selectedId=copy.id;});};
  $('remove').onclick=()=>change(()=>{state.items=state.items.filter(item=>item.id!==selectedId);selectedId='';});
  function history(from,to){if(loading||importing||previewing||!from.length)return;to.push(clone(state));state=from.pop();selectedId='';render();persist();}
  $('undo').onclick=()=>history(past,future);$('redo').onclick=()=>history(future,past);
  $('preview').onclick=()=>{previewing=!previewing;$('productInfo').textContent='';render();};
  async function initialize(){
    render();try{db=await storageOpen();const draft=await readDraft();if(draft&&Array.isArray(draft.items)){
      state={...state,...draft,items:draft.items.slice(0,40).filter(item=>item&&typeof item.src==='string'&&/^data:image\/(webp|png|jpeg);base64,/.test(item.src)).map(item=>({...item,size:clamp(Number(item.size)||18,8,45),rotation:clamp(Number(item.rotation)||0,-45,45),x:clamp(Number(item.x)||0,0,90),y:clamp(Number(item.y)||20,20,90)}))};
      state.zones=clamp(Number(state.zones)||1,1,3);state.shelves=clamp(Number(state.shelves)||3,2,4);state.light=clamp(Number(state.light)||100,75,125);
      if(!presets[state.preset])state.preset='cafe';if(!['plain','wood','brick','tile'].includes(state.material))state.material='plain';
      for(const key of ['wall','shelfColor'])if(!/^#[a-f0-9]{6}$/i.test(state[key]))state[key]=defaults[key];
      say('이 기기에 저장한 사진과 배치를 불러왔습니다.');
    }}catch{say('이 브라우저에서는 시안을 저장할 수 없습니다. 창을 닫거나 새로고침하면 변경사항이 사라질 수 있습니다.',true);}
    loading=false;render();
  }
  void initialize();
})();
