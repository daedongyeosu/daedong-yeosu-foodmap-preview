'use strict';

// One owner for foreground geolocation consent. Never modify navigator itself.
(() => {
  const VERSION = '2026-11-03.1';
  const KEY = 'matjidoLocationConsentV1';
  const PENDING = 'matjidoLocationWithdrawalV1';
  let generation = 0, pendingConsent = null, current = null, revoked = false;
  const read = key => { try {return JSON.parse(localStorage.getItem(key) || 'null');} catch {return null;} };
  const write = (key,value) => {localStorage.setItem(key,JSON.stringify(value));};
  const token = () => [...crypto.getRandomValues(new Uint8Array(32))].map(b=>b.toString(16).padStart(2,'0')).join('');
  const endpoint = () => `${window.daedongDataApi?.locationJournalBaseUrl || window.daedongDataApi?.baseUrl || ''}/api/location-journal`;
  const valid = value => value?.version===VERSION && value?.adult===true && /^[a-f0-9]{64}$/.test(value.token || '') && Date.parse(value.expiresAt)>Date.now();
  async function journal(receipt, method, kind) {
    const response = await fetch(endpoint(), {method,credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:AbortSignal.timeout(8000),headers:{'Content-Type':'application/json',Authorization:`Bearer ${receipt.token}`},...(kind?{body:JSON.stringify({kind,version:VERSION,adult:true,eventId:crypto.randomUUID()})}:{})});
    if(!response.ok) throw Error('기록을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    const result=await response.json(); if(result.ok!==true)throw Error('위치 기록 응답을 확인하지 못했습니다.');return result;
  }
  function eraseGpsStorage() {
    const gps = item => item && (item.type==='current' || item.coordinateSource==='browser-geolocation' || item.regionSource==='browser_geolocation');
    for(const storage of [localStorage,sessionStorage]) {
      try {
        for(const key of Object.keys(storage)) {
          if(!/^(daedongDeliveryAddressV2|daedongAddressBookV2|savedLocation)(:|$)/.test(key))continue;
          const item=JSON.parse(storage.getItem(key)||'null');
          if(Array.isArray(item)) storage.setItem(key,JSON.stringify(item.filter(value=>!gps(value))));
          else if(gps(item)) {storage.removeItem(key);storage.removeItem(key.includes(':')?`location:${key.split(':')[1]}`:'location');}
        }
      } catch { /* Manual addresses and favorites must remain intact. */ }
    }
  }
  // Legacy GPS positions were retained indefinitely without a dedicated consent.
  eraseGpsStorage();
  const existing=read(KEY);current=valid(existing)?existing:null;
  function dialog() {
    if(pendingConsent)return pendingConsent;
    pendingConsent=new Promise(resolve=>{
      const previous=document.activeElement, element=document.createElement('dialog');
      element.className='location-consent';
      element.innerHTML=`<form method="dialog"><h2>현재 위치로 가까운 가게 찾기</h2><p>주소 검색은 위치 동의 없이 이용할 수 있습니다.</p><dl><dt>이용 정보·목적</dt><dd>기기의 현재 좌표로 가까운 가게와 거리를 안내합니다. 백그라운드 추적은 하지 않습니다.</dd><dt>보관</dt><dd>정확한 좌표는 이 방문 화면에서만 사용합니다. 서버에는 좌표·주소를 보내지 않고, 임의 식별값과 동의·이용 시각을 6개월 보관합니다. 철회하면 해당 기록을 삭제합니다.</dd></dl><p>라이더 오토바이 · 위치정보관리책임자 김민태<br>010-4797-7803 · sisakim@naver.com</p><p><a href="/location-terms/" target="_blank" rel="noopener">위치기반서비스 이용약관 전문</a> · <a href="/privacy/" target="_blank" rel="noopener">개인정보처리방침</a></p><label><input type="checkbox" name="adult"> 만 14세 이상입니다</label><label><input type="checkbox" name="agree"> [선택] 위치기반서비스 이용약관과 개인위치정보 이용에 동의합니다</label><p class="location-consent-status" role="status"></p><div class="location-consent-actions"><button type="button" data-location-cancel>주소로 찾기</button><button type="submit" data-location-agree disabled>동의하고 현재 위치 사용</button></div></form>`;
      document.body.append(element);
      const form=element.querySelector('form'),button=element.querySelector('[data-location-agree]'),status=element.querySelector('[role=status]');let busy=false,done=false;
      const finish=value=>{if(done)return;done=true;element.close();element.remove();pendingConsent=null;resolve(value);setTimeout(()=>previous?.isConnected && previous.focus?.({preventScroll:true}),0);};
      form.addEventListener('change',()=>{button.disabled=busy || !form.elements.adult.checked || !form.elements.agree.checked;});
      element.querySelector('[data-location-cancel]').onclick=()=>{if(!busy)finish(false);};
      element.addEventListener('cancel',event=>{event.preventDefault();if(!busy)finish(false);});
      form.addEventListener('submit',async event=>{
        event.preventDefault();if(busy || !form.elements.adult.checked || !form.elements.agree.checked)return;
        busy=true;button.disabled=true;status.textContent='동의 내용을 저장하고 있습니다…';
        const previousReceipt=read(KEY);
        const next={version:VERSION,adult:true,token:/^[a-f0-9]{64}$/.test(previousReceipt?.token || '')?previousReceipt.token:token()};
        try {write(KEY,next);const result=await journal(next,'POST','consent');Object.assign(next,{createdAt:result.createdAt,expiresAt:result.expiresAt});write(KEY,next);current=next;revoked=false;finish(true);}
        catch {status.textContent='위치 동의를 저장하지 못했습니다. 다시 시도하거나 주소로 찾아 주세요.';busy=false;button.disabled=false;}
      });
      element.showModal();
    });return pendingConsent;
  }
  async function retryWithdrawal() {
    const receipt=read(PENDING);if(!receipt)return true;
    try{await journal(receipt,'DELETE');localStorage.removeItem(PENDING);return true;}catch{return false;}
  }
  async function ensure() {
    if(!(await retryWithdrawal()))return false;
    const saved=read(KEY);current=!revoked && valid(saved)?saved:null;
    return Boolean(current) || dialog();
  }
  async function getCurrentPosition(success,error,options) {
    if(!(await ensure())){error?.({code:0,message:'주소 검색으로 위치를 정할 수 있습니다.'});return;}
    const receipt=current, turn=generation;
    if(!navigator.geolocation){error?.({code:2,message:'위치 기능을 사용할 수 없습니다.'});return;}
    navigator.geolocation.getCurrentPosition(async position=>{
      if(turn!==generation || current?.token!==receipt.token)return;
      try {
        await journal(receipt,'POST','use');
        if(turn===generation && current?.token===receipt.token)success(position);
      } catch {error?.({code:2,message:'위치 이용 기록을 저장하지 못했습니다. 주소로 찾아 주세요.'});}
    },error,options);
  }
  async function withdraw() {
    generation++;revoked=true;
    const receipt=read(KEY) || read(PENDING);current=null;
    // Keep a retry handle until server deletion succeeds; it cannot authorize GPS.
    let retrySaved=true;
    try {if(receipt)write(PENDING,receipt);localStorage.removeItem(KEY);} catch {retrySaved=false;}
    eraseGpsStorage();
    window.dispatchEvent(new Event('matjido-location-withdrawn'));
    if(!retrySaved && receipt){try{await journal(receipt,'DELETE');return true;}catch{return false;}}
    return retryWithdrawal();
  }
  async function records() {
    const receipt=read(KEY) || read(PENDING);
    return receipt?journal(receipt,'GET'):{ok:true,records:[]};
  }
  document.addEventListener('click',async event=>{
    if(event.target.closest('[data-location-withdraw]')) {
      const ok=await withdraw(),status=document.querySelector('[data-location-status]');
      if(status)status.textContent=ok?'위치 동의를 철회하고 해당 기록을 삭제했습니다. 기기의 위치 권한도 사이트 설정에서 끌 수 있습니다.':'현재 위치 이용을 중지했습니다. 서버 기록 삭제는 연결이 회복되면 다시 시도합니다. 이 화면을 닫기 전에 다시 눌러 확인해 주세요.';
    }
    if(event.target.closest('[data-location-records]')) {
      const status=document.querySelector('[data-location-status]');if(!status)return;
      try{const result=await records();status.textContent=result.records.length?result.records.map(r=>`${r.created_at} · ${r.kind==='consent'?'동의':'위치 이용'} · 약관 ${r.terms_version}`).join('\n')+'\n최근 최대 1,000건입니다. 전체 기록·정정은 문의처로 요청해 주세요.':'이 기기에 연결된 위치 이용 기록이 없습니다.';}catch{status.textContent='기록을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';}
    }
  });
  window.addEventListener('storage',event=>{if(event.key===KEY && !event.newValue){current=null;generation++;eraseGpsStorage();window.dispatchEvent(new Event('matjido-location-withdrawn'));}});
  window.addEventListener('online',()=>{void retryWithdrawal();});
  window.MatjidoLocation=Object.freeze({version:VERSION,ensure,getCurrentPosition,withdraw,records});
})();
