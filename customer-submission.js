// One durable, device-local pending intent per flow/store. Never retry with a new UUID.
// UUIDs and payloads are private: do not place them in URLs, analytics or console logs.
(()=>{
  'use strict';
  const prefix='matjido-pending-submit-v1:',ttl=86400000;
  const key=scope=>prefix+scope;
  function read(scope){
    const raw=localStorage.getItem(key(scope));if(!raw)return null;
    let value;try{value=JSON.parse(raw);}catch{throw Error('저장된 접수 확인정보를 읽지 못했습니다. 새로 접수하지 말고 운영자에게 문의해 주세요.');}
    if(value.version!==1||!value.requestId||!Number.isFinite(value.createdAt))throw Error('접수 확인정보가 올바르지 않습니다. 운영자에게 문의해 주세요.');
    if(Date.now()-value.createdAt>=ttl){
      if(value.payload){value={version:1,requestId:value.requestId,createdAt:value.createdAt,expired:true};localStorage.setItem(key(scope),JSON.stringify(value));}
      throw Error('접수 확인기간이 끝났습니다. 새로 접수하기 전에 운영자에게 기존 접수번호를 확인해 주세요.');
    }
    return value;
  }
  function has(scope){if(localStorage.getItem(key(scope))===null)return false;try{read(scope);}catch{}return true;}
  function clear(scope,requestId){
    const raw=localStorage.getItem(key(scope));if(!raw)return;
    if(!requestId||JSON.parse(raw).requestId!==requestId)throw Error('다른 화면에서 확인 중인 접수가 있습니다. 기존 접수 결과를 확인해 주세요.');
    localStorage.removeItem(key(scope));if(localStorage.getItem(key(scope))!==null)throw Error('접수 확인정보를 정리하지 못했습니다. 기존 접수 결과를 다시 확인해 주세요.');window.dispatchEvent(new Event('matjido-submit-change'));
  }
  async function send(scope,endpoint,payload,headers={}){
    if(!navigator.locks?.request)throw Error('이 브라우저에서는 안전한 접수 잠금을 사용할 수 없습니다. 최신 기본 브라우저로 열어 주세요.');
    return navigator.locks.request(key(scope),async()=>{
      let pending=read(scope);
      if(!pending&&!payload)throw Error('확인할 접수가 없습니다. 이미 다른 화면에서 확인했을 수 있습니다.');
      let check,support;
      try{check=await fetch(endpoint+'/submission-support',{headers:{accept:'application/json',...headers},credentials:'omit',cache:'no-store',signal:AbortSignal.timeout(15000)});support=await check.json();}
      catch{throw Error('접수 서버 연결을 확인하지 못했습니다. 이번 요청은 전송하지 않았으며 기존 접수 확인정보는 그대로 보관합니다.');}
      if(!check.ok||support.protocol!==1)throw Error('안전한 재접수 기능을 준비 중입니다. 새 접수는 전송하지 않았습니다.');
      if(!pending){
        const requestId=crypto.randomUUID();pending={version:1,createdAt:Date.now(),requestId,endpoint,payload:JSON.parse(JSON.stringify({...payload,clientRequestId:requestId}))};
        const raw=JSON.stringify(pending);
        try{localStorage.setItem(key(scope),raw);if(localStorage.getItem(key(scope))!==raw)throw Error('storage verification');}
        catch{throw Error('이 기기에 접수 확인정보를 저장하지 못했습니다. 주문은 보내지 않았습니다.');}
        window.dispatchEvent(new Event('matjido-submit-change'));
      }
      if(pending.endpoint!==endpoint||!pending.payload)throw Error('기존 접수의 연결정보가 다릅니다. 운영자에게 확인해 주세요.');
      let response,result;
      try{response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',accept:'application/json',...headers},credentials:'omit',body:JSON.stringify(pending.payload),signal:AbortSignal.timeout(20000)});result=await response.json();}
      catch{throw Error('접수 결과를 아직 확인하지 못했습니다. ‘기존 접수 결과 확인’을 눌러 주세요. 새 주문으로 다시 보내지 않습니다.');}
      if(!response.ok){if(result.safeToReplace===true)clear(scope,pending.requestId);throw Error(result.message||result.error||'접수 결과 확인이 필요합니다. 같은 접수번호로 다시 확인해 주세요.');}
      if(result.submission?.protocol!==1||result.submission.requestId!==pending.requestId)throw Error('서버의 접수 확인정보가 일치하지 않습니다. 새로 접수하지 말고 기존 결과를 확인해 주세요.');
      return {receipt:result,payload:pending.payload};
    });
  }
  window.MatjidoSubmission=Object.freeze({send,has,clear});
})();
