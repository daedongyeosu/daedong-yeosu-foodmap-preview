import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const introJs = fs.readFileSync('turtle-ship-hero.js', 'utf8');
const introCss = fs.readFileSync('turtle-ship-hero.css', 'utf8');
const eventJs = fs.readFileSync('mukkebi-summer-event.js', 'utf8');
const eventCss = fs.readFileSync('mukkebi-summer-event.css', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.match(introJs, /pointerdown', dismissIntroImmediately/);
assert.match(introJs, /finishIntro\(\{immediate:true\}\)/);
assert.match(introJs, /if \(immediate\) \{\s*completeIntroClose\(\);\s*return;/);
assert.match(introCss, /\.community-intro-close\{[^}]*touch-action:manipulation/);

assert.match(eventJs, /pointerdown', dismissEventImmediately/);
assert.match(eventJs, /function dismissEventImmediately\(event\)[\s\S]*?closeEvent\(\)/);
assert.match(eventCss, /\.mukkebi-summer-close\{[^}]*touch-action:manipulation/);

assert.match(html, /turtle-ship-hero\.js\?v=[^"\n]*immediate-close-1/);
assert.match(html, /mukkebi-summer-event\.js\?v=[^"\n]*immediate-close-1/);
assert.match(serviceWorker, /CACHE_NAME = 'daedong-yeosu-app-shell-v15-mobile-performance-followup'/);

console.log('First-entry popups immediate close regression: PASS');
