import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const eventJs = fs.readFileSync(new URL('./mukkebi-summer-event.js', import.meta.url), 'utf8');

for (const requiredCopy of [
  '2026여수세계섬박람회 기념',
  '5천 원 할인쿠폰',
  '09.01.(화) ~ 10.31.(토)',
  '15,000원 이상 주문 시',
  '5천 원 즉시 할인',
  '먹깨비 앱 이용 시민·관광객',
  '매일 선착순 500매',
  '1일 1회',
  '총 18,000매',
  '예산 소진 시 종료',
]) {
  assert.ok(html.includes(requiredCopy), `공식 행사 정보가 빠졌습니다: ${requiredCopy}`);
}

for (const staleCopy of [
  '여수시 여름휴가 기념',
  '3천 원 할인',
  '08.01.(토) ~ 08.31.(월)',
  '12,000원 이상 주문 시',
  '총 선착순 6,300매',
]) {
  assert.ok(!html.includes(staleCopy), `종료된 이전 행사 정보가 남았습니다: ${staleCopy}`);
}

assert.match(eventJs, /EVENT_START = new Date\('2026-09-01T00:00:00\+09:00'\)/,
  '행사 시작일 전에는 팝업이 열리지 않아야 합니다.');
assert.match(eventJs, /EVENT_END = new Date\('2026-11-01T00:00:00\+09:00'\)/,
  '10월 31일 하루가 끝날 때까지 팝업을 표시해야 합니다.');
assert.match(eventJs, /Date\.now\(\) < EVENT_START[\s\S]*campaign-not-started/);
assert.match(eventJs, /Date\.now\(\) >= EVENT_END[\s\S]*campaign-ended/);
assert.match(eventJs, /daedongMukkebiIslandExpoEventHiddenDateV1/,
  '이전 행사 숨김 기록과 새 섬박람회 행사를 분리해야 합니다.');
assert.match(eventJs, /daedongMukkebiIslandExpoEventSeenSessionV1/,
  '이전 행사 세션 기록 때문에 새 팝업이 가려지면 안 됩니다.');
assert.match(html, /총 18,000매<br>예산 소진 시 종료/,
  '총 발행량과 예산 소진 안내는 모바일에서 읽기 좋은 두 줄로 고정해야 합니다.');

console.log('PASS: 2026여수세계섬박람회 먹깨비 쿠폰 팝업 정보와 노출 기간이 정확합니다.');
