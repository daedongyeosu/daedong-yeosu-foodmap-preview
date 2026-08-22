import assert from 'node:assert/strict';
import fs from 'node:fs';

const service = fs.readFileSync('store-service-info.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(service, /let overviewSuspendedForChild = false/,
  '통합검색 아래에 열린 상세 화면의 복귀 상태를 추적해야 합니다.');
assert.match(service, /function suspendOverviewForChild\(\)[\s\S]*?overlay\.hidden = true[\s\S]*?overviewSuspendedForChild = true/,
  '상세 화면을 열 때 검색 결과를 지우지 않고 잠시 숨겨야 합니다.');
assert.match(service, /function resumeOverviewAfterChild\(\)[\s\S]*?overlay\.hidden = false[\s\S]*?overviewSuspendedForChild = false/,
  '상세 화면에서 돌아오면 기존 검색 결과를 즉시 다시 보여야 합니다.');
assert.match(service, /const storeCard = event\.target\.closest\('\[data-store-service-store-id\]'\);[\s\S]*?suspendOverviewForChild\(\);[\s\S]*?openStoreAfterOverview\(storeId\)/,
  '검색 결과 카드에서 상세로 이동할 때 검색 히스토리를 먼저 제거하면 안 됩니다.');
assert.doesNotMatch(service, /const storeCard = event\.target\.closest\('\[data-store-service-store-id\]'\);[\s\S]{0,500}?history\.back\(\)/,
  '검색 결과 카드 터치 직후 history.back()을 호출하면 상세 뒤로가기에서 홈이 나타납니다.');
assert.match(service, /if \(event\.state\?\.\[HISTORY_KEY\] && overviewSuspendedForChild\) \{[\s\S]*?resumeOverviewAfterChild\(\);/,
  '상세 화면의 X와 휴대전화 뒤로가기 모두 검색 히스토리에서 기존 결과를 복원해야 합니다.');
assert.match(html, /store-service-info\.js\?v=[^"\n]*detail-search-return-1/,
  '수정된 검색 복귀 스크립트가 모바일 캐시에 즉시 반영되어야 합니다.');

console.log('store service detail return regression: PASS');
