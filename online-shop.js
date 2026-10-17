(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MatjidoOnlineShop=api;})(globalThis,function(){
  'use strict';
  const host='https://daedong-yeosu-admin.sisakim.chatgpt.site';
  const endpoint=host+'/api/online-shops';
  const id=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value)?value:'';
  function hash(value){let n=14695981039346656037n;for(const byte of new TextEncoder().encode(value))n=BigInt.asUintN(64,(n^BigInt(byte))*1099511628211n);return n.toString(16);}
  function image(value,base){try{const u=new URL(value,base);return value&&u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
  function importStore(sourceId,detail,menu,base){
    if(!id(sourceId)||!detail||String(detail.id||detail.store_id||detail.storeId)!==sourceId||!String(detail.name||detail.storeName||'').trim())throw Error('기존 가게 정보를 확인하지 못했습니다.');
    if(!menu||String(menu.storeId||menu.store_id||'')!==sourceId||!Array.isArray(menu.items))throw Error('이 가게의 메뉴를 확인하지 못했습니다. 다시 불러와 주세요.');
    if(menu.items.length>500)throw Error('메뉴가 500개를 넘습니다. 나누어 가져오기가 필요합니다.');
    const seen=new Set();
    const products=menu.items.map((item,index)=>{
      const sourceMenuId=String(item.id||item.menuId||JSON.stringify([item.category||'',item.name||'',item.options||[],item.variants||[]])),productId='menu-'+hash(sourceMenuId);
      if(!item||!String(item.name||'').trim()||seen.has(sourceMenuId))throw Error('메뉴 이름이나 중복 번호를 확인해 주세요.');
      seen.add(sourceMenuId);
      return {id:productId,sourceMenuId,name:String(item.name).trim(),description:String(item.description||''),category:String(item.category||''),image:image(item.image,base),price:null,unit:'개',stockMode:'판매 가능',stockQuantity:null,source:'existing-menu',hasPhoto:Boolean(image(item.image,base)),priceConfirmed:false};
    });
    return {storeId:'shop-'+sourceId,sourceStoreId:sourceId,storeName:String(detail.name||detail.storeName),category:String(detail.category||detail.cat||'기타 상점'),address:String(detail.address||''),phone:String(detail.phone||''),products,subsidy:0,minimumOrder:0,deliveryCostSharing:{mode:'ratio',customerPercent:100,stepWon:100},theme:'실제 가게와 비슷하게',productMethod:'휴대전화로 직접 등록',previewOnly:true};
  }
  async function publicShop(sourceId){
    if(!id(sourceId))throw Error('가게 번호를 확인해 주세요.');
    const response=await fetch(endpoint+'/public/'+encodeURIComponent(sourceId),{credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(response.status===404)return null;
    if(!response.ok)throw Error('공개 상점 확인에 실패했습니다.');
    const result=await response.json();if(result.sourceStoreId!==sourceId||result.published!==true||!Array.isArray(result.shop?.products))throw Error('공개 상점 정보가 올바르지 않습니다.');return result;
  }
  function route(sourceId,base){if(!id(sourceId))return '';const url=new URL('online-store/index.html',base);url.searchParams.set('publicShop',sourceId);return url.href;}
  async function card(target,sourceId){
    if(!target||!id(sourceId))return;
    target.replaceChildren();
    const a=document.createElement('a');a.className='online-shop-owner-link';a.href=new URL('store-partner/index.html?sourceStore='+encodeURIComponent(sourceId),document.baseURI).href;a.textContent='사장님이신가요? 온라인 상점 등록하기';target.append(a);
    try{const result=await publicShop(sourceId);if(!target.isConnected)return;if(result){const link=document.createElement('a');link.className='detail-route online-shop-public-link';link.href=route(sourceId,document.baseURI);link.innerHTML='<span aria-hidden="true">🏪</span><span>온라인 상점 보기</span><b aria-hidden="true">›</b>';link.setAttribute('aria-label','온라인 상점 보기');target.prepend(link);}}catch{/* A failed lookup never exposes a draft or removes existing order routes. */}
  }
  return Object.freeze({host,endpoint,id,image,importStore,publicShop,route,card});
});
