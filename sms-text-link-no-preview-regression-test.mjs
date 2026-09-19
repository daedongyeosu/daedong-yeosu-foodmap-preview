import fs from 'node:fs';
import assert from 'node:assert/strict';

for (const page of ['s/index.html', 'm/index.html']) {
  const shell = fs.readFileSync(page, 'utf8');

  assert.doesNotMatch(shell, /<meta[^>]+property=["']og:/i, page);
  assert.doesNotMatch(shell, /<meta[^>]+name=["']twitter:/i, page);
  assert.doesNotMatch(shell, /<link[^>]+rel=["'](?:icon|canonical)/i, page);
  assert.doesNotMatch(shell, /<img\b/i, page);
  assert.doesNotMatch(shell, /assets\/|images\//i, page);
  assert.doesNotMatch(shell, /대동여수음식지도|여수 음식점/i, page);
  assert.match(shell, /noindex,nofollow,noimageindex,nosnippet/, page);
  assert.match(shell, /location\.replace\(destination\.href\)/, page);
}

console.log('SMS text links /m and /s have no preview image or descriptive card metadata and still redirect to the map.');
