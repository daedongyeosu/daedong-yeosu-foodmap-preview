import fs from 'node:fs';
import assert from 'node:assert/strict';

const shell = fs.readFileSync('s/index.html', 'utf8');

assert.doesNotMatch(shell, /<meta[^>]+property=["']og:/i);
assert.doesNotMatch(shell, /<meta[^>]+name=["']twitter:/i);
assert.doesNotMatch(shell, /<link[^>]+rel=["'](?:icon|canonical)/i);
assert.doesNotMatch(shell, /<img\b/i);
assert.doesNotMatch(shell, /assets\/|images\//i);
assert.doesNotMatch(shell, /대동여수음식지도|여수 음식점/i);
assert.match(shell, /noindex,nofollow,noimageindex,nosnippet/);
assert.match(shell, /location\.replace\(destination\.href\)/);

console.log('SMS text link /s has no preview image or descriptive card metadata and still redirects to the map.');
