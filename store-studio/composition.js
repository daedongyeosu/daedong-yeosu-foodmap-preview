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
  const palettes=[
    {name:'따뜻한 오크',color:'#986641',accent:'#f1d9a5',finish:'wood'},
    {name:'숲속 가게',color:'#315b49',accent:'#e1cfa5',finish:'wood'},
    {name:'크림 베이커리',color:'#c29b71',accent:'#fff2d4',finish:'plain'},
    {name:'로즈 부티크',color:'#ae7789',accent:'#f5e0e6',finish:'fabric'},
    {name:'바닷빛 상점',color:'#356b82',accent:'#d4ebe8',finish:'plain'},
    {name:'차콜 스튜디오',color:'#353d46',accent:'#d6b477',finish:'metal'},
    {name:'라벤더 소품점',color:'#88749f',accent:'#eee0af',finish:'fabric'},
    {name:'오렌지 공방',color:'#b96637',accent:'#e7d3a7',finish:'metal'}
  ];
  function styleSelection(fixtures,ids,values,fields){
    const selected=fixtures.filter(i=>ids.includes(i.id)),keys=['color','accent','finish'].filter(k=>fields.includes(k));
    if(!selected.length||!keys.length)return{ok:false,message:'가구와 바꿀 항목을 하나 이상 선택해 주세요.'};
    if(keys.some(k=>k==='finish'?!['plain','wood','metal','fabric'].includes(values[k]):!/^#[a-f0-9]{6}$/i.test(values[k])))return{ok:false,message:'색상과 재질을 다시 확인해 주세요.'};
    let changed=0,limited=0;
    const result=fixtures.map(item=>{if(!ids.includes(item.id))return{...item};const next={...item},modern=design.catalog[item.type]?.modern;
      for(const key of keys){if(key!=='color'&&!modern){limited++;continue;}if(next[key]!==values[key]){next[key]=values[key];changed++;}}
      return next;
    });
    return{ok:true,fixtures:result,changed,limited,count:selected.length};
  }
  function captureStyle(item){
    if(!item||!Object.hasOwn(design.types,item.type))return null;const safe=design.decor(item),style={color:safe.color,showLabel:safe.showLabel};
    if(design.catalog[item.type].modern)Object.assign(style,{accent:safe.accent,finish:safe.finish});return style;
  }
  function pasteStyle(fixtures,ids,style){
    if(!style||typeof style.showLabel!=='boolean')return{ok:false,message:'먼저 가구의 스타일을 복사해 주세요.'};
    const result=styleSelection(fixtures,ids,style,['color',...['accent','finish'].filter(key=>Object.hasOwn(style,key))]);if(!result.ok)return result;
    result.fixtures=result.fixtures.map(item=>{if(!ids.includes(item.id))return item;if(item.showLabel!==style.showLabel)result.changed++;return{...item,showLabel:style.showLabel};});return result;
  }
  function findPlaced(fixtures,query='',mode='all'){
    const needle=String(query).trim().toLocaleLowerCase('ko-KR');
    return fixtures.filter(item=>(mode==='hidden'?item.hidden:mode==='visible'?!item.hidden:mode==='locked'?item.locked:true)&&(!needle||`${design.types[item.type]||''} ${item.text||''}`.toLocaleLowerCase('ko-KR').includes(needle)));
  }
  function findPhotos(items,query='',purpose='all',mode='all'){
    const needle=String(query).trim().toLocaleLowerCase('ko-KR');
    return items.filter(item=>(purpose==='decoration'?item.purpose==='decoration':purpose==='product'?item.purpose!=='decoration':true)&&(mode==='hidden'?item.hidden:mode==='visible'?!item.hidden:mode==='locked'?item.locked:true)&&(!needle||`${item.name||''} ${item.section||''}`.toLocaleLowerCase('ko-KR').includes(needle)));
  }
  function photoBatch(items,ids,key,value){
    if(!['locked','hidden','section'].includes(key)||key==='section'&&typeof value!=='string'||key!=='section'&&typeof value!=='boolean')return{ok:false,message:'바꿀 사진 설정을 확인해 주세요.'};
    const selected=items.filter(i=>ids.includes(i.id));if(!selected.length)return{ok:false,message:'검색 결과에 적용할 사진이 없습니다.'};
    const next=key==='section'?value.trim().slice(0,24):value;let changed=0;
    const updated=items.map(i=>{if(!ids.includes(i.id))return{...i};if(i[key]!==next)changed++;return{...i,[key]:next};});return{ok:true,count:selected.length,items:updated,changed};
  }
  return Object.freeze({clean,create,instantiate,importFile,builtins,arrange,palettes,styleSelection,captureStyle,pasteStyle,findPlaced,findPhotos,photoBatch});
});
