(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.ShopStudioProductHandoff=api;})(globalThis,function(){
  'use strict';
  const prefix='matjido-studio-product-v1:';
  const token=value=>typeof value==='string'&&/^[a-z0-9-]{20,80}$/i.test(value)?value:'';
  const storeId=value=>typeof value==='string'&&/^[a-z0-9_-]{1,80}$/i.test(value)&&!['__proto__','constructor','prototype'].includes(value)?value:'';
  function read(value,now=Date.now()){
    if(!value||value.version!==1||!Number.isFinite(value.createdAt)||now-value.createdAt>30*60*1000||value.createdAt>now+60000)return null;
    if(typeof value.src!=='string'||value.src.length>2000000||!/^data:image\/(webp|png|jpeg);base64,[A-Za-z0-9+/]+=*$/.test(value.src))return null;
    if(value.storeId&&!storeId(value.storeId))return null;
    const name=String(value.name||'').trim().slice(0,50);if(!name)return null;
    return{version:1,createdAt:value.createdAt,storeId:storeId(value.storeId),name,description:String(value.description||'').slice(0,160),src:value.src};
  }
  function key(value){return token(value)?prefix+value:'';}
  return Object.freeze({read,key,token});
});
