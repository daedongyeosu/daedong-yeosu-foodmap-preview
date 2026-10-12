import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync('live-commerce-engine.js','utf8');
const sandbox={};
vm.createContext(sandbox);
vm.runInContext(source,sandbox);
const engine=sandbox.MatjidoLiveCommerce;
assert.ok(engine,'실시간 할인 계산기를 브라우저 전역에 공개해야 합니다.');

const future='2030-01-01T00:00:00.000Z';
const before=new Date('2029-01-01T00:00:00.000Z').getTime();
const cumulative={price:12000,livePricing:{enabled:true,mode:'cumulative',floorPrice:9900,endAt:future,confirmedOrders:7,tiers:[{threshold:5,price:11500},{threshold:10,price:10800},{threshold:20,price:9900}]}};
let state=engine.evaluate(cumulative,before);
assert.equal(state.currentPrice,11500,'결제 확인 누적 주문수에 해당하는 단계 가격을 적용');
assert.equal(state.nextTier.threshold,10,'다음 누적 주문 단계를 안내');
assert.match(engine.describeNext(state),/3개 더 주문되면 10,800원/);

state=engine.evaluate({...cumulative,livePricing:{...cumulative.livePricing,confirmedOrders:30}},before);
assert.equal(state.currentPrice,9900,'누적 주문 최종 단계에서도 상점 최저가격을 지킴');
assert.equal(state.nextTier,null);

const clearance={price:4500,stockQuantity:6,livePricing:{enabled:true,mode:'clearance',floorPrice:3300,endAt:future,remainingStock:6,tiers:[{threshold:10,price:4200},{threshold:5,price:3800},{threshold:2,price:3300}]}};
state=engine.evaluate(clearance,before);
assert.equal(state.currentPrice,4200,'남은 재고가 기준 이하일 때 재고소진 단계 적용');
assert.equal(state.nextTier.threshold,5,'다음 재고소진 단계를 안내');
state=engine.evaluate({...clearance,livePricing:{...clearance.livePricing,remainingStock:1}},before);
assert.equal(state.currentPrice,3300,'재고가 줄어도 최저가격 아래로 내려가지 않음');

state=engine.evaluate({...cumulative,livePricing:{...cumulative.livePricing,endAt:'2020-01-01T00:00:00.000Z'}},before);
assert.equal(state.active,false,'종료된 행사는 정상가격으로 복귀');
assert.equal(state.currentPrice,12000);
assert.equal(engine.bestLockedPrice(11500,10800,12000),10800,'장바구니 가격은 행사 중 더 낮아진 경우에만 갱신');
assert.equal(engine.bestLockedPrice(10800,11500,12000),10800,'장바구니 가격은 다시 오르지 않음');
assert.equal(engine.bestLockedPrice(null,4200,4500),4200,'처음 담을 때 현재 행사 가격을 정상적으로 잠금');

console.log('PASS 실시간 할인·누적주문 가격 계산 계약');
