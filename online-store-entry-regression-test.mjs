import fs from 'node:fs';

const home=fs.readFileSync('index.html','utf8');
const page=fs.readFileSync('store-partner/index.html','utf8');
const script=fs.readFileSync('store-partner/app.js','utf8');
const sample=fs.readFileSync('store-partner/sample-products.csv','utf8');

const requiredHomeCopy=[
  '가게는 그대로, 판매는 온라인까지',
  '온라인상점',
  '무료입점',
  'href="store-partner/"',
  '내 상점 만들기'
];
for(const copy of requiredHomeCopy){if(!home.includes(copy))throw new Error(`메인 온라인 상점 입점 문구 누락: ${copy}`);}

const requiredOnboarding=[
  '매장 판매가격 그대로',
  '도로명주소 찾기',
  '가게 외관 사진',
  '가게 내부 사진',
  '상품등록 작업대',
  '500g',
  '1근',
  'CSV 상품목록 선택',
  'CSV 양식 내려받기',
  '메뉴판·가격표 사진 선택',
  'AI 분석 서버를 연결하기 전에는 상품정보를 자동 생성하지 않습니다.',
  '건당 1,000원',
  '건당 2,000원',
  '기기 초안은 고객에게 보이지 않습니다.',
  '상점주 확인 후 서버 저장·공개를 별도로 선택',
  '실제 결제·배송 접수는 아직 준비 중입니다.'
];
for(const copy of requiredOnboarding){if(!page.includes(copy))throw new Error(`입점 프리뷰 필수 항목 누락: ${copy}`);}
if(!script.includes("previewOnly:true"))throw new Error('프리뷰 저장이 실제 입점 데이터와 구분되지 않습니다.');
if(!script.includes('daumcdn.net/mapjsapi/bundle/postcode'))throw new Error('공식 주소검색 연결이 없습니다.');
if(!script.includes("/(?:^|\\s)여수시\\s/"))throw new Error('행정구역 명칭 변경에도 여수시 공식 주소를 허용해야 합니다.');
if(!script.includes('function addDirectProduct'))throw new Error('직접 상품등록 기능이 없습니다.');
if(!script.includes('async function importProductSheet'))throw new Error('CSV 상품 일괄등록 기능이 없습니다.');
if(!script.includes('products:products.map'))throw new Error('상품 초안이 입점 준비내용에 포함되지 않습니다.');
if(!script.includes('function loadDraft'))throw new Error('기기에 저장한 입점 준비내용을 다시 불러오지 않습니다.');
if(!sample.startsWith('상품명,가격,단위,재고'))throw new Error('CSV 상품등록 양식의 필수 열이 올바르지 않습니다.');

console.log('PASS 온라인 상점 무료입점 진입·프리뷰 계약');
