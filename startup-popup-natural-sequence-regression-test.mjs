import assert from 'node:assert/strict';
import fs from 'node:fs';

const eventJs = fs.readFileSync(new URL('./mukkebi-summer-event.js', import.meta.url), 'utf8');
const introJs = fs.readFileSync(new URL('./turtle-ship-hero.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(eventJs, /const FOLLOWUP_INTRO_DELAY = 3000/,
  '첫 팝업과 두 번째 안내 사이에는 3초의 숨 고르기 시간이 있어야 합니다.');
assert.match(eventJs, /window\.daedongCommunityIntroReadyAt = readyAt/);
assert.match(eventJs, /window\.dispatchEvent\(new Event\('daedong:mukkebi-followup-ready'\)\)/);
assert.match(introJs, /const introReadyAt = Number\(window\.daedongCommunityIntroReadyAt \|\| 0\)/);
assert.match(introJs, /!introReadyAt \|\| Date\.now\(\) >= introReadyAt/,
  '일반 안내는 약속된 지연시간 전에 열리면 안 됩니다.');
assert.match(introJs, /window\.addEventListener\('daedong:mukkebi-followup-ready', waitForClearHome\)/,
  '지연시간이 끝나면 다른 화면이 없는 안전한 홈에서만 일반 안내를 시작해야 합니다.');
assert.match(html, /mukkebi-summer-event\.js\?v=[^"\n]*natural-followup-1/);
assert.match(html, /turtle-ship-hero\.js\?v=[^"\n]*natural-followup-1/);

console.log('startup popup natural sequence regression: PASS');
