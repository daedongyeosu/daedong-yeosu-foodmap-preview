import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(
  experience,
  /root\.replaceChildren\(\.\.\.staging\.childNodes\);[\s\S]*observeDeferredPhotos\(root\);/,
  'atomically inserted recommendation cards must hydrate their deferred photos'
);

assert.match(
  experience,
  /function fxCardPhoto\(store\)\{const src=fxPhoto\(store\);const options=\{deferred:false\};/,
  'recommendation and modal card photos must always receive a real src attribute'
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
  /final-experience\.js\?v=[^"\n]*reliable-card-photo-src-1/,
  'final-experience.js cache key must change for the reliable card photo fix'
);

console.log('deferred photo hydration regression test passed');
