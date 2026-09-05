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
  ['7bc7239e6b509c44', '수라상궁조선국밥 여서점'],
  ['d86586aaef8454c9', '조선밀면&냉면 여수여서점'],
  ['84c118675c0caa4c', '바오탕수 여서점'],
  ['04910f606ba038a6', '오워래 수제돈까스 여서점'],
];

const kongsansoFamilyStoreIds = [
  'cfde2617224f33a0',
  '1d691d8e74499d31',
  '2017de4f9111f3ce',
  '93ae27237a8e75c4',
  '3f441930b8d18783',
  'f3cb61dd45ba9b8b',
  '665953a0453afc52',
  '7ed65c8f086f11f2',
];

const manifest = JSON.parse(readFileSync('data/store-campaign-links.json', 'utf8'));
const heroData = JSON.parse(readFileSync('data/hero-campaigns.json', 'utf8'));
const rc6 = readFileSync('rc6-fixes.js', 'utf8');
const loader = readFileSync('final-experience.js', 'utf8');
const index = readFileSync('index.html', 'utf8');

assert.equal(manifest.campaigns.length, expected.length, 'The public campaign-link list must contain exactly the approved stores.');
assert.equal(Object.keys(heroData.campaigns).length, expected.length, 'Each approved store must have one hero campaign.');
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
  assert.ok(Array.isArray(campaign.slides) && campaign.slides.length > 0, `${name}: standardized menu slides are missing.`);
  assert.equal(campaign.images, undefined, `${name}: legacy image-only campaigns are not allowed.`);
  assert.equal(campaign.copySlides, undefined, `${name}: legacy copy-slide selection is not allowed.`);
  assert.equal(campaign.specialBannerKeys, undefined, `${name}: unrelated ads must not enter a store campaign.`);

  for (const slide of campaign.slides) {
    assert.ok(String(slide.storeId || '').trim(), `${name}: a slide has no store ID.`);
    assert.ok(String(slide.image || '').trim(), `${name}: a slide has no menu photo.`);
    assert.ok(String(slide.title || '').trim(), `${name}: a slide has no store name.`);
    assert.ok(String(slide.meta || '').trim(), `${name}: a slide has no menu name.`);
  }

  const slideStoreIds = [...new Set(campaign.slides.map((slide) => slide.storeId))];
  if (storeId === 'cfde2617224f33a0') {
    assert.deepEqual(
      campaign.slides.map((slide) => slide.storeId),
      kongsansoFamilyStoreIds,
      '콩산소는 본점과 기존 연계 7곳의 구성과 순서를 그대로 유지해야 합니다.',
    );
  } else {
    assert.deepEqual(slideStoreIds, [storeId], `${name}: another store must not appear in this dedicated campaign.`);
  }

  assert.ok(existsSync(item.qrAsset), `${name}: QR asset is missing.`);
  const qr = readFileSync(item.qrAsset, 'utf8');
  assert.match(qr, /<svg\b/, `${name}: QR asset is not SVG.`);
  assert.match(qr, /viewBox=/, `${name}: QR asset has no scalable viewBox.`);
}

for (const campaign of Object.values(heroData.campaigns)) {
  const images = campaign.slides.map((slide) => slide.image);
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
assert.match(rc6, /hero-campaigns\.json\?v=store-campaign-standard-1/, 'The hero campaign data cache must be refreshed.');
assert.match(loader, /rc6-fixes\.js\?v=[^'\n]*store-campaign-standard-1/, 'The RC6 script cache must be refreshed.');
assert.match(index, /final-experience\.js\?v=[^"\n]*store-campaign-standard-1/, 'The final loader cache must be refreshed.');

console.log('store-campaign-nine-regression-test: pass');
