import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const appCss = readFileSync(new URL('./app.css', import.meta.url), 'utf8');
const index = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.doesNotMatch(
  app,
  /photoViewer|data-photo-viewer|openPhotoViewer|closePhotoViewer|daedongPhotoViewer/,
  'The application must not contain a full-screen photo viewer execution path.',
);
assert.doesNotMatch(
  appCss,
  /\.photo-viewer|data-photo-viewer/,
  'The stylesheet must not contain full-screen photo viewer presentation rules.',
);
assert.doesNotMatch(
  index,
  /id="photoViewer"|class="photo-viewer"|data-photo-viewer/,
  'The page must not contain a full-screen photo viewer element.',
);

assert.match(
  app,
  /id="detailPhotoCarousel"/,
  'The in-popup multi-photo carousel must remain available.',
);
assert.match(
  app,
  /aria-label="이전 가게사진"/,
  'The in-popup previous-photo control must remain available.',
);
assert.match(
  app,
  /aria-label="다음 가게사진"/,
  'The in-popup next-photo control must remain available.',
);
assert.match(
  index,
  /app\.css\?v=(?!store-list-horizontal-1)[^"]+/,
  'The stylesheet cache key must remain newer than the full-screen photo viewer version.',
);
assert.match(
  index,
  /app\.js\?v=photo-viewer-removed-1/,
  'The application cache key must expose the removal immediately.',
);

console.log('photo-viewer-removal-regression-test: pass');
