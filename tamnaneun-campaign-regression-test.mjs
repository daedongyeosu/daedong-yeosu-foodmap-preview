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
assert.equal(campaigns.campaigns[canonicalId].images.length, 6, '전용 첫 화면에는 서로 다른 대표사진 6장이 필요합니다.');
for (const image of campaigns.campaigns[canonicalId].images) {
  assert.doesNotMatch(image, /\/api\/asset\/assets\/yogiyo-menu\//, '존재하지 않는 옛 사진 주소를 사용하면 안 됩니다.');
  if (!/^https:\/\//.test(image)) assert.ok(existsSync(image), `로컬 대표사진이 없습니다: ${image}`);
}

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
