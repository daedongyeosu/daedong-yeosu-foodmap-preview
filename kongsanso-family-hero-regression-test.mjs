import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const stores = JSON.parse(fs.readFileSync('data/stores.json', 'utf8'));
const campaigns = JSON.parse(fs.readFileSync('data/hero-campaigns.json', 'utf8'));
const rc6 = fs.readFileSync('rc6-fixes.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const index = fs.readFileSync('index.html', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');

const campaignStoreId = 'cfde2617224f33a0';
const expectedSlideIds = [
  campaignStoreId,
  '1d691d8e74499d31',
  '2017de4f9111f3ce',
  '93ae27237a8e75c4',
  '3f441930b8d18783',
  'f3cb61dd45ba9b8b',
  '665953a0453afc52',
  '7ed65c8f086f11f2',
];
const campaign = campaigns.campaigns?.[campaignStoreId];

assert(campaign, '콩산소 전용 캠페인이 등록되어야 합니다.');
assert.equal(campaign.storeId, campaignStoreId);
assert.equal(campaign.slides?.length, 8, '콩산소 계열 가게 8곳이 모두 슬라이드에 있어야 합니다.');
assert.deepEqual(campaign.slides.map(slide => slide.storeId), expectedSlideIds, '콩산소 전용 슬라이드의 가게 연결 순서가 달라졌습니다.');
for (const slide of campaign.slides) {
  assert(fs.existsSync(slide.image), `슬라이드 사진이 없습니다: ${slide.image}`);
  assert(fs.statSync(slide.image).size > 30_000, `슬라이드 사진이 비정상적으로 작습니다: ${slide.image}`);
  assert(stores.some(store => String(store.id) === String(slide.storeId)), `슬라이드에 연결된 가게카드가 없습니다: ${slide.storeId}`);
}

assert.equal(stores.length, 701, '콩산소 신규 카드 3개를 포함한 전체 가게 수가 달라졌습니다.');
assert.equal(stores.filter(store => String(store.name || '').replace(/\s+/g, '') !== '제목없음').length, 700, '검색 가능한 가게 수가 달라졌습니다.');
assert.equal(stores.reduce((sum, store) => sum + (store.routes || []).length, 0), 4917, '주문링크 수가 허용 범위를 벗어났습니다.');
assert.equal(new Set(stores.map(store => String(store.id))).size, stores.length, '가게 ID가 누락되거나 중복되었습니다.');

const exactRoutes = new Map([
  ['2017de4f9111f3ce', [
    ['먹깨비', 'https://bit.ly/4tDrZX6'],
    ['땡겨요', 'https://bit.ly/49LSW3B'],
  ]],
  ['1d691d8e74499d31', [
    ['먹깨비', 'https://bit.ly/439Tn4a'],
    ['땡겨요', 'https://bit.ly/4drnTv8'],
  ]],
  ['93ae27237a8e75c4', [
    ['먹깨비', 'https://bit.ly/4dq4sTs'],
    ['땡겨요', 'https://bit.ly/3Pacwjg'],
  ]],
]);
for (const [id, expected] of exactRoutes) {
  const store = stores.find(item => String(item.id) === id);
  assert(store, `신규 가게카드가 없습니다: ${id}`);
  assert.deepEqual((store.routes || []).map(route => [route.name, route.url]), expected, `${store.name}에는 노션에서 확인한 먹깨비·땡겨요 링크만 있어야 합니다.`);
  for (const image of store.images || []) {
    const path = image.detail || image.card;
    assert(fs.existsSync(path), `${store.name} 사진이 없습니다: ${path}`);
  }
}

const choChef = stores.find(store => String(store.id) === '1d691d8e74499d31');
assert.equal(choChef?.name, '조쉐프의 쌀국수', '고객 화면 이름은 조쉐프의 쌀국수로 통일해야 합니다.');
assert(choChef?.searchAliases?.includes('조셰프의 쌀국수'), '땡겨요 표기 조셰프의 쌀국수도 검색되어야 합니다.');
assert.equal(choChef?.images?.length, 5, '제공받은 조쉐프의 쌀국수 사진 5장을 모두 카드에 사용해야 합니다.');

const kongsanso = stores.find(store => String(store.id) === campaignStoreId);
assert.equal(kongsanso?.name, '콩산소 (음식 연구소)', '기존 콩산소 가게카드를 재사용해야 합니다.');
assert.deepEqual(
  (kongsanso.routes || []).map(route => [route.name, route.url]),
  [
    ['가게바로주문', 'https://bit.ly/4dpo6Pu'],
    ['먹깨비', 'https://bit.ly/4metw3L'],
    ['땡겨요', 'https://bit.ly/47NPuEV'],
    ['CHAK 지역상품권', 'https://bit.ly/chak-yeosu'],
    ['전화주문', 'https://bit.ly/4metU2d'],
  ],
  '기존 콩산소 링크를 보존하고 노션의 땡겨요 링크만 추가해야 합니다.',
);

