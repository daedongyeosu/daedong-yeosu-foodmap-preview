(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./design.js'):root.ShopStudioDesign);if(typeof module==='object'&&module.exports)module.exports=api;else root.ShopStudioComposition=api;})(globalThis,function(design){
  'use strict';
  function clean(value,id){
    if(!value||typeof value.name!=='string'||!value.name.trim()||!Array.isArray(value.decor)||!value.decor.length||value.decor.length>20)throw Error('세트 이름과 가구 1~20개를 확인해 주세요.');
    if(value.decor.some(item=>!item||!Object.hasOwn(design.types,item.type)))throw Error('지원하는 가구로 만든 세트만 가져올 수 있습니다.');
    return{id,name:value.name.trim().slice(0,40),decor:value.decor.map((item,index)=>design.decor({...item,id:'piece-'+index,locked:false,hidden:false}))};
  }
  function create(name,fixtures,ids,id){return clean({name,decor:fixtures.filter(item=>ids.includes(item.id))},id);}
  function instantiate(value,newId){
    const set=clean(value,'copy'),right=Math.max(...set.decor.map(item=>item.x+item.width)),bottom=Math.max(...set.decor.map(item=>item.y+item.height));
    const dx=Math.min(4,100-right),dy=Math.min(3,98-bottom);
    return set.decor.map(item=>design.decor({...item,id:newId(),x:item.x+dx,y:item.y+dy}));
  }
  function importFile(value,newId){if(value?.format!=='matjido-furniture-sets'||value.version!==1||!Array.isArray(value.sets)||!value.sets.length||value.sets.length>12)throw Error('맛지도 가구 세트 파일을 선택해 주세요.');return value.sets.map(item=>clean(item,newId()));}
  function builtin(name,pieces){return clean({name,decor:pieces.map(([type,x,y,width,height,cabinet],i)=>({...design.createDecor(type,'piece-'+i),x,y,width,height,cabinet}))},'builtin-'+name);}
  const builtins=[builtin('테이크아웃 코너',[['coffeebar',8,56,38,30],['menuboard',51,40,17,43],['flowers',75,56,17,27]]),builtin('의류 진열 코너',[['wallrail',8,30,35,40],['shoerack',51,32,25,50,{rows:4,columns:2,doors:'none',handle:'none',back:true}],['mirror',79,30,17,51]]),builtin('미용 작업 코너',[['vanity',8,26,31,54],['salonchair',42,55,22,29],['cosmeticrack',71,32,22,49,{rows:4,columns:2,doors:'glass',handle:'bar',back:true}]])];
  function arrange(fixtures,items,ids,mode,geometry){
    const selected=fixtures.filter(item=>ids.includes(item.id));
    const spacing=mode==='spaceX'||mode==='spaceY';
    if(!['left','right','top','bottom','centerX','centerY','spaceX','spaceY'].includes(mode)||selected.length<(spacing?3:2))return{ok:false,message:spacing?'같은 간격 배치는 가구를 3개 이상 선택해 주세요.':'정렬할 가구를 2개 이상 선택해 주세요.'};
    if(selected.some(i=>i.locked||i.hidden)||items.some(i=>ids.includes(i.decorId)&&i.locked))return{ok:false,message:'선택한 가구의 숨김·위치 잠금과 연결된 사진의 위치 잠금을 먼저 풀어 주세요.'};
    const horizontal=['left','right','centerX','spaceX'].includes(mode),axis=horizontal?'x':'y',size=horizontal?'width':'height';
    const start=Math.min(...selected.map(i=>i[axis])),end=Math.max(...selected.map(i=>i[axis]+i[size])),targets=new Map();
    if(spacing){
      const ordered=[...selected].sort((a,b)=>a[axis]-b[axis]||a.id.localeCompare(b.id)),gap=(end-start-ordered.reduce((sum,i)=>sum+i[size],0))/(selected.length-1);
      if(gap< -1e-7)return{ok:false,message:'선택한 가구가 들어갈 간격이 부족합니다. 가구 크기를 줄이거나 양끝 가구를 더 벌려 주세요.'};
      let position=start;for(const item of ordered){targets.set(item.id,position);position+=item[size]+Math.max(0,gap);}
    }else for(const item of selected)targets.set(item.id,['left','top'].includes(mode)?start:['right','bottom'].includes(mode)?end-item[size]:(start+end-item[size])/2);
    let photos=items.map(i=>({...i}));const moved=new Map();
    for(const item of selected){const delta=targets.get(item.id)-item[axis],result=design.translate(item,photos,horizontal?delta:0,horizontal?0:delta,geometry);
      if(result.blocked||Math.abs(result.fixture[axis]-targets.get(item.id))>1e-6)return{ok:false,message:'연결된 사진이 공간 밖으로 나가므로 정렬하지 않았습니다. 사진 위치나 가구 구성을 조정해 주세요.'};
      moved.set(item.id,result.fixture);photos=result.items;
    }
    return{ok:true,fixtures:fixtures.map(i=>moved.get(i.id)||{...i}),items:photos};
  }
  return Object.freeze({clean,create,instantiate,importFile,builtins,arrange});
});
