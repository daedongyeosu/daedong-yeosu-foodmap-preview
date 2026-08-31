import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const expected = [
  ['67a9e4f14c8c7ea4', '손수김밥 양지점'],
  ['cfde2617224f33a0', '콩산소 (음식 연구소)'],
  ['421ecef35a879687', '탐나는피자 여수점'],
  ['068b2ae8fe32874a', '1인피자 피자먹다 여수여서점'],
  ['0abd7147b7d6b1dd', '비비큐 미평둔덕점'],
  ['f8a71a5a2344ee7f', '프랭크버거 미평점'],
  ['fb798d3119a28415', '60계치킨 여수미평점'],
  ['a089d1d54720b48e', '외계인피자 여수점'],
  ['aa0a00258c22f377', '뽕뜨락피자 여수여서점'],
];

const manifest = JSON.parse(readFileSync('data/store-campaign-links.json', 'utf8'));
const heroData = JSON.parse(readFileSync('data/hero-campaigns.json', 'utf8'));
const rc6 = readFileSync('rc6-fixes.js', 'utf8');
const loader = readFileSync('final-experience.js', 'utf8');
const index = readFileSync('index.html', 'utf8');

assert.equal(manifest.campaigns.length, 9, 'The public campaign-link list must contain exactly nine approved stores.');
assert.equal(Object.keys(heroData.campaigns).length, 9, 'Each approved store must have one hero campaign.');
assert.deepEqual(
  manifest.campaigns.map(({ storeId, name }) => [storeId, name]),
  expected,
  'Store IDs and canonical names must not be renamed or reordered accidentally.',
);

for (const [storeId, name] of expected) {
  const item = manifest.campaigns.find((entry) => entry.storeId === storeId);
  const campaign = heroData.campaigns[storeId];
  assert.ok(item, `${name}: campaign link is missing.`);
  assert.equal(item.url, `https://daedongmap.com/?hero=${storeId}`, `${name}: production link is wrong.`);
  assert.equal(item.previewUrl, `https://preview.daedongmap.com/?hero=${storeId}`, `${name}: preview link is wrong.`);
  assert.ok(campaign, `${name}: hero campaign is missing.`);
  assert.equal(campaign.storeId, storeId, `${name}: hero campaign points at another store.`);
  assert.ok((campaign.images?.length || campaign.slides?.length) > 0, `${name}: hero campaign has no photo.`);

  assert.ok(existsSync(item.qrAsset), `${name}: QR asset is missing.`);
  const qr = readFileSync(item.qrAsset, 'utf8');
  assert.match(qr, /<svg\b/, `${name}: QR asset is not SVG.`);
  assert.match(qr, /viewBox=/, `${name}: QR asset has no scalable viewBox.`);
}

for (const campaign of Object.values(heroData.campaigns)) {
  const images = campaign.images || campaign.slides.map((slide) => slide.image);
  assert.equal(new Set(images).size, images.length, `${campaign.label}: duplicate hero photos are not allowed.`);
  for (const image of images) {
    if (/^https:\/\//.test(image)) continue;
    assert.ok(existsSync(image), `${campaign.label}: local photo is missing: ${image}`);
  }
}

const tamnaneun = heroData.campaigns['421ecef35a879687'];
assert.deepEqual(
  tamnaneun.entryStoreIds,
  ['421ecef35a879687', '2da10529e7fb987c'],
  '탐나는피자의 통합 ID와 이전 요기요 QR ID가 함께 연결되어야 합니다.',
);
assert.match(rc6, /params\.get\('hero'\)\|\|params\.get\('store'\)/, '가게 상세 QR도 전용 배너 모드로 인식해야 합니다.');
assert.match(loader, /daedongResolveHeroCampaignStoreId/, '가게 상세 QR은 통합 가게 ID로 교정되어야 합니다.');
assert.match(rc6, /hero-campaigns\.json\?v=tamnaneun-menu-hero-3/, 'The hero campaign data cache must be refreshed.');
assert.match(loader, /rc6-fixes\.js\?v=[^'\n]*tamnaneun-menu-hero-3/, 'The RC6 script cache must be refreshed.');
assert.match(index, /final-experience\.js\?v=[^"\n]*tamnaneun-menu-hero-3/, 'The final loader cache must be refreshed.');

console.log('store-campaign-nine-regression-test: pass');
