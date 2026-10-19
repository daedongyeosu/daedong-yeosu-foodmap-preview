(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NeighborWorkspace=api;})(globalThis,function(){
  'use strict';
  const share=value=>Math.max(25,Math.min(75,Number.isFinite(Number(value))?Number(value):40));
  function rows(height,gap,divider,value){const available=Math.max(0,height-divider-gap*2),ratio=share(value),display=available*ratio/100;return{display,tools:available-display,available,share:ratio};}
  function attach({workspace,controls,sceneActions,divider,handle,reset,label,active,enabled,cancelScene,onLayout}){
    let value=40,shown=40,drag=null;
    const mobile=()=>window.matchMedia('(max-width:700px) and (min-height:521px), (max-width:559px)').matches;
    function update(){
      const visible=active()&&mobile();divider.hidden=!visible;workspace.classList.toggle('adjustable-workspace',visible);handle.disabled=reset.disabled=!enabled();
      if(!visible){workspace.classList.remove('tools-compact');return;}
      const gap=parseFloat(getComputedStyle(workspace).rowGap)||0,height=workspace.clientHeight-controls.offsetHeight-sceneActions.offsetHeight-gap*2;
      let r=rows(height,gap,divider.offsetHeight,value);const maximum=Math.max(25,Math.min(75,100-136/Math.max(1,r.available)*100));shown=Math.min(value,maximum);r=rows(height,gap,divider.offsetHeight,shown);workspace.classList.toggle('tools-compact',r.tools<190);handle.setAttribute('aria-valuemax',String(Math.round(maximum)));
      workspace.style.setProperty('--display-row',r.display+'px');
      const percent=Math.round(shown);label.textContent='진열판 '+percent+'% · 도구 '+(100-percent)+'%';handle.setAttribute('aria-valuenow',String(percent));handle.setAttribute('aria-valuetext',label.textContent);onLayout?.();
    }
    function set(valueNext){value=share(valueNext);update();}
    function stop(cancelled){const previous=drag;if(!previous)return;drag=null;if(handle.hasPointerCapture(previous.id))handle.releasePointerCapture(previous.id);if(cancelled)value=previous.preference;update();}
    handle.addEventListener('pointerdown',event=>{if(!active()||!mobile()||!enabled()||event.button!==0||drag)return;cancelScene?.();const gap=parseFloat(getComputedStyle(workspace).rowGap)||0;drag={id:event.pointerId,y:event.clientY,value:shown,preference:value,available:rows(workspace.clientHeight-controls.offsetHeight-sceneActions.offsetHeight-gap*2,gap,divider.offsetHeight,shown).available};handle.setPointerCapture(event.pointerId);event.preventDefault();});
    handle.addEventListener('pointermove',event=>{if(!drag||drag.id!==event.pointerId)return;set(drag.value+(event.clientY-drag.y)/Math.max(1,drag.available)*100);event.preventDefault();});
    handle.addEventListener('pointerup',event=>{if(drag?.id===event.pointerId)stop(false);});
    handle.addEventListener('pointercancel',()=>stop(true));handle.addEventListener('lostpointercapture',event=>{if(drag?.id===event.pointerId)stop(true);});
    handle.addEventListener('keydown',event=>{const deltas={ArrowUp:-5,ArrowDown:5,ArrowLeft:-5,ArrowRight:5};if(!enabled()||!active()||!mobile()||!(event.key in deltas)&&!['Home','End','Enter'].includes(event.key))return;event.preventDefault();cancelScene?.();set(event.key==='Home'?25:event.key==='End'?75:event.key==='Enter'?40:shown+deltas[event.key]);});
    reset.onclick=()=>{if(!enabled())return;cancelScene?.();set(40);};
    const observer=new ResizeObserver(update);for(const node of [workspace,controls,sceneActions])observer.observe(node);window.addEventListener('resize',()=>{stop(true);update();});
    update();return{update};
  }
  return Object.freeze({rows,attach});
});
