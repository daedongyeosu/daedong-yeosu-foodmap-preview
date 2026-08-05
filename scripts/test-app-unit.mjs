import fs from 'node:fs';
import {execFileSync} from 'node:child_process';

const app = fs.readFileSync('app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const rc5 = fs.readFileSync('rc5-fixes.js', 'utf8');
const rc7 = fs.readFileSync('rc7-address-map.js', 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
  console.log('PASS', message);
};

assert(app.includes('credentials: \'omit\''), '통계 전송에 로그인 정보 미포함');
assert(app.includes('.catch(() => {})'), '통계 실패가 고객 이동을 차단하지 않음');
assert(app.includes("entrySource = 'store_qr'"), 'hero 주소를 가게 QR로 분류');
assert(app.includes("entrySource = 'shared_link'"), 'store 주소를 공유 링크로 분류');
assert(app.includes("entrySource = 'legacy-bitly'"), '기존 Bitly 유입 분류');
assert(app.includes("['naver', 'chak'].includes(channel) ? 'utility_click' : 'order_click'"), '지도 클릭과 주문 클릭 분리');
assert(index.includes('app.js?v=') && index.includes('anonymous-analytics-1'), '브라우저 캐시 갱신');
assert(rc5.includes("event.target.closest('#modal .rc4-category-all-list .store-card[data-id]')"), '카테고리 더보기 모달 가게카드 터치 연결');
assert(rc5.includes('const store=fxStoreById(modalStore.dataset.id);if(store)openStore(store)'), '카테고리 더보기 카드에서 가게 상세 열기');
assert(finalExperience.includes('rc5-fixes.js?v=category-first-paint-1-category-more-card-touch-1'), '카테고리 더보기 터치 수정 스크립트 캐시 갱신');
assert(index.includes('category-more-card-touch-1'), '카테고리 더보기 터치 수정 홈페이지 캐시 갱신');
assert(app.includes('function normalizeOutsideYeosuCurrent'), '기존 타지역 현재 위치를 여수 전체보기로 복원');
assert(app.includes("label: '여수 외 지역 · 전체 가게 보기'") && app.includes("area: '여수시 전체'"), '타지역 저장 위치의 여수 전체보기 전환');
assert(rc7.includes('const outsideYeosu = !localArea && !isYeosuRegion(region)'), '현재 위치의 여수 안팎 판정');
assert(rc7.includes("area: '여수시 전체'") && rc7.includes('coords: null') && rc7.includes('sortByDistance: false'), '타지역 위치·거리순 해제');
assert(rc7.includes('현재 위치가 여수 외 지역이라 여수 전체 가게를 보여드립니다.'), '타지역 전체보기 안내');
assert(finalExperience.includes('outside-yeosu-full-list-1') && index.includes('outside-yeosu-full-list-1'), '타지역 전체보기 브라우저 캐시 갱신');

let baseApp = '';
try {
  baseApp = execFileSync('git', ['show', 'origin/main:app.js'], {encoding: 'utf8'});
} catch {
  console.log('WARN origin/main 비교 생략');
}

if (baseApp) {
  const urlPattern = /(?:https?:\/\/|tel:)[^'"`\s)]+/g;
  const counts = source => {
    const result = new Map();
    for (const url of source.match(urlPattern) || []) result.set(url, (result.get(url) || 0) + 1);
    return result;
  };
  const before = counts(baseApp);
  const after = counts(app);
  for (const [url, count] of before) {
    assert((after.get(url) || 0) >= count, `기존 주문·지도·전화 주소 보존: ${url}`);
  }
}

console.log('PASS unit tests complete');
await import('../location-ranking-unification-regression-test.mjs');
await import('../mobile-initialization-unblock-regression-test.mjs');