const preservedRoutes = new Map([
  ['3f441930b8d18783', [
    ['가게바로주문', 'https://app.notion.com/p/385da158dd2a8086b123d996e77cebef'],
    ['먹깨비', 'http://mukkebi.com/shop.php?data=206857'],
    ['CHAK 지역상품권', 'https://bit.ly/chak-yeosu'],
    ['전화주문', 'https://app.notion.com/p/385da158dd2a80509d5ee8a0f5119ac8'],
    ['쿠팡이츠', 'https://web.coupangeats.com/share?storeId=1004923&dishId=&key=11dbf4cd-a29c-458d-8761-b9138867ad15'],
    ['배달의민족', 'https://s.baemin.com/4c000DmgKEX9U'],
  ]],
  ['f3cb61dd45ba9b8b', [
    ['가게바로주문', 'https://app.notion.com/p/387da158dd2a80f290a4dca67ece65ce'],
    ['먹깨비', 'http://mukkebi.com/shop.php?data=156665'],
    ['CHAK 지역상품권', 'https://bit.ly/chak-yeosu'],
    ['전화주문', 'https://app.notion.com/p/387da158dd2a80de8ae0c572f469d5b1'],
  ]],
  ['665953a0453afc52', [
    ['가게바로주문', 'https://app.notion.com/p/387da158dd2a80de8bb4efbe87d444eb'],
    ['먹깨비', 'http://mukkebi.com/shop.php?data=156666'],
    ['땡겨요', 'https://fdofd.ddangyo.com/gateway1.html?LHa71H6='],
    ['CHAK 지역상품권', 'https://bit.ly/chak-yeosu'],
    ['전화주문', 'https://app.notion.com/p/387da158dd2a80dabf3efb171f119f2a'],
    ['요기요', 'https://ws.yogiyo.co.kr/te2cd14'],
  ]],
  ['7ed65c8f086f11f2', [
    ['가게바로주문', 'https://app.notion.com/p/6cfda158dd2a82e5a9c581365cf2c43d'],
    ['먹깨비', 'http://mukkebi.com/shop.php?data=168070'],
    ['CHAK 지역상품권', 'https://bit.ly/chak-yeosu'],
    ['전화주문', 'https://app.notion.com/p/385da158dd2a806e928de8c5f631424e'],
  ]],
]);
for (const [id, expected] of preservedRoutes) {
  const store = stores.find(item => String(item.id) === id);
  assert.deepEqual((store?.routes || []).map(route => [route.name, route.url]), expected, `${store?.name || id}의 기존 주문·지도 관련 링크가 변경되었습니다.`);
}

assert.match(app, /startupBypassHeroStoreIds = new Set\(\['67a9e4f14c8c7ea4','cfde2617224f33a0'\]\)/, '콩산소 전용 주소에서 시작 팝업을 건너뛰어야 합니다.');
assert.match(rc6, /if\(campaignEntries\.length\)return campaignEntries;/, '콩산소 전용 주소에서 전용 슬라이드를 선택해야 합니다.');
assert.match(rc6, /data-rc6-banner-store=/, '모든 가게 슬라이드는 가게카드 터치 대상으로 렌더링되어야 합니다.');
assert.match(index, /kongsanso-store-family-1/, '브라우저가 콩산소 전용 로직을 즉시 받아야 합니다.');
assert.match(finalExperience, /rc6-fixes\.js\?v=[^'"]*kongsanso-store-family-1/, '최신 콩산소 슬라이드 스크립트를 불러와야 합니다.');

const context = vm.createContext({
  appRegisteredStores() { return []; },
  fxPhoneStores() { return []; },
  fxDirectBrands() { return []; },
  fxOpenBrandHub() {},
  commitAddressSelection() {},
  location: {search: `?hero=${campaignStoreId}`},
  URLSearchParams,
  stores,
  HERO_BANNERS: [],
});
vm.runInContext(
  `${rc6}
   rc6HeroCampaigns=${JSON.stringify(campaigns)};
   globalThis.campaignEntries=rc6CampaignHeroEntries().map(item=>({kind:item.kind,storeId:item.store?.id||''}));`,
  context,
);
assert.deepEqual(
  Array.from(context.campaignEntries, item => item.storeId),
  expectedSlideIds,
  '콩산소 전용 슬라이드 8개가 각각 올바른 가게카드로 연결되어야 합니다.',
);
assert(context.campaignEntries.every(item => item.kind === 'store'), '콩산소 전용 8개 슬라이드는 모두 가게카드여야 합니다.');

console.log('PASS 콩산소 전용 8개 슬라이드·가게카드·주문링크');
