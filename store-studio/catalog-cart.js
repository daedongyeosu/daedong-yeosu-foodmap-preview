// Same store-scoped cart and line format consumed by online-store/app.js.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MatjidoCatalogCart=api;})(globalThis,function(){
  'use strict';
  function key(storeId){if(typeof storeId!=='string'||!/^[a-z0-9_-]{1,80}$/i.test(storeId)||['__proto__','constructor','prototype'].includes(storeId))throw Error('상점번호를 확인해 주세요.');return 'matjido-customer-store-cart-v1:store:'+storeId;}
  function read(storage,storeId){const raw=storage.getItem(key(storeId));if(!raw)return {};const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('장바구니를 읽지 못했습니다. 주문 화면에서 확인해 주세요.');return value;}
  function quantity(line){const n=typeof line==='number'?line:line?.quantity;return Number.isSafeInteger(n)&&n>0?Math.min(99,n):0;}
  function add(storage,storeId,product,catalog,engine){
    if(!catalog.available(product))throw Error('현재 구매할 수 없는 상품입니다.');const cart=read(storage,storeId),old=cart[product.id],count=quantity(old),limit=product.stockMode==='수량 관리'?Math.min(99,product.stockQuantity):99;
    if(count>=limit)throw Error('담을 수 있는 수량을 모두 담았습니다.');const state=engine.evaluate(product);
    cart[product.id]={quantity:count+1,lockedPrice:engine.bestLockedPrice(old?.lockedPrice,state.currentPrice,product.price),mode:state.mode||'',addedAt:new Date().toISOString()};
    // Write failure is an error, not a successful add notification.
    try{storage.setItem(key(storeId),JSON.stringify(cart));}catch{throw Error('장바구니를 저장하지 못했습니다. 저장 공간을 확인해 주세요.');}return cart;
  }
  function summary(cart,products,engine){let count=0,total=0;for(const product of products){const q=quantity(cart[product.id]);count+=q;total+=q*engine.bestLockedPrice(cart[product.id]?.lockedPrice,engine.evaluate(product).currentPrice,product.price);}return {count,total};}
  return Object.freeze({key,read,quantity,add,summary});
});
