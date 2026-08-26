import assert from 'node:assert/strict';
import fs from 'node:fs';

const sources = [
  'final-experience.js',
  'final-experience.css',
  'rc2-fixes.js',
  'rc2-fixes.css',
  'rc6-fixes.css',
  'region-config.css'
];

for (const file of sources) {
  const source = fs.readFileSync(file, 'utf8');
  assert.doesNotMatch(source, /firework/i, `${file}에 대낮 불꽃놀이 코드가 남으면 안 됩니다.`);
}

const html = fs.readFileSync('index.html', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

assert.match(html, /final-experience\.js\?v=[^"\n]*daylight-effects-cleanup-1/);
assert.match(html, /rc7-address-map\.css\?v=[^"\n]*main-logo-frame-1/);
assert.match(serviceWorker, /CACHE_NAME = 'daedong-yeosu-app-shell-v23-mukkebi-no-late-popup'/);

console.log('Home logo frame and daytime fireworks removal regression: PASS');
