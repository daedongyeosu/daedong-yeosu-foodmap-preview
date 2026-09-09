import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const storeId = 'dc638b23f8cf3c5b';
const storeName = '도미노피자 문수점';
const hero = JSON.parse(readFileSync('data/hero-campaigns.json', 'utf8'));
const campaign = hero.campaigns[storeId];

assert.ok(campaign, '도미노피자 문수점 전용 캠페인이 있어야 합니다.');
assert.equal(campaign.storeId, storeId);
assert.equal(campaign.title, storeName);
assert.equal(campaign.layout, 'food14-plus3');
assert.equal(campaign.slides.length, 14, '실제 메뉴 음식사진 배너 14개가 필요합니다.');
assert.equal(new Set(campaign.slides.map(slide => slide.image)).size, 14, '같은 음식사진을 복제하면 안 됩니다.');
for (const slide of campaign.slides) {
  assert.equal(slide.storeId, storeId, '다른 지점이나 가게 사진이 섞이면 안 됩니다.');
  assert.equal(slide.title, storeName);
  assert.match(slide.image, /^https:\/\/daedong-yeosu-data-api\.sisakim\.workers\.dev\/api\/media\/yogiyo-menu\/v1\/[a-f0-9]{64}\.jpg$/);
  assert.ok(slide.meta.trim(), '각 음식사진에는 실제 메뉴명이 있어야 합니다.');
}

const source = readFileSync('rc6-fixes.js', 'utf8');
const helperStart = source.indexOf('function rc6CampaignMenuImage(');
const helperEnd = source.indexOf('\nasync function rc6LoadRequestedCampaignMenuSlides()', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, '실제 자동 메뉴 배너 선별 함수를 검사해야 합니다.');
const helpers = source.slice(helperStart, helperEnd);
const generated = new vm.Script(`${helpers}\nrc6BuildCampaignMenuSlides(menu,campaign,store);`).runInNewContext({
  menu: {
    items: [
      {name:'대표 메뉴', image:'https://example.test/menu/0.jpg'},
      {name:'대표 메뉴 중복', image:'https://example.test/menu/0.jpg'},
      {name:'앱 로고', image:'assets/app-icons/daedong-app-icon-512.png'},
      ...Array.from({length:20}, (_, index) => ({name:`메뉴 ${index + 1}`, image:`https://example.test/menu/${index + 1}.jpg`})),
    ],
  },
  campaign: {storeId, title:storeName},
  store: {id:storeId, name:storeName},
});
const normalized = JSON.parse(JSON.stringify(generated));
assert.equal(normalized.length, 14, '메뉴가 많으면 서로 다른 사진을 최대 14장까지 자동 선별해야 합니다.');
assert.equal(new Set(normalized.map(slide => slide.image)).size, 14);
assert.ok(normalized.every(slide => slide.storeId === storeId && slide.title === storeName));
assert.ok(!normalized.some(slide => /app-icon/.test(slide.image)), '앱 로고를 음식사진으로 사용하면 안 됩니다.');

assert.match(source, /staticSlides\.length>=14\)return;/, '이미 완성된 수동 배너 14장은 보존해야 합니다.');
assert.match(source, /menuSlides\.length<=staticSlides\.length\)return;/, '자동 선별 결과가 더 적으면 기존 배너를 덮어쓰면 안 됩니다.');
const loaderStart = source.indexOf('async function rc6LoadRequestedCampaignMenuSlides()');
const loaderEnd = source.indexOf('\nfunction rc6CampaignHeroEntries()', loaderStart);
assert.ok(loaderStart >= 0 && loaderEnd > loaderStart);
assert.doesNotMatch(source.slice(loaderStart, loaderEnd), /campaign\.layout/, '모든 가게전용 QR에 자동 메뉴사진 보완을 적용해야 합니다.');
assert.match(source, /const specialKeys=RC6_CAMPAIGN_SPECIAL_HERO_KEYS;/, '모든 가게전용 QR에 일반광고 3개를 붙여야 합니다.');
assert.match(source, /hero-campaigns\.json\?v=[^'\n]*auto-menu-fill-all-1-domino-munsu-14-1/);
assert.match(readFileSync('final-experience.js', 'utf8'), /rc6-fixes\.js\?v=[^'\n]*auto-menu-fill-all-1-domino-munsu-14-1/);
assert.match(readFileSync('index.html', 'utf8'), /final-experience\.js\?v=[^"\n]*auto-menu-fill-all-1-domino-munsu-14-1/);

console.log('domino-dedicated-menu-hero-regression-test: pass');
