import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const canonicalId = '2da10529e7fb987c';
const retiredWrongId = '421ecef35a879687';
const campaigns = JSON.parse(readFileSync('data/hero-campaigns.json', 'utf8'));
const links = JSON.parse(readFileSync('data/store-campaign-links.json', 'utf8'));
const menu = JSON.parse(readFileSync('data/tamnaneun-pizza-menu.json', 'utf8'));
const dataApi = readFileSync('data-api.js', 'utf8');
const rc6 = readFileSync('rc6-fixes.js', 'utf8');

assert.ok(campaigns.campaigns[canonicalId], '탐나는피자 캠페인은 실제 가게 ID를 사용해야 합니다.');
assert.equal(campaigns.campaigns[retiredWrongId], undefined, '작동하지 않던 임시 ID를 캠페인에 남기면 안 됩니다.');
assert.equal(campaigns.campaigns[canonicalId].images.length, 6, '전용 첫 화면에는 서로 다른 대표사진 6장이 필요합니다.');
for (const image of campaigns.campaigns[canonicalId].images) {
  assert.doesNotMatch(image, /\/api\/asset\/assets\/yogiyo-menu\//, '존재하지 않는 옛 사진 주소를 사용하면 안 됩니다.');
  if (!/^https:\/\//.test(image)) assert.ok(existsSync(image), `로컬 대표사진이 없습니다: ${image}`);
}

const virtualStore = campaigns.virtualStores?.[canonicalId];
assert.ok(virtualStore, '운영 카탈로그가 갱신되기 전에도 전용 링크가 열리도록 가게 기본정보가 필요합니다.');
assert.equal(virtualStore.category, '피자');
assert.equal(virtualStore.phone, '061-652-0908');
assert.equal(virtualStore.hasMenu, true);
assert.equal(virtualStore.trustedDetail, true);
assert.ok(virtualStore.routes.some(route => route.key === 'yogiyo' && /^https:\/\//.test(route.url)), '실제 요기요 주문경로가 필요합니다.');
assert.ok(virtualStore.routes.some(route => route.key === 'phone' && route.url === 'tel:0616520908'), '전화주문 경로가 필요합니다.');

const link = links.campaigns.find(entry => entry.storeId === canonicalId);
assert.equal(link?.url, `https://daedongmap.com/?hero=${canonicalId}`);
assert.equal(link?.previewUrl, `https://preview.daedongmap.com/?hero=${canonicalId}`);

assert.equal(menu.storeId, canonicalId);
assert.equal(menu.items.length, 56, '수집된 전체 메뉴 56개를 전용 음식지도에서 확인할 수 있어야 합니다.');
assert.ok(menu.items.filter(item => item.image).length >= 50, '메뉴사진 누락이 과도하면 안 됩니다.');
assert.match(dataApi, /STATIC_MENU_URLS[\s\S]*2da10529e7fb987c[\s\S]*tamnaneun-pizza-menu\.json/);
assert.match(rc6, /raw\?\.trustedDetail===true/);

console.log('tamnaneun-campaign-regression-test: pass');
