import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('final-experience.js','utf8');
function extract(name){
 const start=source.indexOf('function '+name+'(');assert.ok(start>=0,name);
 const from=source.indexOf('{',start);let depth=0,quote='',escaped=false;
 for(let i=from;i<source.length;i++){
  const c=source[i];
  if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote='';continue;}
  if(['"',"'",'`'].includes(c)){quote=c;continue;}
  if(c==='{')depth++;if(c==='}'&&!--depth)return (source.slice(start-6,start)==='async '?'async ':'')+source.slice(start,i+1);
 }
 throw Error(name);
}
function button(id,key){return {dataset:{appStoreOrder:id,appKey:key},disabled:false,attributes:{},
 setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];}};}
for(const key of ['direct','ondongne']){
 const active=button('84c118675c0caa4c',key),other=button('7bc7239e6b509c44',key);
 const buttons=[active,other],store={id:active.dataset.appStoreOrder,name:'바오탕수'};
 let finishEnrich,enrichCalls=0,written,launches=0,armed=0;
 const modal={hidden:false,dataset:{appBrowserKey:key,appBrowserCategory:'중식'},
  querySelector:s=>s==='.modal-card'?{scrollTop:240}:null,
  querySelectorAll:()=>buttons};
 const content={get innerHTML(){return buttons.map(b=>'<button data-app-store-order="'+b.dataset.appStoreOrder+'"'+(b.dataset.routeBusy?' data-route-busy="'+b.dataset.routeBusy+'"':'')+(b.attributes['aria-busy']?' aria-busy="true"':'')+'>주문</button>').join('');}};
 const context={console,Date,JSON,EXTERNAL_APP_KEYS:[],APP_META:{[key]:{label:key}},
  document:{body:{dataset:{lockScrollY:'90'}}},sessionStorage:{getItem:()=>null,setItem(){}},
  $:s=>s==='#modal'?modal:s==='#modalContent'?content:null,$$:()=>buttons,
  fxStoreById:()=>store,normalizedStore:x=>x,safeHref:x=>x,
  routeFor:()=>({url:'https://ond.bursim.co.kr/shop/mns/?pageType=redirect&stCode=S502719'}),
  sendAnalyticsEvent(){},
  window:{__daedongCatalogProgress:{complete:false},
   daedongSecureStoreDetail:{enrich:()=>{enrichCalls++;return new Promise(resolve=>{finishEnrich=()=>{store.__secureDetailReady=true;resolve();};});}},
   daedongWriteExternalReturnState:(_key,payload)=>{written={...payload,savedAt:Date.now(),returnToken:'return-token'};},
   daedongReadExternalReturnState:()=>written,
   daedongLaunchMobileRoute:async()=>{launches++;},daedongMarkExternalAppDeparture(){},
   daedongStabilizeReturnPosition(){},daedongArmRestoredReturnLease(){armed++;}}
 };
 vm.createContext(context);
 vm.runInContext("const FX_APP_BROWSER_RETURN='daedongAppBrowserReturnV1';\n"+['fxRememberAppBrowserReturn','fxRestoreAppBrowserReturn','fxRestoreRegisteredAppButtons','fxOpenRegisteredAppOrder'].map(extract).join('\n'),context);
 const first=context.fxOpenRegisteredAppOrder(active);
 await context.fxOpenRegisteredAppOrder(active);
 assert.equal(enrichCalls,1,'실제 주소를 읽는 동안의 중복 클릭은 계속 막아야 합니다.');
 finishEnrich();await first;
 assert.equal(launches,1);
 assert.doesNotMatch(written.modalSnapshot.html,/data-route-busy|aria-busy/,key+': 복귀용 HTML에 출발 중 잠금을 저장하면 안 됩니다.');
 // Older already-saved documents can still contain this lock. Restore the
 // visible list before catalog completion without rebuilding its scroll.
 active.dataset.routeBusy='true';active.attributes['aria-busy']='true';active.disabled=true;
 other.dataset.routeBusy='true';other.attributes['aria-busy']='true';
 assert.equal(context.fxRestoreAppBrowserReturn(),true);
 for(const b of buttons){assert.equal(b.dataset.routeBusy,undefined);assert.equal(b.attributes['aria-busy'],undefined);assert.equal(b.disabled,false);}
 assert.equal(armed,1);
 await context.fxOpenRegisteredAppOrder(active);
 assert.equal(launches,2,key+': 뒤로 돌아온 동일 가게를 다시 눌러도 주문 화면이 열려야 합니다.');
 assert.doesNotMatch(written.modalSnapshot.html,/data-route-busy|aria-busy/);
}
console.log('PASS direct/Ondongne: pending-click dedupe, unlocked saved snapshot, legacy-lock cleanup and same-store repeat launch');
