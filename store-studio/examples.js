(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./bakery.js'));else root.ShopStudioExamples=factory(root.ShopStudioBakery);})(globalThis,function(bakery){
  'use strict';
  const definitions={
    boutique:{name:'모퉁이 옷장',category:'옷가게',tagline:'나만의 취향을 차분히 걸어두는 곳',accent:'#815967',preset:'boutique',wall:'#eee2e6',floor:'#c6b5b4',sign:'#603d50',zones:['오늘의 옷','가방 & 소품'],
      products:[{sku:'blouse',name:'리넨 블라우스',price:39000,section:'오늘의 옷'},{sku:'bag',name:'브라운 크로스백',price:58000,section:'가방 & 소품'}],
      fixtures:[['mirror','전신 거울',6,32,14,52,'#c3a183'],['clothesrack','DAILY COLLECTION',22,32,38,46,'#987e6c'],['mannequin','수동 배치용 마네킹',31,34,14,49,'#c9b6a0'],['counter','작은 취향을 담아요',67,64,26,21,'#b48d97'],['board','나를 닮은 옷을 만나는 시간',63,33,31,12,'#735264'],['plant','초록 화분',4,72,10,22,'#5e7858']],
      placements:[['blouse',25,34,27,2],['bag',72,42,20,3]]},
    banchan:{name:'엄마손 반찬가게',category:'반찬가게',tagline:'오늘 저녁 식탁을 따뜻하게 채워요',accent:'#55734e',preset:'market',wall:'#f0e7cf',floor:'#b59972',sign:'#47613d',zones:['맛깔난 김치','든든한 나물'],
      products:[{sku:'kimchi',name:'배추김치 한 팩',price:7000,section:'맛깔난 김치'},{sku:'namul',name:'삼색나물 한 팩',price:6000,section:'든든한 나물'}],
      fixtures:[['board','오늘도 정성껏 준비했어요',14,32,72,10,'#526944'],['glass','김치 진열장',5,47,43,35,'#aa8a5f'],['glass','오늘의 나물',52,47,43,35,'#aa8a5f'],['counter','포장·픽업하는 곳',18,83,64,12,'#6f8050'],['plant','작은 화분',2,74,10,22,'#517b4b']],
      placements:[['kimchi',9,47,17,1],['kimchi',29,47,17,1],['namul',56,47,17,2],['namul',76,47,17,2]]},
    hardware:{name:'든든 철물상회',category:'철물점',tagline:'필요한 공구를 한눈에, 규격은 또렷하게',accent:'#3c5964',preset:'hardware',wall:'#d9e0df',floor:'#9daba8',sign:'#233e49',zones:['손공구','절단 공구'],
      products:[{sku:'hammer',name:'장도리 망치',price:12000,section:'손공구'},{sku:'saw',name:'목공용 손톱',price:15000,section:'절단 공구'}],
      fixtures:[['pegboard','HAND TOOLS',5,33,43,46,'#6c827f'],['pegboard','CUTTING TOOLS',52,33,43,46,'#6c827f'],['bin','부품·소모품 진열',5,82,43,13,'#637876'],['counter','공구 상담·픽업',55,82,40,13,'#3c5861']],
      placements:[['hammer',15,36,24,0],['saw',60,37,27,1]]}
  };
  function create(id){
    if(id==='bakery')return bakery.create();if(!Object.hasOwn(definitions,id))return null;const d=definitions[id];
    const scene=bakery.create();Object.assign(scene,{preset:d.preset,shopTitle:d.name,zones:2,wall:d.wall,light:105,material:id==='banchan'?'tile':'plain',catalogStoreId:'',sampleOnly:true});
    scene.appearance={...scene.appearance,signBackground:d.sign,signColor:'#fff7e8',floor:d.floor,font:id==='hardware'?'sans':id==='boutique'?'serif':'rounded',awning:id==='banchan',zoneNames:[...d.zones,'기타 상품']};
    scene.business={...scene.business,intro:`${d.tagline}. 실제 브랜드·가게와 무관한 시범매장입니다.`,address:'가상 시범매장 · 실제 방문 주소 없음'};
    scene.decor=d.fixtures.map(([type,text,x,y,width,height,color],index)=>({id:`${id}-fixture-${index}`,type,text,x,y,width,height,color,locked:false,hidden:false}));
    scene.items=d.placements.map(([sku,x,y,size,parent],index)=>{const p=d.products.find(value=>value.sku===sku);return {id:`${id}-product-${index}`,name:p.name,description:'AI 연출 이미지와 예시 가격을 사용하는 시범 상품입니다. 실제 주문·결제·배송은 발생하지 않습니다.',section:p.section,demoSku:sku,demoPrice:p.price,decorId:scene.decor[parent].id,src:`../assets/studio-alley/${sku}.webp`,x,y,size,rotation:0,shadow:true,locked:false,hidden:false};});return scene;
  }
  const all=[{id:'bakery',name:'골목의 빵집',category:'베이커리',tagline:'빵 고르는 시간이 즐거운 작은 가게',accent:'#244f49',products:bakery.products},...Object.entries(definitions).map(([id,d])=>({id,name:d.name,category:d.category,tagline:d.tagline,accent:d.accent,products:d.products}))];
  function get(id){const entry=all.find(item=>item.id===id);return entry?{...entry,create:()=>create(id)}:null;}
  function template(id){const scene=create(id);if(!scene)return null;return {...scene,shopTitle:'내 상점 이름',sampleOnly:false,items:[],catalogStoreId:'',business:{intro:'',address:'',hours:'',phone:'',mapUrl:'',orderUrl:'',delivery:'',realPhoto:''}};}
  const draftKey=id=>get(id)?id==='bakery'?'scene-bakery-example-v1':`scene-${id}-example-v1`:'scene';
  return Object.freeze({all,get,template,draftKey});
});
