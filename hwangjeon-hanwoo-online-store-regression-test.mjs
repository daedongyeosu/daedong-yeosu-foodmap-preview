import fs from 'node:fs';

const page=fs.readFileSync('online-store/index.html','utf8');
const script=fs.readFileSync('online-store/app.js','utf8');

for(const value of [
  "'hwangjeon-hanwoo-munsu'",
  "storeName:'황전한우정육식당'",
  "pickupName:'황전한우정육식당'",
  "category:'정육식당'",
  "address:'전남광주 여수시 문수7길 21'",
  "phone:'010-2401-0067'",
  "hours:'매일 16:00~22:00'",
  "naverPlaceId:'1044077495'",
  "heroIcon:'🥩'",
  "name:'육사시미'",
  "name:'한우암소 전골(야채불고기)'",
  "name:'한우암소 특수부위 모듬'",
  "name:'한우암소 육회비빔밥'",
  'inquiryOnly:true',
  "catalogSource:'static'",
  'const preset=previewStore()'
])if(!script.includes(value))throw new Error(`황전한우정육 온라인 상점 등록정보 누락: ${value}`);

if(!script.includes('(Array.isArray(list)?list:fallbackProducts)'))throw new Error('상품이 없는 신규 상점에 예시 상품이 섞일 수 있습니다.');
if(!script.includes("if(store.catalogSource==='static')return;"))throw new Error('상품 미등록 상점이 다른 서버 상품을 불러올 수 있습니다.');
if(!script.includes('상점 등록을 마쳤습니다. 판매 상품과 가격은 상점 확인 후 순서대로 등록합니다.'))throw new Error('상품 등록 전 고객 안내가 없습니다.');
if(!page.includes('id="storePhone"')||!page.includes('id="storeProfile"')||!page.includes('id="storeMapLink"')||!page.includes('store-profile.css?v=20261016-1'))throw new Error('등록된 상점 전화·가게안내 화면이 없습니다.');
for(const sensitive of ['5829800440','630531'])if(script.includes(sensitive)||page.includes(sensitive))throw new Error(`공개 상점 화면에 민감정보가 포함됨: ${sensitive}`);

console.log('PASS 황전한우정육식당 온라인 상점 메뉴·가게정보 등록');
