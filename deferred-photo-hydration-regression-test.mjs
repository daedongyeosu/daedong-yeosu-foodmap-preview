import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(
  experience,
  /root\.insertAdjacentHTML\('beforeend',fxRailMarkup\(spec,used\)\);\s*observeDeferredPhotos\(root\);/,
  'progressively inserted recommendation cards must hydrate their deferred photos'
);

assert.match(
  app,
  /\$\('#modalContent'\)\.innerHTML = html;\s*observeDeferredPhotos\(\$\('#modalContent'\)\);/,
  'new modal content must hydrate deferred photos immediately'
);

assert.match(
  html,
  /app\.js\?v=[^"\n]*deferred-photo-hydration-1/,
  'app.js cache key must change for the deferred photo hydration fix'
);

assert.match(
  html,
  /final-experience\.js\?v=[^"\n]*deferred-photo-hydration-1/,
  'final-experience.js cache key must change for the deferred photo hydration fix'
);

console.log('deferred photo hydration regression test passed');
