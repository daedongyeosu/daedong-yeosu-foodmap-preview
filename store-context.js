(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MatjidoStoreContext=api;})(globalThis,function(){
  'use strict';
  const id=value=>typeof value==='string'&&/^[a-zA-Z0-9_-]{1,80}$/.test(value)&&!['__proto__','constructor','prototype'].includes(value)?value:'';
  function matchingDraft(value,storeId){return value?.previewOnly===true&&id(value.storeId)===storeId&&id(storeId)?value:null;}
  function metadata(value){
    if(!value||typeof value!=='object')return {};
    const text=key=>String(value[key]||'').slice(0,200);
    const amount=key=>Number.isSafeInteger(value[key])&&value[key]>=0?value[key]:0;
    return {address:text('address'),addressZonecode:text('addressZonecode'),addressDetail:text('addressDetail'),phone:text('phone'),subsidy:amount('subsidy'),minimumOrder:amount('minimumOrder'),category:text('category')};
  }
  return Object.freeze({id,matchingDraft,metadata});
});
