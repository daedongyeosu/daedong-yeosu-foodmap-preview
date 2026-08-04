import fs from 'node:fs';
import assert from 'node:assert/strict';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const addressMap = fs.readFileSync(new URL('./rc7-address-map.js', import.meta.url), 'utf8');
const experience = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const index = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(app, /function isExplicitOutsideYeosuCurrent/);
assert.match(app, /type \|\| ''\)\.trim\(\) !== 'current'/);
assert.match(app, /region2.*!\s*\/\(\?:여수\|yeosu\)\/i/s);
assert.match(app, /label: '여수 외 지역 · 전체 가게 보기'/);
assert.match(app, /area: '여수시 전체'/);
assert.match(app, /coords: null/);
assert.match(app, /sortByDistance: false/);
assert.match(app, /getSavedAddress\(\) \{ return normalizeOutsideYeosuCurrent/);
assert.match(app, /getAddressBook\(\).*\.map\(normalizeOutsideYeosuCurrent\)/);

assert.match(addressMap, /function isYeosuRegion/);
assert.match(addressMap, /const outsideYeosu = !localArea && !isYeosuRegion\(region\)/);
assert.match(addressMap, /if \(outsideYeosu\)[\s\S]*?area: '여수시 전체'[\s\S]*?coords: null[\s\S]*?sortByDistance: false/);
assert.match(addressMap, /현재 위치가 여수 외 지역이라 여수 전체 가게를 보여드립니다/);
assert.match(addressMap, /chooseAddress\(`현재 위치[\s\S]*?coords,[\s\S]*?sortByDistance: true/);

const cacheToken = 'outside-yeosu-full-list-1';
assert.ok(experience.includes(`rc7-address-map.js?v=address-home-return-1-coarse-region-1-inapp-location-recovery-1-${cacheToken}`));
assert.ok(index.includes(`owner-exclusion-1-${cacheToken}`));
assert.ok(index.includes(`inapp-location-recovery-1-${cacheToken}`));

console.log('outside Yeosu full-list regression checks passed');
