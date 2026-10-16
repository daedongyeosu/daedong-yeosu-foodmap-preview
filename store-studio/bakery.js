(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShopStudioBakery=api;})(globalThis,function(){
  'use strict';
  const products=[
    {sku:'croissant',name:'버터 크루아상',price:3200,section:'갓 구운 빵',description:'겹겹이 바삭한 버터 크루아상. 시범매장용 AI 이미지와 예시 가격입니다.'},
    {sku:'bread',name:'시골 깜빠뉴',price:6500,section:'갓 구운 빵',description:'담백한 식사빵. 실제 판매상품이 아닌 꾸미기·장보기 체험용입니다.'},
    {sku:'cake',name:'딸기 생크림 케이크',price:32000,section:'케이크 & 디저트',description:'딸기와 크림으로 꾸민 예시 케이크. 실제 주문과 예약은 접수하지 않습니다.'},
    {sku:'sandwich',name:'햄치즈 샌드위치',price:6800,section:'샌드위치 & 커피',description:'채소와 햄치즈를 넣은 샌드위치의 AI 연출 이미지입니다.'},
    {sku:'coffee',name:'따뜻한 카푸치노',price:4500,section:'샌드위치 & 커피',description:'라테아트 카푸치노. 시범매장용 예시 가격입니다.'}
  ];
  function create(){
    const placements=[['croissant',8,36,13],['bread',22,34,15],['croissant',8,58,13],['bread',22,56,15],['cake',44,36,17],['cake',44,63,17],['sandwich',72,37,15],['coffee',82,62,12]];
    return {preset:'cafe',shopTitle:'골목의 빵집',zones:3,shelves:3,wall:'#f3e8d6',shelfColor:'#9e744b',material:'plain',light:105,catalogStoreId:'',sampleOnly:true,
      appearance:{font:'serif',signColor:'#faedcf',signBackground:'#193d42',floor:'#b7976d',awning:true,showShelves:false,showTags:true,zoneNames:['갓 구운 빵','케이크 & 디저트','샌드위치 & 커피']},
      business:{intro:'빵 고르는 시간이 즐거운 동네 베이커리. 매장 구경과 장바구니를 체험해 보세요. 실제 브랜드와 관계없는 가상의 시범매장입니다.',address:'가상의 시범매장 · 실제 방문 주소 없음',hours:'영업시간 예시 · 실제 영업하지 않습니다.',phone:'',mapUrl:'',orderUrl:'',delivery:'꾸미기와 장보기 체험용이며 실제 결제·배달은 발생하지 않습니다.',realPhoto:''},
      decor:[
        {id:'bakery-window',type:'window',text:'BAKED WITH CARE',x:4,y:31,width:29,height:43,color:'#c4a775'},
        {id:'bakery-rack',type:'rack',text:'오늘 구운 빵',x:4,y:31,width:35,height:54,color:'#90643d'},
        {id:'bakery-glass',type:'glass',text:'CAKE ATELIER',x:41,y:32,width:24,height:54,color:'#b49a74'},
        {id:'bakery-counter',type:'counter',text:'PICK UP · 포장하는 곳',x:68,y:77,width:28,height:17,color:'#264f4b'},
        {id:'bakery-board',type:'board',text:'작은 여유, 따뜻한 한 입',x:70,y:30,width:25,height:8,color:'#234944'},
        {id:'bakery-ledge',type:'ledge',text:'샌드위치 선반',x:69,y:57,width:26,height:5,color:'#9d784a'},
        {id:'bakery-plant',type:'plant',text:'초록 화분',x:1,y:72,width:6+4,height:22,color:'#32664a'}
      ].map(item=>({...item,locked:false,hidden:false})),
      items:placements.map(([sku,x,y,size],index)=>{const p=products.find(value=>value.sku===sku);return {id:`bakery-item-${index+1}`,name:p.name,description:p.description,section:p.section,decorId:{croissant:'bakery-rack',bread:'bakery-rack',cake:'bakery-glass',sandwich:'bakery-ledge',coffee:'bakery-counter'}[sku],demoSku:sku,demoPrice:p.price,src:`../assets/studio-bakery/${sku}.webp`,x,y,size,rotation:0,shadow:true,hidden:false,locked:false};})};
  }
  return Object.freeze({products,create});
});
