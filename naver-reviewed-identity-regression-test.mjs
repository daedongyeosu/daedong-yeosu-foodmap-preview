import assert from 'node:assert/strict';
import fs from 'node:fs';
const expected={
 '43384f472418faec':'1042642943',
 '23e36eb3741524aa':'4277888320',
 'c76dbc66a4867b84':'2005576147',
 '3cd502d3432e2118':'1526738731',
 '24f321d28eec1c6a':'2005576147'
};
const data=JSON.parse(fs.readFileSync('data/naver-map-runtime.json','utf8'));
const audits=new Map(data.stores.map(r=>[r.store_id,r]));
for(const [id,place] of Object.entries(expected)){
 assert.equal(audits.get(id)?.status,'verified','Reviewed place without phone must not remain hidden: '+id);
 assert.equal(audits.get(id)?.place_id,place,'Review must be pinned to the actual saved place ID');
}
const rc2=fs.readFileSync('rc2-fixes.js','utf8'),rc3=fs.readFileSync('rc3-fixes.js','utf8');
function source(text,name){const start=text.indexOf('function '+name+'(');assert(start>=0,name);const end=text.indexOf('\n}',start);return text.slice(start,end+2);}
const {rc2MapIdentityFingerprint,rc2NaverAuditMatches,rc3VerifiedPhysicalMap}=Function('rc2NaverByStore','safeHref',source(rc2,'rc2MapIdentityFingerprint')+'\n'+source(rc2,'rc2NaverAuditMatches')+'\n'+source(rc3,'rc3VerifiedPhysicalMap')+'\nreturn {rc2MapIdentityFingerprint,rc2NaverAuditMatches,rc3VerifiedPhysicalMap};')(audits,value=>/^https:\/\//.test(value)?value:'#');
for(const [id,place] of Object.entries(expected)){
 const url='https://map.naver.com/p/entry/place/'+place;
 assert.equal(rc3VerifiedPhysicalMap({id,naverMap:url,phone:''})?.url,url);
 for(const wrong of ['https://map.naver.com/p/entry/place/999','https://naver.me/unresolved','https://example.com/p/entry/place/'+place]){
  assert.equal(rc2NaverAuditMatches({id,naverMap:wrong}),false);
  assert.equal(rc3VerifiedPhysicalMap({id,naverMap:wrong,__verifiedPhysicalMapSource:id}),null);
 }
}
assert.equal(rc3VerifiedPhysicalMap({id:'unreviewed',naverMap:'https://naver.me/unresolved'}),null);
const alternateId='a8218795099e637e';
const alternateSource='https://bit.ly/네이버지도-오늘은오므라이스여수점';
assert.equal(audits.get(alternateId)?.place_id,'2033356705');
assert.equal(audits.get(alternateId)?.source_url,alternateSource);
assert.equal(rc3VerifiedPhysicalMap({id:alternateId,naverMap:alternateSource,phone:''})?.url,'https://map.naver.com/p/entry/place/2033356705');
assert.equal(rc3VerifiedPhysicalMap({id:alternateId,naverMap:new URL(alternateSource).href})?.url,'https://map.naver.com/p/entry/place/2033356705');
assert.equal(rc3VerifiedPhysicalMap({id:alternateId,naverMap:'https://bit.ly/changed',__verifiedPhysicalMapSource:alternateId}),null);
assert.equal(audits.get('fd8d24a45e887938')?.status,'name-mismatch','Unrelated disputed map stays held');
assert.match(rc2,/RC2_NAVER_AUDIT_URL = 'data\/naver-map-runtime\.json\?v=reviewed-identity-20260913'/);
assert.match(rc2,/rc2NaverByStore\.size && !rc2NaverAuditMatches\(store\)/);
const fixture={id:'identity-fixture',name:'검증된 가게',address:'전남 여수시 도원로 1 1층',naverMap:''};
audits.set(fixture.id,{status:'verified',place_id:'123',source_url:'',identity_guard:rc2MapIdentityFingerprint(fixture)});
assert.equal(rc3VerifiedPhysicalMap(fixture)?.url,'https://map.naver.com/p/entry/place/123');
for(const changed of [{address:'전남 여수시 도원로 2 1층'},{name:'다른 가게'},{naverMap:'https://naver.me/changed'}])assert.equal(rc3VerifiedPhysicalMap({...fixture,...changed,__verifiedPhysicalMapSource:fixture.id}),null);
assert.equal(rc2MapIdentityFingerprint({...fixture,address:'전남광주 여수시 도원로 1 1층'}),rc2MapIdentityFingerprint(fixture));
assert.equal(data.stores.filter(r=>r.identity_guard).length,7);
assert.equal(audits.has('746e3a0c26e21661'),false,'No-order-route hidden record remains unchanged');
console.log('Reviewed Naver identity: 13 customer records; exact destination, source URL and changed-identity guards: PASS');
