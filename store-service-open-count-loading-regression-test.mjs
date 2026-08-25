import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(runtime, /let serviceLoadState = 'loading'/);
assert.match(runtime, /data-store-finder-open-count aria-live="polite">확인 중</,
  '홈 빠른 필터에는 현재 영업 중인 가게 수를 준비 상태와 함께 표시해야 합니다.');
assert.match(runtime, /const countReady = serviceLoadState === 'ready' && source\.length > 0/,
  '영업정보와 가게목록이 모두 준비된 뒤에만 영업 중 가게 수를 계산해야 합니다.');
assert.match(runtime, /\['open', 'closing-soon'\]\.includes\(storeStatus\(serviceInfoForStore\(store\)\)\.state\)/,
  '영업 중과 곧 종료 가게만 홈 영업 중 숫자에 포함해야 합니다.');
assert.match(runtime, /const nextCount = countReady \? String\(count\) : loadFailed \? '다시 확인' : '확인 중'/,
  '로딩 중 0곳을 오표시하지 않고 실패 시 재확인이 필요함을 알려야 합니다.');
assert.match(runtime, /for \(const delay of \[0, 1200\]\)/,
  '모바일 웹뷰의 일시적인 서비스 API 실패를 재시도해야 합니다.');
assert.match(runtime, /window\.daedongDataApi\.services\(\{timeoutMs: 20000\}\)/,
  '모바일 웹뷰에서 서비스 API 요청이 무한 대기하면 안 됩니다.');
assert.match(runtime, /const SERVICE_BOOT_DELAY_MS = 6000/);
assert.match(runtime, /const ready = Promise\.race\(\[\s*window\.daedongCatalogReady \|\| Promise\.resolve\(\[\]\),\s*wait\(4000\)\s*\]\)\.then\(\(\) => wait\(SERVICE_BOOT_DELAY_MS\)\)\.then\(\(\) => beginServiceLoad\(\)\)/,
  '영업시간은 첫 가게목록 표시 뒤에 준비되어 초기 회선 경합을 피해야 합니다.');
assert.doesNotMatch(runtime, /Promise\.all\(\[\s*loadServiceData\(\)[\s\S]*daedongLocationRankingReady/,
  '위치정렬 지연이 영업정보를 막으면 안 됩니다.');
assert.match(runtime, /if \(serviceLoadState === 'ready' && sourceStores\(\)\.length\)[\s\S]*showOverview\(trigger, \{status:/,
  '영업시간과 가게목록이 준비된 뒤에만 영업 중 필터를 열어야 합니다.');
assert.match(runtime, /else \{\s*showOverview\(trigger, \{status: 'all'\}\)/,
  '영업시간 확인 실패 시 빈 영업 중 결과가 아니라 전체 가게를 보여줘야 합니다.');
assert.match(html, /store-service-info\.js\?v=store-service-26-deferred-bootstrap-1-menu-search-status-order-1/);
assert.match(html, /store-service-info\.js\?v=[^"'\n]*home-open-count-1/);

console.log('PASS: 영업시간 로딩 중 0곳 오표시와 빈 목록 진입을 방지합니다.');
