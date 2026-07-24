import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const appCss = read('./app.css');
const index = read('./index.html');
const rc2 = read('./rc2-fixes.js');
const rc3 = read('./rc3-fixes.js');
const stores = JSON.parse(read('./data/stores.json'));

assert(
  appCss.includes('#recommendRails .rail-order-button{display:none!important}'),
  '추천 카드의 구형 주문방법 보기 버튼이 초기 스타일에서 숨겨지지 않습니다.'
);
assert(
  index.includes('app.css?v=selected-category-label-1-external-app-text-1-legacy-rail-button-hidden-1'),
  '초기 스타일 캐시 버전이 갱신되지 않았습니다.'
);
assert(
  rc2.includes('class="rail-card-open glass-action" data-rail-store-id="${escapeHtml(store.id)}"'),
  '구형 렌더러의 카드 전체 상세 진입점이 사라졌습니다.'
);
assert(
  rc2.includes("const railStore = event.target.closest('[data-rail-store-id]');"),
  '구형 카드 전체 터치 처리기가 사라졌습니다.'
);
assert(
  rc2.includes('if (store) openStore(store); return;'),
  '구형 카드의 상세 팝업 연결이 사라졌습니다.'
);
assert(
  rc2.includes('class="rail-order-button glass-action" data-rail-store-id="${escapeHtml(store.id)}"'),
  '구형 버튼 코드를 삭제하지 않고 표시만 숨겨야 합니다.'
);
assert(
  rc3.includes('data-rc3-rail-open="${escapeHtml(store.id)}"'),
  '현재 추천 카드의 전체 터치 진입점이 사라졌습니다.'
);
assert(
  rc3.includes('if (store) openStore(store);'),
  '현재 추천 카드의 상세 팝업 연결이 사라졌습니다.'
);
assert(stores.length === 650, `전체 가게 수가 변경되었습니다: ${stores.length}`);
assert(
  stores.flatMap(store => store.routes || []).length === 4558,
  '주문경로 수가 변경되었습니다.'
);

console.log(JSON.stringify({
  ok: true,
  totalStores: stores.length,
  totalRoutes: stores.flatMap(store => store.routes || []).length,
  legacyButtonHiddenOnly: true,
  cardOpenHandlersPreserved: true
}, null, 2));
