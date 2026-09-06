import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const storeId = '17d9bf1de3d671fd';
const menuPath = 'data/haeinine-yeoseo-menu.json';
const expectedNames = ['동태탕', '꽃게탕', '국내산 제육볶음', '낙지볶음', '고등어구이', '갈치조림', '양푼이 돼지갈비찜'];
const menu = JSON.parse(readFileSync(menuPath, 'utf8'));

assert.equal(menu.storeId, storeId);
assert.equal(menu.displayName, '해인이네 여서점');
assert.deepEqual(menu.items.map(item => item.name), expectedNames);
assert.equal(menu.items.length, 7);
assert.equal(new Set(menu.items.map(item => item.image)).size, 7, '음식사진을 중복하면 안 됩니다.');
for (const item of menu.items) {
  assert.ok(item.image.startsWith('assets/campaigns/haeinine-yeoseo/'));
  assert.ok(existsSync(item.image), '음식 미리보기 사진 파일이 필요합니다: ' + item.image);
  const mobileImage = item.image.replace(/\.(?:png|jpe?g|gif)$/i, '.mobile.webp');
  assert.ok(existsSync(mobileImage), '모바일 음식 미리보기 사진 파일이 필요합니다: ' + mobileImage);
  assert.equal(item.description, '', '확인하지 않은 설명이나 가격을 만들면 안 됩니다.');
}

const source = readFileSync('data-api.js', 'utf8');
const windowObject = { DAEDONG_REGION: { code: 'yeosu' }, setTimeout, clearTimeout };
const fetch = async url => {
  const value = String(url);
  if (value.includes('/api/catalog')) {
    return { ok: true, json: async () => [
      { store_id: storeId, name: '해인이네 여서점', hasMenu: false },
      { store_id: 'aaaaaaaaaaaaaaaa', name: '다른 가게', hasMenu: false },
    ] };
  }
  if (value.startsWith(menuPath)) return { ok: true, json: async () => menu };
  throw new Error('예상하지 않은 요청: ' + value);
};
const context = vm.createContext({ window: windowObject, fetch, AbortController, setTimeout, clearTimeout, console });
new vm.Script(source, { filename: 'data-api.js' }).runInContext(context);

const catalog = await windowObject.daedongDataApi.catalog();
assert.equal(catalog.find(store => store.store_id === storeId)?.hasMenu, true, '해인이네 음식보기 버튼을 켜야 합니다.');
assert.equal(catalog.find(store => store.store_id === 'aaaaaaaaaaaaaaaa')?.hasMenu, false, '다른 가게의 메뉴 상태를 바꾸면 안 됩니다.');
const loadedMenu = await windowObject.daedongDataApi.menu(storeId);
assert.deepEqual(Array.from(loadedMenu.items, item => item.name), expectedNames);

const index = readFileSync('index.html', 'utf8');
assert.match(index, /data-api\.js\?v=[^"']*haeinine-menu-preview-1/);
const browserCheck = readFileSync('scripts/browser-store-campaign-nine.mjs', 'utf8');
assert.ok(browserCheck.includes('assertHaeinineMenuPreview(page)'), '390px 브라우저에서 음식 미리보기를 열어야 합니다.');
assert.ok(browserCheck.includes('음식 미리보기 7개 메뉴명·사진 구성이 다릅니다'), '7개 메뉴명과 사진을 검사해야 합니다.');

console.log('haeinine-menu-preview-regression-test: pass');
