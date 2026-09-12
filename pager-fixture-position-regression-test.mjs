import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync(new URL('./scripts/browser-store-list-interruption.mjs', import.meta.url), 'utf8');
const position = source.indexOf("window.scrollTo({top: scrollY, left: 0, behavior: 'instant'})");
const baseline = source.indexOf('const beforeSwipe =');
assert.ok(position > 0 && position < baseline, 'fixture vertical scroll must finish before the horizontal swipe baseline');
assert.doesNotMatch(source, /window\.scrollTo\(0, scrollY\)/, 'CSS-smooth fixture positioning must not race the swipe');
assert.match(source, /Math\.abs\(revealedPage\.gridTop - beforeSwipe\.gridTop\) < 2/);
assert.doesNotMatch(source, /&&\s*Math\.abs\(revealedPage\.scrollY - beforeSwipe\.scrollY\) < 2/,
  'document-offset correction must remain allowed when upstream content grows; viewport position is the customer contract');
assert.match(source, /transitionMs < 250/);
assert.match(source, /Math\.abs\(afterRanking\.gridTop - beforeRanking\.gridTop\) < 2/);
console.log('pager fixture positioning: PASS (instant setup; latency and viewport checks preserved)');
