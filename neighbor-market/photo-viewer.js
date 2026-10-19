(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else{root.NeighborPhotoViewer=api;api.attach(document);}})(globalThis,function(){
  'use strict';
  const limit=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(value)?value:min));
  function fit(naturalWidth,naturalHeight,viewWidth,viewHeight){const ratio=Math.min(viewWidth/Math.max(1,naturalWidth),viewHeight/Math.max(1,naturalHeight));return{width:naturalWidth*ratio,height:naturalHeight*ratio,viewWidth,viewHeight,scale:1,x:0,y:0};}
  function bounded(state){const scale=limit(state.scale,1,6),maxX=Math.max(0,(state.width*scale-state.viewWidth)/2),maxY=Math.max(0,(state.height*scale-state.viewHeight)/2);return{...state,scale,x:limit(state.x,-maxX,maxX),y:limit(state.y,-maxY,maxY)};}
  function zoomAt(state,scale,focusX=0,focusY=0){scale=limit(scale,1,6);const ratio=scale/state.scale;return bounded({...state,scale,x:focusX-(focusX-state.x)*ratio,y:focusY-(focusY-state.y)*ratio});}
  function attach(document){
    const $=id=>document.getElementById(id),dialog=$('photoDialog'),stage=$('photoStage'),image=$('photoImage');if(!dialog||!stage||!image)return;
    let state=null,baseline=null,lastTap=null,multi=false,lastTouch=0;const pointers=new Map();
    const center=()=>{const r=stage.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};};
    const midpoint=points=>({x:(points[0].x+points[1].x)/2,y:(points[0].y+points[1].y)/2});
    const distance=points=>Math.hypot(points[0].x-points[1].x,points[0].y-points[1].y);
    function paint(){if(!state)return;state=bounded(state);image.style.width=state.width+'px';image.style.height=state.height+'px';image.style.transform=`translate(-50%,-50%) translate(${state.x}px,${state.y}px) scale(${state.scale})`;stage.dataset.scale=String(state.scale);stage.dataset.panX=String(state.x);stage.dataset.panY=String(state.y);$('photoZoom').textContent=Math.round(state.scale*100)+'%';$('photoMinus').disabled=state.scale<=1;$('photoPlus').disabled=state.scale>=6;$('resetPhoto').disabled=false;}
    function reset(){if(!dialog.open||!image.naturalWidth)return;state=fit(image.naturalWidth,image.naturalHeight,stage.clientWidth,stage.clientHeight);pointers.clear();baseline=null;lastTap=null;multi=false;paint();}
    function begin(){baseline=state?{state:{...state},points:[...pointers.values()].map(point=>({...point})),started:Date.now(),moved:false}:null;}
    function zoom(scale,x=0,y=0){if(!state)return;state=zoomAt(state,scale,x,y);paint();}
    function toggleAt(x,y){const c=center();if(state?.scale>1)reset();else zoom(2.5,x-c.x,y-c.y);}
    function open(){const source=$('detailPhoto');if(dialog.open||!source.src)return;state=null;stage.removeAttribute('data-scale');for(const id of ['photoMinus','photoPlus','resetPhoto'])$(id).disabled=true;$('photoZoom').textContent='…';image.style.visibility='hidden';image.alt=source.alt;$('photoTitle').textContent=source.alt||'상품 사진';$('photoHelp').textContent='두 손가락으로 확대 · 끌어서 이동 · 두 번 누르면 확대/전체';dialog.showModal();image.src=source.dataset.fullSrc||source.src;if(image.complete&&image.naturalWidth){image.style.visibility='visible';reset();}stage.focus({preventScroll:true});}
    $('openDetailPhoto').addEventListener('click',open);
    // A pinch starting on the detail photo must not enlarge the whole card either.
    const previewPointers=new Map();$('openDetailPhoto').addEventListener('pointerdown',event=>{if(event.pointerType!=='touch')return;previewPointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(previewPointers.size<2)return;event.preventDefault();const active=[...previewPointers];previewPointers.clear();open();for(const [id,point]of active){pointers.set(id,point);stage.setPointerCapture(id);}multi=true;begin();});
    for(const type of ['pointerup','pointercancel'])$('openDetailPhoto').addEventListener(type,event=>previewPointers.delete(event.pointerId));
    image.onload=()=>{const active=[...pointers];image.style.visibility='visible';reset();for(const [id,point]of active)pointers.set(id,point);multi=pointers.size>1;begin();};image.onerror=()=>{$('photoHelp').textContent='사진을 불러오지 못했습니다. 닫고 다시 열어 주세요.';};
    $('closePhoto').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{pointers.clear();baseline=null;lastTap=null;state=null;if($('productDialog').open)$('openDetailPhoto').focus({preventScroll:true});});
    $('productDialog').addEventListener('close',()=>{if(dialog.open)dialog.close();});
    $('resetPhoto').onclick=reset;$('photoPlus').onclick=()=>zoom((state?.scale||1)*1.5);$('photoMinus').onclick=()=>zoom((state?.scale||1)/1.5);
    stage.addEventListener('pointerdown',event=>{if(!state||event.button!==0)return;event.preventDefault();if(event.pointerType!=='mouse')lastTouch=Date.now();stage.setPointerCapture(event.pointerId);pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});begin();if(pointers.size>1){lastTap=null;multi=true;}});
    stage.addEventListener('pointermove',event=>{
      if(!pointers.has(event.pointerId))return;pointers.set(event.pointerId,{x:event.clientX,y:event.clientY});if(!baseline)return;const points=[...pointers.values()];
      if(points.length>=2&&baseline.points.length>=2){const before=midpoint(baseline.points),now=midpoint(points),c=center(),ratio=distance(points)/Math.max(1,distance(baseline.points));state=zoomAt(baseline.state,baseline.state.scale*ratio,before.x-c.x,before.y-c.y);state=bounded({...state,x:state.x+now.x-before.x,y:state.y+now.y-before.y});baseline.moved=true;}
      else if(points.length===1){const dx=points[0].x-baseline.points[0].x,dy=points[0].y-baseline.points[0].y;if(Math.hypot(dx,dy)>5)baseline.moved=true;state=bounded({...baseline.state,x:baseline.state.x+dx,y:baseline.state.y+dy});}
      paint();
    });
    function end(event){if(!pointers.has(event.pointerId))return;const tap=event.type==='pointerup'&&pointers.size===1&&!multi&&!baseline?.moved&&Date.now()-(baseline?.started||0)<300;pointers.delete(event.pointerId);if(tap&&event.pointerType!=='mouse'){const now=Date.now();if(lastTap&&now-lastTap.time<350&&Math.hypot(event.clientX-lastTap.x,event.clientY-lastTap.y)<28){toggleAt(event.clientX,event.clientY);lastTap=null;}else lastTap={time:now,x:event.clientX,y:event.clientY};}if(event.type!=='pointerup')lastTap=null;if(!pointers.size){multi=false;if(state&&(state.viewWidth!==stage.clientWidth||state.viewHeight!==stage.clientHeight))reset();}begin();}
    for(const type of ['pointerup','pointercancel','lostpointercapture'])stage.addEventListener(type,end);
    stage.addEventListener('dblclick',event=>{event.preventDefault();if(Date.now()-lastTouch<700)return;toggleAt(event.clientX,event.clientY);});
    stage.addEventListener('wheel',event=>{if(!state)return;event.preventDefault();const c=center();zoom(state.scale*(event.deltaY<0?1.2:1/1.2),event.clientX-c.x,event.clientY-c.y);},{passive:false});
    stage.addEventListener('keydown',event=>{if(!state)return;const deltas={ArrowLeft:[28,0],ArrowRight:[-28,0],ArrowUp:[0,28],ArrowDown:[0,-28]};if(Object.hasOwn(deltas,event.key)){event.preventDefault();const [x,y]=deltas[event.key];state=bounded({...state,x:state.x+x,y:state.y+y});paint();}else if(['+','=','-','0'].includes(event.key)){event.preventDefault();if(event.key==='0')reset();else zoom(state.scale*(event.key==='-'?1/1.5:1.5));}});
    if(typeof ResizeObserver==='function')new ResizeObserver(()=>{if(dialog.open&&!pointers.size)reset();}).observe(stage);
  }
  return Object.freeze({fit,bounded,zoomAt,attach});
});
