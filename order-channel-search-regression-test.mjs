import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const rc2 = fs.readFileSync(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const rc3 = fs.readFileSync(new URL('./rc3-fixes.js', import.meta.url), 'utf8');
const rc6 = fs.readFileSync(new URL('./rc6-fixes.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./final-experience.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(source, /placeholder="메뉴·가게명·혜택 검색"/, '주문경로별 공통 검색창 문구가 있어야 함');
assert.match(source, /window\.daedongDataApi\?\.menuSearch\?\.\(query\)/, '메뉴명은 메뉴 검색 API로 찾아야 함');
assert.match(source, /window\.daedongStoreServiceInfo\?\.get/, '가게 혜택 자료를 검색어에 포함해야 함');
assert.match(rc2, /rc2AppBrowserMarkup\(key, selectedCategory = '추천', searchQuery = ''\)/, '주문앱 복귀 레이어도 검색어를 보존해야 함');
assert.match(rc2, /rc2OpenBrandHub\(view = 'channels', value = '', searchQuery = ''\)/, '브랜드앱 레이어도 검색어를 받을 수 있어야 함');
assert.match(rc3, /rc3OpenPhoneDirectory\(category = '추천', searchQuery = ''\)/, '전화주문 최종 화면도 검색어를 받을 수 있어야 함');
assert.match(rc6, /rc6LocationBrandHub\(view='channels',value='',searchQuery=''\)/, '위치 정렬 뒤 브랜드앱 화면도 검색을 유지해야 함');

for (const surface of [
  'class="app-browser" data-channel-search-root',
  'class="phone-order-sheet" data-channel-search-root',
  'class="brand-app-hub" data-channel-search-root',
  'class="happyorder-hub" data-channel-search-root'
]) {
  assert.ok(source.includes(surface), `${surface} 화면에 주문경로 검색이 있어야 함`);
}

for (const channel of ['mukkebi', 'ddangyo', 'yogiyo', 'coupang', 'baemin']) {
  assert.ok(source.includes(`'${channel}'`), `${channel} 주문경로가 앱별 검색 화면 대상이어야 함`);
}

assert.match(source, /data-phone-category[\s\S]*fxOpenPhoneDirectory\([^\n]+channel-search-input/, '전화주문 카테고리를 바꿔도 검색어가 유지되어야 함');
assert.match(source, /data-app-category[\s\S]*openAppBrowser\([^\n]+channel-search-input/, '주문앱 카테고리를 바꿔도 검색어가 유지되어야 함');
assert.match(css, /\.channel-modal-search\{/, '모바일 검색창 스타일이 있어야 함');
assert.match(css, /\.channel-modal-search-empty\{/, '검색 결과 없음 안내 스타일이 있어야 함');
assert.match(html, /final-experience\.js\?v=[^"\n]*order-channel-search-1/, '브라우저가 새 검색 스크립트를 받아야 함');
assert.match(html, /final-experience\.css\?v=[^"\n]*order-channel-search-1/, '브라우저가 새 검색 스타일을 받아야 함');

console.log('주문경로별 메뉴·가게명·혜택 검색 회귀검사 통과');
