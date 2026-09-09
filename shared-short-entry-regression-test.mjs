import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const entry=fs.readFileSync('shared-entry.js','utf8');
const shell=fs.readFileSync('s/index.html','utf8');
const index=fs.readFileSync('index.html','utf8');
const rc6=fs.readFileSync('rc6-fixes.js','utf8');
const final=fs.readFileSync('final-experience.js','utf8');
const expression=rc6.match(/const RC6_PARTNER_KEY=([^;]+);/)[1];
function boot(href){let url=new URL(href),writes=0;const state={keep:'history'};const c=vm.createContext({URL,decodeURIComponent,location:url,history:{state,replaceState(s,unused,next){assert.equal(s,state);url=new URL(next,url);writes++;}}});vm.runInContext(entry,c);return {url,writes,active:vm.runInNewContext(expression,{location:url})==='shared-yeosu'};}
function short(href){let target;vm.runInNewContext(shell.match(/<script>([\s\S]*?)<\/script>/)[1],{URL,encodeURIComponent,location:{...Object.fromEntries(['origin','search','hash'].map(k=>[k,new URL(href)[k]])),replace(next){target=next;}}});return boot(target);}
for(const origin of ['https://daedongmap.com','https://preview.daedongmap.com']){
 for(const path of ['/s/','/s/index.html']){const b=short(origin+path);assert.equal(b.url.href,origin+'/s');assert.equal(b.active,true);}
 const b=short(origin+'/s/?__ddret=token&__ddguard=guard#section');assert.equal(b.url.href,origin+'/s?__ddret=token&__ddguard=guard#section');assert.equal(b.active,true);
 const retired=boot(origin+'/?partner=shared-yeosu');assert.equal(retired.url.href,origin+'/');assert.equal(retired.active,false);
 const qr=boot(origin+'/?partner=shared-yeosu&hero=65cc1845e542d5fb#menu');assert.equal(qr.url.search,'?hero=65cc1845e542d5fb');assert.equal(qr.url.hash,'#menu');assert.equal(qr.active,false);
 assert.equal(boot(origin+'/').active,false);assert.equal(boot(origin+'/?partner=unknown').active,false);
 assert.equal(boot(origin+'/#__dd_shared_s=%zz').active,false);
}
assert.ok(index.indexOf('/shared-entry.js?v=shared-short-1')<index.indexOf('region-boot.js'));
assert.doesNotMatch(entry,/sessionStorage|localStorage|document\.cookie/);
assert.doesNotMatch(shell,/\?partner=|document\.write|iframe/);
assert.match(final,/location.pathname==='\/s'\?'\/s':'\/'/);
console.log('Shared short entry: /s canonical, old query retired, return query/hash preserved, no persisted profile, shared home share URL');
