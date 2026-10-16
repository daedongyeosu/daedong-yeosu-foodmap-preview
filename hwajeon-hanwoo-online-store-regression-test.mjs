import fs from 'node:fs';

const page=fs.readFileSync('online-store/index.html','utf8');
const script=fs.readFileSync('online-store/app.js','utf8');

for(const value of [
  "'hwajeon-hanwoo-munsu'",
  "storeName:'화전한우정육(문수점)'",
  "pickupName:'화전한우정육식당'",
  "category:'정육점'",
  "address:'전남광주통합특별시 여수시 문수동 457-2'",
  "phone:'010-2401-0067'",
  'products:[]',
  "catalogSource:'static'",
  'const preset=previewStore()'
])if(!script.includes(value))throw new Error(`화전한우정육 온라인 상점 등록정보 누락: ${value}`);

if(!script.includes('(Array.isArray(list)?list:fallbackProducts)'))throw new Error('상품이 없는 신규 상점에 예시 상품이 섞일 수 있습니다.');
if(!script.includes("if(store.catalogSource==='static')return;"))throw new Error('상품 미등록 상점이 다른 서버 상품을 불러올 수 있습니다.');
if(!script.includes('상점 등록을 마쳤습니다. 판매 상품과 가격은 상점 확인 후 순서대로 등록합니다.'))throw new Error('상품 등록 전 고객 안내가 없습니다.');
if(!page.includes('id="storePhone"')||!page.includes('store-profile.css?v=20261016-1'))throw new Error('등록된 상점 전화 연결 화면이 없습니다.');
for(const sensitive of ['5829800440','630531'])if(script.includes(sensitive)||page.includes(sensitive))throw new Error(`공개 상점 화면에 민감정보가 포함됨: ${sensitive}`);

console.log('PASS 화전한우정육(문수점) 온라인 상점 등록');
