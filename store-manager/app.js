const STORAGE_KEY='matjido-store-manager-preview-v1';
const ONBOARD_KEY='matjido-store-onboarding-preview-v1';
const STORE_ORDER_ENDPOINT='https://daedong-yeosu-admin.sisakim.chatgpt.site/api/store-orders/preview';
const PREVIEW_CLIENT='store-manager-preview';
const STATUS={new:'새 주문',accepted:'주문 수락',preparing:'준비중',ready:'준비완료',delivery_requested:'배송요청',assigned:'기사 배정',delivering:'배송중',completed:'배송완료',rejected:'주문 거절',cancelled:'주문 취소'};
const initialOrders=[
  {id:'YM-1021',placedAt:'2026-10-12T10:21:00+09:00',status:'new',customer:'김○수',phone:'010-12**-56**',address:'전남 여수시 여문2로 38 · 101동 1203호',request:'문 앞에 놓고 벨을 눌러주세요.',items:[{name:'국산 고춧가루',unit:'500g',quantity:1,price:12000},{name:'배추',unit:'1통',quantity:2,price:4500}],subtotal:21000,deliveryFee:6100,merchantSupport:1000,platformFee:500,history:[{status:'new',at:'2026-10-12T10:21:00+09:00',note:'고객 결제 완료 · 상점에 새 주문 알림'}]},
  {id:'YM-1019',placedAt:'2026-10-12T10:08:00+09:00',status:'preparing',customer:'박○희',phone:'010-98**-43**',address:'전남 여수시 문수로 27 · 현관 앞',request:'배추 상태 좋은 것으로 부탁드립니다.',items:[{name:'배추',unit:'1통',quantity:1,price:4500},{name:'생수',unit:'1박스',quantity:1,price:6500}],subtotal:11000,deliveryFee:5500,merchantSupport:0,platformFee:500,history:[{status:'new',at:'2026-10-12T10:08:00+09:00',note:'고객 결제 완료'},{status:'accepted',at:'2026-10-12T10:09:00+09:00',note:'상점에서 주문 수락'},{status:'preparing',at:'2026-10-12T10:09:00+09:00',note:'상품 준비 시작'}]},
  {id:'YM-1015',placedAt:'2026-10-12T09:42:00+09:00',status:'delivering',customer:'이○민',phone:'010-34**-78**',address:'전남 여수시 좌수영로 55 · 2층',request:'깨지지 않게 부탁드립니다.',items:[{name:'공구 나사 세트',unit:'1팩',quantity:2,price:6900}],subtotal:13800,deliveryFee:5800,merchantSupport:0,platformFee:500,history:[{status:'new',at:'2026-10-12T09:42:00+09:00',note:'고객 결제 완료'},{status:'accepted',at:'2026-10-12T09:43:00+09:00',note:'상점에서 주문 수락'},{status:'preparing',at:'2026-10-12T09:43:00+09:00',note:'상품 준비 시작'},{status:'ready',at:'2026-10-12T09:49:00+09:00',note:'포장과 수량 확인 완료'},{status:'delivery_requested',at:'2026-10-12T09:50:00+09:00',note:'배송요청 생성'},{status:'assigned',at:'2026-10-12T09:52:00+09:00',note:'배달기사 배정 완료'},{status:'delivering',at:'2026-10-12T09:58:00+09:00',note:'기사 픽업 완료 · 배송 시작'}]},
  {id:'YM-1008',placedAt:'2026-10-12T08:53:00+09:00',status:'completed',customer:'최○영',phone:'010-55**-11**',address:'전남 여수시 웅천남1로 8 · 로비',request:'',items:[{name:'생수',unit:'1박스',quantity:1,price:6500}],subtotal:6500,deliveryFee:7300,merchantSupport:0,platformFee:500,history:[{status:'new',at:'2026-10-12T08:53:00+09:00',note:'고객 결제 완료'},{status:'accepted',at:'2026-10-12T08:55:00+09:00',note:'상점에서 주문 수락'},{status:'preparing',at:'2026-10-12T08:55:00+09:00',note:'상품 준비 시작'},{status:'ready',at:'2026-10-12T09:01:00+09:00',note:'상품 준비완료'},{status:'delivery_requested',at:'2026-10-12T09:02:00+09:00',note:'배송요청 생성'},{status:'delivering',at:'2026-10-12T09:14:00+09:00',note:'배송 시작'},{status:'completed',at:'2026-10-12T09:28:00+09:00',note:'고객 전달 완료'}]}
];

