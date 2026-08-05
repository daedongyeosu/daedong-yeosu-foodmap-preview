import assert from 'node:assert/strict';
import fs from 'node:fs';

const rc6 = fs.readFileSync('rc6-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');

assert.match(rc6, /RC6_RAIN_MODE_URL='https:\/\/daedong-yeosu-admin\.sisakim\.chatgpt\.site\/api\/rain-mode'/);
assert.match(rc6, /function rc6RainManagedRatio\(\)\{return rc6RainMode==='rain1'\?\.7:rc6RainMode==='rain2'\?\.4:rc6RainMode==='rain3'\?0:1;\}/);
assert.match(rc6, /\[rc6Coordinates,rc6BannerTargets,rc6StorePriority,rc6HeroCampaigns,rc6RainMode\]=await Promise\.all/);
assert.match(rc6, /function rc6ManagedStoreHeroEntries\(\)[\s\S]*?rc6ApplyRainExposure/);
assert.match(rc6, /function rc6LocationRankedRail\(spec,originalRank\)[\s\S]*?return rc6ApplyRainExposure\(sortStoresByBusinessStatus\(ranked\),8\)/);
assert.match(rc6, /function rc6ApplyRainExposure\(candidates,limit\)[\s\S]*?sortStoresByBusinessStatus\(rows\)[\s\S]*?statusGroups/,
  '비 노출비율을 적용할 때도 영업상태 그룹을 섞으면 안 됩니다.');
assert.match(finalExperience, /rc6-fixes\.js\?v=[^'\n]*rain-mode-admin-1/);

console.log('rain-mode-admin-integration-regression-test: pass');
