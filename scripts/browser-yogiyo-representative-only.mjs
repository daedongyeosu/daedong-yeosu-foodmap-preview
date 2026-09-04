import {createRequire} from 'node:module';

const {chromium} = createRequire(import.meta.url)('playwright');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const yogiyoPhoto = 'https://daedong-yeosu-data-api-preview.sisakim.workers.dev/api/media/yogiyo-menu/v1/9eb40189ee8eab3d246ca81ddf3a04018e836691d9c925d3ef1454c0ade6afdd.jpg';
const coupangPhoto = 'https://daedong-yeosu-data-api-preview.sisakim.workers.dev/api/media/coupang-menu/v1/dba72036c1e7b9ec02f0f84aa945c703412168c581ba0dd3c3a4574626fc6056.jpg';
const stores = [
  {id: '9db01d4bf068da59', name: '1194번지', image: yogiyoPhoto, source: 'yogiyo'},
  {id: '6bb198cd74849680', name: '빠삭강정 여수봉산점', image: coupangPhoto, source: 'coupang'}
];

const catalog = stores.map(store => ({
  id: store.id, store_id: store.id, name: store.name, district: '여수시', category: '치킨',
  categories: ['치킨'], image: store.image, img: store.image,
  images: [{card: store.image, detail: store.image}], hasMenu: true, channelKeys: [store.source]
}));

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})
});
const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, locale: 'ko-KR'});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1', '1');
});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
await context.route('**/api/catalog', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(catalog)}));
await context.route('**/api/services', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({programs: [], stores: {}})}));
for (const store of stores) {
  await context.route(`**/api/store/${store.id}`, route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({...catalog.find(item => item.id === store.id), address: '전라남도 여수시', routes: []})
  }));
  await context.route(`**/api/store/${store.id}/menu`, route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({storeId: store.id, storeName: store.name, displayName: store.name,
      mainImage: store.image, categories: ['치킨'],
      items: [{id: `${store.id}-1`, name: '대표메뉴', description: '', category: '치킨', image: store.image}]})
  }));
}

const page = await context.newPage();
const report = {success: false, yogiyo: {}, coupang: {}, errors: []};
page.on('pageerror', error => report.errors.push(error.message));
try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => Array.isArray(allStores) && allStores.length === 2, null, {timeout: 15000});

  await page.evaluate(id => openStore(allStores.find(store => store.id === id)), stores[0].id);
  const yogiyoDetail = page.locator(`#modal .store-detail[data-store-id="${stores[0].id}"]:not(.store-detail-loading)`);
  await yogiyoDetail.waitFor({state: 'visible'});
  report.yogiyo.hero = await yogiyoDetail.locator('.detail-photo').first().getAttribute('src');
  if (report.yogiyo.hero !== yogiyoPhoto) throw new Error('요기요 대표사진이 가게 상세에 표시되지 않았습니다.');
  await page.evaluate(() => closeModal());

  await page.evaluate(id => openStore(allStores.find(store => store.id === id)), stores[1].id);
  const coupangDetail = page.locator(`#modal .store-detail[data-store-id="${stores[1].id}"]:not(.store-detail-loading)`);
  await coupangDetail.waitFor({state: 'visible'});
  report.coupang.detailPhotoCount = await coupangDetail.locator('.detail-photo').count();
  if (report.coupang.detailPhotoCount !== 0) throw new Error('격리된 쿠팡 사진이 가게 대표사진으로 노출됐습니다.');
  await page.evaluate(id => window.daedongMenuPreview.open(id), stores[1].id);
  const menuOverlay = page.locator('[data-store-menu-overlay]:not([hidden])');
  await menuOverlay.waitFor({state: 'visible'});
  report.coupang.menuPhotoCount = await menuOverlay.locator('[data-menu-image-src], .store-menu-card img').count();
  if (report.coupang.menuPhotoCount !== 0) throw new Error('격리된 쿠팡 사진이 메뉴 카드에 노출됐습니다.');

  report.success = report.errors.length === 0;
} catch (error) {
  report.errors.push(error.stack || String(error));
} finally {
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
