import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const help = fs.readFileSync('ddangyo-open-help.html', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(app, /function ddangyoHelpUrl\(originUrl = '', routeUrl = ''\)/);
assert.match(app, /url\.searchParams\.set\('origin', originUrl\)/);
assert.match(app, /url\.searchParams\.set\('route', routeUrl\)/);
assert.match(app, /ddangyoAndroidIntent\(originUrl, href\)/);
assert.match(app, /localStorage\.setItem\(DDANGYO_RETRY_INTENT_KEY, intent\)/);
assert.match(app, /ddangyoHelpUrl\('', href\)/);

assert.match(help, /<a id="retry" href="#">땡겨요 앱 다시 열기<\/a>/);
assert.match(help, /pointer-events:auto;touch-action:manipulation/);
assert.match(help, /const origin=String\(params\.get\('origin'\)/);
assert.match(help, /candidate\.hostname==='fdofd\.ddangyo\.com'/);
assert.match(help, /sessionStorage\.getItem\(retryKey\)\|\|localStorage\.getItem\(retryKey\)/);
assert.match(help, /retry\.href=retryHref/);
assert.match(help, /땡겨요 앱을 다시 여는 중입니다/);
assert.doesNotMatch(help, /if\(intent\)location\.assign\(intent\)/);

assert.match(html, /app\.js\?v=[^"\n]*ddangyo-retry-touch-1/);

console.log('ddangyo-retry-touch-regression-test: pass');
