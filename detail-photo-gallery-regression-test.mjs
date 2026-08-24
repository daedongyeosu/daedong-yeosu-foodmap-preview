import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('./app.css', import.meta.url), 'utf8');
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

for (const photo of [
  '38088586441c38df8530.webp',
  'e8c5f7d70617bbedcbbe.webp',
  'd3477ed0d9edeba67c6f.webp',
  '9803efcb39118e4bfc9f.webp',
  'aca21bc9cc32528edfbd.webp'
]) {
  assert.ok(app.includes(`'${photo}'`), `fully blank collected photo must stay blocked: ${photo}`);
}

assert.match(app, /validPath\(path, store\)[\s\S]*!isKnownBlankDetailPhotoPath\(value\)/, 'known blank photos must be rejected by the shared photo resolver');
assert.match(app, /this\.nativeScroll\s*=\s*root\.classList\.contains\('detail-photo-carousel'\)/, 'store galleries must select native scrolling');
assert.match(app, /if \(this\.nativeScroll\) \{[\s\S]*detail-photo-native-track[\s\S]*this\.renderDots\(\);[\s\S]*return;/, 'native store galleries must avoid cloned infinite slides');
assert.match(app, /this\.listen\(this\.track, 'scroll',[\s\S]*Math\.round\(this\.track\.scrollLeft \/ width\)/, 'native scroll position must update the active photo dot');
assert.match(app, /this\.track\.scrollTo\(\{left, behavior: 'smooth'\}\)/, 'arrows and dots must scroll the native gallery');
assert.match(app, /start\(\) \{ if \(this\.nativeScroll \|\|/, 'detail galleries must not move automatically while a visitor is viewing them');

assert.match(app, /data-photo-crop-audit="yogiyo-menu"/, 'collected menu photos must opt in to shared black-band inspection');
assert.match(app, /function auditDetailPhotoCrop\(image\)[\s\S]*img\[data-photo-crop-audit="yogiyo-menu"\][\s\S]*getImageData[\s\S]*detail-photo-auto-cropped/, 'all customer photo surfaces must inspect and remove a dark top band');
assert.match(app, /document\.addEventListener\('load',[\s\S]*auditDetailPhotoCrop/, 'crop inspection must run after each detail photo loads');

assert.match(css, /\.detail-photo-carousel \.detail-photo-native-track\{[^}]*overflow-x:auto[^}]*scroll-snap-type:x mandatory[^}]*touch-action:pan-x pan-y/, 'native gallery CSS must follow horizontal finger movement and snap per photo');
assert.match(css, /\.detail-photo-native-track>\.detail-photo-slide\{[^}]*scroll-snap-align:start[^}]*overflow:hidden/, 'each photo slide must be a clipped snap point');
assert.match(css, /\.detail-photo-auto-cropped\{[^}]*scale\(var\(--detail-photo-zoom,1\)\)[^}]*transform-origin:50% 100%/, 'black-band correction must zoom from the bottom edge');

assert.match(html, /app\.css\?v=[^"]*detail-native-swipe-1-photo-black-band-auto-crop-1/, 'gallery CSS cache key must be bumped');
assert.match(html, /app\.js\?v=[^"]*detail-native-swipe-1-photo-black-band-auto-crop-1/, 'gallery JavaScript cache key must be bumped');

console.log(JSON.stringify({ok: true, nativeSwipe: true, blackBandCorrection: true, blankPhotosBlocked: 5}));
