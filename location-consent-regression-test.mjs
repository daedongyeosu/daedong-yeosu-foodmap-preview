import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {webcrypto} from 'node:crypto';
const source=fs.readFileSync('location-privacy.js','utf8');
function storage(initial={}){return Object.assign({},initial,{getItem(k){return this[k]??null;},setItem(k,v){this[k]=String(v);},removeItem(k){delete this[k];}});}
function harness({consent=true,fetchOk=true}={}){
 const receipt={version:'2026-11-03.1',adult:true,token:'a'.repeat(64),expiresAt:'2099-01-01T00:00:00Z'};
 const localStorage=storage({'matjidoLocationConsentV1':JSON.stringify(consent?receipt:null),savedLocation:JSON.stringify({type:'current',coords:{lat:34,lng:127}}),daedongAddressBookV2:JSON.stringify([{type:'current',coords:{lat:34,lng:127}},{type:'postcode',address:'수동주소'}]),daedongFavoriteStoresV2:'["keep"]'});
 const events={},requests=[];let calls=0,gpsSuccess;
 const ctx={localStorage,sessionStorage:storage(),crypto:webcrypto,AbortSignal,Date,JSON,Uint8Array,Event,document:{addEventListener(){},querySelector(){return null;}},navigator:{geolocation:{getCurrentPosition(success){calls++;gpsSuccess=success;}}},fetch:async(url,options)=>{requests.push(options);return{ok:fetchOk,json:async()=>({ok:true,records:[]})};}};
 ctx.window={daedongDataApi:{baseUrl:'https://api.example'},addEventListener(name,fn){events[name]=fn;},dispatchEvent(){}};
 vm.runInNewContext(source,ctx);return{ctx,requests,api:ctx.window.MatjidoLocation,calls:()=>calls,deliver:()=>gpsSuccess({coords:{latitude:34,longitude:127}})};
}
const first=harness();assert.equal(first.ctx.localStorage.getItem('savedLocation'),null);assert.equal(JSON.parse(first.ctx.localStorage.daedongAddressBookV2).length,1);assert.equal(first.ctx.localStorage.daedongFavoriteStoresV2,'["keep"]');assert.equal(first.calls(),0,'loading does not request GPS');
let accepted=false;await first.api.getCurrentPosition(()=>{accepted=true;});assert.equal(first.calls(),1);await first.deliver();assert.equal(accepted,true);assert.equal(first.requests.length,1);const payload=JSON.parse(first.requests[0].body);assert.deepEqual(Object.keys(payload).sort(),['adult','eventId','kind','version']);assert.equal(payload.kind,'use');
const offline=harness({fetchOk:false});let used=false,failed=false;await offline.api.getCurrentPosition(()=>used=true,()=>failed=true);await offline.deliver();assert.equal(used,false);assert.equal(failed,true,'no location use when legal journal fails');
const late=harness();let resurrected=false;await late.api.getCurrentPosition(()=>resurrected=true);await late.api.withdraw();await late.deliver();assert.equal(resurrected,false);assert.equal(late.ctx.localStorage.getItem('matjidoLocationConsentV1'),null);
for(const file of ['app.js','rc6-fixes.js','rc7-address-map.js']){const code=fs.readFileSync(file,'utf8');assert.ok(!code.includes('navigator.geolocation.getCurrentPosition('),`${file} must use the consent owner`);assert.ok(code.includes('MatjidoLocation?.getCurrentPosition('));}
const rc7=fs.readFileSync('rc7-address-map.js','utf8');assert.ok(!rc7.includes('openstreetmap.org/reverse'),'GPS must not leave the device via reverse-geocoding');
const html=fs.readFileSync('index.html','utf8');assert.ok(html.indexOf('src="location-privacy.js')<html.indexOf('src="app.js'));assert.ok(html.includes('href="/location-terms/"'));assert.ok(html.includes('data-location-settings'));
console.log('PASS location consent, journal failure, withdrawal race, migration and all GPS entrypoints');
