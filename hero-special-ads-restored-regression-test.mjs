import assert from 'node:assert/strict';
import fs from 'node:fs';

const rc6 = fs.readFileSync('rc6-fixes.js', 'utf8');
const targets = JSON.parse(fs.readFileSync('data/banner-targets.json', 'utf8'));
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(rc6, /const RC6_MAIN_SPECIAL_HERO_KEYS=new Set\(\['18','19','20'\]\);/);
assert.match(rc6, /RC6_MAIN_SPECIAL_HERO_KEYS\.has\(String\(key\)\)/);
assert.match(rc6, /return rc6InterleaveHeroEntries\(rc6DailyHeroOrder\(rc6ManagedStoreHeroEntries\(\)\),rc6SpecialHeroEntries\(\)\);/);

assert.equal(targets['18']?.label, '여수 소상공인 소식');
assert.equal(targets['19']?.label, '여수 힐링요트');
assert.equal(targets['20']?.label, '오마카세 우미');
for (const key of ['18', '19', '20']) {
  assert.equal(targets[key]?.status, 'notion');
  assert.ok(targets[key]?.notionUrl);
  assert.ok(targets[key]?.image);
}

assert.match(finalExperience, /rc6-fixes\.js\?v=[^'\n]*three-main-ads-restored-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*three-main-ads-restored-1/);

console.log('hero-special-ads-restored-regression-test: pass');
