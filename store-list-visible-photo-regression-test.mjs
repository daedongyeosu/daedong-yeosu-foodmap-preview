import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const pager = fs.readFileSync(new URL('./store-list-horizontal-pager.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

const source = pager.match(/function hydrateStoreListPagerPhotos\(grid\)\{[\s\S]*?\n\}/)?.[0] || '';
assert.ok(source, '가로 가게목록 사진 보강 함수를 찾을 수 있어야 합니다.');

const loaded = [];
const context = {
  loadDeferredPhoto(image) { loaded.push(image.id); }
};
vm.createContext(context);
vm.runInContext(source, context);

const imageAt = (id, left, width = 180) => ({
  id,
  closest() { return {offsetLeft: left, offsetWidth: width}; }
});
const images = [
  imageAt('behind', 0),
  imageAt('visible', 420),
  imageAt('next', 760),
  imageAt('far', 1300)
];
context.hydrateStoreListPagerPhotos({
  clientWidth: 390,
  scrollLeft: 390,
  querySelectorAll() { return images; }
});

assert.deepEqual(Array.from(loaded), ['visible', 'next'],
  '현재 보이는 카드와 바로 다음 카드만 실제 src로 전환해야 합니다.');
assert.match(pager, /function applyStoreListPager\(\)[\s\S]*?hydrateStoreListPagerPhotos\(grid\)/,
  '목록을 그리거나 페이지를 바꾼 직후 보이는 사진을 보강해야 합니다.');
assert.match(pager, /function scheduleStoreListPagerScrollRead\(\)[\s\S]*?hydrateStoreListPagerPhotos\(grid\)/,
  '고객이 가로로 미는 동안 새로 보이는 사진을 즉시 보강해야 합니다.');
assert.match(html, /store-list-horizontal-pager\.js\?v=[^"\n]*visible-photo-hydration-1/,
  '모바일 브라우저가 수정된 목록 스크립트를 새로 받아야 합니다.');

console.log('store list visible photo regression: PASS');
