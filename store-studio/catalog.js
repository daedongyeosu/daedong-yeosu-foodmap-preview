(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShopStudioCatalog=api;})(globalThis,function(){
  'use strict';
  const endpoint='https://daedong-yeosu-admin.sisakim.chatgpt.site/api/store-orders/preview/catalog';
  const id=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value)?value:'';
  function products(result){
    if(!Array.isArray(result?.products)||result.products.length>500)throw new Error('catalog-invalid');
    const seen=new Set();
    return result.products.map(item=>{
      if(!id(item?.id)||seen.has(item.id)||typeof item.name!=='string'||!item.name.trim()||!Number.isSafeInteger(item.price)||item.price<0)throw new Error('catalog-invalid');
      if(item.stockMode==='수량 관리'&&(!Number.isSafeInteger(item.stockQuantity)||item.stockQuantity<0))throw new Error('stock-invalid');
      seen.add(item.id);return {...item};
    });
  }
  function available(item){return Boolean(item&&item.price>0&&!item.inquiryOnly&&['판매 가능','수량 관리'].includes(item.stockMode)&&(item.stockMode!=='수량 관리'||item.stockQuantity>0));}
  function route(storeId,productId,base){
    if(!id(storeId)||!id(productId))return '';
    const url=new URL('../online-store/index.html',base);url.searchParams.set('catalogStore',storeId);url.searchParams.set('product',productId);return url.href;
  }
  return Object.freeze({endpoint,id,products,available,route});
});
