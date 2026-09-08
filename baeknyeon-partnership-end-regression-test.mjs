import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = name => fs.readFileSync(new URL(name, import.meta.url), 'utf8');
const priority = JSON.parse(read('./data/store-priority.json'));
const id = '0987413e7ca12e2a';
assert.ok(!priority.managedStoreIds.includes(id));
assert.ok(priority.deprioritizedStoreIds.includes(id));
assert.ok(!priority.deprioritizedStoreIds.includes('7df2a013f496da50'), '여천점은 요청 대상이 아니다');
assert.equal(priority.stats.managedCanonicalStores, priority.managedStoreIds.length);
assert.equal(priority.stats.deprioritizedCanonicalStores, priority.deprioritizedStoreIds.length);
const app = read('./app.js');
function extract(name) {
  const start = app.indexOf(`function ${name}(`);
  assert.ok(start >= 0);
  const body = app.indexOf('{', start);
  let depth = 0;
  for (let i=body;i<app.length;i++) {
    if (app[i]==='{') depth++;
    if (app[i]==='}' && --depth===0) return app.slice(start,i+1);
  }
  throw new Error(name);
}
const target = {id,name:'백년족발',cat:'족발/보쌈',area:'여서동',managed:false,deprioritized:true};
const other = {id:'ordinary',name:'일반족발',cat:'족발/보쌈',area:'여서동',managed:false,deprioritized:false};
const context = {
  stores:[target,other],state:{query:'백년족발',brandId:'',coords:null,sortByDistance:false,location:'여수시 전체',category:'전체'},
  BRAND_BY_ID:{},REGION_DEFAULT_AREA:'여수시 전체',
  normalize:s=>String(s||'').replace(/\s/g,''),storeText:s=>s.name+s.cat+s.area,
  storeMatchesLocation:()=>true,storeMatchesCategory:()=>true,brandMatchesStore:()=>true,
  compareStoreBusinessStatus:()=>0,applyCategoryPriorityOverrides:s=>s,Number
};
vm.createContext(context);
vm.runInContext(`${extract('relevance')};${extract('filteredStores')};this.filtered=filteredStores;`,context);
assert.deepEqual(Array.from(context.filtered(),s=>s.id),[id], '정확한 가게명 검색은 유지한다');
context.state.query='';
assert.deepEqual(Array.from(context.filtered(),s=>s.id),['ordinary',id], '일반 목록에서는 후순위다');
assert.match(read('./rc6-fixes.js'), /store-priority\.json\?v=former-managed-bottom-1-baeknyeon-ended-1/);
assert.match(read('./final-experience.js'), /rc6-fixes\.js\?v=[^']*-baeknyeon-ended-1/);
assert.match(read('./index.html'), /final-experience\.js\?v=[^"]*-baeknyeon-ended-1/);
console.log('baeknyeon partnership end regression passed');
