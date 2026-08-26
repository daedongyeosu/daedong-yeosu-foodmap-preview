import assert from 'node:assert/strict';
import fs from 'node:fs';

const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const browserTest = fs.readFileSync('scripts/browser-kakao-cross-document-return.mjs', 'utf8');

assert.match(rc2, /const RC2_RETURN_GUARD_STATE = 'daedongExternalReturnGuard'/);
assert.match(
  rc2,
  /history\.replaceState\([\s\S]*?if \(RC2_IS_KAKAO_WEBVIEW\) \{[\s\S]*?history\.pushState\([\s\S]*?RC2_RETURN_GUARD_STATE/,
  '카카오가 현재 기록을 주문앱 웹페이지로 교체하기 전에 한 칸 아래의 복귀 기록을 보존해야 합니다.'
);
assert.match(
  rc2,
  /if \(next\[RC2_RETURN_GUARD_STATE\] === token\) delete next\[RC2_RETURN_GUARD_STATE\]/,
  '복귀가 끝난 현재 기록에서는 일회용 보호 표식을 제거해야 합니다.'
);
assert.match(browserTest, /window\.location\.replace\(link\.href\)/);
assert.match(browserTest, /원래 가게 상세 유지/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*kakao-external-history-guard-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*kakao-external-history-guard-1/);

console.log('kakao-external-history-guard-regression-test: pass');
