import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appCss = readFileSync(new URL('./app.css', import.meta.url), 'utf8');
const rc2 = readFileSync(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const rc3 = readFileSync(new URL('./rc3-fixes.js', import.meta.url), 'utf8');
const finalExperience = readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(
  rc2,
  /function rc2SelectedCategoryMarkup\(category\)[\s\S]*app-browser-selected-category[\s\S]*escapeHtml\(category\)/,
  'The selected food category name must be rendered above app and phone store lists.',
);
assert.match(
  rc2,
  /function rc2RevealSelectedCategory\(\)[\s\S]*chips\.scrollLeft[\s\S]*active\.offsetLeft/,
  'The selected category chip must be brought into the visible horizontal area.',
);
assert.match(
  rc2,
  /rc2SelectedCategoryMarkup\(selectedCategory\)/,
  'Order-app store lists must show their selected category name.',
);
assert.match(
  rc3,
  /rc2SelectedCategoryMarkup\(category\)/,
  'The verified phone-order list must show its selected category name.',
);
assert.match(
  appCss,
  /\.app-browser-selected-category\{position:sticky;top:45px/,
  'The selected category name must stay visible while the modal list scrolls.',
);
assert.doesNotMatch(
  rc2 + rc3,
  /app-browser-selected-category[^`]*\d[\d,]*\s*곳/,
  'The selected category label must not display a store count.',
);
assert.match(
  finalExperience,
  /rc2-fixes\.js\?v=selected-category-label-1/,
  'The category-label runtime must bypass older cached RC2 copies.',
);
assert.match(
  finalExperience,
  /rc3-fixes\.js\?v=selected-category-label-1/,
  'The phone category-label runtime must bypass older cached RC3 copies.',
);
assert.match(
  index,
  /app\.css\?v=selected-category-label-1/,
  'The selected category label style must bypass older cached copies.',
);
assert.match(
  index,
  /final-experience\.js\?v=selected-category-label-1/,
  'The runtime loader must bypass older cached copies.',
);

console.log('app-browser-category-label-regression-test: pass');
