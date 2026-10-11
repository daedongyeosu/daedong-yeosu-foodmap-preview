import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const store=fs.readFileSync('freight-order-store.js','utf8');
const driverHtml=fs.readFileSync('freight-driver/index.html','utf8');
const driverJs=fs.readFileSync('freight-driver/app.js','utf8');
const adminJs=fs.readFileSync('freight-admin/app.js','utf8');

for(const contract of ['PRESENCE_TIMEOUT_MS','driverMatchesOrder','driverPresenceStatus','updateDriverPresence','rankOrdersForDriver'])assert.match(store,new RegExp(contract));
for(const text of ['오더를 둘러보는 중입니다','GPS','연결','위치 확인하고 오더 받기'])assert.match(`${driverHtml}\n${driverJs}`,new RegExp(text));
assert.match(driverJs,/navigator\.geolocation\.getCurrentPosition/);
assert.match(driverJs,/locationConsent/);
assert.match(adminJs,/최근접속/);
assert.match(adminJs,/driverPresenceStatus/);

const memory=new Map();
const window={dispatchEvent(){},addEventListener(){},removeEventListener(){}};
vm.runInNewContext(store,{window,navigator:{},localStorage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value)},CustomEvent:class{constructor(type,options){this.type=type;this.detail=options?.detail;}},Date,Intl,JSON,Number,Math,Set});
const api=window.MatjidoFreightStore;
api.reset();
let state=api.read();
let driver=state.drivers.find(item=>item.id==='D-01');
assert.equal(api.driverPresenceStatus(driver).online,true);
assert.equal(api.driverMatchesOrder(driver,{fleetClass:'TON',weight:400,required:['리프트']}),true);
assert.equal(api.driverMatchesOrder(driver,{fleetClass:'LABO',weight:400,required:['리프트']}),false);
assert.equal(api.driverMatchesOrder(driver,{fleetClass:'TON',weight:800,required:['리프트']}),false);

api.updateDriverPresence('D-01',{available:false,boardOpen:false,locationStatus:'OFF'});
state=api.read();
driver=state.drivers.find(item=>item.id==='D-01');
assert.equal(api.driverPresenceStatus(driver).code,'OFFLINE');
assert.equal(api.eligibleDrivers({fleetClass:'TON',weight:100,required:[]},state).some(item=>item.id==='D-01'),false);

api.updateDriverPresence('D-01',{available:true,boardOpen:true,locationStatus:'GRANTED',latitude:34.75,longitude:127.70});
driver=api.read().drivers.find(item=>item.id==='D-01');
assert.equal(api.driverPresenceStatus(driver).code,'ONLINE');
assert.equal(api.driverPresenceStatus({...driver,lastSeenAt:new Date(Date.now()-api.PRESENCE_TIMEOUT_MS-1).toISOString()}).code,'STALE');

const ranked=api.rankOrdersForDriver([
  {id:'far',createdAt:'2026-10-11T00:00:00Z',pickupLocation:{latitude:35.00,longitude:127.90}},
  {id:'near',createdAt:'2026-10-11T00:01:00Z',pickupLocation:{latitude:34.751,longitude:127.701}},
  {id:'recovery',createdAt:'2026-10-11T00:02:00Z',pickupLocation:{latitude:36.00,longitude:128.00},recoveryPriority:true}
],driver);
assert.equal(ranked.map(item=>item.id).join(','),'recovery,near,far');

console.log('freight driver presence regression checks passed');
