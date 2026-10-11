import fs from 'node:fs';

const page=fs.readFileSync('online-store/index.html','utf8');
const script=fs.readFileSync('online-store/app.js','utf8');
const merchant=fs.readFileSync('store-partner/index.html','utf8');

for(const text of [
  '고객 화면 프리뷰',
  '매장 판매가격 그대로',
  '이 상점에서 상품 찾기',
  '장바구니',
  '상점 배송비 지원',
  '기사 배송료',
  '맛지도 이용금액',
  '직선거리가 아닌 실제 도로거리',
  '실제 주문·결제·배송요청은 발생하지 않습니다.'
])if(!page.includes(text))throw new Error(`고객 온라인 상점 필수 문구 누락: ${text}`);

for(const contract of [
  "const ONBOARD_KEY='matjido-store-onboarding-preview-v1'",
  'function demoMode',
  'function renderProducts',
  'function addToCart',
  'function changeQuantity',
  '배송비 별도',
  '실제 도로거리 배송비·결제·상점 주문접수는 다음 서버 단계에서 연결합니다.'
])if(!script.includes(contract))throw new Error(`고객 온라인 상점 기능 계약 누락: ${contract}`);

if(!merchant.includes('href="../online-store/"'))throw new Error('상점주 최종 미리보기에서 고객 상점으로 연결되지 않습니다.');
if(/기사 배송료<\/dt><dd>\s*[0-9,]+원/.test(page))throw new Error('도로거리 계산 전 기사 배송료를 임의 금액으로 표시했습니다.');

console.log('PASS 고객 온라인 상점·장바구니 프리뷰 계약');
