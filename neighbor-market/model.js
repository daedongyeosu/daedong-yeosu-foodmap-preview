(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.NeighborMarket=api;})(globalThis,function(){
  'use strict';
  const FORMAT='matjido-neighbor-market',DB='matjido-neighbor-market-preview-v1',KEY='owner-draft',MAX=20;
  const themes={attic:{label:'빈티지 보물창고',wall:'#ece2cd',wood:'#9b704b',accent:'#9b4b32'},bookshop:{label:'햇살 드는 책방',wall:'#e4e7d7',wood:'#a18560',accent:'#526c53'},closet:{label:'나만의 작은 옷장',wall:'#ede0dc',wood:'#b18a74',accent:'#8c5362'},blue:{label:'푸른 골목 소품방',wall:'#e0e7e5',wood:'#89938a',accent:'#3f656b'}};
  const assets=['camera','books','bag'].map(name=>'../assets/neighbor-market/'+name+'.webp').concat(['../assets/studio-alley/blouse.webp','../assets/studio-alley/hammer.webp','../assets/studio-alley/bag.webp']);
  const decorTypes=['basket','flowers','rug','frame','pendant','producecrate'];
  const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number.isFinite(Number(v))?Number(v):min));
  const text=(v,n)=>typeof v==='string'?v.slice(0,n):'';
  const color=(v,fallback)=>/^#[\da-f]{6}$/i.test(v)?v:fallback;
  function price(value){const raw=typeof value==='number'?String(value):typeof value==='string'?value.trim():'';if(!/^\d{1,8}$/.test(raw))return null;const n=Number(raw);return Number.isSafeInteger(n)&&n<=99999999?n:null;}
  const image=src=>typeof src==='string'&&(assets.includes(src)||/^data:image\/(webp|jpeg|png);base64,[a-z\d+/=]+$/i.test(src)&&src.length<=1500000);
  function blank(){return{format:FORMAT,version:1,name:'나의 이웃장터',theme:'attic',wall:themes.attic.wall,wood:themes.attic.wood,accent:themes.attic.accent,finish:'wood',brightness:100,tags:true,items:[],decor:[]};}
  function position(item){const width=clamp(item.size,12,36);return{...item,size:width,x:clamp(item.x,0,100-width),y:clamp(item.y,19,96-width*.9)};}
  function clean(raw){
    if(raw?.format!==FORMAT||raw.version!==1||!Array.isArray(raw.items)||raw.items.length>MAX||!Array.isArray(raw.decor)||raw.decor.length>12)throw Error('이웃장터 시안 형식이 다릅니다. 기존 자료는 바꾸지 않았습니다.');
    const theme=Object.hasOwn(themes,raw.theme)?raw.theme:'attic',base=themes[theme],ids=new Set();
    const items=raw.items.map((item,index)=>{if(!item||!image(item.src)||typeof item.id!=='string'||!/^[a-z\d_-]{1,80}$/i.test(item.id)||ids.has(item.id)||price(item.price)===null)throw Error('사진·가격·물건 번호를 확인해 주세요.');ids.add(item.id);return position({id:item.id,name:text(item.name,40).trim()||'내 물건 '+(index+1),src:item.src,price:price(item.price),note:text(item.note,300),condition:['good','used','worn'].includes(item.condition)?item.condition:'unspecified',sample:item.sample===true,sold:item.sold===true,locked:item.locked===true,size:item.size??24,x:item.x??8,y:item.y??30});});
    const decor=raw.decor.map(d=>{if(!decorTypes.includes(d?.type)||typeof d.id!=='string'||!/^[a-z\d_-]{1,80}$/i.test(d.id)||ids.has(d.id))throw Error('장식 번호를 확인해 주세요.');ids.add(d.id);const size=clamp(d.size,12,36);return{id:d.id,type:d.type,size,x:clamp(d.x,0,100-size),y:clamp(d.y,19,96-size*.9),locked:d.locked===true};});
    return{...blank(),name:text(raw.name,40).trim()||'나의 이웃장터',theme,wall:color(raw.wall,base.wall),wood:color(raw.wood,base.wood),accent:color(raw.accent,base.accent),finish:['wood','plain','linen'].includes(raw.finish)?raw.finish:'wood',brightness:clamp(raw.brightness??100,80,115),tags:raw.tags!==false,items,decor};
  }
  function arrange(scene){const moving=scene.items.filter(item=>!item.locked);if(!moving.length)return scene;const fixed=scene.items.filter(item=>item.locked);let slots=[];
    const overlaps=(a,b)=>a.x<b.x+b.size+1&&a.x+a.size+1>b.x&&a.y<b.y+b.size*.9+1&&a.y+a.size*.9+1>b.y;
    for(const y of [31,66])for(const x of [6,38,70]){const slot={x,y,size:24};if(!fixed.some(item=>overlaps(slot,item)))slots.push(slot);}
    if(slots.length<moving.length){slots=[];for(const y of [24,42,60,77])for(const x of [2,22,42,62,82]){const slot={x,y,size:16};if(!fixed.some(item=>overlaps(slot,item)))slots.push(slot);}}
    if(slots.length<moving.length)throw Error('잠근 물건을 그대로 두고 정리할 공간이 부족합니다. 잠금을 풀거나 직접 옮겨 주세요.');
    let index=0;return{...scene,items:scene.items.map(item=>item.locked?{...item}:{...item,...slots[index++]})};
  }
  function applyTheme(scene,id){if(!Object.hasOwn(themes,id))return scene;return{...scene,theme:id,...Object.fromEntries(['wall','wood','accent'].map(key=>[key,themes[id][key]]))};}
  function example(){const scene=blank();scene.name='모퉁이 보물상자';scene.items=[['camera','작은 필름카메라',38000,'레트로한 분위기의 카메라입니다. 작동·흠집 설명을 적는 위치의 예시예요.'],['books','다시 읽는 책 세 권',9000,'책 세 권을 한 묶음으로 올린 견본입니다.'],['bag','손때 묻은 캔버스백',12000,'가벼운 사용감이 있는 가방을 표현한 견본입니다.'],['blouse','햇살빛 리넨 셔츠',15000,'옷의 치수·오염·수선 여부를 적어보세요.'],['hammer','아버지의 작은 망치',6000,'공구의 상태와 사용 흔적을 설명하는 예시입니다.'],['leatherbag','갈색 크로스백',18000,'소품도 내 취향대로 진열할 수 있어요.']].map(([asset,name,price,note],index)=>({id:'sample-'+index,name,price,note,src:assets[index],condition:'used',sample:true,sold:false,locked:false,size:24,x:[6,38,70][index%3],y:index<3?31:66}));return scene;}
  function validateEntries(entries){if(!entries.length||entries.length>MAX)throw Error('사진을 1~20장 선택해 주세요.');return entries.map((item,index)=>{const p=price(item.price);if(p===null)throw Error((index+1)+'번째 물건의 가격을 원 단위 숫자로 입력해 주세요. 0원은 무료 나눔입니다.');return{...item,price:p,name:text(item.name,40).trim()||'내 물건 '+(index+1)};});}
  function basket(scene,ids){const items=scene.items.filter(item=>ids.has(item.id)&&!item.sold);return{items,total:items.reduce((sum,item)=>sum+item.price,0)};}
  return Object.freeze({FORMAT,DB,KEY,MAX,themes,assets,decorTypes,price,image,blank,position,clean,arrange,applyTheme,example,validateEntries,basket});
});
