const DRIVER={status:'VERIFIED',payloadKg:700,features:['리프트']};
const ORDERS=[
  {id:'YF-DEMO-1011-01',pickupArea:'문수동',dropoffArea:'여천공단',pickupAddress:'여수시 문수로 00 · 상가 앞',dropoffAddress:'여수시 여수산단로 000 · 경비실 인계',contact:'배차 확정 후 연결되는 안심번호',distanceKm:12.8,item:'포장된 행사물품 6박스',weightKg:350,features:['리프트'],payout:45000,note:'상차지에서 물품을 리프트에 올려드립니다. 도착지 경비실 인계입니다.'},
  {id:'YF-DEMO-1011-02',pickupArea:'국동',dropoffArea:'웅천동',pickupAddress:'여수시 국동 000 · 창고',dropoffAddress:'여수시 웅천로 000 · 지하주차장',contact:'배차 확정 후 연결되는 안심번호',distanceKm:8.4,item:'생활용품 3박스',weightKg:120,features:[],payout:32000,note:'파손주의 물품이 포함되어 있습니다. 고정 후 운행해 주세요.'},
  {id:'YF-HIDDEN-OVERWEIGHT',pickupArea:'학동',dropoffArea:'돌산읍',pickupAddress:'비공개',dropoffAddress:'비공개',contact:'비공개',distanceKm:18.2,item:'자재 1팔레트',weightKg:900,features:['리프트'],payout:70000,note:'등록 적재량을 초과하므로 표시되면 안 됩니다.'}
];
const STATE_KEY='matjidoFreightDriverPreviewV1';
const tabs=[...document.querySelectorAll('[data-tab]')];
const panels={offers:document.querySelector('#offersPanel'),active:document.querySelector('#activePanel'),settlement:document.querySelector('#settlementPanel')};
const availability=document.querySelector('#availabilityToggle');
const offerList=document.querySelector('#offerList');
const offlineMessage=document.querySelector('#offlineMessage');
let state={available:false,activeOrderId:'',stage:'',settlements:[]};

function money(value){return `${Number(value||0).toLocaleString('ko-KR')}원`;}
function eligible(order){return DRIVER.status==='VERIFIED'&&order.weightKg<=DRIVER.payloadKg&&order.features.every(feature=>DRIVER.features.includes(feature));}
function save(){try{localStorage.setItem(STATE_KEY,JSON.stringify(state));}catch{}}
function load(){try{const saved=JSON.parse(localStorage.getItem(STATE_KEY)||'null');if(saved&&typeof saved==='object')state={...state,...saved};}catch{}}
function setTab(name){tabs.forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tab===name)));Object.entries(panels).forEach(([key,panel])=>{panel.hidden=key!==name;});window.scrollTo({top:0,behavior:'smooth'});}

function renderOffers(){
  availability.checked=Boolean(state.available);
  document.querySelector('#availabilityCopy').textContent=state.available?'운행 중 · 새 오더 알림을 받을 수 있습니다.':'운행을 시작하면 맞는 오더만 보여드려요.';
  const offers=ORDERS.filter(eligible).filter(order=>order.id!==state.activeOrderId);
  document.querySelector('#offerCount').textContent=state.available&&!state.activeOrderId?String(offers.length):'0';
  offlineMessage.hidden=state.available;
  offerList.hidden=!state.available;
  if(!state.available)return;
  offerList.innerHTML=state.activeOrderId?'<div class="empty-state"><span>🚚</span><h2>한 건을 수행 중입니다</h2><p>현재 배송을 완료한 뒤 새 오더를 받을 수 있습니다.</p></div>':offers.map(order=>`<article class="offer-card" data-order-id="${order.id}"><div class="offer-card-head"><span><small>${order.distanceKm.toFixed(1)}km · ${order.weightKg}kg</small><h2>${order.pickupArea} → ${order.dropoffArea}</h2></span><strong>받을 금액 ${money(order.payout)}</strong></div><div class="route-line"><div><i></i><span><small>출발 권역</small><b>${order.pickupArea}</b></span></div><div><i></i><span><small>도착 권역</small><b>${order.dropoffArea}</b></span></div></div><div class="offer-meta"><span>${order.item}</span><span>${order.weightKg}kg</span>${order.features.map(feature=>`<span>${feature} 필요</span>`).join('')}</div><p class="offer-note">${order.note}</p><button class="accept-offer" type="button" data-accept="${order.id}">이 금액으로 수락하기</button></article>`).join('');
  offerList.querySelectorAll('[data-accept]').forEach(button=>button.addEventListener('click',()=>acceptOrder(button.dataset.accept)));
}