let orders=loadOrders();
let filter='active';
let selectedId=null;
let relayTimer=null;

function copyOrders(){return JSON.parse(JSON.stringify(initialOrders));}
function loadOrders(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');return Array.isArray(saved)&&saved.length?saved:copyOrders();}catch{return copyOrders();}}
function saveOrders(){localStorage.setItem(STORAGE_KEY,JSON.stringify(orders));}
function money(value){return `${Math.max(0,Number(value)||0).toLocaleString('ko-KR')}원`;}
function clock(value){return new Intl.DateTimeFormat('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(value));}
function now(){return new Date().toISOString();}
function orderTotal(order){return order.subtotal+Math.max(0,order.deliveryFee-order.merchantSupport)+order.platformFee;}
function itemSummary(order){return order.items.map(item=>`${item.name} · 수량 ${item.quantity} · ${item.unit}`).join(' / ');}
function loadStoreName(){try{const store=JSON.parse(localStorage.getItem(ONBOARD_KEY)||'null');if(store?.previewOnly&&store.storeName)document.querySelector('#storeStatusTitle').textContent=store.storeName;}catch{}}
function currentStoreId(){try{const store=JSON.parse(localStorage.getItem(ONBOARD_KEY)||'null');return String(store?.storeId||'demo-yeosu-store').replace(/[^a-zA-Z0-9_-]/g,'').slice(0,80)||'demo-yeosu-store';}catch{return'demo-yeosu-store';}}
function relayOrder(value){const status=String(value.status||'NEW').toLowerCase();return{id:String(value.id),placedAt:String(value.createdAt),status,version:Number(value.version),relay:true,customer:'테스트',phone:'개인정보 미수집',address:String(value.destinationLabel||'배송지 비공개'),request:String(value.customerRequest||''),items:(Array.isArray(value.items)?value.items:[]).map(item=>({name:String(item.name||''),unit:'개',quantity:Number(item.quantity)||1,price:Number(item.priceWon)||0})),subtotal:Number(value.subtotalWon)||0,deliveryFee:Number(value.deliveryFeeWon)||0,merchantSupport:Number(value.merchantSupportWon)||0,platformFee:Number(value.platformFeeWon)||0,history:[{status,at:String(value.updatedAt||value.createdAt),note:`서버 테스트 주문 · ${STATUS[status]||status}`} ]};}
async function refreshRelayOrders(){
  const status=document.querySelector('#relayStatus');
  try{const response=await fetch(`${STORE_ORDER_ENDPOINT}?storeId=${encodeURIComponent(currentStoreId())}`,{headers:{'accept':'application/json','X-Matjido-Preview-Client':PREVIEW_CLIENT},credentials:'omit'});if(!response.ok)throw new Error(`relay-${response.status}`);const result=await response.json();const fixtures=orders.filter(order=>!order.relay);orders=[...(result.orders||[]).map(relayOrder),...fixtures];status.textContent='고객 온라인 상점의 테스트 주문과 연결되었습니다. 실제 결제·환불·고객 알림·젠딜리 배송요청은 발생하지 않습니다.';renderOrders();if(selectedId){const selected=orders.find(order=>order.id===selectedId);if(selected)openOrder(selected.id);}}
  catch{status.textContent='테스트 주문 서버 연결을 확인하는 중입니다. 아래 가짜 주문으로 화면 기능은 계속 확인할 수 있습니다.';}
}
function group(order){if(order.status==='completed')return'completed';if(['rejected','cancelled'].includes(order.status))return'cancelled';return'active';}

function updateCounts(){
  const count=status=>orders.filter(order=>status.includes(order.status)).length;
  document.querySelector('#newCount').textContent=count(['new']);
  document.querySelector('#preparingCount').textContent=count(['accepted','preparing','ready']);
  document.querySelector('#deliveryCount').textContent=count(['delivery_requested','assigned','delivering']);
  document.querySelector('#completedCount').textContent=count(['completed']);
  document.querySelector('#activeBadge').textContent=count(['new','accepted','preparing','ready','delivery_requested','assigned','delivering']);
}

function renderOrders(){
  updateCounts();
  const list=document.querySelector('#orderList');
  const visible=orders.filter(order=>group(order)===filter);
  list.replaceChildren();
  document.querySelector('#orderListTitle').textContent=filter==='active'?'지금 처리할 주문':filter==='completed'?'완료된 주문':'거절·취소 주문';
  if(!visible.length){const empty=document.createElement('div');empty.className='empty-list';empty.innerHTML='<b>해당 주문이 없습니다.</b><span>주문 상태가 바뀌면 이곳에 자동으로 정리됩니다.</span>';list.append(empty);return;}
  visible.sort((a,b)=>new Date(b.placedAt)-new Date(a.placedAt)).forEach(order=>{
    const card=document.createElement('article');
    card.className=`order-card${order.status==='new'?' is-new':''}`;
    card.innerHTML=`<header><span><small>${order.id} · ${clock(order.placedAt)}</small><b>${order.customer} 고객</b></span><em class="status-pill">${STATUS[order.status]}</em></header><p class="items"></p><p class="address"></p><footer><span class="total"><small>고객 결제금액</small><b>${money(orderTotal(order))}</b></span><button class="open-order" type="button">주문 보기</button></footer>`;
    card.querySelector('.items').textContent=itemSummary(order);
    card.querySelector('.address').textContent=order.address;
    card.querySelector('button').addEventListener('click',()=>openOrder(order.id));
    list.append(card);
  });
}

async function history(order,status,note){
  if(!order.relay){order.status=status;order.history.push({status,at:now(),note});saveOrders();renderOrders();openOrder(order.id);return;}
  const targets=order.status==='new'&&status==='preparing'?['ACCEPTED','PREPARING']:[status.toUpperCase()];
  try{for(const target of targets){const response=await fetch(`${STORE_ORDER_ENDPOINT}/${encodeURIComponent(order.id)}`,{method:'PATCH',headers:{'content-type':'application/json','accept':'application/json','X-Matjido-Preview-Client':PREVIEW_CLIENT,'If-Match':`"${order.version}"`},credentials:'omit',body:JSON.stringify({storeId:currentStoreId(),status:target,note})});const result=await response.json();if(!response.ok)throw new Error(result?.message||`status-${response.status}`);const next=relayOrder(result.order);order.status=next.status;order.version=next.version;order.history.push({status:next.status,at:now(),note});}renderOrders();openOrder(order.id);}catch(error){document.querySelector('#relayStatus').textContent=error?.message||'주문상태를 변경하지 못했습니다. 새로고침 후 다시 시도해 주세요.';await refreshRelayOrders();}
}
function renderActions(order){
  const actions=document.querySelector('#panelActions');actions.replaceChildren();
  const button=(label,className,handler)=>{const node=document.createElement('button');node.type='button';node.className=className;node.textContent=label;node.addEventListener('click',handler);actions.append(node);};
  if(order.status==='new'){
    button('거절 사유 선택','secondary',()=>document.querySelector('#rejectPanel').hidden=false);
    button('주문 수락','primary',()=>history(order,'preparing','상점에서 주문을 수락하고 상품 준비 시작'));
  }else if(['accepted','preparing'].includes(order.status)){
    button('상품 준비완료','primary single',()=>history(order,'ready','상품 수량과 포장 준비완료'));
  }else if(order.status==='ready'){
    button('배송요청','primary delivery single',()=>document.querySelector('#deliveryPanel').hidden=false);
  }else button('확인','secondary single',closeOrder);
}

function openOrder(id){
  selectedId=id;const order=orders.find(item=>item.id===id);if(!order)return;
  document.querySelector('#panelOrderNumber').textContent=`주문번호 ${order.id} · ${clock(order.placedAt)}`;
  document.querySelector('#panelTitle').textContent=`${order.customer} 고객 주문`;
  document.querySelector('#panelStatus').textContent=STATUS[order.status];
  document.querySelector('#panelRequest').textContent=order.request||'별도 요청사항이 없습니다.';
  document.querySelector('#panelAddress').textContent=order.address;
  document.querySelector('#panelPhone').textContent=order.phone;
  document.querySelector('#panelDelivery').textContent=money(order.deliveryFee);
  const items=document.querySelector('#panelItems');items.replaceChildren();
  order.items.forEach(item=>{const row=document.createElement('div');const name=document.createElement('span');name.textContent=`${item.name} · 수량 ${item.quantity} · ${item.unit}`;const amount=document.createElement('b');amount.textContent=money(item.price*item.quantity);row.append(name,amount);items.append(row);});
  const merchantSettlement=order.subtotal-order.merchantSupport;
  document.querySelector('#panelMoney').innerHTML=`<div><dt>상품금액</dt><dd>${money(order.subtotal)}</dd></div><div><dt>상점 배송비 지원</dt><dd>${order.merchantSupport?`-${money(order.merchantSupport)}`:'0원'}</dd></div><div><dt>고객 배송비</dt><dd>${money(Math.max(0,order.deliveryFee-order.merchantSupport))}</dd></div><div><dt>맛지도 이용금액</dt><dd>${money(order.platformFee)}</dd></div><div><dt>고객 총 결제금액</dt><dd>${money(orderTotal(order))}</dd></div><div class="settlement"><dt>상점 정산예정</dt><dd>${money(merchantSettlement)}</dd></div>`;
  const log=document.querySelector('#panelHistory');log.replaceChildren();
  [...order.history].reverse().forEach(entry=>{const row=document.createElement('li');row.textContent=entry.note;const time=document.createElement('time');time.textContent=`${clock(entry.at)} · ${STATUS[entry.status]}`;row.append(time);log.append(row);});
  renderActions(order);document.querySelector('#orderPanel').hidden=false;document.body.style.overflow='hidden';
}

function closeOrder(){document.querySelector('#orderPanel').hidden=true;document.body.style.overflow='';selectedId=null;}
document.querySelectorAll('[data-filter]').forEach(button=>button.addEventListener('click',()=>{filter=button.dataset.filter;document.querySelectorAll('[data-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));renderOrders();}));
document.querySelector('#closePanel').addEventListener('click',closeOrder);
document.querySelector('#storeOpen').addEventListener('change',event=>{document.querySelector('#storeOpenText').textContent=event.target.checked?'주문 받는 중':'주문 일시중지';});
document.querySelector('#resetDemo').addEventListener('click',refreshRelayOrders);
document.querySelector('#cancelReject').addEventListener('click',()=>{document.querySelector('#rejectPanel').hidden=true;});
document.querySelector('#confirmReject').addEventListener('click',()=>{const order=orders.find(item=>item.id===selectedId);if(!order)return;const reason=document.querySelector('[name="rejectReason"]:checked').value;document.querySelector('#rejectPanel').hidden=true;history(order,'rejected',`${reason} 사유로 주문 거절 · 고객 환불요청 상태`);});
document.querySelector('#packingCheck').addEventListener('change',event=>{document.querySelector('#confirmDelivery').disabled=!event.target.checked;});
document.querySelector('#cancelDelivery').addEventListener('click',()=>{document.querySelector('#deliveryPanel').hidden=true;document.querySelector('#packingCheck').checked=false;document.querySelector('#confirmDelivery').disabled=true;});
document.querySelector('#confirmDelivery').addEventListener('click',()=>{const order=orders.find(item=>item.id===selectedId);if(!order)return;document.querySelector('#deliveryPanel').hidden=true;document.querySelector('#packingCheck').checked=false;document.querySelector('#confirmDelivery').disabled=true;history(order,'delivery_requested','배송요청 미리보기 생성 · 실제 젠딜리 전송 안 됨');});

loadStoreName();
renderOrders();
refreshRelayOrders();relayTimer=setInterval(refreshRelayOrders,5000);
