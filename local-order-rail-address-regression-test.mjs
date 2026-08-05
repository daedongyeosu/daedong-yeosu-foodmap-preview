import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const locationSource = fs.readFileSync(new URL('./rc6-fixes.js', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(source, /protectedLocationRail\s*=\s*spec\.kind\s*===\s*'local'/,
  'The local-order rail must be protected from cross-rail exhaustion.');
assert.match(source, /spec\.kind\s*===\s*'local'\s*&&\s*result\.length\s*<\s*limit[\s\S]*?fillGroups\(groups,\s*true\)/,
  'The local-order rail must refill with nearby stores already shown in another rail.');
assert.match(html, /rail-local-repeat-fallback-2/,
  'The deployed page must invalidate the recommendation script cache.');
assert.match(experience, /rc2-fixes\.js\?v=[^'\n]*rail-local-repeat-fallback-2/,
  'The RC2 recommendation layer itself must bypass the old browser cache.');
assert.match(locationSource, /spec\.kind\s*===\s*'local'[\s\S]*?storeHasChannel\(store,key\)/,
  'Local-order candidates must use the public channel marker before secure route details load.');
assert.doesNotMatch(locationSource, /spec\.kind\s*===\s*'local'[\s\S]{0,180}?routeFor\(store,key\)/,
  'Local-order candidates must not disappear while secure route details are still loading.');
assert.match(experience, /rc6-fixes\.js\?v=[^'\n]*local-channel-marker-1/,
  'The corrected location layer must bypass the old browser cache.');

console.log('local order rail address regression: ok');
