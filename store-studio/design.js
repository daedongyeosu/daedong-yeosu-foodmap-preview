(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShopStudioDesign=api;})(globalThis,function(){
  'use strict';
  const types={rack:'나무 진열장',glass:'유리 쇼케이스',ledge:'벽 선반',counter:'계산·픽업대',board:'안내판',window:'창문',plant:'화분'};
  const assets=['croissant','bread','cake','sandwich','coffee'].map(name=>`../assets/studio-bakery/${name}.webp`);
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):min));
  const color=(value,fallback)=>/^#[\da-f]{6}$/i.test(value)?value:fallback;
  const image=value=>typeof value==='string'&&(assets.includes(value)||/^data:image\/(webp|png|jpeg);base64,[a-z\d+/=]+$/i.test(value)&&value.length<=2000000);
  function decor(value){
    const type=Object.hasOwn(types,value?.type)?value.type:'rack',width=clamp(value?.width,10,90),height=clamp(value?.height,5,65);
    return {id:String(value?.id||'').slice(0,80),type,text:String(value?.text||types[type]).slice(0,80),color:color(value?.color,'#87613e'),width,height,x:clamp(value?.x,0,100-width),y:clamp(value?.y,18,98-height),locked:value?.locked===true,hidden:value?.hidden===true};
  }
  function appearance(value={}){value=value&&typeof value==='object'?value:{};return {signColor:color(value.signColor,'#f5ead6'),signBackground:color(value.signBackground,'#193d42'),floor:color(value.floor,'#c5ac88'),font:['serif','sans','rounded'].includes(value.font)?value.font:'serif',awning:value.awning===true,showShelves:value.showShelves!==false,showTags:value.showTags===true,zoneNames:[0,1,2].map(i=>String(value.zoneNames?.[i]||`구역 ${i+1}`).slice(0,24))};}
  function translate(fixture,items,dx,dy,geometry){
    const attached=items.filter(item=>item.decorId===fixture.id);
    if(fixture.locked||attached.some(item=>item.locked))return {blocked:true,fixture:{...fixture},items:items.map(item=>({...item}))};
    let left=-fixture.x,right=100-fixture.width-fixture.x,top=18-fixture.y,bottom=98-fixture.height-fixture.y;
    for(const item of attached){const f=geometry.footprint(item);left=Math.max(left,f.offsetX-item.x);right=Math.min(right,100-item.size-f.offsetX-item.x);top=Math.max(top,20+f.offsetY-item.y);bottom=Math.min(bottom,98-f.baseHeight-f.offsetY-item.y);}
    const x=clamp(dx,left,right),y=clamp(dy,top,bottom);
    return {blocked:false,fixture:{...fixture,x:fixture.x+x,y:fixture.y+y},items:items.map(item=>item.decorId===fixture.id?{...item,x:item.x+x,y:item.y+y}:{...item})};
  }
  function validateImport(value){
    if(value?.format!=='matjido-studio'||value.version!==1||!value.scene||!Array.isArray(value.scene.items)||value.scene.items.length>40)throw new Error('맛지도에서 내려받은 시안 파일을 선택해 주세요.');
    if(value.scene.items.some(item=>!item||!image(item.src)))throw new Error('사진 형식이 올바르지 않거나 사진이 너무 큽니다.');
    if(value.scene.decor&&!Array.isArray(value.scene.decor)||value.scene.decor?.length>30)throw new Error('가구는 30개까지 복원할 수 있습니다.');
    return value.scene;
  }
  return Object.freeze({types,assets,color,image,decor,appearance,translate,validateImport});
});
