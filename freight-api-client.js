(function(){
  const Store=window.MatjidoFreightStore;
  const configured=String(window.MATJIDO_FREIGHT_API_BASE||document.querySelector('meta[name="freight-api-base"]')?.content||'').trim();
  const base=configured.replace(/\/$/,'');
  const enabled=Boolean(base);
  const CLIENT='matjido-freight-web-v1';
  const TIMEOUT_MS=12000;
  const AUTH_KEY='matjidoFreightDriverAuthV1';
  class FreightApiError extends Error{constructor(message,{status=0,code='NETWORK_ERROR'}={}){super(message);this.name='FreightApiError';this.status=status;this.code=code;}}
  function idempotencyKey(scope){const key=`matjido-freight-idempotency:${scope}`;let value=sessionStorage.getItem(key);if(!value){value=globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random().toString(16).slice(2)}`;sessionStorage.setItem(key,value);}return value;}
  function auth(){try{const value=JSON.parse(localStorage.getItem(AUTH_KEY)||'null');if(value?.expiresAt&&Number(value.expiresAt)<=Date.now()){localStorage.removeItem(AUTH_KEY);return null;}return value;}catch{return null;}}
  function driverId(){return String(auth()?.driver?.id||'');}
  function isAuthenticated(){return !enabled||Boolean(auth()?.token&&driverId());}
  function logout(){localStorage.removeItem(AUTH_KEY);}
  async function request(path,{method='GET',body,idempotencyScope,version,anonymous=false}={}){
    const controller=new AbortController();const timer=setTimeout(()=>controller.abort(),TIMEOUT_MS);
    const headers={Accept:'application/json','X-Matjido-Freight-Client':CLIENT};
    const session=auth();if(!anonymous&&session?.token)headers.Authorization=`Bearer ${session.token}`;
    if(body!==undefined)headers['Content-Type']='application/json';if(idempotencyScope)headers['Idempotency-Key']=idempotencyKey(idempotencyScope);if(Number.isFinite(version))headers['If-Match']=`"${version}"`;
    try{
      const response=await fetch(`${base}${path}`,{method,headers,body:body===undefined?undefined:JSON.stringify(body),credentials:'include',cache:'no-store',signal:controller.signal});
      const payload=await response.json().catch(()=>({}));
      if(!response.ok)throw new FreightApiError(payload.message||'화물배차 서버 요청을 처리하지 못했습니다.',{status:response.status,code:payload.code||'HTTP_ERROR'});
      return payload;
    }catch(error){if(error instanceof FreightApiError)throw error;throw new FreightApiError(error?.name==='AbortError'?'화물배차 서버 응답이 지연되고 있습니다.':'화물배차 서버에 연결할 수 없습니다.',{code:error?.name==='AbortError'?'TIMEOUT':'NETWORK_ERROR'});}finally{clearTimeout(timer);}
  }
  async function login(phone,accessCode){if(!enabled)throw new FreightApiError('서버 로그인은 시험 운영에서만 사용합니다.',{code:'PREVIEW_MODE'});const result=await request('/v1/freight/driver/login',{method:'POST',body:{phone,accessCode},anonymous:true});if(!result?.token||!result?.driver?.id)throw new FreightApiError('기사 로그인 응답을 확인할 수 없습니다.',{code:'INVALID_RESPONSE'});localStorage.setItem(AUTH_KEY,JSON.stringify({token:result.token,driver:result.driver,expiresAt:Date.now()+Number(result.expiresInDays||30)*86400000}));return result;}
  function validateBoard(payload){if(!payload||!Array.isArray(payload.orders)||!payload.driver)throw new FreightApiError('화물배차 서버 응답 형식이 올바르지 않습니다.',{code:'INVALID_RESPONSE'});return payload;}
  function orderVersion(order){const version=Number(order?.version);if(!Number.isInteger(version)||version<1)throw new FreightApiError('주문 최신 버전을 확인할 수 없습니다. 오더판을 새로고침해 주세요.',{code:'MISSING_ORDER_VERSION'});return version;}
  async function getDriverBoard(driverId){if(!enabled)return {mode:'preview',state:Store.read()};return {mode:'server',...(validateBoard(await request(`/v1/freight/drivers/${encodeURIComponent(driverId)}/board`)))};}
  async function updatePresence(driverId,presence){if(!enabled)return {mode:'preview',...Store.updateDriverPresence(driverId,presence)};return {mode:'server',...(await request(`/v1/freight/drivers/${encodeURIComponent(driverId)}/presence`,{method:'PUT',body:presence}))};}
  async function acceptOrder(order,driverId){if(!enabled)return {mode:'preview',...(await Store.acceptOrder(order.id,driverId))};return {mode:'server',...(await request(`/v1/freight/orders/${encodeURIComponent(order.id)}/accept`,{method:'POST',body:{driverId},idempotencyScope:`accept:${order.id}:${driverId}`,version:orderVersion(order)}))};}
  async function updateOrderStatus(order,nextStatus,driverId,proof={}){if(!enabled){const expected={ARRIVED:'ASSIGNED',PICKED_UP:'ARRIVED',SETTLEMENT_PENDING:'PICKED_UP'}[nextStatus];return {mode:'preview',...Store.transition(order.id,expected,nextStatus,proof,`DRIVER:${driverId}`)};}return {mode:'server',...(await request(`/v1/freight/orders/${encodeURIComponent(order.id)}/status`,{method:'POST',body:{driverId,nextStatus,proof},idempotencyScope:`status:${order.id}:${nextStatus}:${driverId}`,version:orderVersion(order)}))};}
  async function releaseOrder(order,driverId,reason){if(!enabled)return {mode:'preview',...Store.recoverDriverFailure(order.id,driverId,reason)};return {mode:'server',...(await request(`/v1/freight/orders/${encodeURIComponent(order.id)}/release`,{method:'POST',body:{driverId,reason},idempotencyScope:`release:${order.id}:${driverId}`,version:orderVersion(order)}))};}
  window.MatjidoFreightApi={enabled,base,FreightApiError,auth,driverId,isAuthenticated,login,logout,getDriverBoard,updatePresence,acceptOrder,updateOrderStatus,releaseOrder};
})();
