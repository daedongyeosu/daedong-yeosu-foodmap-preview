import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import vm from 'node:vm';

const id = '17d9bf1de3d671fd';
const title = '해인이네';
const canonicalName = '해인이네 여서점';
const productionUrl = 'https://daedongmap.com/?hero=17d9bf1de3d671fd';
const previewUrl = 'https://preview.daedongmap.com/?hero=17d9bf1de3d671fd';
const expectedMenus = [
  '동태탕',
  '꽃게탕',
  '국내산 제육볶음',
  '낙지볶음',
  '고등어구이',
  '갈치조림',
  '양푼이 돼지갈비찜',
];

const heroData = JSON.parse(readFileSync('data/hero-campaigns.json', 'utf8'));
const campaign = heroData.campaigns[id];
assert.ok(campaign, '해인이네 전용 캠페인이 있어야 합니다.');
assert.equal(heroData.virtualStores?.[id], undefined, '실제 가게와 주문 경로를 가상 가게로 가리지 않아야 합니다.');
assert.equal(campaign.storeId, id);
assert.equal(campaign.slug, 'haeinine-yeoseo');
assert.equal(campaign.label, '해인이네 전용 대동여수음식지도');
assert.equal(campaign.title, title);
assert.equal(campaign.meta, '먹깨비 등록 메뉴');
assert.equal(campaign.layout, 'food14-plus3');
assert.equal(campaign.slides.length, 7, '먹깨비에서 확인한 음식사진 7장만 사용해야 합니다.');
assert.deepEqual(campaign.slides.map((slide) => slide.meta), expectedMenus);
assert.equal(new Set(campaign.slides.map((slide) => slide.image)).size, 7, '음식사진을 중복하면 안 됩니다.');
for (const slide of campaign.slides) {
  assert.equal(slide.storeId, id);
  assert.equal(slide.title, title);
  assert.match(slide.image, /^assets\/campaigns\/haeinine-yeoseo\/\d{2}[-a-z]+\.png$/);
  assert.ok(existsSync(slide.image), '음식사진 파일이 실제로 있어야 합니다: ' + slide.image);
}

const links = JSON.parse(readFileSync('data/store-campaign-links.json', 'utf8')).campaigns
  .filter((entry) => entry.storeId === id);
assert.equal(links.length, 1, '가게 전용 링크는 정확히 하나여야 합니다.');
assert.equal(links[0].name, canonicalName);
assert.equal(links[0].url, productionUrl);
assert.equal(links[0].previewUrl, previewUrl);
assert.equal(links[0].qrAsset, 'assets/qr/haeinine-yeoseo.svg');
const svg = readFileSync(links[0].qrAsset, 'utf8');
assert.ok(svg.includes('<desc>' + productionUrl + '</desc>'), '인쇄 QR은 영구 운영 주소를 가리켜야 합니다.');
assert.match(svg, /viewBox="0 0 \d+ \d+"/);

const source = readFileSync('rc6-fixes.js', 'utf8');
const start = source.indexOf('function rc6CampaignHeroEntries(){');
const end = source.indexOf('\nfunction rc6HeroEntries()', start);
assert.ok(start >= 0 && end > start, '실제 캠페인 런타임 함수를 검사해야 합니다.');
const constants = [...source.matchAll(/^const RC6_CAMPAIGN_(?:STORE_HERO_LIMIT|SPECIAL_HERO_KEYS)=[^\r\n]+/gm)]
  .map((match) => match[0])
  .join('\n');
const targets = Object.fromEntries(['18', '19', '20'].map((key) => [key, {
  label: '기존 배너 ' + key,
  status: 'notion',
  notionUrl: 'https://example.test/' + key,
  image: 'https://example.test/' + key + '.jpg',
}]));
const store = { id, name: canonicalName, area: '여서동', cat: '한식' };
const context = vm.createContext({
  RC6_IS_GOHEUNG: false,
  rc6RequestedHeroCampaign: () => ({ campaign, store }),
  rc6CampaignStoreById: (storeId) => storeId === id ? store : null,
  rc6BannerTargets: targets,
  HERO_BANNERS: Array.from({ length: 21 }, () => ({})),
});
const entries = new vm.Script(constants + '\n' + source.slice(start, end) + '\nrc6CampaignHeroEntries();')
  .runInContext(context, { timeout: 1000 });
assert.equal(entries.filter((entry) => entry.kind === 'store').length, 7);
assert.equal(entries.filter((entry) => entry.kind === 'notion').length, 3);
assert.equal(entries.length, 10);
assert.deepEqual(
  Array.from(entries.entries()).filter(([, entry]) => entry.kind === 'notion').map(([index]) => index),
  [4, 8, 9],
);

for (const [file, asset] of [
  ['rc6-fixes.js', 'hero-campaigns.json'],
  ['final-experience.js', 'rc6-fixes.js'],
  ['index.html', 'final-experience.js'],
]) {
  const content = readFileSync(file, 'utf8');
  assert.ok(
    content.split(/\r?\n/).some((line) => line.includes(asset + '?v=') && line.includes('haeinine-campaign-1')),
    '해인이네 캠페인 캐시 갱신이 필요합니다: ' + file,
  );
}

console.log('haeinine-campaign-regression-test: pass');

