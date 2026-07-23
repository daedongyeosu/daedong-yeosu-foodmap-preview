import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rc6 = readFileSync(new URL('./rc6-fixes.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const finalExperience = readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(
  rc6,
  /if\(store\)setTimeout\(\(\)=>openStore\(store\),0\)/,
  'A store hero must wait until the originating click finishes before opening the store popup.',
);
assert.doesNotMatch(
  rc6,
  /if\(store\)openStore\(store\);return;/,
  'A store hero must not synchronously place a photo-viewer target under the same tap.',
);
assert.match(
  app,
  /data-photo-viewer data-gallery-index=/,
  'Tapping a photo inside an already-open store popup must still support the photo viewer.',
);
assert.match(
  finalExperience,
  /rc6-fixes\.js\?v=hero-store-direct-1/,
  'The corrected hero interaction script must bypass older cached copies.',
);
assert.match(
  index,
  /final-experience\.js\?v=hero-store-direct-1/,
  'The loader containing the corrected hero script version must bypass older cached copies.',
);

console.log('hero-store-direct-popup-regression-test: pass');
