(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.MatjidoLiveCommerce=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';

  const MODES={cumulative:'누적주문 할인',clearance:'실시간 재고소진'};

  function number(value,fallback=0){const parsed=Number(value);return Number.isFinite(parsed)?parsed:fallback;}
  function won(value){return Math.max(0,Math.round(number(value)));}
  function dateValue(value){const parsed=new Date(value||'').getTime();return Number.isFinite(parsed)?parsed:null;}
  function clampPrice(value,basePrice,floorPrice){return Math.min(basePrice,Math.max(floorPrice,won(value)));}
  function active(program,now=Date.now()){
    if(!program||program.enabled!==true||!MODES[program.mode])return false;
    const end=dateValue(program.endAt);
    return end===null||end>number(now,Date.now());
  }
  function normalizedTiers(program,basePrice,floorPrice){
    const source=Array.isArray(program?.tiers)?program.tiers:[];
    const tiers=source.map(tier=>({threshold:Math.max(0,Math.floor(number(tier?.threshold))),price:clampPrice(tier?.price,basePrice,floorPrice)})).filter(tier=>tier.threshold>0&&tier.price<basePrice);
    tiers.sort((a,b)=>program.mode==='clearance'?b.threshold-a.threshold:a.threshold-b.threshold);
    let last=basePrice;
    return tiers.map(tier=>{last=Math.min(last,tier.price);return{...tier,price:last};});
  }
  function evaluate(product,now=Date.now()){
    const basePrice=Math.max(1,won(product?.price));
    const program=product?.livePricing||null;
    const floorPrice=Math.min(basePrice,Math.max(1,won(program?.floorPrice||basePrice)));
    const isActive=active(program,now);
    const mode=isActive?program.mode:null;
    const tiers=isActive?normalizedTiers(program,basePrice,floorPrice):[];
    const signal=mode==='clearance'
      ?Math.max(0,Math.floor(number(program.remainingStock,product?.stockQuantity)))
      :Math.max(0,Math.floor(number(program?.confirmedOrders)));
    let currentPrice=basePrice;
    let nextTier=null;
    if(mode==='cumulative'){
      for(const tier of tiers){if(signal>=tier.threshold)currentPrice=tier.price;else{nextTier=tier;break;}}
    }else if(mode==='clearance'){
      for(const tier of tiers){if(signal<=tier.threshold)currentPrice=tier.price;else if(!nextTier)nextTier=tier;}
      const upcoming=tiers.filter(tier=>tier.threshold<signal).sort((a,b)=>b.threshold-a.threshold)[0];
      nextTier=upcoming||null;
    }
    currentPrice=clampPrice(currentPrice,basePrice,floorPrice);
    const end=dateValue(program?.endAt);
    return{
      active:isActive,mode,label:mode?MODES[mode]:'일반 판매',basePrice,currentPrice,floorPrice,
      discountWon:Math.max(0,basePrice-currentPrice),discountRate:Math.round(Math.max(0,basePrice-currentPrice)/basePrice*100),
      signal,nextTier,endAt:end?new Date(end).toISOString():'',remainingMs:end?Math.max(0,end-number(now,Date.now())):null,
      settlement:mode==='cumulative'?'마감 전 더 내려가면 같은 행사 주문에 최종가를 적용합니다.':'장바구니에 담은 현재 할인가를 잠급니다.'
    };
  }
  function bestLockedPrice(previousPrice,currentPrice,basePrice){
    const base=Math.max(1,won(basePrice));
    const previous=previousPrice===null||previousPrice===undefined||previousPrice===''?base:number(previousPrice,base);
    const current=currentPrice===null||currentPrice===undefined||currentPrice===''?base:number(currentPrice,base);
    return Math.max(1,Math.min(base,previous,current));
  }
  function describeNext(state){
    if(!state?.active)return'일반 판매 중';
    if(!state.nextTier)return state.mode==='cumulative'?'현재 최저 단계입니다.':'현재 마지막 할인 단계입니다.';
    if(state.mode==='cumulative')return`${Math.max(0,state.nextTier.threshold-state.signal)}개 더 주문되면 ${won(state.nextTier.price).toLocaleString('ko-KR')}원`;
    return`재고 ${state.nextTier.threshold}개 이하가 되면 ${won(state.nextTier.price).toLocaleString('ko-KR')}원`;
  }
  function timeLeft(remainingMs){
    if(remainingMs===null)return'종료시간 없음';
    const minutes=Math.max(0,Math.ceil(remainingMs/60000));
    if(minutes>=1440)return`${Math.ceil(minutes/1440)}일 남음`;
    if(minutes>=60)return`${Math.floor(minutes/60)}시간 ${minutes%60}분 남음`;
    return`${minutes}분 남음`;
  }

  return{MODES,evaluate,bestLockedPrice,describeNext,timeLeft};
});
