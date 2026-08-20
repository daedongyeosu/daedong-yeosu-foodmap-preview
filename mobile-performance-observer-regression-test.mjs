import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const source = fs.readFileSync('mobile-performance-observer.js', 'utf8');

assert.match(html, /mobile-performance-observer\.js\?v=actual-device-v1/, 'actual-device observer must load before the app');
assert.ok(html.indexOf('mobile-performance-observer.js') < html.indexOf('app.js'), 'observer must start before app boot');
assert.match(source, /largest-contentful-paint/, 'LCP must be observed');
assert.match(source, /layout-shift/, 'CLS must be observed');
assert.match(source, /longtask/, 'long tasks must be observed');
assert.match(source, /rawPhotoRequests/, 'raw photo regressions must be recorded');
assert.match(source, /homeReadyMs/, 'home readiness must be recorded');
assert.match(source, /detailSkeletonMs/, 'detail skeleton latency must be recorded');
assert.match(source, /menuReadyMs/, 'menu readiness must be recorded');
assert.match(source, /performance.*=== '1'/s, 'phone report must be opt-in');

console.log('mobile performance observer regression passed');
