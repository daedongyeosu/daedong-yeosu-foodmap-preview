import fs from 'node:fs';

const app=fs.readFileSync('app.js','utf8');
const store=fs.readFileSync('online-store/app.js','utf8');

for(const value of [
  "online_store: {label: '맛지도 바로주문', icon: '🛵'}",
  "online_store:'맛지도 바로주문으로'",
  "address:'전라남도 여수시 문수7길 21'",
  '여수맛지도에서 주문하면 집까지 배달하고'
])if(!(app+store).includes(value))throw new Error(`황전한우정육식당 메인 검색·주문 연결 누락: ${value}`);

if(app.includes("if (route.key === 'online_store')"))throw new Error('맛지도 온라인 주문 경로가 준비중 버튼으로 막혔습니다.');

console.log('PASS 황전한우정육식당 메인 검색 결과에서 맛지도 온라인 주문 연결');
