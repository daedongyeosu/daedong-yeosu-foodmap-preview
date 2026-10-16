/* Shared geometry for the 4:3 shop display. No browser or storage dependency. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShopStudioLayout=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  const ASPECT=4/3;
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
  function footprint(item){
    const radians=Number(item.rotation||0)*Math.PI/180;
    const extent=Math.abs(Math.cos(radians))+Math.abs(Math.sin(radians));
    const size=Number(item.size),height=size*ASPECT;
    return{width:size*extent,height:height*extent,offsetX:(size*extent-size)/2,offsetY:(height*extent-height)/2,baseHeight:height};
  }
  function bounded(item){
    const rotation=clamp(Number(item.rotation)||0,-45,45),radians=rotation*Math.PI/180;
    const maxSize=Math.min(45,74/(ASPECT*(Math.abs(Math.cos(radians))+Math.abs(Math.sin(radians)))));
    const next={...item,rotation,size:clamp(Number(item.size)||18,8,maxSize)};
    const f=footprint(next);
    next.x=clamp(Number(next.x)||0,f.offsetX,100-next.size-f.offsetX);
    next.y=clamp(Number(next.y)||20,20+f.offsetY,98-f.baseHeight-f.offsetY);
    return next;
  }
  function shelfLevels(count){return Array.from({length:clamp(Math.round(Number(count)||3),2,4)},(_,i)=>26+(i+1)*68/clamp(Math.round(Number(count)||3),2,4));}
  function onShelf(item,count){
    const next=bounded(item),f=footprint(next);
    const available=shelfLevels(count).filter(level=>level-f.baseHeight-f.offsetY>=20+f.offsetY-1e-8);
    if(!available.length)return next;
    const bottom=next.y+f.baseHeight+f.offsetY;
    const level=available.reduce((best,current)=>Math.abs(current-bottom)<Math.abs(best-bottom)?current:best);
    return bounded({...next,y:level-f.baseHeight-f.offsetY});
  }
  function rect(item){const f=footprint(item);return{left:item.x-f.offsetX,right:item.x+item.size+f.offsetX,top:item.y-f.offsetY,bottom:item.y+f.baseHeight+f.offsetY};}
  function overlaps(a,b){const x=rect(a),y=rect(b);return x.left<y.right+1&&x.right+1>y.left&&x.top<y.bottom+1&&x.bottom+1>y.top;}
  function arrange(items,zones=1,shelves=3){
    const moving=items.filter(item=>!item.locked&&!item.hidden),fixed=items.filter(item=>item.locked&&!item.hidden);
    if(!moving.length)return{ok:false,message:'정리할 사진이 없습니다. 숨김 또는 잠금 상태를 확인해 주세요.'};
    const zoneCount=clamp(Math.round(zones)||1,1,3),levels=shelfLevels(shelves);
    for(let columns=zoneCount;columns<=10;columns+=zoneCount){
      const cell=100/columns,size=Math.min(18,cell-3,(68/levels.length-3)/ASPECT);
      if(size<8)break;
      const slots=[];
      for(const level of levels)for(let column=0;column<columns;column++){
        const slot={x:column*cell+(cell-size)/2,y:level-size*ASPECT,size,rotation:0};
        if(!fixed.some(item=>overlaps(slot,item)))slots.push(slot);
      }
      if(slots.length<moving.length)continue;
      let index=0;
      return{ok:true,items:items.map(item=>item.locked||item.hidden?{...item}:{...item,...slots[index++]})};
    }
    return{ok:false,message:'이 배치에서는 사진이 겹치지 않게 들어갈 공간이 부족합니다. 진열장 단 수를 늘리거나 사진 일부를 숨겨 주세요.'};
  }
  return Object.freeze({ASPECT,footprint,bounded,shelfLevels,onShelf,arrange,overlaps});
});
