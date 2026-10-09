import assert from 'node:assert/strict';
import fs from 'node:fs';

const html=fs.readFileSync(new URL('./errand/index.html',import.meta.url),'utf8');
const app=fs.readFileSync(new URL('./errand/app.js',import.meta.url),'utf8');
const css=fs.readFileSync(new URL('./errand/styles.css',import.meta.url),'utf8');

assert.match(html,/id="errandBack"[^>]*aria-label="이전 심부름 단계로 돌아가기"/,'header back is a step-aware button, not a fixed home link');
assert.doesNotMatch(html,/<header><a href="\.\.\/"/,'header back no longer exits every step to the map home');
assert.match(app,/function showErrandStep\(step\)/,'one renderer owns step visibility');
assert.match(app,/history\.pushState\(\{errandStep:step\}/,'forward steps create browser history entries');
assert.match(app,/window\.addEventListener\('popstate'/,'phone and browser back restore the prior errand step');
assert.match(app,/if\(currentErrandStep\(\)==='home'\)location\.href='\.\.\/'/,'only errand home exits to the map home');
assert.match(app,/else history\.back\(\)/,'header back moves one step backward while applying');
assert.match(app,/pushErrandStep\('postcode'\)/,'address search also participates in step history');
assert.match(app,/history\.replaceState\(\{errandStep:initialErrandStep\}/,'reloaded payment or tracking views receive a stable initial state');
assert.match(css,/header>button\{[^}]*background:transparent/,'new back button preserves the old lightweight arrow appearance');

console.log('errand step-aware back navigation regression checks passed');
