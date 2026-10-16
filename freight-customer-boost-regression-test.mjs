import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const storeSource=fs.readFileSync('freight-order-store.js','utf8');
const requestHtml=fs.readFileSync('freight-request/index.html','utf8');
const requestJs=fs.readFileSync('freight-request/app.js','utf8');
const adminJs=fs.readFileSync('freight-admin/app.js','utf8');
const driverJs=fs.readFileSync('freight-driver/app.js','utf8');
const storage=new Map();
const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,String(value))};
class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail;}}
const window={dispatchEvent(){},addEventListener(){},removeEventListener(){}};
const context={window,localStorage,CustomEvent,navigator:{},Intl,Date,JSON,Number,String,Array,Math};
vm.runInNewContext(storeSource,context);
const Store=window.MatjidoFreightStore;

Store.reset();
const base=Store.read().orders.find(order=>order.id==='YF-1011-01');
assert.equal(base.driverPayout,45000);
assert.equal(base.customerTotal,52500);
const offeredAt=Date.now()-Store.OFFER_TIMEOUT_MS-1000;
assert.equal(Store.transition(base.id,'PAID','OFFERED',{offerRound:1,boostEligible:false,lastOfferedAt:new Date(offeredAt).toISOString()},'ADMIN').ok,true);
assert.equal(Store.offerSecondsRemaining(Store.read().orders.find(order=>order.id===base.id),offeredAt),30);
assert.equal(Store.expireUnacceptedOffers(Date.now()).count,1,'미수락 공고를 타이머가 자동 전환');
assert.equal(Store.addCustomerBoost(base.id,10000).ok,true);
let raised=Store.read().orders.find(order=>order.id===base.id);
assert.equal(raised.driverPayout,55000);
assert.equal(raised.customerTotal,62500);
assert.equal(raised.boostTotal,10000);
assert.equal(raised.offerRound,2);
assert.equal(raised.boostPayments.at(-1).status,'SUCCEEDED_PREVIEW');
assert.equal(raised.boostEligible,false);
assert.equal(Store.addCustomerBoost(base.id,5000).ok,false,'미수락 재확인 전에는 연속 인상 불가');
assert.equal(Store.markNoAcceptance(base.id).ok,true);
assert.equal(Store.addCustomerBoost(base.id,99500).reason,'INVALID_AMOUNT','1천원 단위만 허용');
const accepted=await Store.acceptOrder(base.id,'D-01');
assert.equal(accepted.ok,true);
assert.equal(Store.markNoAcceptance(base.id).ok,false,'기사 수락 뒤에는 미수락 처리 불가');
assert.equal(Store.addCustomerBoost(base.id,5000).ok,false,'기사 수락 뒤에는 추가금 불가');

for(const text of ['빠른 배차 추가금','\\+5,000원','\\+10,000원','\\+20,000원','배차를 보장하지 않으며','최종 미배차 시 추가금도 환불'])assert.match(requestHtml,new RegExp(text));
for(const text of ['addCustomerBoost','누적 100,000원','PG 차액결제 성공 후'])assert.match(`${requestJs}\n${requestHtml}`,new RegExp(text.replace(/[.]/g,'\\.')));
assert.match(requestJs,/CUSTOMER_ORDER_KEY/);
assert.match(requestJs,/localStorage\.setItem\(CUSTOMER_ORDER_KEY,order\.id\)/);
assert.match(adminJs,/expireUnacceptedOffers/);
assert.match(adminJs,/자동 미수락 확인/);
assert.doesNotMatch(adminJs,/data-action="no-accept"/);
assert.match(adminJs,/관리자가 고객 대신 금액을 정하지 않습니다/);
assert.match(driverJs,/order\.driverPayout/);
assert.doesNotMatch(driverJs,/boostTotal|boostPayments|offerRound/);

console.log('freight customer self-service boost regression checks passed');
