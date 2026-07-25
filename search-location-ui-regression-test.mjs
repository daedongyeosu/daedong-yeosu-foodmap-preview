import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const js=readFileSync('final-experience.js','utf8');
const css=readFileSync('final-experience.css','utf8');
const html=readFileSync('index.html','utf8');
const stores=JSON.parse(readFileSync('data/stores.json','utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};

const searchable=stores.filter(store=>(store.store_id||store.id)&&store.name?.trim()&&store.name!=='제목 없음');
const localColdNoodle=searchable.find(store=>store.name==='금성칡냉면 미평점');

assert(searchable.length===649,`search scope changed: ${searchable.length}`);
assert(localColdNoodle,'둔덕·미평 냉면 가게가 검색 데이터에서 빠졌습니다.');
assert(/미평/.test(localColdNoodle.district)&&/둔덕/.test(localColdNoodle.district),'복수 동네 정보가 유지되지 않았습니다.');
assert(js.includes('function fxRankSearchMatches(matches)'), '검색 위치 정렬 함수가 없습니다.');
assert(js.includes("typeof rc6RankCandidatesByCustomerLocation==='function'?rc6RankCandidatesByCustomerLocation(stores):stores"),'공통 동네 정렬 함수를 사용하지 않습니다.');
assert(js.includes("const matches=searchableStores.map(store=>({store,score:relevance(store,q)})).filter(item=>item.score>0);"),'전체 검색 대상 또는 기존 일치도 계산이 바뀌었습니다.');
assert(js.includes('const list=fxRankSearchMatches(matches);'),'검색 결과에 위치 정렬이 적용되지 않았습니다.');
assert(!js.includes('const list=fxDiversifySearchPhotos(ranked);'),'사진 섞기가 검색 순서를 다시 바꾸고 있습니다.');
assert(!/function fxRankSearchMatches[\s\S]*?[{};\n]\s*let fxSearchRenderToken/.exec(js)?.[0].includes('둔덕'),'특정 동네가 검색 정렬에 하드코딩됐습니다.');

assert(css.includes('.search-popup .searchbox{display:grid;'),'검색창 레이아웃이 고정되지 않았습니다.');
assert(css.includes('grid-template-columns:minmax(0,1fr) clamp(82px,22vw,100px)'),'검색 버튼 가로 공간이 확보되지 않았습니다.');
assert(css.includes('white-space:nowrap'),'검색 버튼 줄바꿈 방지가 없습니다.');
assert(css.includes('word-break:keep-all'),'한글 글자 단위 줄바꿈 방지가 없습니다.');
assert(css.includes('writing-mode:horizontal-tb'),'검색 버튼 가로 쓰기가 명시되지 않았습니다.');
assert(html.includes('final-experience.css?v=category-first-paint-1-turtle-glass-1-search-button-horizontal-1'),'검색 CSS 캐시 갱신이 없습니다.');
assert(html.includes('rail-cross-section-dedupe-1-search-location-order-1'),'검색 JS 캐시 갱신이 없습니다.');

const functionStart=js.indexOf('function fxRankSearchMatches(matches)');
const bodyStart=js.indexOf('{',functionStart);
let depth=0,functionEnd=-1;
for(let index=bodyStart;index<js.length;index+=1){
 if(js[index]==='{')depth+=1;
 if(js[index]==='}'&&--depth===0){functionEnd=index+1;break;}
}
const rankFunctionSource=js.slice(functionStart,functionEnd);
for(const selected of ['둔덕동','웅천동','여서동']){
 const context={
  selected,
  matches:[
   {store:{id:'exact-other',name:'정확 일치',neighborhoods:['문수동']},score:100},
   {store:{id:'other',name:'다른 동',neighborhoods:['문수동']},score:80},
   {store:{id:'local',name:'현재 동',neighborhoods:[selected]},score:80}
  ],
  rc6RankCandidatesByCustomerLocation(candidates){
   return [...candidates].sort((a,b)=>Number(b.neighborhoods.includes(selected))-Number(a.neighborhoods.includes(selected)));
  },
  result:null
 };
 vm.runInNewContext(`${rankFunctionSource};result=fxRankSearchMatches(matches);`,context);
 assert(context.result[0].store.id==='exact-other',`${selected}: 검색 일치도 우선순위가 깨졌습니다.`);
 assert(context.result[1].store.id==='local',`${selected}: 같은 일치도에서 현재 동이 먼저 나오지 않습니다.`);
 assert(context.result.length===3,`${selected}: 위치 정렬 중 검색 결과가 누락됐습니다.`);
}

console.log(JSON.stringify({
 searchableStoreCount:searchable.length,
 pairedNeighborhoodStore:localColdNoodle.name,
 district:localColdNoodle.district,
 representativeNeighborhoods:['둔덕동','웅천동','여서동'],
 appliesToEveryNeighborhood:true,
 photoDiversificationDisabledForSearch:true,
 horizontalSearchButton:true,
 status:'PASS'
},null,2));
