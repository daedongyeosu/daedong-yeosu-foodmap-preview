import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('./customer-submission.js',import.meta.url),'utf8');
function fixture(){
  const rows=new Map(),posts=[],scope={Event,AbortSignal,crypto,Date,JSON,navigator:{locks:{request:async(_,fn)=>fn()}},window:{dispatchEvent(){}},localStorage:{getItem:k=>rows.get(k)??null,setItem:(k,v)=>rows.set(k,v),removeItem:k=>rows.delete(k)}};
  let failure=true,support=true;
  scope.fetch=async(url,init)=>{if(url.endsWith('/submission-support'))return{ok:support,json:async()=>({protocol:support?1:0})};const body=JSON.parse(init.body);posts.push(body);if(failure)throw Error('lost response');return{ok:true,json:async()=>({order:{id:'one'},submission:{protocol:1,requestId:body.clientRequestId}})};};
  vm.runInNewContext(source,scope);
  return{api:scope.window.MatjidoSubmission,rows,posts,scope,setFailure:v=>failure=v,setSupport:v=>support=v};
}
const f=fixture();await assert.rejects(f.api.send('store:a','/orders',{items:[1],address:'original'}),/기존 접수/);const uuid=f.posts[0].clientRequestId;
f.setFailure(false);const recovered=await f.api.send('store:a','/orders',null);assert.equal(recovered.payload.address,'original');assert.equal(f.posts[1].clientRequestId,uuid);assert.equal(f.api.has('store:a'),true,'Receipt stays pending until caller verifies its persisted tracking receipt');
assert.throws(()=>f.api.clear('store:a','different-id'),/다른 화면/);assert.equal(f.api.has('store:a'),true);f.api.clear('store:a',uuid);assert.equal(f.api.has('store:a'),false);
const g=fixture();g.setSupport(false);await assert.rejects(g.api.send('errand','/orders',{description:'hello'}),/준비 중/);assert.equal(g.posts.length,0);assert.equal(g.rows.size,0);
const h=fixture();h.scope.localStorage.setItem=()=>{throw Error('quota');};await assert.rejects(h.api.send('errand','/orders',{}));assert.equal(h.posts.length,0,'Storage failure must occur before POST');
const expired=fixture();expired.rows.set('matjido-pending-submit-v1:errand',JSON.stringify({version:1,requestId:uuid,createdAt:Date.now()-86400001,payload:{phone:'private'}}));await assert.rejects(expired.api.send('errand','/orders',{}),/확인기간/);assert.equal(expired.posts.length,0);assert.ok(![...expired.rows.values()][0].includes('private'),'Expired local private payload is removed; key tombstone stays');
for(const file of ['online-store/index.html','errand/index.html'])assert.ok(fs.readFileSync(new URL('./'+file,import.meta.url),'utf8').includes('../customer-submission.js'));
console.log('PASS retry protocol: durable frozen intent, original UUID, explicit recovery, capability/storage fail-closed, expiry tombstone and guarded receipt cleanup');
