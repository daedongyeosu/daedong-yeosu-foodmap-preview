(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShopStudioCustomerLinks=api;})(typeof globalThis==='object'?globalThis:this,function(){
  'use strict';
  function https(value){
    const text=String(value||'').trim();if(!text||text.length>2048)return '';
    try{const url=new URL(text);if(url.protocol!=='https:'||url.username||url.password)return '';return url.href;}catch{return '';}
  }
  function map(value){
    const href=https(value);if(!href)return '';
    const allowed=['map.naver.com','m.map.naver.com','m.place.naver.com','pcmap.place.naver.com','naver.me','map.kakao.com','m.map.kakao.com','place.map.kakao.com'];
    return allowed.includes(new URL(href).hostname)?href:'';
  }
  function phone(value){
    const text=String(value||'').trim();if(!/^[0-9()\s-]+$/.test(text))return '';
    const digits=text.replace(/\D/g,'');return /^(?:02\d{7,8}|0[3-6]\d{8}|01[016789]\d{7,8}|070\d{8})$/.test(digits)?'tel:'+digits:'';
  }
  function product(item,business){
    const specific=String(item?.productUrl||'').trim();
    return specific?{href:https(specific),label:'이 상품 주문 화면 열기'}:{href:https(business?.orderUrl),label:'가게 주문 화면 열기'};
  }
  return Object.freeze({https,map,phone,product});
});
