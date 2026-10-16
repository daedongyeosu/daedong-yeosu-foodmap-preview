(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShopStudioDesign=api;})(globalThis,function(){
  'use strict';
  const types={rack:'나무 진열장',glass:'유리 쇼케이스',ledge:'벽 선반',counter:'계산·픽업대',board:'안내판',window:'창문',plant:'화분',clothesrack:'옷걸이 행거',mannequin:'수동 배치 마네킹',mirror:'전신 거울',pegboard:'벽걸이 공구판',bin:'부품 진열함'};
  const groups={all:'전체',cafe:'카페·베이커리',market:'음식점·시장',fashion:'의류·잡화',beauty:'미용·뷰티',hardware:'철물·공구',common:'공통·장식'};
  const catalog={};
  for(const [type,label] of Object.entries(types))catalog[type]={type,label,group:['clothesrack','mannequin','mirror'].includes(type)?'fashion':['pegboard','bin'].includes(type)?'hardware':'common',width:30,height:30,color:'#87613e',accent:'#ead9ba',modern:false};
  const additions=[
    ['table','원형 테이블','cafe',28,22],['chair','카페 의자','cafe',15,28],['stool','높은 스툴','cafe',14,23],['coffeebar','커피 바','cafe',44,28],['pastrycase','경사형 빵 쇼케이스','cafe',40,27],['menuboard','입간판 메뉴보드','cafe',18,34],
    ['producecrate','과일·채소 나무상자','market',27,20],['basket','장보기 바구니','market',20,20],['refrigerator','음료 냉장고','market',21,48],['freezer','뚜껑형 냉동고','market',39,24],['meatcase','정육·반찬 냉장대','market',44,28],['breadbasket','바게트 진열 바구니','market',20,27],
    ['wallrail','벽면 의류 행거','fashion',34,30],['foldedtable','의류 접이 진열대','fashion',34,25],['shoerack','신발 진열장','fashion',25,37],['jewelrycase','액세서리 쇼케이스','fashion',30,26],['fittingroom','커튼 피팅룸','fashion',27,50],['hatstand','모자·가방 스탠드','fashion',18,40],
    ['salonchair','미용 의자','beauty',22,31],['vanity','조명 거울 화장대','beauty',29,46],['washbasin','샴푸대','beauty',27,27],['naildesk','네일 작업대','beauty',35,24],['cosmeticrack','화장품 진열장','beauty',27,40],['towelrack','수건 정리장','beauty',23,35],
    ['workbench','공구 작업대','hardware',39,29],['toolbox','이동식 공구함','hardware',25,30],['partsdrawer','소형 부품 서랍장','hardware',31,31],['ladder','사다리 진열대','hardware',22,44],['gridwall','메시 철망 진열벽','hardware',35,42],['utilitycart','운반 카트','hardware',30,27],
    ['pendant','펜던트 조명 장식','common',22,27],['walllamp','벽등 장식','common',16,24],['frame','포스터 액자','common',24,30],['rug','패턴 러그','common',40,15],['partition','장식 파티션','common',30,44],['flowers','꽃병·꽃 장식','common',20,27]
  ];
  const palettes={cafe:['#8e603e','#e9c58b'],market:['#547857','#e8cf8d'],fashion:['#a37b87','#eadce2'],beauty:['#c58c8b','#f5e1bb'],hardware:['#46646d','#d6a85a'],common:['#81745f','#ead5a8']};
  for(const [type,label,group,width,height] of additions){types[type]=label;catalog[type]={type,label,group,width,height,color:palettes[group][0],accent:palettes[group][1],modern:true};}
  function findDecor(query='',group='all'){const needle=String(query).trim().toLocaleLowerCase('ko-KR');return Object.values(catalog).filter(item=>(group==='all'||item.group===group)&&(!needle||(item.label+' '+groups[item.group]).toLocaleLowerCase('ko-KR').includes(needle)));}
  function createDecor(type,id){const item=Object.hasOwn(catalog,type)?catalog[type]:catalog.rack;return decor({...item,id,text:item.label,x:(100-item.width)/2,y:Math.min(48,98-item.height)});}
  const assets=[...['croissant','bread','cake','sandwich','coffee'].map(name=>`../assets/studio-bakery/${name}.webp`),...['blouse','bag','kimchi','namul','hammer','saw'].map(name=>`../assets/studio-alley/${name}.webp`)];
  const clamp=(value,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(value))?Number(value):min));
  const color=(value,fallback)=>/^#[\da-f]{6}$/i.test(value)?value:fallback;
  const image=value=>typeof value==='string'&&(assets.includes(value)||/^data:image\/(webp|png|jpeg);base64,[a-z\d+/=]+$/i.test(value)&&value.length<=2000000);
  const cabinetTypes=['shoerack','cosmeticrack','towelrack','jewelrycase','partsdrawer','toolbox','refrigerator','freezer'];
  function cabinet(value){if(!value||typeof value!=='object')return null;return{rows:Math.round(clamp(value.rows,1,6)),columns:Math.round(clamp(value.columns,1,6)),doors:['none','glass','solid'].includes(value.doors)?value.doors:'none',handle:['none','bar','knob'].includes(value.handle)?value.handle:'bar',back:value.back!==false};}
  function decor(value){
    const type=Object.hasOwn(types,value?.type)?value.type:'rack',width=clamp(value?.width,10,90),height=clamp(value?.height,5,65);
    return {id:String(value?.id||'').slice(0,80),type,text:String(value?.text??types[type]).slice(0,80),color:color(value?.color,'#87613e'),accent:color(value?.accent,'#ead9ba'),finish:['plain','wood','metal','fabric'].includes(value?.finish)?value.finish:'plain',showLabel:value?.showLabel!==false,cabinet:cabinetTypes.includes(type)?cabinet(value?.cabinet):null,width,height,x:clamp(value?.x,0,100-width),y:clamp(value?.y,18,98-height),locked:value?.locked===true,hidden:value?.hidden===true};
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
    if(value.scene.decor&&!Array.isArray(value.scene.decor)||value.scene.decor?.length>60)throw new Error('가구는 60개까지 복원할 수 있습니다.');
    return value.scene;
  }
  function translateMany(fixtures,items,ids,dx,dy,geometry){
    const selected=fixtures.filter(item=>ids.includes(item.id));let x=dx,y=dy;
    for(const fixture of selected){const result=translate(fixture,items,dx,dy,geometry);if(result.blocked)return{blocked:true,fixtures,items};const ax=result.fixture.x-fixture.x,ay=result.fixture.y-fixture.y;x=dx>=0?Math.min(x,ax):Math.max(x,ax);y=dy>=0?Math.min(y,ay):Math.max(y,ay);}
    let movedItems=items.map(item=>({...item}));const moved=fixtures.map(fixture=>{if(!ids.includes(fixture.id))return{...fixture};const result=translate(fixture,movedItems,x,y,geometry);movedItems=result.items;return result.fixture;});return{blocked:false,fixtures:moved,items:movedItems};
  }
  return Object.freeze({types,catalog,groups,findDecor,createDecor,cabinetTypes,cabinet,assets,color,image,decor,appearance,translate,translateMany,validateImport});
});
