import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const merchants = {
  '7bc7239e6b509c44': 'S503561',
  '04910f606ba038a6': 'S502168',
  'd86586aaef8454c9': 'S503551',
  '84c118675c0caa4c': 'S502719'
};
const otherId = 'a'.repeat(16);
const ids = [...Object.keys(merchants), otherId];
const originalRoutes = [{key:'direct',name:'가게바로주문',url:'https://example.com/old-preparing-page'},
  {key:'mukkebi',name:'먹깨비',url:'https://example.com/retained-order'},
  {key:'phone',name:'전화주문',url:'tel:0610000000'}];
const records = ids.map(id=>({id,name:id,channelKeys:id===otherId?['direct','phone']:['phone'],routes:originalRoutes}));
const closure = {type:'monthly-weekday',nth:2,weekday:'wed'};
const services = {programs:[{id:'preserved'}],stores:Object.fromEntries(ids.map(id=>[id,{
  benefits:[{id:'kept'}],hours:{weekly:{sun:[{open:'11:00',close:'01:00'},{open:'15:00',close:'01:00'}]},closures:[closure],breaks:[]}
}]))};
const plain=value=>JSON.parse(JSON.stringify(value));
const context={window:{setTimeout,clearTimeout},URL,console,AbortController,fetch:async url=>{
  const pathname=new URL(url).pathname;
  const payload=pathname==='/api/catalog'||pathname==='/api/catalog/bootstrap'?records
    :pathname==='/api/services'?services
    :pathname==='/api/native/public/catalog'?{items:[],cursor:null}
    :pathname.startsWith('/api/store/')?records.find(x=>x.id===pathname.split('/').pop()):null;
  return {ok:payload!==null,status:payload===null?404:200,json:async()=>structuredClone(payload)};
}};
vm.createContext(context);
vm.runInContext(fs.readFileSync('data-api.js','utf8'),context);
const api=context.window.daedongDataApi;
assert.equal(typeof api.isDirectOrderStoreId,'function','네 가게 허용 목록이 있어야 합니다.');
const catalog=await api.catalog();
assert.deepEqual(catalog.filter(x=>api.isDirectOrderStoreId(x.id)).map(x=>x.id),Object.keys(merchants));
for(const [id,code] of Object.entries(merchants)){
  assert.equal(catalog.find(x=>x.id===id).channelKeys.includes('direct'),true);
  const detail=await api.detail(id);
  assert.equal(catalog.find(x=>x.id===id).channelKeys.includes('ondongne'),true);
  const ondongne=detail.routes.find(r=>r.key==='ondongne');
  assert.equal(new URL(ondongne.url).searchParams.get('stCode'),code);
  const direct=detail.routes.filter(r=>r.key==='direct');
  assert.equal(direct.length,1);
  assert.equal(direct[0].directOrderVerified,true);
  const destination=new URL(direct[0].url);
  assert.equal(destination.origin,'https://ond.bursim.co.kr');
  assert.equal(destination.pathname,'/shop/mns/');
  assert.equal(destination.searchParams.get('pageType'),'redirect');
  assert.equal(destination.searchParams.get('stCode'),code);
  assert.deepEqual(plain(detail.routes.filter(r=>!['direct','ondongne'].includes(r.key))),originalRoutes.filter(r=>!['direct','ondongne'].includes(r.key)));
}
assert.equal(api.isDirectOrderStoreId(otherId),false);
assert.deepEqual(plain((await api.detail(otherId)).routes),originalRoutes,'다른 가게의 원본 링크를 덮어쓰지 않습니다.');
const updated=await api.services();
for(const id of Object.keys(merchants)){
  const row=updated.stores[id];
  for(const day of ['mon','tue','wed','thu','fri','sat'])assert.deepEqual(plain(row.hours.weekly[day]),[{open:'11:00',close:'01:00'}]);
  assert.deepEqual(plain(row.hours.weekly.sun),[{open:'15:00',close:'01:00'}],'일요일 오전 시간 중복을 제거합니다.');
  assert.deepEqual(plain(row.hours.closures),[closure],'기존 확인된 휴무일은 보존합니다.');
  assert.deepEqual(plain(row.benefits),[{id:'kept'}]);
}
assert.deepEqual(plain(updated.stores[otherId]),services.stores[otherId]);
assert.deepEqual(plain(updated.programs),services.programs);

function extract(source,name){const start=source.indexOf('function '+name+'(');assert.ok(start>=0);const from=source.indexOf('{',start);let depth=0;for(let n=from;n<source.length;n++){if(source[n]==='{')depth++;if(source[n]==='}'&&!--depth)return source.slice(start,n+1);}throw Error(name);}
const app=fs.readFileSync('app.js','utf8');
const core={window:context.window,BLOCKED_STORE_ROUTE_KEYS:{},EXTERNAL_APP_KEYS:['baemin','yogiyo','coupang'],escapeHtml:String,appIcon:()=>''};
vm.createContext(core);
vm.runInContext(['storeRouteIsBlocked','routeFor','storeHasChannel','routeLink'].map(name=>extract(app,name)).join('\n'),core);
assert.equal(core.storeHasChannel(records.at(-1),'direct'),false,'미승인 가게의 바로주문은 열리지 않아야 합니다.');
assert.match(core.routeLink(core.routeFor(records.at(-1),'direct')),/disabled[^>]*data-route-key="direct"/,'다른 가게의 기존 준비중 표시는 비활성 상태로 보존합니다.');
assert.equal(core.routeFor(records.at(-1),'mukkebi').url,originalRoutes[1].url);
const direct=(await api.detail(ids[0])).routes.find(r=>r.key==='direct');
assert.match(core.routeLink(direct),/<a /);
assert.doesNotMatch(core.routeLink(direct),/disabled|준비중/);
assert.match(core.routeLink(originalRoutes[0]),/disabled/);
const home=fs.readFileSync('index.html','utf8');
const homeButton=home.match(/<button[^>]*data-order-key="direct"[^>]*>[\s\S]*?<\/button>/)?.[0];
assert.ok(homeButton);assert.doesNotMatch(homeButton,/disabled|준비중/);
const ondongneButton=home.match(/<button[^>]*data-order-key="ondongne"[^>]*>[\s\S]*?<\/button>/)?.[0];
assert.ok(ondongneButton);assert.doesNotMatch(ondongneButton,/disabled|준비중/);
console.log('PASS four verified order routes, four-store-only gate, Sunday/overnight hours and untouched existing routes/holidays');
