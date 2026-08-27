import assert from 'node:assert/strict';
import fs from 'node:fs';

const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const browserTest = fs.readFileSync('scripts/browser-kakao-cross-document-return.mjs', 'utf8');

assert.match(rc2, /const RC2_RETURN_GUARD_PARAM = '__ddguard'/);
assert.doesNotMatch(rc2, /RC2_NEEDS_EXTERNAL_HISTORY_GUARD/);
assert.match(rc2, /navigationEntry\?\.type === 'back_forward'/);
assert.match(
  rc2,
  /savedToken === historyToken[\s\S]*?savedToken === urlToken[\s\S]*?savedToken === departureToken/,
  '카카오가 JS 기록을 버려도 뒤로가기 재진입과 정확한 출발 토큰이 함께 맞으면 복원해야 합니다.'
);
assert.match(html, /const historyReentry = navigationEntry\?\.type === 'back_forward'/);
assert.match(html, /hasMatchingDepartureMarker\(savedToken\)/);
assert.match(html, /const durableReturnCookie = 'daedongOrderReturnV1'/);
assert.match(html, /historyReentry[\s\S]*?durablePayload\?\.\[durableRequiredField\][\s\S]*?sessionStorage\.setItem\(durableStorageKey, saved\)/,
  '실제 뒤로가기에서만 일회용 쿠키로 잃어버린 Web Storage를 재구성해야 합니다.');
assert.match(rc2, /function rc2ClearReturnState\([\s\S]*?if \(token && rc2IsHistoryReentry\(\)\) rc2ClearDurableReturn\(token\)/,
  '일회용 쿠키는 실제 뒤로가기 복원이 끝났을 때만 소비해야 합니다.');
const writeStart = rc2.indexOf('function rc2WriteReturnState(key, value)');
const writeEnd = rc2.indexOf('function rc2ClearReturnState', writeStart);
const writeReturnState = rc2.slice(writeStart, writeEnd);
assert.match(writeReturnState, /history\.replaceState\(/,
  '현재 Preview 기록에 정확한 일회용 복귀 토큰을 기록해야 합니다.');
assert.doesNotMatch(writeReturnState, /history\.pushState\(|history\.back\(/,
  '주문앱 출발 때 추가 뒤로가기 기록을 만들거나 자동 뒤로가기를 실행하면 안 됩니다.');
assert.match(
  rc2,
  /if \(guardMatches\) returnUrl\.searchParams\.delete\(RC2_RETURN_GUARD_PARAM\)/,
  '외부 앱에서 직접 복귀한 경우 일회용 보호 주소도 제거해야 합니다.'
);
assert.match(browserTest, /window\.location\.assign\(link\.href\)/);
assert.match(browserTest, /history\.replaceState\(\{\}, '', cleanReturnHref\)/);
assert.match(browserTest, /sessionStorage\.removeItem\(key\)[\s\S]*?localStorage\.removeItem\(key\)/,
  '브라우저 재현도 실제 카카오처럼 Web Storage 손실을 포함해야 합니다.');
assert.match(browserTest, /원래 가게 상세 유지/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*single-entry-return-1[^'\n]*anchor-lease-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*single-entry-return-1[^"\n]*anchor-lease-1/);

console.log('kakao-external-history-guard-regression-test: pass');
