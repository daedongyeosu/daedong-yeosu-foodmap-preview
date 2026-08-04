import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const service = JSON.parse(fs.readFileSync(new URL('./store-service-info.json', import.meta.url), 'utf8'));

const convert = (period, rawHour, rawMinute) => {
  const marker = String(period || '').replace(/\./g, '').toLowerCase();
  let hour = Number(rawHour);
  if (marker === '오전' || marker === 'am') hour %= 12;
  else if (marker === '오후' || marker === 'pm') hour = (hour % 12) + 12;
  else if (marker === '낮') hour = hour === 12 ? 12 : (hour % 12) + 12;
  else if (marker === '밤') hour = hour === 12 ? 24 : hour <= 5 ? hour : (hour % 12) + 12;
  return `${String(hour).padStart(2, '0')}:${String(rawMinute).padStart(2, '0')}`;
};
const format24 = value => String(value ?? '')
  .replace(/(오전|오후|낮|밤)\s*(\d{1,2})\s*:\s*(\d{2})/g, (_, period, hour, minute) => convert(period, hour, minute))
  .replace(/\b(\d{1,2})\s*:\s*(\d{2})\s*(AM|PM)\b/gi, (_, hour, minute, period) => convert(period, hour, minute));

assert.equal(format24('매일 오후 04:00 ~ 오후 10:30'), '매일 16:00 ~ 22:30');
assert.equal(format24('평일 오후 05:00 ~ 익일 오전 03:00'), '평일 17:00 ~ 익일 03:00');
assert.equal(format24('매일 낮 12:00 ~ 밤 12:00'), '매일 12:00 ~ 24:00');
assert.equal(format24('오전 12:30 ~ 오후 12:05'), '00:30 ~ 12:05');
assert.equal(format24('04:00 PM ~ 10:30 PM'), '16:00 ~ 22:30');

const displayLines = Object.values(service.stores || {}).flatMap(info => info?.hours?.displayLines || []);
const markedLines = displayLines.filter(line => /(오전|오후|낮|밤|\bAM\b|\bPM\b)/i.test(line));
assert.ok(markedLines.length > 1000, '12시간제로 수집된 영업시간 안내문을 전수 검사해야 합니다.');
assert.ok(markedLines.every(line => !/(오전|오후|낮|밤|\bAM\b|\bPM\b)/i.test(format24(line))), '24시간제로 변환되지 않는 영업시간 안내문이 있습니다.');

assert.match(runtime, /function formatCustomerHours24\(value\)/);
assert.match(runtime, /formatCustomerHours24\(status\.detail\)/);
assert.match(runtime, /formatCustomerHours24\(status\.today\)/);
assert.match(runtime, /formatCustomerHours24\(entry\.status\.today\)/);
assert.match(runtime, /displayLines\.map\(line => `<span>\$\{escapeHtml\(formatCustomerHours24\(line\)\)\}<\/span>`\)/);
assert.match(html, /store-service-19-mobile-freeze-fix-1/);

console.log(`PASS: 고객용 영업시간 ${markedLines.length}줄을 24시간제로 통일`);
