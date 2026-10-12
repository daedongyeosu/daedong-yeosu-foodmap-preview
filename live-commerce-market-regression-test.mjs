import fs from 'node:fs';

const customerPage=fs.readFileSync('online-store/index.html','utf8');
const customerScript=fs.readFileSync('online-store/app.js','utf8');
const customerStyle=fs.readFileSync('online-store/live-market.css','utf8');
const partnerPage=fs.readFileSync('store-partner/index.html','utf8');
const partnerScript=fs.readFileSync('store-partner/app.js','utf8');
const managerPage=fs.readFileSync('store-manager/index.html','utf8');
const managerScript=fs.readFileSync('store-manager/app.js','utf8');

for(const text of ['지금 움직이는 가격','함께 주문','재고 할인','관심상품','다른 가게 가격을 따라 자동으로 내리지 않습니다.'])if(!customerPage.includes(text))throw new Error(`고객 실시간 장터 필수 문구 누락: ${text}`);
for(const contract of ['function renderLiveMarket','function priceState','function cartEntry','lockedPrice','bestLockedPrice','결제확인','최저'])if(!customerScript.includes(contract))throw new Error(`고객 실시간 장터 기능 계약 누락: ${contract}`);
if(!customerStyle.includes('.live-market-card')||!customerStyle.includes('@media(max-width:420px)'))throw new Error('실시간 장터 모바일 카드 스타일이 없습니다.');

for(const text of ['실시간 할인 사용','함께 주문할수록 할인','남은 재고 실시간 할인','최저 판매가격'])if(!partnerPage.includes(text))throw new Error(`상점주 상품 할인설정 문구 누락: ${text}`);
if(!(partnerPage+partnerScript).includes('경쟁 가게 가격과 자동 연동하지 않습니다.'))throw new Error('경쟁 가게 가격 비연동 원칙이 없습니다.');
for(const contract of ['function readLivePricing','competitorPricing:false','merchantControlled:true','livePricing'])if(!partnerScript.includes(contract))throw new Error(`상점주 할인설정 계약 누락: ${contract}`);
if(!managerPage.includes('실시간 판매설정')||!managerScript.includes('function renderLivePricingPrograms'))throw new Error('상점주 주문관리에서 할인 사용·중지 기능을 찾을 수 없습니다.');
if(!customerPage.includes('../live-commerce-engine.js')||!partnerPage.includes('../live-commerce-engine.js')||!managerPage.includes('../live-commerce-engine.js'))throw new Error('세 화면이 같은 가격 계산기를 사용해야 합니다.');

console.log('PASS 고객·상점주 실시간 장터 화면 계약');
