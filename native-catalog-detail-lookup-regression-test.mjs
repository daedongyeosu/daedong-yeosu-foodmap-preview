import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const code = fs.readFileSync('data-api.js','utf8');
const id = 'a'.repeat(16);
async function scenario(items, failCatalog=false, paginated=false) {
  const calls=[];
  const context={window:{setTimeout,clearTimeout},URL,AbortController,console:{warn(){}},
    fetch: async url=>{
      calls.push(url);
      if(url.includes('/native/public/catalog')) {
        if(failCatalog)return {ok:false,status:503};
        return {ok:true,json:async()=>paginated&&!url.includes('cursor=')
          ? {items:[],cursor:'next'} : {items,cursor:null}};
      }
      if(url.includes('/native/public/store/'))return {ok:true,json:async()=>({id,fields:{description:'published'},photos:[]})};
      if(url.endsWith('/api/catalog'))return {ok:true,json:async()=>[{id,name:'store'}]};
      return {ok:true,json:async()=>({id,name:'store',routes:[]})};
    }};
  vm.runInNewContext(code,context);
  await context.window.daedongDataApi.catalog();
  const detail=await context.window.daedongDataApi.detail(id);
  return {detail,calls};
}
const absent=await scenario([]);
assert.equal(absent.calls.filter(url=>url.includes('/native/public/store/')).length,0,
  'A confirmed absent publication must not add a cold cross-origin 404 request.');
assert.equal(absent.detail.name,'store');
for(const mode of ['published','failed','paginated']) {
  const result=await scenario([{id,fields:{}}],mode==='failed',mode==='paginated');
  assert.equal(result.calls.filter(url=>url.includes('/native/public/store/')).length,1,mode);
  assert.equal(result.detail.nativeDescription,'published',mode);
}
console.log('native catalog detail lookup regression: PASS');
