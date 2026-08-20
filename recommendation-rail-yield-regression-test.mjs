import assert from 'node:assert/strict';
import fs from 'node:fs';

const experience = fs.readFileSync('final-experience.js', 'utf8');

assert.match(experience, /let fxRailRenderVersion=0/);
assert.match(experience, /function fxRailMarkup\(spec,used\)/);
assert.match(experience, /root\.insertAdjacentHTML\('beforeend',fxRailMarkup\(spec,used\)\)/);
assert.match(experience, /window\.setTimeout\(renderNext,0\)/);
assert.doesNotMatch(experience, /root\.innerHTML=fxSelectedRails\(\)\.map/);

console.log('recommendation rail yield regression: PASS');
