import assert from 'node:assert/strict';
import fs from 'node:fs';

const eventJs = fs.readFileSync(new URL('./mukkebi-summer-event.js', import.meta.url), 'utf8');
const introJs = fs.readFileSync(new URL('./turtle-ship-hero.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(eventJs, /const FOLLOWUP_CAMPAIGN_DELAY = 3000/,
  '첫 팝업과 두 번째 안내 사이에는 3초의 숨 고르기 시간이 있어야 합니다.');
assert.match(introJs, /window\.dispatchEvent\(new Event\('daedong:community-intro-closed'\)\)/,
  '일반 안내가 완전히 닫힌 뒤에만 먹깨비 후속 팝업을 예약해야 합니다.');
assert.match(eventJs, /window\.addEventListener\('daedong:community-intro-closed', scheduleCampaignFollowup\)/);
assert.match(eventJs, /function scheduleCampaignFollowup\(\)[\s\S]*?FOLLOWUP_CAMPAIGN_DELAY/,
  '먹깨비 팝업은 일반 안내 뒤 후속 순서로 예약되어야 합니다.');
assert.match(eventJs, /target\?\.closest\('#communityIntro'\)\) return/,
  '첫 안내 닫기 동작을 고객의 다른 화면 이동으로 오인해 두 번째 팝업을 취소하면 안 됩니다.');
assert.match(html, /mukkebi-summer-event\.js\?v=[^"\n]*mukkebi-second-1/);
assert.match(html, /turtle-ship-hero\.js\?v=[^"\n]*mukkebi-second-1/);

console.log('startup popup natural sequence regression: PASS');
