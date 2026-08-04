import {createHash} from 'node:crypto';
import {existsSync,readFileSync} from 'node:fs';

const stores=JSON.parse(readFileSync('data/stores.json','utf8')).filter(store=>(store.store_id||store.id)&&store.name&&store.name.trim()&&store.name!=='제목 없음');
const manifest=JSON.parse(readFileSync('data/photo-manifest.json','utf8')).entries||[];
const pools=JSON.parse(readFileSync('data/brand-photo-pools.json','utf8'));
const photoById=new Map(manifest.map(entry=>[String(entry.storeId),entry.src]));
const normalize=value=>String(value??'').normalize('NFKC').trim().toLowerCase().replace(/[\s·&()\-_/.,]/g,'');
const stableHash=value=>{let hash=2166136261;for(const char of String(value)){hash^=char.charCodeAt(0);hash=Math.imul(hash,16777619)>>>0;}return hash;};
const photoFor=store=>pools.assignments[String(store.store_id||store.id)]||photoById.get(String(store.store_id||store.id))||store.image||'';
const shaFor=src=>createHash('sha256').update(readFileSync(src)).digest('hex');
const assert=(value,message)=>{if(!value)throw new Error(message);};

function relevance(store,query){const q=normalize(query),name=normalize(store.name);if(name===q)return 100;if(name.startsWith(q))return 90;if(name.includes(q))return 80;const aliases=name.includes('비비큐')?['BBQ','BBQ치킨','비비큐치킨']:[];const index=normalize([store.name,store.realBusinessName,store.brandName,store.branchName,store.district,store.category,...(store.searchAliases||[]),...aliases].filter(Boolean).join(' '));return index.includes(q)?50:0;}
function diversify(items){const remaining=[...items],result=[];if(remaining.length)result.push(remaining.shift());while(remaining.length){const previous=photoFor(result.at(-1)),counts=new Map();remaining.forEach(store=>counts.set(photoFor(store),(counts.get(photoFor(store))||0)+1));let index=-1,best=-1;remaining.forEach((store,i)=>{const photo=photoFor(store),count=counts.get(photo)||0;if(photo!==previous&&count>best){index=i;best=count;}});if(index<0)index=0;result.push(remaining.splice(index,1)[0]);}return result;}
function search(query){return diversify(stores.map(store=>({store,score:relevance(store,query)})).filter(item=>item.score>0).sort((a,b)=>b.score-a.score||a.store.name.localeCompare(b.store.name,'ko')).map(item=>item.store));}

assert(pools.brands['비비큐'].length===4,'BBQ photo pool count changed');
assert(pools.brands['60계치킨'].length===4,'60 chicken photo pool count changed');
assert(pools.brands['더벤티'].length===6,'The Venti photo pool count changed');
for(const [id,src] of Object.entries(pools.assignments)){
  assert(existsSync(src),`Assigned brand photo missing: ${id}`);
  const store=stores.find(item=>String(item.store_id||item.id)===id);
  assert(store,`Assigned store missing: ${id}`);
  const brand=store.name.includes('비비큐')?'비비큐':store.name.includes('60계')?'60계치킨':store.name.includes('더벤티')?'더벤티':'';
  const pool=pools.brands[brand];
  assert(pool&&pool[stableHash(id)%pool.length]===src,`Unstable brand photo assignment: ${store.name}`);
}

const report=[];
for(const query of ['비비큐','BBQ','60계','60계치킨','더벤티','조선밀면','보드람치킨','청하대 영빈관','바삭한 휴게소']){
  const results=search(query);
  const hashes=results.map(store=>shaFor(photoFor(store)));
  const consecutive=hashes.slice(1).filter((hash,index)=>hash===hashes[index]).length;
  assert(consecutive===0,`${query}: identical image hash is consecutive ${consecutive} time(s)`);
  report.push({query,resultCount:results.length,consecutiveIdenticalHashes:consecutive,firstResult:results[0]?.name||''});
}
console.log(JSON.stringify({poolCounts:Object.fromEntries(Object.entries(pools.brands).map(([brand,photos])=>[brand,photos.length])),assignmentCount:Object.keys(pools.assignments).length,report,status:'PASS'},null,2));
