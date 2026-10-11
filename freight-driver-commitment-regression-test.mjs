import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const store=fs.readFileSync('freight-order-store.js','utf8');
const driverHtml=fs.readFileSync('freight-driver/index.html','utf8');
const driverJs=fs.readFileSync('freight-driver/app.js','utf8');
const customerJs=fs.readFileSync('freight-request/app.js','utf8');
const adminJs=fs.readFileSync('freight-admin/app.js','utf8');

for(const contract of ['promisedPickupAt','recoverDriverFailure','checkAssignmentCommitments','REFUND_PENDING','excludedDriverIds'])assert.match(store,new RegExp(contract));
assert.match(driverHtml,/내가 확정한 픽업 약속/);
assert.match(driverHtml,/수행이 어려워졌습니다/);
assert.match(driverJs,/약속 불이행이 반복되면 오더 이용이 제한됩니다/);
assert.match(customerJs,/고객 추가비용 없이 다른 기사를 긴급 배차/);
assert.match(customerJs,/결제금액 전액을 환불/);
assert.match(adminJs,/불이행 기사는 이 주문에서 제외/);
assert.match(adminJs,/고객 전액환불 처리 대기/);

const memory=new Map();
const window={dispatchEvent(){},addEventListener(){},removeEventListener(){}};
vm.runInNewContext(store,{window,navigator:{},localStorage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},Date,Intl,JSON,Number,Math,Set});
const api=window.MatjidoFreightStore;
api.reset();
api.transition('YF-1011-01','PAID','OFFERED',{lastOfferedAt:new Date().toISOString()},'TEST');
const accepted=await api.acceptOrder('YF-1011-01','D-01');
assert.equal(accepted.ok,true);
assert.equal(accepted.order.status,'ASSIGNED');
assert.ok(accepted.order.promisedPickupAt);
const recovered=api.recoverDriverFailure('YF-1011-01','D-01','TEST_NO_SHOW');
assert.equal(recovered.ok,true);
assert.equal(recovered.order.status,'OFFERED');
assert.deepEqual([...recovered.order.excludedDriverIds],['D-01']);
api.expireUnacceptedOffers(Date.parse(recovered.order.lastOfferedAt)+api.OFFER_TIMEOUT_MS+1);
assert.equal(api.read().orders.find(order=>order.id==='YF-1011-01').status,'REFUND_PENDING');

console.log('freight driver commitment regression checks passed');
