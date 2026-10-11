import fs from 'node:fs';

const page=fs.readFileSync('online-store/index.html','utf8');
const script=fs.readFileSync('online-store/app.js','utf8');
const style=fs.readFileSync('online-store/order-tracking.css','utf8');

const mainEnd=page.indexOf('</main>');
const trackingIndex=page.indexOf('id="orderTracking"');
const reviewIndex=page.indexOf('id="orderReviewPanel"');
if(trackingIndex<0||trackingIndex>mainEnd||trackingIndex>reviewIndex)throw new Error('고객 주문조회가 메인 화면에 없어 새로 열었을 때 찾을 수 없습니다.');

for(const copy of ['내 테스트 주문','주문 전달','주문 수락','상품 준비','준비완료','배송요청','새로고침']){
  if(!page.includes(copy))throw new Error(`고객 주문 진행단계 누락: ${copy}`);
}
for(const contract of ["const ORDER_PROGRESS=['NEW','ACCEPTED','PREPARING','READY','DELIVERY_REQUESTED']",'function paintTracking(order,events=[])','result.events','trackingClock','refreshTracking','scrollIntoView',"document.querySelector('#cartPanel').hidden=true"]){
  if(!script.includes(contract))throw new Error(`고객 주문 상태 동기화 계약 누락: ${contract}`);
}
if(!script.includes("document.querySelector('#refreshTracking').addEventListener('click',refreshTracking)"))throw new Error('고객이 주문상태를 즉시 다시 확인할 수 없습니다.');
if(!style.includes('.tracking-steps')||!style.includes('@media(max-width:390px)')||!style.includes('scroll-margin-top:84px'))throw new Error('모바일 주문 단계 표시 또는 고정 헤더 보정 스타일이 없습니다.');
if(/toss|zendely|젠딜리.*fetch/i.test(script))throw new Error('고객 프리뷰에서 실제 결제 또는 젠딜리 전송 코드가 발견됐습니다.');

console.log('PASS 고객 온라인상점 주문상태 동기화 계약');
