import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const campaignPath = 'data/hero-campaigns.json';
const campaignData = JSON.parse(fs.readFileSync(campaignPath, 'utf8'));
const bannerTargets = JSON.parse(fs.readFileSync('data/banner-targets.json', 'utf8'));
const stores = JSON.parse(fs.readFileSync('data/stores.json', 'utf8'));
const rc6 = fs.readFileSync('rc6-fixes.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const storeId = '67a9e4f14c8c7ea4';
const campaign = campaignData.campaigns?.[storeId];

assert(campaign, '손수김밥 전단지 전용 캠페인이 등록되어야 함');
assert.equal(campaign.storeId, storeId, '캠페인은 기존 손수김밥 고유 ID를 그대로 사용해야 함');
assert.equal(campaign.images.length, 14, '제공받은 손수김밥 사진 14장을 모두 사용해야 함');
assert.deepEqual(campaign.specialBannerKeys, ['18', '19', '20'], '소상공인 공지·힐링요트·오마카세 우미 순서를 유지해야 함');
for (const image of campaign.images) {
  assert(fs.existsSync(image), `캠페인 이미지가 존재해야 함: ${image}`);
  assert(fs.statSync(image).size > 10_000, `캠페인 이미지가 정상 용량이어야 함: ${image}`);
}

const store = stores.find(item => String(item.id) === storeId);
assert.equal(store?.name, '손수김밥 양지점', '기존 손수김밥 데이터와 연결되어야 함');
assert.equal(stores.length, 650, '전체 가게 650곳을 보존해야 함');
assert.equal(stores.filter(item => String(item.name || '').replace(/\s+/g, '') !== '제목없음').length, 649, '고객 검색 대상 649곳을 보존해야 함');
assert.equal(stores.reduce((sum, item) => sum + (item.routes || []).length, 0), 4558, '주문경로 4,558건을 보존해야 함');
assert.equal(new Set(stores.map(item => String(item.id))).size, 650, '가게 고유 ID는 누락·중복 없이 보존해야 함');

assert.match(rc6, /new URLSearchParams\(location\.search\)\.get\('hero'\)/, 'hero 전용 주소를 읽어야 함');
assert.match(rc6, /if\(campaignEntries\.length\)return campaignEntries;/, '전용 주소에서만 캠페인 슬라이드를 사용해야 함');
assert.match(rc6, /return rc6InterleaveHeroEntries\(rc6DailyHeroOrder/, '일반 주소의 기존 위치 기반 슬라이드를 유지해야 함');
assert.match(rc6, /data-rc6-banner-store=/, '손수김밥 슬라이드가 기존 가게 팝업 동작과 연결되어야 함');
assert.match(app, /startupBypassHeroStoreIds = new Set\(\['67a9e4f14c8c7ea4'\]\)/, '전용 주소에서 시작 광고가 슬라이드를 덮지 않아야 함');
assert.match(index, /sonsugimbap-flyer-hero-1/, '브라우저가 새 진입 로직을 즉시 받아야 함');
assert.match(finalExperience, /rc6-fixes\.js\?v=sonsugimbap-flyer-hero-1/, '브라우저가 새 슬라이드 로직을 즉시 받아야 함');

const context = vm.createContext({
  appRegisteredStores() { return []; },
  fxPhoneStores() { return []; },
  fxDirectBrands() { return []; },
  fxOpenBrandHub() {},
  commitAddressSelection() {},
  location: {search: `?hero=${storeId}`},
  URLSearchParams,
  stores: [store],
  HERO_BANNERS: [],
});
vm.runInContext(
  `${rc6}
   rc6HeroCampaigns=${JSON.stringify(campaignData)};
   rc6BannerTargets=${JSON.stringify(bannerTargets)};
   globalThis.campaignEntries=rc6CampaignHeroEntries().map(item=>({key:item.key,kind:item.kind,storeId:item.store?.id||''}));`,
  context,
);
assert.equal(context.campaignEntries.length, 17, '손수김밥 14장과 지역 소식 3장을 모두 순환해야 함');
assert.equal(context.campaignEntries[0].storeId, storeId, '첫 슬라이드는 손수김밥이어야 함');
assert.deepEqual(
  [4, 9, 14].map(index => context.campaignEntries[index].kind),
  ['notion', 'notion', 'notion'],
  '지역 소식 3개는 손수김밥 사진 사이에 분산되어야 함',
);

console.log('PASS 손수김밥 전단지 전용 메인슬라이드');
