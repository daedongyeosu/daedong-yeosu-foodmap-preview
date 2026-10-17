(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MatjidoDeliverySharing=api;})(globalThis,function(){
  'use strict';
  const validTotal=value=>Number.isSafeInteger(value)&&value>=0&&value<=100000000;
  function choices(total){
    if(!validTotal(total))throw Error('배송서비스 비용을 확인해 주세요.');
    const values=[];for(let won=0;won<=total;won+=100)values.push(won);
    if(values.at(-1)!==total)values.push(total);
    return values;
  }
  function split(total,policy){
    if(!validTotal(total))throw Error('배송서비스 비용을 확인해 주세요.');
    if(policy?.mode!=='ratio'||!Number.isFinite(policy.customerPercent)||policy.customerPercent<0||policy.customerPercent>100)throw Error('부담 비율을 확인해 주세요.');
    const p=policy.customerPercent;
    const customerWon=p===0?0:p===100?total:p===50?Math.round(total/2):Math.min(total,Math.max(0,Math.round(total*p/100/100)*100));
    return {totalWon:total,customerWon,merchantWon:total-customerWon,customerPercent:total?customerWon/total*100:p};
  }
  function policy(total,customerWon){
    if(!validTotal(total)||!Number.isSafeInteger(customerWon)||customerWon<0||customerWon>total)throw Error('부담액을 확인해 주세요.');
    return {mode:'ratio',customerPercent:total?customerWon/total*100:100,stepWon:100};
  }
  return Object.freeze({choices,split,policy});
});
