import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const help = fs.readFileSync('ddangyo-open-help.html', 'utf8');

assert.match(app, /function ddangyoShortCode/);
assert.match(app, /https:\/\/fdofd\.ddangyo\.com\/shorturl\/view/);
assert.match(app, /intent:\/\/o2o\/deeplink\//);
assert.match(app, /package=\$\{DDANGYO_ANDROID_PACKAGE\}/);
assert.match(app, /S\.browser_fallback_url=\$\{fallback\}/);
assert.match(finalExperience, /if\(key==='ddangyo'\)await openDdangyoRoute\(href\)/);

assert.match(help, /Play 스토어는 고객님이 직접 선택할 때만 열립니다/);
assert.match(help, /땡겨요 앱 다시 열기/);
assert.match(help, /대동여수음식지도로 돌아가기/);
assert.doesNotMatch(help, /setTimeout\s*\(/);

console.log('ddangyo-direct-launch-regression: PASS');
