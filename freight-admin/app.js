const ORDERS=[
  {id:'YF-1011-01',status:'PAID',label:'결제완료·배차대기',route:'문수동 → 여천공단',pickup:'여수시 문수로 00 · 상가 앞',dropoff:'여수시 여수산단로 000 · 경비실 인계',distance:12.8,item:'포장된 행사물품 6박스',weight:350,required:['리프트'],customerTotal:52500,driverPayout:45000,platformFee:5000,pgFee:1500,expenses:1000},
  {id:'YF-1011-02',status:'QUOTING',label:'견적검토',route:'국동 → 웅천동',pickup:'여수시 국동 000 · 창고',dropoff:'여수시 웅천로 000 · 지하주차장',distance:8.4,item:'생활용품 3박스',weight:120,required:[],customerTotal:37500,driverPayout:32000,platformFee:4000,pgFee:1000,expenses:500},
  {id:'YF-1011-03',status:'SETTLEMENT_PENDING',label:'정산대기',route:'학동 → 돌산읍',pickup:'여수시 학동 000',dropoff:'여수시 돌산읍 000',distance:18.2,item:'포장 자재 1팔레트',weight:900,required:['리프트'],customerTotal:80000,driverPayout:70000,platformFee:7000,pgFee:2000,expenses:1000}
];
const DRIVERS=[
  {id:'D-01',name:'김화물',vehicle:'700kg 리프트 카고',payload:700,features:['리프트'],area:'여수 전지역',hours:'주간·야간 · 오늘 운행 중',available:true,verified:true},
  {id:'D-02',name:'이용달',vehicle:'1톤 리프트 카고',payload:1000,features:['리프트'],area:'여수·광양',hours:'24시간 가능 · 오늘 운행 중',available:true,verified:true},
  {id:'D-03',name:'박운송',vehicle:'500kg 라보',payload:500,features:[],area:'여수 시내',hours:'주간만 · 현재 운행종료',available:false,verified:true}
];
const STATE_KEY='matjidoFreightAdminPreviewV1';
let state={selectedId:ORDERS[0].id,workflow:{}};

function money(value){return `${Number(value||0).toLocaleString('ko-KR')}원`;}
function save(){try{localStorage.setItem(STATE_KEY,JSON.stringify(state));}catch{}}
function load(){try{const saved=JSON.parse(localStorage.getItem(STATE_KEY)||'null');if(saved&&typeof saved==='object')state={...state,...saved};}catch{}}
function workflow(order){return state.workflow[order.id]||order.status;}
function matchingDrivers(order){return DRIVERS.map(driver=>({...driver,eligible:driver.verified&&driver.available&&driver.payload>=order.weight&&order.required.every(feature=>driver.features.includes(feature))}));}
function statusLabel(order){const value=workflow(order);return {QUOTING:'견적검토',PAID:'결제완료·배차대기',OFFERED:'기사알림 발송',ASSIGNED:'기사배차 완료',SETTLEMENT_PENDING:'정산대기'}[value]||order.label;}

function renderSummary(){
  document.querySelector('#quoteCount').textContent=ORDERS.filter(order=>workflow(order)==='QUOTING').length;
  document.querySelector('#dispatchCount').textContent=ORDERS.filter(order=>['PAID','OFFERED'].includes(workflow(order))).length;
  document.querySelector('#activeCount').textContent=ORDERS.filter(order=>['ASSIGNED','SETTLEMENT_PENDING'].includes(workflow(order))).length;
}

function renderOrders(){
  const list=document.querySelector('#orderList');
  list.innerHTML=ORDERS.map(order=>`<button class="order-card" type="button" data-order="${order.id}" aria-pressed="${state.selectedId===order.id}"><small>${order.id} · ${order.distance.toFixed(1)}km</small><b>${order.route}</b><span>${statusLabel(order)}</span></button>`).join('');
  list.querySelectorAll('[data-order]').forEach(button=>button.addEventListener('click',()=>{state.selectedId=button.dataset.order;save();renderAll();}));
  renderDetail();
}

