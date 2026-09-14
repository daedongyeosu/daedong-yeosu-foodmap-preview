import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const rc2=fs.readFileSync('rc2-fixes.js','utf8');
const menu=fs.readFileSync('store-menu-preview.js','utf8');
const read=rc2.slice(rc2.indexOf('function rc2ReadReturnState('),rc2.indexOf('function rc2StoreReturnState('));
const saved={storeId:'store-a',returnToken:'exact-token',savedAt:Date.now(),menuState:{storeId:'store-a'}};
const ctx={URL,String,history:{state:{}},location:{href:'https://daedongmap.com/'},
 RC2_RETURN_TOKEN_PARAM:'__ddret',RC2_RETURN_TOKEN_STATE:'daedongExternalReturnToken',
 sessionStorage:{},localStorage:{},rc2ParseReturnState:()=>saved,rc2FreshReturnState:()=>true,
 rc2IsHistoryReentry:()=>false,rc2ReadDepartureMarker:()=>null};
vm.createContext(ctx);vm.runInContext(read,ctx);
assert.equal(ctx.rc2ReadReturnState('store'),null,'A fresh home visit must not inherit stored returns');
ctx.daedongActiveDocumentReturnToken='exact-token';
assert.equal(ctx.rc2ReadReturnState('store'),saved,'Same-document Back must retain this document departure after URL/history tokens are popped');
ctx.daedongActiveDocumentReturnToken='other-token';
assert.equal(ctx.rc2ReadReturnState('store'),null,'Other departures must never match');
const start=menu.indexOf("window.addEventListener('popstate', event => {");
const listener=menu.slice(start,menu.indexOf("}, true);",start)+9);
let callback,closed=0,stopped=0;
const preview={dataset:{storeId:'store-a'},querySelector:()=>({hidden:false})};
const mctx={window:{addEventListener:(_,fn)=>callback=fn,daedongRestoreMenuExternalBack:id=>id==='store-a'},
 document:{body:{classList:{contains:()=>true}},querySelector:()=>preview},
 closeMenuOrderSheet:()=>closed++,closeMenuPreview:()=>closed++,MENU_HISTORY:{preview:'menu'}};
vm.createContext(mctx);vm.runInContext(listener,mctx);
callback({state:{},stopImmediatePropagation:()=>stopped++});
assert.equal(closed,0,'App return must preserve selected-menu order sheet');
assert.equal(stopped,1,'App return must not reach the home/modal Back handler');
mctx.window.daedongRestoreMenuExternalBack=()=>false;
callback({state:{},stopImmediatePropagation:()=>stopped++});
assert.equal(closed,1,'Normal Back must still close the menu layer');
assert.match(rc2,/globalThis\.daedongActiveDocumentReturnToken = ''/);
console.log('same-document-menu-app-return-regression-test: pass');
