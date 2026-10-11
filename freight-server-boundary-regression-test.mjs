import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const clientSource=fs.readFileSync('freight-api-client.js','utf8');
const driverHtml=fs.readFileSync('freight-driver/index.html','utf8');
const driverJs=fs.readFileSync('freight-driver/app.js','utf8');
const contract=fs.readFileSync('docs/freight-dispatch-api-contract.md','utf8');

assert.match(driverHtml,/freight-api-client\.js/);
assert.match(driverHtml,/name="freight-api-base"/);
assert.match(driverHtml,/프리뷰 · 이 기기에서만 동작/);
for(const text of ['Idempotency-Key','If-Match','credentials:\'include\'','cache:\'no-store\''])assert.match(clientSource,new RegExp(text));
for(const path of ['/board','/presence','/accept','/status','/release'])assert.ok(clientSource.includes(path));
assert.match(driverJs,/서버 연결 끊김 · 수락 일시중지/);
assert.match(driverJs,/if\(serverError\).*지금은 수락할 수 없습니다/);
assert.match(contract,/조건부 갱신/);
assert.match(contract,/로컬 주문으로 대체 수락하지 않는다/);

const storage=new Map();
const localCalls=[];
const localStore={
  read:()=>({orders:[],drivers:[]}),
  updateDriverPresence:(id,payload)=>{localCalls.push(['presence',id,payload]);return {ok:true};},
  acceptOrder:async(id,driverId)=>{localCalls.push(['accept',id,driverId]);return {ok:true};},
  transition:()=>({ok:true}),recoverDriverFailure:()=>({ok:true})
};
const localWindow={MatjidoFreightStore:localStore};
vm.runInNewContext(clientSource,{window:localWindow,document:{querySelector:()=>null},sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},globalThis:{crypto:{randomUUID:()=> 'uuid-local'}},setTimeout,clearTimeout,encodeURIComponent,Math,Date,Error});
assert.equal(localWindow.MatjidoFreightApi.enabled,false);
await localWindow.MatjidoFreightApi.updatePresence('D-01',{available:true});
await localWindow.MatjidoFreightApi.acceptOrder({id:'O-1'},'D-01');
assert.equal(localCalls.map(call=>call[0]).join(','),'presence,accept');

const networkCalls=[];
const networkWindow={MatjidoFreightStore:localStore,MATJIDO_FREIGHT_API_BASE:'https://dispatch.example.test/'};
const fetch=async(url,init={})=>{networkCalls.push({url,init});return {ok:true,status:200,json:async()=>url.endsWith('/board')?{driver:{id:'D-01'},orders:[]}:{ok:true,order:{id:'O-1'}}};};
vm.runInNewContext(clientSource,{window:networkWindow,document:{querySelector:()=>null},sessionStorage:{getItem:key=>storage.get(key)||null,setItem:(key,value)=>storage.set(key,value)},globalThis:{crypto:{randomUUID:()=> 'uuid-server'}},fetch,AbortController,setTimeout,clearTimeout,encodeURIComponent,Math,Date,Error});
const api=networkWindow.MatjidoFreightApi;
assert.equal(api.enabled,true);
await api.getDriverBoard('D-01');
await api.acceptOrder({id:'O-1',version:7},'D-01');
assert.equal(networkCalls[0].url,'https://dispatch.example.test/v1/freight/drivers/D-01/board');
assert.equal(networkCalls[1].init.headers['If-Match'],'"7"');
assert.equal(networkCalls[1].init.headers['Idempotency-Key'],'uuid-server');
assert.equal(networkCalls[1].init.credentials,'include');
await assert.rejects(()=>api.acceptOrder({id:'O-NO-VERSION'},'D-01'),error=>error.code==='MISSING_ORDER_VERSION');

console.log('freight server boundary regression checks passed');
