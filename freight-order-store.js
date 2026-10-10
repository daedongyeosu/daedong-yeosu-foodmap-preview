(function(){
  const KEY='matjidoFreightSharedPreviewV1';
  const CHANGE_EVENT='matjido-freight-change';
  const seedOrders=[
    {id:'YF-1011-01',status:'PAID',createdAt:'2026-10-11T06:00:00+09:00',route:'문수동 → 여천공단',pickupArea:'문수동',dropoffArea:'여천공단',pickup:'여수시 문수로 00 · 상가 앞',dropoff:'여수시 여수산단로 000 · 경비실 인계',contact:'배차 확정 후 연결되는 안심번호',distance:12.8,item:'포장된 행사물품 6박스',weight:350,required:['리프트'],note:'상차지에서 물품을 리프트에 올려드립니다. 도착지 경비실 인계입니다.',customerTotal:52500,driverPayout:45000,platformFee:5000,pgFee:1500,expenses:1000,assignedDriverId:''},
    {id:'YF-1011-02',status:'QUOTING',createdAt:'2026-10-11T06:05:00+09:00',route:'국동 → 웅천동',pickupArea:'국동',dropoffArea:'웅천동',pickup:'여수시 국동 000 · 창고',dropoff:'여수시 웅천로 000 · 지하주차장',contact:'배차 확정 후 연결되는 안심번호',distance:8.4,item:'생활용품 3박스',weight:120,required:[],note:'파손주의 물품이 포함되어 있습니다. 고정 후 운행해 주세요.',customerTotal:37500,driverPayout:32000,platformFee:4000,pgFee:1000,expenses:500,assignedDriverId:''},
    {id:'YF-1011-03',status:'SETTLEMENT_PENDING',createdAt:'2026-10-11T05:30:00+09:00',route:'학동 → 돌산읍',pickupArea:'학동',dropoffArea:'돌산읍',pickup:'여수시 학동 000',dropoff:'여수시 돌산읍 000',contact:'배차 확정 후 연결되는 안심번호',distance:18.2,item:'포장 자재 1팔레트',weight:900,required:['리프트'],note:'배송완료 증빙 확인 대기 중입니다.',customerTotal:80000,driverPayout:70000,platformFee:7000,pgFee:2000,expenses:1000,assignedDriverId:'D-02'}
  ];
  const seedDrivers=[
    {id:'D-01',name:'김화물',vehicle:'700kg 리프트 카고',payload:700,features:['리프트'],area:'여수 전지역',hours:'주간·야간 · 오늘 운행 중',available:true,verified:true},
    {id:'D-02',name:'이용달',vehicle:'1톤 리프트 카고',payload:1000,features:['리프트'],area:'여수·광양',hours:'24시간 가능 · 오늘 운행 중',available:true,verified:true},
    {id:'D-03',name:'박운송',vehicle:'500kg 라보',payload:500,features:[],area:'여수 시내',hours:'주간만 · 현재 운행종료',available:false,verified:true}
  ];
  const clone=value=>JSON.parse(JSON.stringify(value));
  const initial=()=>({version:1,orders:clone(seedOrders),drivers:clone(seedDrivers),history:[]});
  function read(){
    try{
      const saved=JSON.parse(localStorage.getItem(KEY)||'null');
      if(saved&&Array.isArray(saved.orders)&&Array.isArray(saved.drivers))return saved;
    }catch{}
    const state=initial();write(state);return state;
  }
  function write(state){
    localStorage.setItem(KEY,JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(CHANGE_EVENT,{detail:clone(state)}));
    return state;
  }
  function reset(){return write(initial());}
  function eligibleDrivers(order,state=read()){
    return state.drivers.filter(driver=>driver.verified&&driver.available&&driver.payload>=Number(order.weight||0)&&(order.required||[]).every(feature=>driver.features.includes(feature)));
  }
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
  async function acceptOrder(orderId,driverId){
    const perform=()=>{
      const state=read();const order=state.orders.find(item=>item.id===orderId);
      const driver=state.drivers.find(item=>item.id===driverId);
      if(!order||order.status!=='OFFERED'||!driver||!eligibleDrivers(order,state).some(item=>item.id===driverId))return {ok:false,reason:'ALREADY_ASSIGNED'};
      return transition(orderId,'OFFERED','ASSIGNED',{assignedDriverId:driverId},`DRIVER:${driverId}`);
    };
    if(navigator.locks&&navigator.locks.request)return navigator.locks.request(`freight-accept-${orderId}`,perform);
    return perform();
  }
  function subscribe(listener){
    const local=event=>listener(event.detail||read());
    const storage=event=>{if(event.key===KEY)listener(read());};
    window.addEventListener(CHANGE_EVENT,local);window.addEventListener('storage',storage);
    return ()=>{window.removeEventListener(CHANGE_EVENT,local);window.removeEventListener('storage',storage);};
  }
  window.MatjidoFreightStore={KEY,read,reset,createRequest,transition,acceptOrder,eligibleDrivers,subscribe};
})();
