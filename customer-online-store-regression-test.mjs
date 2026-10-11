import fs from 'node:fs';

const page=fs.readFileSync('online-store/index.html','utf8');
const script=fs.readFileSync('online-store/app.js','utf8');
const deliveryStyle=fs.readFileSync('online-store/delivery-quote.css','utf8');
const merchant=fs.readFileSync('store-partner/index.html','utf8');

for(const text of [
  '고객 화면 프리뷰',
  '매장 판매가격 그대로',
  '이 상점에서 상품 찾기',
  '장바구니',
  '상점 배송비 지원',
  '기사 배송료',
  '고객 배송비',
  '맛지도 이용금액',
  '직선거리가 아닌 실제 도로거리',
  '공식 주소를 선택해 주세요',
  '총 결제예정금액',
  '실제 주문·결제·배송요청은 발생하지 않습니다.'
])if(!page.includes(text))throw new Error(`고객 온라인 상점 필수 문구 누락: ${text}`);

for(const contract of [
  "const ONBOARD_KEY='matjido-store-onboarding-preview-v1'",
  'function demoMode',
  'function renderProducts',
  'function addToCart',
  'function changeQuantity',
  'function loadPostcode',
  'function selectDeliveryAddress',
  'function requestDeliveryQuote',
  "const DELIVERY_QUOTE_ENDPOINT='/api/store-delivery-quote'",
  "source:'daum_postcode'",
  'roadDistanceMeters',
  '배송비 별도',
  '실제 도로거리 배송비가 확정된 뒤 주문내용을 확인할 수 있습니다.'
])if(!script.includes(contract))throw new Error(`고객 온라인 상점 기능 계약 누락: ${contract}`);

if(!merchant.includes('href="../online-store/"'))throw new Error('상점주 최종 미리보기에서 고객 상점으로 연결되지 않습니다.');
if(/기사 배송료<\/dt><dd>\s*[0-9,]+원/.test(page))throw new Error('도로거리 계산 전 기사 배송료를 임의 금액으로 표시했습니다.');
if(!deliveryStyle.includes('.postcode-panel')||!deliveryStyle.includes('.quote-status.is-error'))throw new Error('공식 주소검색 또는 견적 실패 화면이 없습니다.');
if(/블록요금|고산지대|회피구역/.test(page))throw new Error('고객 화면에 내부 배송비 계산근거가 노출됐습니다.');

console.log('PASS 고객 온라인 상점·장바구니 프리뷰 계약');
