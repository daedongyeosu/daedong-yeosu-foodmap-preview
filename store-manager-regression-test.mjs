import fs from 'node:fs';

const page=fs.readFileSync('store-manager/index.html','utf8');
const script=fs.readFileSync('store-manager/app.js','utf8');
const style=fs.readFileSync('store-manager/styles.css','utf8');
const partner=fs.readFileSync('store-partner/index.html','utf8');

for(const text of ['상점주 주문관리 화면 미리보기','실제 결제·환불·고객 알림·젠딜리 배송요청은 발생하지 않습니다.','주문 받는 중','처리할 주문','주문 수락','상품 준비완료','배송요청 미리보기','상점 정산예정']){
  if(!page.includes(text)&&!script.includes(text))throw new Error(`상점주 주문관리 필수 문구 누락: ${text}`);
}
for(const contract of ["const STORAGE_KEY='matjido-store-manager-preview-v1'","new:'새 주문'","preparing:'준비중'","ready:'준비완료'","delivery_requested:'배송요청'",'function renderOrders','function openOrder','function history','localStorage.setItem']){
  if(!script.includes(contract))throw new Error(`상점주 주문 상태 계약 누락: ${contract}`);
}
if(!script.includes('수량 ${item.quantity} · ${item.unit}'))throw new Error('상품 수량과 판매단위가 붙어 오해되지 않도록 분리해 표시해야 합니다.');
if(!partner.includes('href="../store-manager/"'))throw new Error('상점 개설 화면에서 상점주 주문관리 미리보기로 연결되지 않습니다.');
if(!style.includes('@media(max-width:390px)'))throw new Error('390px 모바일 전용 보정이 없습니다.');
if(/fetch\s*\(|XMLHttpRequest|WebSocket/.test(script))throw new Error('프리뷰 상점주 화면에서 외부 주문·배송 요청을 전송할 수 있습니다.');
if(/블록요금|고산지대|회피구역|내부 계산/.test(page+script))throw new Error('상점주 화면에 내부 배송비 계산근거가 노출됐습니다.');

console.log('PASS 상점주 모바일 주문접수 프리뷰 계약');
