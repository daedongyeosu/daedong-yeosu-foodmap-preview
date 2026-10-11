import fs from 'node:fs';

const home=fs.readFileSync('index.html','utf8');
const page=fs.readFileSync('store-partner/index.html','utf8');
const script=fs.readFileSync('store-partner/app.js','utf8');

const requiredHomeCopy=[
  '가게는 그대로, 판매는 온라인까지',
  '입점비 없이 온라인 상점을 만들고 상품을 판매해 보세요. 주문이 들어오면 맛지도가 고객 배송까지 연결합니다.',
  'href="store-partner/"',
  '지금 내 상점 만들기'
];
for(const copy of requiredHomeCopy){if(!home.includes(copy))throw new Error(`메인 온라인 상점 입점 문구 누락: ${copy}`);}

const requiredOnboarding=[
  '매장 판매가격 그대로',
  '도로명주소 찾기',
  '가게 외관 사진',
  '가게 내부 사진',
  '건당 1,000원',
  '건당 2,000원',
  '실제 상점 공개·결제·주문은 발생하지 않습니다.'
];
for(const copy of requiredOnboarding){if(!page.includes(copy))throw new Error(`입점 프리뷰 필수 항목 누락: ${copy}`);}
if(!script.includes("previewOnly:true"))throw new Error('프리뷰 저장이 실제 입점 데이터와 구분되지 않습니다.');
if(!script.includes('daumcdn.net/mapjsapi/bundle/postcode'))throw new Error('공식 주소검색 연결이 없습니다.');

console.log('PASS 온라인 상점 무료입점 진입·프리뷰 계약');
