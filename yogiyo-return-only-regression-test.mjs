import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const rc2=readFileSync('rc2-fixes.js','utf8');
const finalExperience=readFileSync('final-experience.js','utf8');
const html=readFileSync('index.html','utf8');
const stores=JSON.parse(readFileSync('data/stores.json','utf8'));
const assert=(condition,message)=>{if(!condition)throw new Error(message);};

const functionStart=rc2.indexOf('function rc2OpenYogiyoSameTab(link)');
const bodyStart=rc2.indexOf('{',functionStart);
let depth=0,functionEnd=-1;
for(let index=bodyStart;index<rc2.length;index+=1){
 if(rc2[index]==='{')depth+=1;
 if(rc2[index]==='}'&&--depth===0){functionEnd=index+1;break;}
}
const functionSource=rc2.slice(functionStart,functionEnd);
let remembered=0;
const assigned=[],context={
 link:{href:'https://ws.yogiyo.co.kr/test'},
 rc2RememberExternalReturn(){remembered+=1;},
 window:{location:{assign(url){assigned.push(url);}}},
 result:null
};
vm.runInNewContext(`${functionSource};result=rc2OpenYogiyoSameTab(link);`,context);

const yogiyoSelector='a[data-community-original="yogiyo"]';
const yogiyoHandler=rc2.indexOf(`event.target.closest('${yogiyoSelector}')`);
const genericHandler=rc2.indexOf("event.target.closest('a[data-community-original]')");
const totalRoutes=stores.reduce((sum,store)=>sum+(store.routes||[]).length,0);
const channelCounts=Object.fromEntries(['요기요','쿠팡이츠','배달의민족'].map(name=>[
 name,
 stores.reduce((sum,store)=>sum+(store.routes||[]).filter(route=>route.name===name&&route.enabled!==false&&route.url).length,0)
]));

assert(functionStart>=0&&functionEnd>functionStart,'요기요 전용 같은 탭 이동 함수가 없습니다.');
assert(context.result===true,'요기요 전용 이동 함수가 성공을 반환하지 않습니다.');
assert(remembered===1,'요기요 이동 전에 복귀 상태를 저장하지 않습니다.');
assert(assigned.length===1&&assigned[0]===context.link.href,'요기요 링크가 같은 탭 location.assign으로 열리지 않습니다.');
assert(!functionSource.includes('window.open'),'요기요 전용 함수가 새 탭을 열고 있습니다.');
assert(yogiyoHandler>=0,'요기요 최종 링크만 선택하는 전용 이벤트가 없습니다.');
assert(yogiyoHandler<genericHandler,'요기요 전용 처리가 일반 외부앱 처리보다 늦습니다.');
assert(rc2.slice(yogiyoHandler,genericHandler).includes('event.stopImmediatePropagation()'),'요기요 이벤트가 다른 외부앱 처리로 번집니다.');
assert(!rc2.includes('a[data-community-original="coupang"]'),'쿠팡이츠 전용 처리가 변경됐습니다.');
assert(!rc2.includes('a[data-community-original="baemin"]'),'배달의민족 전용 처리가 변경됐습니다.');
assert(rc2.includes("window.open(comparedExternal.href, '_blank', 'noopener');"),'기존 외부앱 새 탭 처리가 변경됐습니다.');
assert(finalExperience.includes('rail-cross-section-dedupe-1-yogiyo-same-tab-return-1'),'RC2 캐시 버전이 갱신되지 않았습니다.');
assert(html.includes('search-location-order-1-yogiyo-return-only-1'),'최종 스크립트 캐시 버전이 갱신되지 않았습니다.');
assert(stores.length===650,`가게 데이터 수가 변경됐습니다: ${stores.length}`);
assert(totalRoutes===4558,`주문링크 수가 변경됐습니다: ${totalRoutes}`);
assert(channelCounts['요기요']===502,`요기요 링크 수가 변경됐습니다: ${channelCounts['요기요']}`);
assert(channelCounts['쿠팡이츠']===569,`쿠팡이츠 링크 수가 변경됐습니다: ${channelCounts['쿠팡이츠']}`);
assert(channelCounts['배달의민족']===611,`배달의민족 링크 수가 변경됐습니다: ${channelCounts['배달의민족']}`);

console.log(JSON.stringify({
 yogiyoNavigation:'same-tab',
 coupangAndBaeminNavigation:'unchanged',
 totalStores:stores.length,
 totalRoutes,
 channelCounts,
 status:'PASS'
},null,2));
