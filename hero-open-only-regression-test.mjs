import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const rc6 = fs.readFileSync('rc6-fixes.js', 'utf8');
const css = fs.readFileSync('rc6-fixes.css', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const regionBoot = fs.readFileSync('region-boot.js', 'utf8');

const baseHero = app.slice(app.indexOf('function renderHero()'), app.indexOf('function renderPromos()'));
assert.match(baseHero, /data-hero-placeholder/);
assert.match(baseHero, /hero\.hidden = false/);
assert.match(baseHero, /hero\.setAttribute\('aria-busy', 'true'\)/);
assert.doesNotMatch(baseHero, /HERO_BANNERS\.map/);

assert.doesNotMatch(rc6, /rc6HeroStoreIsOpen/);
assert.match(rc6, /const RC6_HERO_LOW_FEE_CHANNEL_KEYS=\['direct','ondongne','mukkebi','ddangyo','phone'\];/);
assert.match(rc6, /function rc6HeroRequiredChannelKeys\(\)/);
assert.match(rc6, /return !serviceButton\?\.disabled/);
assert.match(rc6, /function rc6HeroHasRequiredChannels\(store\)\{return rc6HeroRequiredChannelKeys\(\)\.every\(key=>storeHasChannel\(store,key\)\);\}/);
assert.match(rc6, /stores\.filter\(store=>fxVisible\(store\)&&rc6HeroHasRequiredChannels\(store\)/);
assert.match(rc6, /function rc6HeroLowFeeIcons\(store,extraClass=''\)/);
assert.match(rc6, /class="rc6-hero-low-fee-icons/);
assert.match(rc6, /rc6HeroLowFeeIcons\(store,'rc6-hero-creative-icons'\)/);
assert.match(css, /\.rc6-hero-low-fee-icons/);
assert.match(css, /\.rc6-hero-creative-icons/);
assert.match(rc6, /function rc6HeroEntries\(\)[\s\S]*return rc6InterleaveHeroEntries\(rc6DailyHeroOrder\(rc6ManagedStoreHeroEntries\(\)\),rc6SpecialHeroEntries\(\)\);/);
assert.match(rc6, /hero\.hidden=false/);
assert.match(rc6, /fetchpriority="high"/);
assert.match(rc6, /firstImage\.addEventListener\('load',finishLoading/);
assert.match(rc6, /if\(!entries\.length\)[\s\S]*data-hero-placeholder/);
assert.match(rc6, /if\(!entries\.length\)[\s\S]*rc6HeroRenderKey=''/);
assert.doesNotMatch(rc6, /rankedStore\?\.proximityLabel/);
assert.doesNotMatch(rc6, /<small>\$\{escapeHtml\(proximity\)\}<\/small>/);
assert.match(css, /\.hero \.carousel-arrow\{display:none!important\}/);

assert.match(html, /app\.js\?v=[^"\n]*hero-open-only-1/);
assert.match(html, /<section class="hero"[^>]*aria-busy="true"/);
assert.match(html, /data-hero-placeholder/);
assert.match(regionBoot, /link\.fetchPriority = priority/);
assert.match(html, /final-experience\.js\?v=[^"\n]*hero-open-only-clean-controls-1/);
assert.match(html, /rc6-fixes\.css\?v=[^"\n]*hero-clean-controls-1/);
assert.match(finalExperience, /rc6-fixes\.js\?v=[^'\n]*hero-open-only-1[^'\n]*hero-area-label-removed-1/);
assert.match(finalExperience, /rc6-fixes\.js\?v=[^'\n]*hero-required-low-fee-2/);
assert.match(finalExperience, /rc6-fixes\.js\?v=[^'\n]*keep-placeholder-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*keep-placeholder-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*hero-required-low-fee-2/);
assert.match(finalExperience, /rc6-fixes\.css\?v=[^'\n]*hero-clean-controls-1/);

console.log('hero-open-only-regression-test: pass');
