import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const addressJs = readFileSync(new URL('./rc7-address-map.js', import.meta.url), 'utf8');
const addressCss = readFileSync(new URL('./rc7-address-map.css', import.meta.url), 'utf8');
const loader = readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

for (const token of ['KAKAOTALK', 'FBAN|FBAV|FB_IAB', 'Instagram']) {
  assert.ok(addressJs.includes(token), `내부 브라우저 감지 누락: ${token}`);
}
assert.ok(addressJs.includes('현재 위치 다시 확인'), '현재 위치 재확인 문구 누락');
assert.ok(addressJs.includes('Chrome에서 열기'), 'Chrome 열기 안내 누락');
assert.ok(addressJs.includes('package=com.android.chrome'), 'Android Chrome intent 누락');
assert.ok(addressJs.includes("navigator.permissions.query({name: 'geolocation'})"), '위치 권한 상태 확인 누락');
assert.ok(addressJs.includes('data-rc5-postcode-open>주소 검색'), '위치 실패 시 주소 검색 복구 경로 누락');
assert.ok(addressJs.includes('data-rc7-map-select>지도에서 선택'), '위치 실패 시 지도 선택 복구 경로 누락');
assert.ok(addressCss.includes('.rc7-inapp-notice'), '내부 브라우저 안내 스타일 누락');
assert.ok(addressCss.includes('.rc7-location-recovery'), '위치 복구 스타일 누락');
assert.ok(loader.includes('inapp-location-recovery-1'), 'RC7 스크립트 캐시 버전 누락');
assert.ok(html.includes('home-share-touch-3-inapp-location-recovery-1'), 'RC7 CSS 캐시 버전 누락');
assert.ok(html.includes('category-more-card-touch-1-inapp-location-recovery-1'), '메인 로더 캐시 버전 누락');

console.log('PASS in-app browser location recovery regression');
