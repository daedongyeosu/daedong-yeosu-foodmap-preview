import assert from 'node:assert/strict';
import {existsSync, readFileSync} from 'node:fs';

const canonicalId = '421ecef35a879687';
const legacyQrId = '2da10529e7fb987c';
const campaigns = JSON.parse(readFileSync('data/hero-campaigns.json', 'utf8'));
const links = JSON.parse(readFileSync('data/store-campaign-links.json', 'utf8'));
const menu = JSON.parse(readFileSync('data/tamnaneun-pizza-menu.json', 'utf8'));
const dataApi = readFileSync('data-api.js', 'utf8');
const rc6 = readFileSync('rc6-fixes.js', 'utf8');

assert.ok(campaigns.campaigns[canonicalId], '탐나는피자 캠페인은 실제 가게 ID를 사용해야 합니다.');
assert.equal(campaigns.campaigns[legacyQrId], undefined, '주문경로가 일부뿐인 이전 QR ID를 독립 캠페인으로 남기면 안 됩니다.');
assert.deepEqual(campaigns.campaigns[canonicalId].entryStoreIds, [canonicalId, legacyQrId], '이전 QR도 통합 캠페인으로 교정되어야 합니다.');
const heroSlides = campaigns.campaigns[canonicalId].slides;
assert.equal(heroSlides.length, 14, '탐나는피자 전용 메인배너는 일반 메인과 같은 14개 카드로 구성해야 합니다.');
assert.equal(campaigns.campaigns[canonicalId].images, undefined, '메뉴명이 없는 사진 배열을 사용하면 안 됩니다.');
assert.equal(campaigns.campaigns[canonicalId].copySlides, undefined, '모든 메뉴 배너에 가게명과 메뉴명이 표시되어야 합니다.');
const menuByName = new Map(menu.items.map(item => [item.name, item]));
for (const slide of heroSlides) {
  assert.equal(slide.storeId, canonicalId);
  assert.equal(slide.title, '탐나는피자 여수점');
  assert.ok(slide.meta, '각 메인배너에는 메뉴명이 있어야 합니다.');
  assert.equal(menuByName.get(slide.meta)?.image, slide.image, `${slide.meta}: 메뉴명과 음식사진이 서로 일치해야 합니다.`);
  assert.doesNotMatch(slide.image, /\/api\/asset\/assets\/yogiyo-menu\//, '존재하지 않는 옛 사진 주소를 사용하면 안 됩니다.');
  if (!/^https:\/\//.test(slide.image)) assert.ok(existsSync(slide.image), `로컬 대표사진이 없습니다: ${slide.image}`);
}
assert.equal(new Set(heroSlides.map(slide => slide.image)).size, heroSlides.length, '중복 음식사진을 메인배너에 넣으면 안 됩니다.');

const link = links.campaigns.find(entry => entry.storeId === canonicalId);
assert.equal(link?.url, `https://daedongmap.com/?hero=${canonicalId}`);
assert.equal(link?.previewUrl, `https://preview.daedongmap.com/?hero=${canonicalId}`);

assert.equal(menu.storeId, canonicalId);
assert.equal(menu.items.length, 56, '수집된 전체 메뉴 56개를 전용 음식지도에서 확인할 수 있어야 합니다.');
assert.ok(menu.items.filter(item => item.image).length >= 50, '메뉴사진 누락이 과도하면 안 됩니다.');
assert.match(dataApi, /STATIC_MENU_URLS[\s\S]*421ecef35a879687[\s\S]*tamnaneun-pizza-menu\.json/);
assert.match(rc6, /raw\?\.trustedDetail===true/);
assert.match(rc6, /params\.get\('hero'\)\|\|params\.get\('store'\)/);

console.log('tamnaneun-campaign-regression-test: pass');
