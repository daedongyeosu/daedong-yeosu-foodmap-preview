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
  return Object.freeze({clean,create,instantiate,importFile,builtins});
});
