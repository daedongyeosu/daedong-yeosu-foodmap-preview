(function(){
  const KEY='matjidoFreightSharedPreviewV1';
  const CHANGE_EVENT='matjido-freight-change';
  const OFFER_TIMEOUT_MS=30000;
  const ASSIGNMENT_GRACE_MS=15*60*1000;
  const PRESENCE_TIMEOUT_MS=90*1000;
  const MAX_BOOST_WON=100000;
  const seedOrders=[
    {id:'YF-1011-01',status:'PAID',createdAt:'2026-10-11T06:00:00+09:00',route:'문수동 → 여천공단',pickupArea:'문수동',dropoffArea:'여천공단',pickup:'여수시 문수로 00 · 상가 앞',dropoff:'여수시 여수산단로 000 · 경비실 인계',contact:'배차 확정 후 연결되는 안심번호',distance:12.8,item:'포장된 행사물품 6박스',weight:350,fleetClass:'TON',required:['리프트'],note:'상차지에서 물품을 리프트에 올려드립니다. 도착지 경비실 인계입니다.',customerTotal:52500,driverPayout:45000,platformFee:5000,pgFee:1500,expenses:1000,assignedDriverId:''},
    {id:'YF-1011-02',status:'QUOTING',createdAt:'2026-10-11T06:05:00+09:00',route:'국동 → 웅천동',pickupArea:'국동',dropoffArea:'웅천동',pickup:'여수시 국동 000 · 창고',dropoff:'여수시 웅천로 000 · 지하주차장',contact:'배차 확정 후 연결되는 안심번호',distance:8.4,item:'생활용품 3박스',weight:120,fleetClass:'DAMAS',required:[],note:'파손주의 물품이 포함되어 있습니다. 고정 후 운행해 주세요.',customerTotal:37500,driverPayout:32000,platformFee:4000,pgFee:1000,expenses:500,assignedDriverId:''},
    {id:'YF-1011-03',status:'SETTLEMENT_PENDING',createdAt:'2026-10-11T05:30:00+09:00',route:'학동 → 돌산읍',pickupArea:'학동',dropoffArea:'돌산읍',pickup:'여수시 학동 000',dropoff:'여수시 돌산읍 000',contact:'배차 확정 후 연결되는 안심번호',distance:18.2,item:'포장 자재 1팔레트',weight:900,fleetClass:'TON',required:['리프트'],note:'배송완료 증빙 확인 대기 중입니다.',customerTotal:80000,driverPayout:70000,platformFee:7000,pgFee:2000,expenses:1000,assignedDriverId:'D-02'}
  ];
  const seedDrivers=[
    {id:'D-01',name:'김화물',vehicle:'700kg 리프트 카고',fleetClass:'TON',payload:700,features:['리프트'],area:'여수 전지역',hours:'주간·야간 · 오늘 운행 중',available:true,verified:true},
    {id:'D-02',name:'이용달',vehicle:'1톤 리프트 카고',fleetClass:'TON',payload:1000,features:['리프트'],area:'여수·광양',hours:'24시간 가능 · 오늘 운행 중',available:true,verified:true},
    {id:'D-03',name:'박운송',vehicle:'500kg 라보',fleetClass:'LABO',payload:500,features:[],area:'여수 시내',hours:'주간만 · 현재 운행종료',available:false,verified:true}
  ];
  const clone=value=>JSON.parse(JSON.stringify(value));
  const demoLocations={'D-01':{latitude:34.7542,longitude:127.7041},'D-02':{latitude:34.7606,longitude:127.6622}};
  const initial=()=>({version:2,orders:clone(seedOrders),drivers:clone(seedDrivers).map(driver=>({...driver,boardOpen:driver.available,lastSeenAt:driver.available?new Date().toISOString():'',locationStatus:driver.available?'GRANTED':'OFF',...(demoLocations[driver.id]||{})})),history:[]});
  function migrate(state){
    if(Number(state.version||0)>=2)return state;const now=new Date().toISOString();state.version=2;
    state.drivers=state.drivers.map(driver=>({...driver,boardOpen:Boolean(driver.available),lastSeenAt:driver.available?now:'',locationStatus:driver.available?'GRANTED':'OFF',...(demoLocations[driver.id]||{})}));localStorage.setItem(KEY,JSON.stringify(state));return state;
  }
  function read(){
    try{
      const saved=JSON.parse(localStorage.getItem(KEY)||'null');
      if(saved&&Array.isArray(saved.orders)&&Array.isArray(saved.drivers))return migrate(saved);
    }catch{}
    const state=initial();write(state);return state;
  }
  function write(state){
    localStorage.setItem(KEY,JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT,{detail:clone(state)}));
    return state;
  }
  function reset(){return write(initial());}
  function driverMatchesOrder(driver,order){return Boolean(driver?.verified&&driver.fleetClass===order.fleetClass&&driver.payload>=Number(order.weight||0)&&(order.required||[]).every(feature=>driver.features.includes(feature)));}
  function driverPresenceStatus(driver,now=Date.now()){
    if(driver?.dispatchExcluded)return {code:'EXCLUDED',label:'이 주문 재배차 제외',online:false};
    if(!driver?.available||!driver.boardOpen)return {code:'OFFLINE',label:'오더판 꺼짐',online:false};
    if(driver.locationStatus!=='GRANTED')return {code:'LOCATION_REQUIRED',label:'위치 확인 필요',online:false};
    const seen=Date.parse(driver.lastSeenAt||'');if(!Number.isFinite(seen)||Number(now)-seen>PRESENCE_TIMEOUT_MS)return {code:'STALE',label:'연결 끊김',online:false};
    return {code:'ONLINE',label:'오더 수신 중',online:true};
  }
  function eligibleDrivers(order,state=read()){
    const excluded=new Set(order.excludedDriverIds||[]);const now=Date.now();
    return state.drivers.filter(driver=>driverMatchesOrder(driver,order)&&driverPresenceStatus(driver,now).online&&!excluded.has(driver.id)&&(!driver.suspendedUntil||Date.parse(driver.suspendedUntil)<=now));
  }
  function updateDriverPresence(driverId,patch={}){
    const state=read();const driver=state.drivers.find(item=>item.id===driverId);if(!driver)return {ok:false,reason:'DRIVER_NOT_FOUND'};
    const allowed=['available','boardOpen','locationStatus','latitude','longitude','accuracy','appState'];for(const key of allowed){if(Object.hasOwn(patch,key))driver[key]=patch[key];}
    driver.lastSeenAt=new Date().toISOString();write(state);return {ok:true,driver:clone(driver)};
  }
  function heartbeatDriver(driverId,patch={}){return updateDriverPresence(driverId,{...patch,appState:patch.appState||'FOREGROUND'});}
  function distanceKm(a,b){if(!Number.isFinite(a?.latitude)||!Number.isFinite(a?.longitude)||!Number.isFinite(b?.latitude)||!Number.isFinite(b?.longitude))return null;const rad=value=>value*Math.PI/180;const dLat=rad(b.latitude-a.latitude);const dLon=rad(b.longitude-a.longitude);const h=Math.sin(dLat/2)**2+Math.cos(rad(a.latitude))*Math.cos(rad(b.latitude))*Math.sin(dLon/2)**2;return 6371*2*Math.atan2(Math.sqrt(h),Math.sqrt(1-h));}
  function rankOrdersForDriver(orders,driver){return [...orders].map(order=>({...order,distanceToPickupKm:distanceKm(driver,order.pickupLocation)})).sort((a,b)=>Number(Boolean(b.recoveryPriority))-Number(Boolean(a.recoveryPriority))||(a.distanceToPickupKm??99999)-(b.distanceToPickupKm??99999)||Date.parse(a.createdAt)-Date.parse(b.createdAt));}
  function createRequest(payload){
    const state=read();
    const serial=String(Date.now()).slice(-6);
    const localDate=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Seoul',month:'2-digit',day:'2-digit'}).format(new Date()).replace('-','');
    const id=`YF-${localDate}-${serial}`;
    const order={id,status:'QUOTING',createdAt:new Date().toISOString(),assignedDriverId:'',customerTotal:0,driverPayout:0,platformFee:0,pgFee:0,expenses:0,required:[],distance:0,...payload};
    state.orders.unshift(order);
    state.history.push({orderId:id,from:'',to:'QUOTING',actor:'CUSTOMER',at:new Date().toISOString()});
    write(state);return clone(order);
  }
  function transition(orderId,expected,next,patch={},actor='ADMIN'){
    const state=read();const order=state.orders.find(item=>item.id===orderId);
    const allowed=Array.isArray(expected)?expected:[expected];
    if(!order||!allowed.includes(order.status))return {ok:false,reason:'STATUS_CONFLICT',order:order?clone(order):null};
    const from=order.status;Object.assign(order,patch,{status:next,updatedAt:new Date().toISOString()});
    state.history.push({orderId,from,to:next,actor,at:order.updatedAt});write(state);
    return {ok:true,order:clone(order)};
  }
  function markNoAcceptance(orderId){
    const state=read();const order=state.orders.find(item=>item.id===orderId);
    if(!order||order.status!=='OFFERED'||order.assignedDriverId||order.boostEligible||Number(order.boostTotal||0)>=MAX_BOOST_WON)return {ok:false,reason:'STATUS_CONFLICT'};
    order.boostEligible=true;order.unacceptedAt=new Date().toISOString();order.updatedAt=order.unacceptedAt;
    state.history.push({orderId,from:'OFFERED',to:'OFFERED',actor:'DISPATCH_TIMEOUT',at:order.updatedAt,reason:'NO_DRIVER_ACCEPTANCE'});write(state);return {ok:true,order:clone(order)};
  }
  function offerSecondsRemaining(order,now=Date.now()){
    if(!order||order.status!=='OFFERED'||order.assignedDriverId||order.boostEligible)return 0;
    const offeredAt=Date.parse(order.lastOfferedAt||order.updatedAt||order.createdAt||'');
    if(!Number.isFinite(offeredAt))return Math.ceil(OFFER_TIMEOUT_MS/1000);
    return Math.max(0,Math.ceil((offeredAt+OFFER_TIMEOUT_MS-Number(now))/1000));
  }
  function expireUnacceptedOffers(now=Date.now()){
    const state=read();const at=new Date(Number(now)).toISOString();let count=0;
    for(const order of state.orders){
      if(order.status!=='OFFERED'||order.assignedDriverId||offerSecondsRemaining(order,now)>0)continue;
      if(order.recoveryPriority){order.status='REFUND_PENDING';order.refundReason='REPLACEMENT_DRIVER_UNAVAILABLE';order.updatedAt=at;count+=1;state.history.push({orderId:order.id,from:'OFFERED',to:'REFUND_PENDING',actor:'DISPATCH_RECOVERY',at,reason:order.refundReason});continue;}
      if(order.boostEligible||Number(order.boostTotal||0)>=MAX_BOOST_WON)continue;
      order.boostEligible=true;order.unacceptedAt=at;order.updatedAt=at;count+=1;
      state.history.push({orderId:order.id,from:'OFFERED',to:'OFFERED',actor:'DISPATCH_TIMEOUT',at,reason:'NO_DRIVER_ACCEPTANCE'});
    }
    if(count)write(state);return {ok:true,count};
  }
  function addCustomerBoost(orderId,amount){
    const state=read();const order=state.orders.find(item=>item.id===orderId);const boost=Math.floor(Number(amount||0)/1000)*1000;const current=Number(order?.boostTotal||0);
    if(!order||order.status!=='OFFERED'||order.assignedDriverId||!order.boostEligible)return {ok:false,reason:'STATUS_CONFLICT'};
    if(boost<1000||boost>MAX_BOOST_WON-current)return {ok:false,reason:'INVALID_AMOUNT'};
    const at=new Date().toISOString();order.boostTotal=current+boost;order.driverPayout=Number(order.driverPayout||0)+boost;order.customerTotal=Number(order.customerTotal||0)+boost;order.boostEligible=false;order.offerRound=Number(order.offerRound||1)+1;order.lastOfferedAt=at;order.updatedAt=at;order.boostPayments=[...(order.boostPayments||[]),{amount:boost,status:'SUCCEEDED_PREVIEW',paidAt:at}];
    state.history.push({orderId,from:'OFFERED',to:'OFFERED',actor:'CUSTOMER',at,reason:'CUSTOMER_FAST_DISPATCH_BOOST',amount:boost});write(state);return {ok:true,order:clone(order)};
  }
  async function acceptOrder(orderId,driverId){
    const perform=()=>{
      const state=read();const order=state.orders.find(item=>item.id===orderId);
      const driver=state.drivers.find(item=>item.id===driverId);
      if(!order||order.status!=='OFFERED'||!driver||!eligibleDrivers(order,state).some(item=>item.id===driverId))return {ok:false,reason:'ALREADY_ASSIGNED'};
      const acceptedAt=new Date().toISOString();const requested=Date.parse(order.requestedAt||'');const promisedPickupAt=new Date(Number.isFinite(requested)&&requested>Date.now()?requested:Date.now()+ASSIGNMENT_GRACE_MS).toISOString();
      return transition(orderId,'OFFERED','ASSIGNED',{assignedDriverId:driverId,acceptedAt,promisedPickupAt,commitmentStatus:'ON_TRACK',recoveryPriority:false,boostEligible:false},`DRIVER:${driverId}`);
    };
    if(navigator.locks&&navigator.locks.request)return navigator.locks.request(`freight-accept-${orderId}`,perform);
    return perform();
  }
  function recoverDriverFailure(orderId,driverId,reason='DRIVER_UNAVAILABLE',now=Date.now()){
    const state=read();const order=state.orders.find(item=>item.id===orderId);const driver=state.drivers.find(item=>item.id===driverId);
    if(!order||order.assignedDriverId!==driverId||!['ASSIGNED','ARRIVED'].includes(order.status))return {ok:false,reason:'STATUS_CONFLICT'};
    const from=order.status;const at=new Date(Number(now)).toISOString();order.status='OFFERED';order.assignedDriverId='';order.failedDriverId=driverId;order.excludedDriverIds=[...new Set([...(order.excludedDriverIds||[]),driverId])];order.recoveryPriority=true;order.commitmentStatus='DRIVER_FAILED';order.recoveryStartedAt=at;order.lastOfferedAt=at;order.offerRound=Number(order.offerRound||1)+1;order.updatedAt=at;order.boostEligible=false;
    if(driver){driver.reliabilityFailures=Number(driver.reliabilityFailures||0)+1;driver.lastFailureAt=at;}
    state.history.push({orderId,from,to:'OFFERED',actor:`DRIVER:${driverId}`,at,reason});write(state);return {ok:true,order:clone(order)};
  }
  function assignmentSecondsRemaining(order,now=Date.now()){
    if(!order||order.status!=='ASSIGNED'||!order.promisedPickupAt)return 0;return Math.max(0,Math.ceil((Date.parse(order.promisedPickupAt)-Number(now))/1000));
  }
  function checkAssignmentCommitments(now=Date.now()){
    const state=read();const overdue=state.orders.filter(order=>order.status==='ASSIGNED'&&order.assignedDriverId&&order.promisedPickupAt&&Date.parse(order.promisedPickupAt)<=Number(now)).map(order=>({orderId:order.id,driverId:order.assignedDriverId}));let count=0;
    for(const item of overdue){if(recoverDriverFailure(item.orderId,item.driverId,'PICKUP_PROMISE_MISSED',now).ok)count+=1;}return {ok:true,count};
  }
  function subscribe(listener){
    const local=event=>listener(event.detail||read());
    const storage=event=>{if(event.key===KEY)listener(read());};
    window.addEventListener(CHANGE_EVENT,local);window.addEventListener('storage',storage);
    return ()=>{window.removeEventListener(CHANGE_EVENT,local);window.removeEventListener('storage',storage);};
  }
  window.MatjidoFreightStore={KEY,OFFER_TIMEOUT_MS,ASSIGNMENT_GRACE_MS,PRESENCE_TIMEOUT_MS,MAX_BOOST_WON,read,reset,createRequest,transition,markNoAcceptance,offerSecondsRemaining,expireUnacceptedOffers,addCustomerBoost,acceptOrder,recoverDriverFailure,assignmentSecondsRemaining,checkAssignmentCommitments,driverMatchesOrder,driverPresenceStatus,updateDriverPresence,heartbeatDriver,rankOrdersForDriver,eligibleDrivers,subscribe};
})();
