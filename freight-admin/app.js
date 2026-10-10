const Store=window.MatjidoFreightStore;
let selectedId='YF-1011-01';
const money=value=>`${Number(value||0).toLocaleString('ko-KR')}원`;
const statusLabel=status=>({QUOTING:'견적검토',PAID:'결제완료·배차대기',OFFERED:'기사알림 발송',ASSIGNED:'기사배차 완료',ARRIVED:'현장도착',PICKED_UP:'배송 중',SETTLEMENT_PENDING:'정산대기'}[status]||status);
function matchingDrivers(order,state){return state.drivers.map(driver=>({...driver,eligible:Store.eligibleDrivers(order,state).some(item=>item.id===driver.id)}));}
function renderSummary(state){
  document.querySelector('#quoteCount').textContent=state.orders.filter(order=>order.status==='QUOTING').length;
  document.querySelector('#dispatchCount').textContent=state.orders.filter(order=>['PAID','OFFERED'].includes(order.status)).length;
  document.querySelector('#activeCount').textContent=state.orders.filter(order=>['ASSIGNED','ARRIVED','PICKED_UP','SETTLEMENT_PENDING'].includes(order.status)).length;
}
function renderOrders(state){
  if(!state.orders.some(order=>order.id===selectedId))selectedId=state.orders[0]?.id||'';
  const list=document.querySelector('#orderList');
  list.innerHTML=state.orders.map(order=>`<button class="order-card" type="button" data-order="${order.id}" aria-pressed="${selectedId===order.id}"><small>${order.id} · ${Number(order.distance||0).toFixed(1)}km</small><b>${order.route}</b><span>${statusLabel(order.status)}</span></button>`).join('');
  list.querySelectorAll('[data-order]').forEach(button=>button.addEventListener('click',()=>{selectedId=button.dataset.order;renderAll();}));renderDetail(state);
}
function renderDetail(state){
  const order=state.orders.find(item=>item.id===selectedId)||state.orders[0];if(!order){document.querySelector('#orderDetail').innerHTML='<p>요청이 없습니다.</p>';return;}
  const candidates=matchingDrivers(order,state);const eligible=candidates.filter(driver=>driver.eligible);let action='';
  if(order.status==='QUOTING')action='<button class="action secondary" type="button" data-action="approve">견적 확정·결제완료 시연</button><p class="action-note">프리뷰에서는 견적과 결제승인을 한 번에 시연합니다. 실제 운영에서는 PG 승인 후에만 다음 단계로 갑니다.</p>';
  if(order.status==='PAID')action=`<button class="action" type="button" data-action="offer" ${eligible.length?'':'disabled'}>조건 맞는 기사 ${eligible.length}명에게 알림</button><p class="action-note">기사 화면에서 먼저 수락한 한 명만 배차됩니다.</p>`;
  if(order.status==='OFFERED')action='<button class="action" type="button" disabled>기사 수락 대기 중</button><p class="action-note">화물기사 화면에서 수락하면 이 주문이 자동으로 배차완료로 바뀝니다.</p>';
  if(['ASSIGNED','ARRIVED','PICKED_UP'].includes(order.status))action=`<button class="action" type="button" disabled>${statusLabel(order.status)} · 상태 추적</button><p class="action-note">현장도착·인수·완료증빙은 기사 화면에서 들어옵니다.</p>`;
  if(order.status==='SETTLEMENT_PENDING')action='<button class="action" type="button" data-tab-jump="settlement">완료증빙과 정산원장 확인</button>';
  document.querySelector('#orderDetail').innerHTML=`<div class="detail-head"><span><small>${order.id} · 실제 도로거리 ${Number(order.distance||0).toFixed(1)}km</small><h2>${order.route}</h2></span><strong>${statusLabel(order.status)}</strong></div><div class="route"><div><span>출발</span><b>${order.pickup}</b></div><div><span>도착</span><b>${order.dropoff}</b></div></div><div class="goods"><span>${order.item}</span><span>${order.weight}kg</span>${(order.required||[]).map(item=>`<span>${item} 필요</span>`).join('')}</div><div class="money-grid"><div class="money-box primary"><small>고객 최종 결제액</small><strong>${money(order.customerTotal)}</strong></div><div class="money-box"><small>기사에게 보일 확정 수행료</small><strong>${money(order.driverPayout)}</strong></div></div><div class="breakdown"><div><span>맛지도 이용금액</span><b>${money(order.platformFee)}</b></div><div><span>결제 비용</span><b>${money(order.pgFee)}</b></div><div><span>통행·주차 등 실비</span><b>${money(order.expenses)}</b></div></div><h3 class="match-title">조건 일치 기사 ${eligible.length}명</h3><div class="candidate-list">${candidates.map(driver=>`<div class="candidate ${driver.eligible?'':'unavailable'}"><span><b>${driver.name} · ${driver.vehicle}</b><small>${driver.area} · ${driver.hours}</small></span><em>${driver.eligible?'알림 가능':driver.available?'차량조건 불일치':'운행종료'}</em></div>`).join('')}</div>${action}`;
  document.querySelector('[data-action]')?.addEventListener('click',event=>advance(order,event.currentTarget.dataset.action));document.querySelector('[data-tab-jump]')?.addEventListener('click',event=>setTab(event.currentTarget.dataset.tabJump));
}
function advance(order,action){
  if(action==='approve')Store.transition(order.id,'QUOTING','PAID',{customerTotal:order.customerTotal||37500,driverPayout:order.driverPayout||32000,platformFee:order.platformFee||4000,pgFee:order.pgFee||1000,expenses:order.expenses||500},'ADMIN_PREVIEW');
  if(action==='offer'&&Store.eligibleDrivers(order).length)Store.transition(order.id,'PAID','OFFERED',{},'ADMIN_PREVIEW');renderAll();
}
function renderLedger(state){document.querySelector('#settlementLedger').innerHTML=state.orders.map(order=>`<article class="ledger-row"><div><span><b>${order.id} · ${order.route}</b></span><strong>${money(order.driverPayout)}</strong></div><p>고객 ${money(order.customerTotal)} · 기사 ${money(order.driverPayout)} · 맛지도 ${money(order.platformFee)} · 결제비용 ${money(order.pgFee)} · 실비 ${money(order.expenses)} · ${statusLabel(order.status)}</p></article>`).join('');}
function renderDrivers(state){document.querySelector('#driverList').innerHTML=state.drivers.map(driver=>`<article class="driver-row"><div><span class="avatar">🚚</span><span><b>${driver.name} · ${driver.vehicle}</b><small>${driver.area}</small></span><strong>${driver.available?'운행 중':'운행종료'}</strong></div><p>${driver.hours} · 서류상태 VERIFIED · ${driver.payload}kg 이하${driver.features.length?` · ${driver.features.join(', ')}`:''}</p></article>`).join('');}
function setTab(name){document.querySelectorAll('[data-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.tab===name)));for(const [key,id] of Object.entries({orders:'ordersPanel',settlement:'settlementPanel',drivers:'driversPanel'}))document.querySelector(`#${id}`).hidden=key!==name;window.scrollTo({top:0,behavior:'smooth'});}
function renderAll(){const state=Store.read();renderSummary(state);renderOrders(state);renderLedger(state);renderDrivers(state);}
document.querySelectorAll('[data-tab]').forEach(button=>button.addEventListener('click',()=>setTab(button.dataset.tab)));document.querySelector('#resetDemo').addEventListener('click',()=>{Store.reset();selectedId='YF-1011-01';renderAll();});Store.subscribe(renderAll);renderAll();
