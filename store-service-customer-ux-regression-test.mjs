import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const service = JSON.parse(fs.readFileSync(new URL('./store-service-info.json', import.meta.url), 'utf8'));

const onnuriStores = Object.values(service.stores).filter(info => (
  (info?.payments || []).some(payment => (
    payment.key === 'onnuri-gift-certificate' && payment.status === 'accepted'
  ))
));

assert.ok(onnuriStores.length > 0, '온누리상품권 사용 가능 가게가 있어야 한다.');
assert.match(runtime, /data-store-service-search-form/);
assert.match(runtime, /enterkeyhint="search"/);
assert.match(runtime, /benefitDefinitionForQuery/);
assert.match(runtime, /사용 가능 \$\{entries\.length\}곳/);
assert.match(runtime, /refreshOverviewQueryResults\(\{scrollToResults: true\}\)/);
assert.match(runtime, /querySelector\('\[data-store-service-query\]'\)\?\.blur\(\)/);
assert.match(runtime, /scrollIntoView\(\{block: 'start'\}\)/);
assert.doesNotMatch(runtime, /땡겨요 화면 재확인/);
assert.doesNotMatch(runtime, /사진으로 받은 정보는 가게를 확인한 뒤 검토·승인하여 반영합니다/);
assert.doesNotMatch(runtime, /표시된 주문앱 기준/);
assert.match(runtime, /주문 전 해당 주문앱에서 다시 확인해 주세요/);
assert.match(html, /store-service-15-single-address-control-1/);

console.log(`PASS: 고객용 혜택 검색 UX 및 내부 문구 비노출 (${onnuriStores.length}곳 온누리상품권 사용 가능)`);