function acceptOrder(id){
  if(state.activeOrderId)return;
  const order=ORDERS.find(candidate=>candidate.id===id&&eligible(candidate));if(!order)return;
  state.activeOrderId=id;state.stage='accepted';save();renderAll();setTab('active');
}

const stageOrder=['accepted','arrived','picked_up','delivered'];
function renderActive(){
  const order=ORDERS.find(candidate=>candidate.id===state.activeOrderId);
  document.querySelector('#activeEmpty').hidden=Boolean(order);
  document.querySelector('#activeOrder').hidden=!order;
  if(!order)return;
  document.querySelector('#activePayout').textContent=`받을 금액 ${money(order.payout)}`;
  document.querySelector('#activeRoute').textContent=`${order.pickupArea} → ${order.dropoffArea}`;
  document.querySelector('#activeItem').textContent=`${order.item} · ${order.weightKg}kg · ${order.distanceKm.toFixed(1)}km`;
  document.querySelector('#activePickup').textContent=order.pickupAddress;
  document.querySelector('#activeDropoff').textContent=order.dropoffAddress;
  document.querySelector('#activeContact').textContent=order.contact;
  const currentIndex=stageOrder.indexOf(state.stage);
  document.querySelectorAll('[data-progress]').forEach((item,index)=>{item.classList.toggle('is-done',index<currentIndex||state.stage==='delivered');item.classList.toggle('is-current',index===currentIndex&&state.stage!=='delivered');});
  const labels={accepted:['배차 확정','현장에 도착했습니다'],arrived:['현장 도착','물품을 인수했습니다'],picked_up:['배송 중','배송을 완료했습니다'],delivered:['정산 대기','배송완료 처리됨']};
  const [badge,button]=labels[state.stage]||labels.accepted;
  document.querySelector('#activeStatusBadge').textContent=badge;
  const advance=document.querySelector('#advanceOrder');advance.textContent=button;
  const proof=document.querySelector('#proofCheck');
  document.querySelector('#proofCheckWrap').hidden=state.stage!=='picked_up';
  if(state.stage!=='picked_up')proof.checked=false;
  advance.disabled=state.stage==='delivered'||(state.stage==='picked_up'&&!proof.checked);
}

function advanceOrder(){
  const order=ORDERS.find(candidate=>candidate.id===state.activeOrderId);if(!order)return;
  if(state.stage==='accepted')state.stage='arrived';
  else if(state.stage==='arrived')state.stage='picked_up';
  else if(state.stage==='picked_up'){
    if(!document.querySelector('#proofCheck').checked)return;
    state.stage='delivered';
    if(!state.settlements.some(row=>row.orderId===order.id))state.settlements.push({orderId:order.id,route:`${order.pickupArea} → ${order.dropoffArea}`,amount:order.payout,status:'정산대기'});
  }
  save();renderAll();
}

function renderSettlement(){
  const total=state.settlements.filter(row=>row.status==='정산대기').reduce((sum,row)=>sum+row.amount,0);
  document.querySelector('#pendingTotal').textContent=money(total);
  const list=document.querySelector('#settlementList');
  list.innerHTML=state.settlements.length?state.settlements.map(row=>`<div class="settlement-row"><span><b>${row.route}</b><small>${row.orderId} · ${row.status}</small></span><strong>${money(row.amount)}</strong></div>`).join(''):'<div class="empty-state compact"><span>🧾</span><h2>아직 정산내역이 없습니다</h2></div>';
}

function renderAll(){renderOffers();renderActive();renderSettlement();}
tabs.forEach(button=>button.addEventListener('click',()=>setTab(button.dataset.tab)));
availability.addEventListener('change',()=>{state.available=availability.checked;save();renderAll();});
document.querySelector('#refreshOffers').addEventListener('click',renderOffers);
document.querySelector('#advanceOrder').addEventListener('click',advanceOrder);
document.querySelector('#proofCheck').addEventListener('change',()=>{document.querySelector('#advanceOrder').disabled=!document.querySelector('#proofCheck').checked;});
document.querySelector('#cancelDemo').addEventListener('click',()=>{state.activeOrderId='';state.stage='';state.settlements=[];save();renderAll();setTab('offers');});
load();renderAll();
