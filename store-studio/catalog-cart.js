// Same store-scoped cart and line format consumed by online-store/app.js.
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MatjidoCatalogCart=api;})(globalThis,function(){
  'use strict';
  function key(storeId){if(typeof storeId!=='string'||!(/^[a-z0-9_-]{1,80}$/i.test(storeId)||/^shop-[a-z0-9_-]{1,80}$/i.test(storeId))||['__proto__','constructor','prototype'].includes(storeId))throw Error('상점번호를 확인해 주세요.');return 'matjido-customer-store-cart-v1:store:'+storeId;}
  function read(storage,storeId){const raw=storage.getItem(key(storeId));if(!raw)return {};const value=JSON.parse(raw);if(!value||typeof value!=='object'||Array.isArray(value))throw Error('장바구니를 읽지 못했습니다. 주문 화면에서 확인해 주세요.');return value;}
  function quantity(line){const n=typeof line==='number'?line:line?.quantity;return Number.isSafeInteger(n)&&n>0?Math.min(99,n):0;}
  function persist(storage,storeId,cart){try{storage.setItem(key(storeId),JSON.stringify(cart));}catch{throw Error('장바구니를 저장하지 못했습니다. 저장 공간을 확인해 주세요.');}return cart;}
  function checked(storage,storeId,expected){const cart=read(storage,storeId);if(expected!==undefined&&JSON.stringify(cart)!==JSON.stringify(expected))throw Error('다른 화면에서 장바구니가 바뀌었습니다. 수량을 확인하고 다시 눌러 주세요.');return cart;}
  function limit(product){return product?.stockMode==='수량 관리'?Math.min(99,product.stockQuantity):99;}
  function add(storage,storeId,product,catalog,engine,expected){
    if(!catalog.available(product))throw Error('현재 구매할 수 없는 상품입니다.');const cart=checked(storage,storeId,expected),old=cart[product.id],count=quantity(old);
    if(count>=limit(product))throw Error('담을 수 있는 수량을 모두 담았습니다.');const state=engine.evaluate(product);
    cart[product.id]={quantity:count+1,lockedPrice:engine.bestLockedPrice(old?.lockedPrice,state.currentPrice,product.price),mode:state.mode||'',addedAt:new Date().toISOString()};
    // Write failure is an error, not a successful add notification.
    return persist(storage,storeId,cart);
  }
  function adjust(storage,storeId,productId,delta,products,catalog,engine,expected){
    if(![-1,1].includes(delta))throw Error('수량은 한 개씩 조절해 주세요.');const cart=checked(storage,storeId,expected),old=cart[productId],count=quantity(old);if(!count)throw Error('담은 상품이 없습니다. 다시 확인해 주세요.');
    const product=products.find(item=>item.id===productId);if(delta>0){if(!catalog.available(product))throw Error('현재 구매할 수 없는 상품입니다.');if(count>=limit(product))throw Error('담을 수 있는 수량을 모두 담았습니다.');}if(count===1&&delta<0)return cart;
    const line=typeof old==='object'?{...old}:{quantity:count};line.quantity=count+delta;
    if(catalog.available(product))line.lockedPrice=engine.bestLockedPrice(line.lockedPrice,engine.evaluate(product).currentPrice,product.price);
    cart[productId]=line;return persist(storage,storeId,cart);
  }
  function remove(storage,storeId,productId,expected){const cart=checked(storage,storeId,expected);if(!Object.hasOwn(cart,productId))throw Error('이미 삭제된 상품입니다.');delete cart[productId];return persist(storage,storeId,cart);}
  function summary(cart,products,engine){let count=0,total=0;for(const product of products){const q=quantity(cart[product.id]);count+=q;total+=q*engine.bestLockedPrice(cart[product.id]?.lockedPrice,engine.evaluate(product).currentPrice,product.price);}return {count,total};}
  return Object.freeze({key,read,quantity,limit,add,adjust,remove,summary});
});
