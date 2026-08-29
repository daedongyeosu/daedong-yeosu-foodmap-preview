import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(runtime, /info\.hours\.partialWeekly === true && observedWeekdays\.length > 0/,
  '요기요 오늘 영업시간을 완전한 주간 일정과 구분해야 합니다.');
assert.match(runtime, /!isPartialWeekly \|\| observedWeekdays\.includes\(previous\.weekday\)/,
  '관측하지 않은 전날의 심야 영업을 추정하면 안 됩니다.');
assert.match(runtime, /isPartialWeekly && !observedWeekdays\.includes\(now\.weekday\)/,
  '관측하지 않은 요일을 휴무로 판정하면 안 됩니다.');
assert.match(runtime, /today: '오늘 영업시간은 주문앱에서 확인'/,
  '관측하지 않은 오늘은 고객에게 확인 필요로 알려야 합니다.');
assert.match(html, /store-service-info\.js\?v=[^"\n]*yogiyo-partial-hours-1/,
  '고객 휴대폰이 부분 영업시간 판정 코드를 즉시 받아야 합니다.');

console.log('yogiyo partial hours regression: PASS');
