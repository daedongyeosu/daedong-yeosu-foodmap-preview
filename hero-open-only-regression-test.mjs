import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const rc6 = fs.readFileSync('rc6-fixes.js', 'utf8');
const css = fs.readFileSync('rc6-fixes.css', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const baseHero = app.slice(app.indexOf('function renderHero()'), app.indexOf('function renderPromos()'));
assert.match(baseHero, /\.hero'\)\.hidden = true/);
assert.doesNotMatch(baseHero, /HERO_BANNERS\.map/);

assert.match(rc6, /function rc6HeroStoreIsOpen\(store\)\{return storeBusinessStatusPriority\(store\)<=1;\}/);
assert.match(rc6, /stores\.filter\(store=>fxVisible\(store\)&&rc6HeroStoreIsOpen\(store\)/);
assert.match(rc6, /function rc6HeroEntries\(\)[\s\S]*return rc6DailyHeroOrder\(rc6ManagedStoreHeroEntries\(\)\);/);
assert.match(rc6, /if\(hero\)hero\.hidden=!entries\.length/);
assert.doesNotMatch(rc6, /rankedStore\?\.proximityLabel/);
assert.doesNotMatch(rc6, /<small>\$\{escapeHtml\(proximity\)\}<\/small>/);
assert.match(css, /\.hero \.carousel-arrow\{display:none!important\}/);

assert.match(html, /app\.js\?v=[^"\n]*hero-open-only-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*hero-open-only-clean-controls-1/);
assert.match(html, /rc6-fixes\.css\?v=[^"\n]*hero-clean-controls-1/);
assert.match(finalExperience, /rc6-fixes\.js\?v=[^'\n]*hero-open-only-1[^'\n]*hero-area-label-removed-1/);
assert.match(finalExperience, /rc6-fixes\.css\?v=[^'\n]*hero-clean-controls-1/);

console.log('hero-open-only-regression-test: pass');
