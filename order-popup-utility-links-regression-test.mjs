import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const stores = JSON.parse(read('./data/stores.json'));
const rc3 = read('./rc3-fixes.js');
const css = read('./rc3-fixes.css');
const finalExperience = read('./final-experience.js');
const index = read('./index.html');

const routeFor = (store, name) => (store.routes || []).find(route => (
  route?.enabled !== false && route?.url && route.name === name
));
const storesWithNaver = stores.filter(store => store.naverMap && store.naverMap !== '#');
const storesWithChak = stores.filter(store => routeFor(store, 'CHAK 지역상품권'));

assert(stores.length === 650, `전체 가게 수가 변경되었습니다: ${stores.length}`);
assert(stores.flatMap(store => store.routes || []).length === 4558, '주문경로 수가 변경되었습니다.');
assert(storesWithNaver.length > 0, '네이버지도 링크가 있는 가게를 찾지 못했습니다.');
assert(storesWithChak.length > 0, 'CHAK 링크가 있는 가게를 찾지 못했습니다.');

assert(rc3.includes('function rc3PopupUtilityLinks(store, {includeChak = true} = {})'), '팝업 공통 이용정보 생성기가 없습니다.');
assert(rc3.includes('${rc3PopupUtilityLinks(store)}<p>가게를 선택해도 전화가 자동으로 걸리지 않습니다.'), '전화주문 팝업에 네이버지도·CHAK가 연결되지 않았습니다.');
assert(rc3.includes('${rc3PopupUtilityLinks(store, {includeChak: false})}<div class="community-choice-list">'), '배달 3사 팝업이 네이버지도 전용 규칙을 사용하지 않습니다.');
assert(rc3.includes("const label = isNaver ? '네이버지도' : 'CHAK 지역상품권앱';"), '팝업 이용정보 이름이 정확하지 않습니다.');
assert(rc3.includes('href="${escapeHtml(item.url)}" target="_blank" rel="noopener"'), '기존 이용정보 주소를 안전하게 연결하지 않습니다.');
assert(rc3.includes('<span class="community-order-kicker">같은 여수, 함께 이어가는 주문</span><div class="community-selected-store"><p class="community-original-label">선택한 가게</p><strong class="selected-store-name">${escapeHtml(store.name)}</strong></div><h2 id="modalTitle">'), '선택한 가게 이름이 주문 안내 팝업 상단에 없습니다.');
assert(!rc3.includes('</div><p class="community-original-label">선택한 가게</p><strong class="selected-store-name">${escapeHtml(store.name)}</strong><p class="community-original-label">처음 선택한 주문방법</p>'), '선택한 가게 이름이 주문방법 목록 아래에 중복되어 있습니다.');
assert(css.includes('.popup-utility-links.single'), '네이버지도 단독 표시 레이아웃이 없습니다.');
assert(css.includes('.community-guide .community-selected-store'), '상단 선택 가게 영역 스타일이 없습니다.');

assert(finalExperience.includes('rc3-fixes.css?v=selected-category-label-1-popup-utility-links-1-selected-store-top-1'), '팝업 스타일 캐시 버전이 갱신되지 않았습니다.');
assert(finalExperience.includes('rc3-fixes.js?v=selected-category-label-1-phone-route-restoration-1-multi-category-1-hamburger-priority-1-external-app-text-1-popup-utility-links-1-selected-store-top-1'), '팝업 코드 캐시 버전이 갱신되지 않았습니다.');
assert(index.includes('final-experience.js?v=selected-category-label-2-store-share-deep-link-2-phone-route-restoration-1-multi-category-1-hamburger-priority-1-external-app-text-1-popup-utility-links-1-selected-store-top-1'), '최종 화면 코드 캐시 버전이 갱신되지 않았습니다.');

console.log(JSON.stringify({
  ok: true,
  totalStores: stores.length,
  totalRoutes: stores.flatMap(store => store.routes || []).length,
  storesWithNaver: storesWithNaver.length,
  storesWithChak: storesWithChak.length
}, null, 2));
