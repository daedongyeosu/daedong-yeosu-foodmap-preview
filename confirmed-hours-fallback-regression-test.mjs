import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync('store-service-info.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(runtime, /const displayLines = Array\.isArray\(info\?\.hours\?\.displayLines\)/,
  '요일별 구조가 없어도 수집된 영업시간 문구를 확인해야 합니다.');
assert.match(runtime, /label: '영업시간 확인'/,
  '확인된 영업시간이 있는 가게를 시간 미확인으로 표시하면 안 됩니다.');
assert.match(runtime, /hoursLine\.replace\(\/\^\\d\{4\}-\\d\{2\}-\\d\{2\}\\s\*확인/,
  '고객 카드에서는 수집 확인 날짜를 제거하고 실제 시간부터 보여줘야 합니다.');
assert.match(runtime, /today: '현재 영업 여부는 주문앱에서 확인'/,
  '요일 정보가 없는 영업시간을 현재 영업 중으로 추정하면 안 됩니다.');
assert.match(html, /store-service-info\.js\?v=[^"\n]*confirmed-hours-fallback-1/,
  '고객 휴대폰이 수정된 영업시간 표시 코드를 즉시 받도록 캐시 버전을 올려야 합니다.');

console.log('confirmed hours fallback regression: PASS');
