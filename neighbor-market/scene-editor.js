(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NeighborSceneEditor=api;})(globalThis,function(){
  'use strict';
  function attach(options){
    const {root}=options,points=new Map();let gesture=null;
    const distance=()=>{const [a,b]=[...points.values()];return Math.hypot(a.x-b.x,a.y-b.y);};
    const center=()=>{const [a,b]=[...points.values()];return{x:(a.x+b.x)/2,y:(a.y+b.y)/2};};
    function stop(cancelled){const g=gesture;if(!g)return;gesture=null;const ids=[...points.keys()];points.clear();for(const id of ids)if(root.hasPointerCapture(id))root.releasePointerCapture(id);try{options.finish(cancelled,g.before,g.moved,!cancelled&&g.allowDrop&&g.moved?g.dropPoint:null);}finally{options.drag?.(null);}}
    root.addEventListener('pointerdown',event=>{
      if(!options.enabled()||event.button!==0||points.size>=2)return;
      const handle=event.target.closest('[data-resize]'),node=event.target.closest('[data-object-id]');
      if(!gesture){if(!handle&&!node)return;if(node)options.select(node.dataset.objectId);const item=options.item();if(!item||item.locked)return;const rect=root.getBoundingClientRect();gesture={before:options.snapshot(),start:{...item},rect,x:event.clientX,y:event.clientY,mode:handle?'resize':'move',allowDrop:!handle,corner:handle?.dataset.resize,moved:false};}
      points.set(event.pointerId,{x:event.clientX,y:event.clientY});root.setPointerCapture(event.pointerId);event.preventDefault();
      if(points.size===2){gesture.mode='pinch';gesture.allowDrop=false;options.drag?.(null);gesture.start={...options.item()};gesture.distance=Math.max(1,distance());gesture.center=center();}
    });
    root.addEventListener('pointermove',event=>{
      const g=gesture;if(!g||!points.has(event.pointerId)||g.mode==='settling')return;
      points.set(event.pointerId,{x:event.clientX,y:event.clientY});const dx=(event.clientX-g.x)/g.rect.width*100,dy=(event.clientY-g.y)/g.rect.height*100;let next;
      if(g.mode==='pinch'){
        if(points.size!==2)return;const c=center(),scale=distance()/g.distance,size=Math.max(12,Math.min(36,g.start.size*scale));
        next=options.position({...g.start,size,x:g.start.x+(g.start.size-size)/2+(c.x-g.center.x)/g.rect.width*100,y:g.start.y+(g.start.size-size)/2/1.15+(c.y-g.center.y)/g.rect.height*100});
      }else if(g.mode==='resize')next=options.resize(g.start,g.corner,dx,dy);
      else{if(!g.moved&&Math.abs(event.clientX-g.x)+Math.abs(event.clientY-g.y)<5)return;g.moved=true;options.drag?.({x:event.clientX,y:event.clientY});next=options.position({...g.start,x:g.start.x+dx,y:g.start.y+dy});}
      if(Math.abs(next.size-g.start.size)+Math.abs(next.x-g.start.x)+Math.abs(next.y-g.start.y)>.01)g.moved=true;
      options.preview(next);event.preventDefault();
    });
    root.addEventListener('pointerup',event=>{if(!gesture||!points.has(event.pointerId))return;if(gesture.mode==='move')gesture.dropPoint={x:event.clientX,y:event.clientY};points.delete(event.pointerId);if(!points.size)stop(false);else gesture.mode='settling';});
    root.addEventListener('pointercancel',()=>stop(true));
    root.addEventListener('lostpointercapture',event=>{if(points.has(event.pointerId))stop(true);});
    root.addEventListener('keydown',event=>{const handle=event.target.closest('[data-resize]');if(!handle||!['+','=','-','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key)||!options.enabled())return;const item=options.item();if(!item||item.locked)return;event.preventDefault();const before=options.snapshot(),delta=['-','ArrowDown','ArrowLeft'].includes(event.key)?-2:2;options.preview(options.position({...item,size:item.size+delta}));options.finish(false,before,true);root.querySelector('[data-resize="'+handle.dataset.resize+'"]')?.focus({preventScroll:true});});
    return{cancel:()=>stop(true),active:()=>Boolean(gesture)};
  }
  return Object.freeze({attach});
});
