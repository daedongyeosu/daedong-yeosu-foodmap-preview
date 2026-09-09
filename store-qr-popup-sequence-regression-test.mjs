import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const intro = readFileSync('turtle-ship-hero.js', 'utf8');
const event = readFileSync('mukkebi-summer-event.js', 'utf8');
const experience = readFileSync('final-experience.js', 'utf8');

assert.match(html, /window\.daedongDedicatedEntryStoreId\s*=\s*String\([\s\S]*?searchParams\.get\('hero'\)[\s\S]*?searchParams\.get\('store'\)/,
  '가게 QR 대상은 지연 스크립트보다 먼저 고정해야 합니다.');
assert.match(experience, /params\.get\(FX_STORE_SHARE_PARAM\)\|\|params\.get\('hero'\)/,
  'hero 형식의 기존 가게 QR도 첫 화면에서 해당 가게를 열어야 합니다.');

assert.match(intro, /function updateDedicatedStorePhase\(\)[\s\S]*?dedicatedStoreDetailOpened\s*=\s*true[\s\S]*?dedicatedStoreDetailClosed\s*=\s*true/,
  '가게 상세가 실제로 열렸다가 닫힌 사실을 순서대로 확인해야 합니다.');
assert.match(intro, /if \(dedicatedPhase !== 'closed'\) return/,
  '가게 상세가 닫히기 전에는 일반 안내를 표시하면 안 됩니다.');
assert.match(intro, /if \(dedicatedEntryStoreId && dedicatedStoreDetailClosed\) return false/,
  '가게 상세 닫기 동작을 후속 안내 취소로 오인하면 안 됩니다.');
assert.match(intro, /window\.daedongEntryHadExternalReturn === true[\s\S]*?daedong-external-return-pending/,
  '주문앱 복귀 화면에서는 QR 후속 팝업을 차단해야 합니다.');

assert.match(event, /const RETURN_QUERY_KEYS = \['store', 'hero', '__ddret', '__ddom', '__ddappfallback'\]/,
  '가게 QR에서는 먹깨비 행사가 첫 화면을 선점하면 안 됩니다.');
assert.match(event, /function isDedicatedStoreSequenceInteraction\([\s\S]*?#modal \.store-detail, #modal \.modal-close/,
  '가게 상세 보기와 닫기를 후속 행사 취소 동작으로 오인하면 안 됩니다.');
assert.match(event, /window\.addEventListener\('daedong:community-intro-closed', scheduleCampaignFollowup\)/,
  '먹깨비 행사는 일반 안내가 닫힌 뒤에만 예약해야 합니다.');
assert.match(event, /const FOLLOWUP_CAMPAIGN_DELAY = 3000/,
  '두 안내 사이에는 기존 3초 화면 여유를 유지해야 합니다.');
assert.match(event, /if \(opened\) return block\('already-opened'\)[\s\S]*?if \(seenThisSession\(\)\) return block\('seen-session'\)/,
  '닫은 행사 팝업이 같은 세션에서 다시 살아나면 안 됩니다.');

assert.match(html, /mukkebi-summer-event\.js\?v=[^"\n]*store-qr-popup-sequence-1/);
assert.match(html, /turtle-ship-hero\.js\?v=[^"\n]*store-qr-popup-sequence-1/);

console.log('store QR popup sequence regression: PASS');