function renderDetail(){
  const order=ORDERS.find(item=>item.id===state.selectedId)||ORDERS[0];
  const current=workflow(order);
  const candidates=matchingDrivers(order);
  const eligible=candidates.filter(driver=>driver.eligible);
  let action='';
  if(current==='QUOTING')action='<button class="action secondary" type="button" data-action="approve">견적 확정·고객 결제대기 만들기</button><p class="action-note">결제가 승인되기 전에는 기사에게 오더를 보내지 않습니다.</p>';
  if(current==='PAID')action=`<button class="action" type="button" data-action="offer" ${eligible.length?'':'disabled'}>조건 맞는 기사 ${eligible.length}명에게 알림</button><p class="action-note">알림을 보내도 먼저 수락한 한 명만 서버에서 배차됩니다.</p>`;
  if(current==='OFFERED')action='<button class="action secondary" type="button" data-action="accept">기사 수락 시뮬레이션</button><p class="action-note">실제 운영에서는 기사 앱의 첫 수락만 원자적으로 확정합니다.</p>';
  if(current==='ASSIGNED')action='<button class="action" type="button" disabled>기사 수행 중 · 상태 추적</button><p class="action-note">현장도착·인수·완료증빙은 기사 화면에서 들어옵니다.</p>';
  if(current==='SETTLEMENT_PENDING')action='<button class="action" type="button" data-tab-jump="settlement">완료증빙과 정산원장 확인</button>';
  document.querySelector('#orderDetail').innerHTML=`<div class="detail-head"><span><small>${order.id} · 실제 도로거리 ${order.distance.toFixed(1)}km</small><h2>${order.route}</h2></span><strong>${statusLabel(order)}</strong></div><div class="route"><div><span>출발</span><b>${order.pickup}</b></div><div><span>도착</span><b>${order.dropoff}</b></div></div><div class="goods"><span>${order.item}</span><span>${order.weight}kg</span>${order.required.map(item=>`<span>${item} 필요</span>`).join('')}</div><div class="money-grid"><div class="money-box primary"><small>고객 최종 결제액</small><strong>${money(order.customerTotal)}</strong></div><div class="money-box"><small>기사에게 보일 확정 수행료</small><strong>${money(order.driverPayout)}</strong></div></div><div class="breakdown"><div><span>맛지도 이용금액</span><b>${money(order.platformFee)}</b></div><div><span>결제 비용</span><b>${money(order.pgFee)}</b></div><div><span>통행·주차 등 실비</span><b>${money(order.expenses)}</b></div></div><h3 class="match-title">조건 일치 기사 ${eligible.length}명</h3><div class="candidate-list">${candidates.map(driver=>`<div class="candidate ${driver.eligible?'':'unavailable'}"><span><b>${driver.name} · ${driver.vehicle}</b><small>${driver.area} · ${driver.hours}</small></span><em>${driver.eligible?'알림 가능':driver.available?'차량조건 불일치':'운행종료'}</em></div>`).join('')}</div>${action}`;
  const actionButton=document.querySelector('[data-action]');if(actionButton)actionButton.addEventListener('click',()=>advance(order,actionButton.dataset.action));
  const jump=document.querySelector('[data-tab-jump]');if(jump)jump.addEventListener('click',()=>setTab(jump.dataset.tabJump));
}

function advance(order,action){
  if(action==='approve')state.workflow[order.id]='PAID';
  if(action==='offer'&&matchingDrivers(order).some(driver=>driver.eligible))state.workflow[order.id]='OFFERED';
  if(action==='accept'&&workflow(order)==='OFFERED')state.workflow[order.id]='ASSIGNED';
  save();renderAll();
}

function renderLedger(){
  document.querySelector('#settlementLedger').innerHTML=ORDERS.map(order=>`<article class="ledger-row"><div><span><b>${order.id} · ${order.route}</b></span><strong>${money(order.driverPayout)}</strong></div><p>고객 ${money(order.customerTotal)} · 기사 ${money(order.driverPayout)} · 맛지도 ${money(order.platformFee)} · 결제비용 ${money(order.pgFee)} · 실비 ${money(order.expenses)} · ${statusLabel(order)}</p></article>`).join('');
}
function renderDrivers(){
  document.querySelector('#driverList').innerHTML=DRIVERS.map(driver=>`<article class="driver-row"><div><span class="avatar">🚚</span><span><b>${driver.name} · ${driver.vehicle}</b><small>${driver.area}</small></span><strong>${driver.available?'운행 중':'운행종료'}</strong></div><p>${driver.hours} · 서류상태 VERIFIED · ${driver.payload}kg 이하${driver.features.length?` · ${driver.features.join(', ')}`:''}</p></article>`).join('');
}
function setTab(name){document.querySelectorAll('[data-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tab===name)));for(const [key,id] of Object.entries({orders:'ordersPanel',settlement:'settlementPanel',drivers:'driversPanel'}))document.querySelector(`#${id}`).hidden=key!==name;window.scrollTo({top:0,behavior:'smooth'});}
function renderAll(){renderSummary();renderOrders();renderLedger();renderDrivers();}
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>setTab(button.dataset.tab)));
document.querySelector('#resetDemo').addEventListener('click',()=>{state={selectedId:ORDERS[0].id,workflow:{}};save();renderAll();});
load();renderAll();
