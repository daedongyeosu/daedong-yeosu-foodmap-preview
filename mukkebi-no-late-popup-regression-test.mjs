import assert from 'node:assert/strict';
import fs from 'node:fs';

const eventJs = fs.readFileSync('mukkebi-summer-event.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.match(eventJs, /let customerInteracted = false/);
assert.match(eventJs, /window\.daedongHasHomeInteraction\?\.\(\) === true/);
assert.match(eventJs, /window\.scrollY[\s\S]*> 16/);
assert.match(eventJs, /function markCustomerInteraction\(\)[\s\S]*clearTimeout\(initialOpenTimer\)/);
assert.match(eventJs, /\['pointerdown', 'touchstart', 'wheel', 'keydown'\]/);
assert.match(eventJs, /window\.addEventListener\('scroll'/);
assert.match(eventJs, /function scheduleInitialOpen\(\)[\s\S]*}, 600\)/);
assert.doesNotMatch(eventJs, /new MutationObserver\(waitUntilExistingPopupCloses\)/);
assert.doesNotMatch(eventJs, /function waitUntilExistingPopupCloses/);
assert.match(html, /mukkebi-summer-event\.js\?v=[^"\n]*no-late-interrupt-3-scroll-cancel-1-layer-guard-1/);
assert.match(serviceWorker, /CACHE_NAME = 'daedong-yeosu-app-shell-v24-initial-top-benefits-guard'/);

console.log('Mukkebi no-late-popup regression: PASS');
