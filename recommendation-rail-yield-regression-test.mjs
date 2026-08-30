import assert from 'node:assert/strict';
import fs from 'node:fs';

const experience = fs.readFileSync('final-experience.js', 'utf8');
const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const rc3 = fs.readFileSync('rc3-fixes.js', 'utf8');
const rc4 = fs.readFileSync('rc4-fixes.js', 'utf8');
const rc5 = fs.readFileSync('rc5-fixes.js', 'utf8');
const rc6 = fs.readFileSync('rc6-fixes.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');

assert.match(experience, /let fxRailRenderVersion=0/);
assert.match(experience, /function fxRailMarkup\(spec,used\)/);
assert.match(experience, /staging\.insertAdjacentHTML\('beforeend',fxRailMarkup\(spec,used\)\)/);
assert.match(experience, /function fxCommitRailsWithoutMovingActiveList\(root,staging\)/);
assert.match(experience, /root\.replaceChildren\(\.\.\.staging\.childNodes\)/,
  '추천 가게는 기존 화면을 비우지 않고 완성된 결과를 한 번에 교체해야 합니다.');
assert.match(experience, /window\.setTimeout\(renderNext,0\)/);
assert.doesNotMatch(experience, /root\.innerHTML=fxSelectedRails\(\)\.map/);

assert.match(rc3, /let rc3RailRenderVersion = 0/);
assert.match(rc3, /if \(window\.__daedongDeferRailRender\) return/);
assert.match(rc3, /staging\.insertAdjacentHTML\('beforeend'/);
assert.match(rc3, /window\.setTimeout\(renderNext, 0\)/);
assert.doesNotMatch(rc3, /root\.innerHTML = fxSelectedRails\(\)\.map/);
assert.match(rc3, /const rankedStores = fxRankStores\(spec\)/);
assert.match(rc3, /rc2RailCandidates\(spec, globallyUsed, 8, useCounts, rankedStores\)/);
assert.match(experience, /window\.__daedongDeferRailRender=true/);
assert.match(experience, /function fxRenderRailsWithoutMovingActiveList\(\)/);
assert.doesNotMatch(experience, /const section=\$\('#recommendSection'\)/,
  '추천 목록 갱신이 고객의 현재 화면 위치를 추적하면 안 됩니다.');
assert.doesNotMatch(experience, /scrollWindowInstant\(window\.scrollY\+delta\)/,
  '추천 목록 갱신이 고객의 스크롤 위치를 강제로 바꾸면 안 됩니다.');
assert.match(experience, /await rc6Initialize\(\);window\.__daedongDeferRailRender=false;fxRenderRailsWithoutMovingActiveList\(\)/);
assert.match(experience, /selectionChanged=next!==fxRainState/);
assert.match(experience, /if\(selectionChanged\)fxRenderRails\(\)/);

assert.match(app, /const NORMALIZED_BRAND_ALIASES = new WeakMap\(\)/);
assert.match(app, /NORMALIZED_BRAND_ALIASES\.set\(brand, aliases\)/);
assert.match(rc2, /let rc2BrandKeyCache = new WeakMap\(\)/);
assert.match(rc4, /const rc4BrandKeyCache=new WeakMap\(\)/);
assert.match(rc5, /const rc5BrandKeyCache=new WeakMap\(\)/);
assert.match(rc6, /async function rc6ApplyCoordinates\(\)/);
assert.match(rc6, /\(index\+1\)%48===0[\s\S]{0,120}await yieldToMainThread\(\)/);
assert.match(rc6, /await rc6ApplyCoordinates\(\)/);

console.log('recommendation rail yield regression: PASS');
