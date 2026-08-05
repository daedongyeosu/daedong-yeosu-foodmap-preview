import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(runtime, /let serviceLoadState = 'loading'/);
assert.match(runtime, /const nextCount = countReady \? String\(count\) : loadFailed \? '다시 확인' : '확인 중'/,
  '영업시간 로딩 전의 빈 데이터를 0곳으로 표시하면 안 됩니다.');
assert.match(runtime, /for \(const delay of \[0, 1200\]\)/,
  '모바일 웹뷰의 일시적인 서비스 API 실패를 재시도해야 합니다.');
assert.match(runtime, /window\.daedongDataApi\.services\(\{timeoutMs: 20000\}\)/,
  '모바일 웹뷰에서 서비스 API 요청이 무한 대기하면 안 됩니다.');
assert.match(runtime, /const ready = beginServiceLoad\(\)/,
  '영업시간은 가게목록·위치정렬과 독립적으로 준비되어야 합니다.');
assert.doesNotMatch(runtime, /Promise\.all\(\[\s*loadServiceData\(\)[\s\S]*daedongLocationRankingReady/,
  '위치정렬 지연이 영업정보를 막으면 안 됩니다.');
assert.match(runtime, /if \(serviceLoadState === 'ready' && sourceStores\(\)\.length\)[\s\S]*showOverview\(trigger, \{status:/,
  '영업시간과 가게목록이 준비된 뒤에만 영업 중 필터를 열어야 합니다.');
assert.match(runtime, /else \{\s*showOverview\(trigger, \{status: 'all'\}\)/,
  '영업시간 확인 실패 시 빈 영업 중 결과가 아니라 전체 가게를 보여줘야 합니다.');
assert.match(html, /store-service-info\.js\?v=store-service-23-customer-popup-order-1/);

console.log('PASS: 영업시간 로딩 중 0곳 오표시와 빈 목록 진입을 방지합니다.');
