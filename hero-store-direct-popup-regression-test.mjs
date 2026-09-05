import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const rc6 = readFileSync(new URL('./rc6-fixes.js', import.meta.url), 'utf8');
const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const finalExperience = readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const index = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

const heroStart = rc6.indexOf('function rc6HeroEvents(){');
const heroEnd = rc6.indexOf('function rc6UseCurrentLocation', heroStart);
assert.ok(heroStart >= 0 && heroEnd > heroStart, 'The actual hero event handler must be present.');
const heroHandler = rc6.slice(heroStart, heroEnd);
const deferredOpen = String.raw`setTimeout\(\(\)=>openStore\(store\),0\)\s*;`;
const sharedGhostGuard = String.raw`if\(typeof rememberDaedongGhostClick===['"]function['"]\)rememberDaedongGhostClick\(e\);\s*`;

// Braces may add the existing shared ghost-click guard, but opening must remain
// a zero-delay queued action. three-store-hero-tap-regression-test.mjs also runs
// the real handler/guard in a VM, including retargeted clicks and genuine taps.
assert.match(
  heroHandler,
  new RegExp(String.raw`if\(store\)\s*(?:${deferredOpen}|\{\s*(?:${sharedGhostGuard})?${deferredOpen}\s*\})`),
  'A store hero must wait until the originating click finishes before opening the store popup.',
);
assert.doesNotMatch(
  heroHandler.replace(new RegExp(deferredOpen, 'g'), ''),
  /\bopenStore\s*\(/,
  'A store hero must not synchronously place a photo-viewer target under the same tap.',
);
assert.doesNotMatch(
  app,
  /data-photo-viewer|openPhotoViewer|closePhotoViewer|photoViewerCarousel/,
  'The removed full-screen photo viewer must not be reachable from a store popup.',
);
assert.match(
  finalExperience,
  /rc6-fixes\.js\?v=(?:hero-store-direct-1|sonsugimbap-flyer-hero-1)/,
  'The corrected hero interaction script must bypass older cached copies.',
);
assert.match(
  index,
  /final-experience\.js\?v=direct-feedback-admin-1-selected-category-label-2/,
  'The current loader must continue to include the corrected hero script version.',
);

console.log('hero-store-direct-popup-regression-test: pass');
