import fs from 'node:fs';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const establishedId = '5c881a3751b1c6cf';
const collectorId = 'd86b08f1865cc35a';
const establishedImage = 'images/notion-stores/4d79f0bfa257.png';
const collectorImage = 'assets/logo.png';
const catalog = [
  {
    id: collectorId, store_id: collectorId, name: '쌀쌀맞은닭 여천점', district: '신기동', neighborhoods: ['신기동'],
    category: '기타', categories: ['기타'], image: collectorImage, latitude: null, longitude: null,
    channelKeys: ['yogiyo'], hasMenu: true
  },
  {
    id: establishedId, store_id: establishedId, name: '쌀쌀맞은닭 여천점(신기동)', district: '신기동', neighborhoods: ['신기동'],
    category: '치킨', categories: ['치킨'], image: establishedImage, latitude: 34.7599, longitude: 127.6725,
    channelKeys: ['mukkebi', 'yogiyo'], hasMenu: false, managed: true
  }
];
const details = {
  [establishedId]: {...catalog[1], images: [{card: establishedImage, detail: establishedImage}], routes: [
    {name: '먹깨비', key: 'mukkebi', url: 'https://mukkebi.com/store', enabled: true},
    {name: '요기요', key: 'yogiyo', url: 'https://ws.yogiyo.co.kr/old', enabled: true}
  ]},
  [collectorId]: {...catalog[0], address: '전남 여수시 신기동 100-9', phone: '0507-1391-0226',
    naverMap: 'https://map.naver.com/p/entry/place/1511961967', images: [
    {card: collectorImage, detail: collectorImage},
    {card: 'assets/logo-192.png', detail: 'assets/logo-192.png'}
  ], routes: [
    {name: '전화주문', key: 'phone', url: 'tel:050713910226', enabled: true},
    {name: '요기요', key: 'yogiyo', url: 'https://ws.yogiyo.co.kr/new', enabled: true}
  ]}
};

const report = {success: false, checks: [], errors: []};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})
});
const context = await browser.newContext({
  viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, locale: 'ko-KR',
  userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.6.0'
});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV1', '1');
});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
await context.route('**/api/catalog', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(catalog)}));
await context.route('**/api/services', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({
  programs: [], deliveryBenefits: [], stores: {[collectorId]: {hours: {displayLines: ['2026-08-17 확인 12:00–24:00']}}}
})}));
for (const [id, detail] of Object.entries(details)) {
  await context.route(`**/api/store/${id}`, route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(detail)}));
}
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));

const check = async (condition, message, detail = null) => {
  const ok = await condition;
  report.checks.push({message, ok, ...(detail ? {detail} : {})});
  if (!ok) throw new Error(message);
};

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.__daedongCatalogProgress?.complete === true, null, {timeout: 12000});
  await page.waitForFunction(() => window.daedongStoreServiceInfo?.ready, null, {timeout: 12000});
  await page.evaluate(() => window.daedongStoreServiceInfo.showOverview(document.body, {query: '쌀쌀맞은닭', locationMode: 'all'}));
  const cards = page.locator('.store-service-overview-card');
  await cards.first().waitFor({state: 'visible', timeout: 3000});
  await page.waitForFunction(() => {
    const image = document.querySelector('.store-service-overview-card-image img');
    return Boolean(image?.complete && image.naturalWidth);
  }, null, {timeout: 5000});
  await check(cards.count().then(count => count === 1), '기존 가게와 요기요 신규 수집 가게가 검색 결과 한 건으로 표시됨');
  const snapshot = await cards.first().evaluate(card => ({
    id: card.dataset.storeServiceStoreId,
    text: card.textContent?.replace(/\s+/g, ' ').trim() || '',
    image: card.querySelector('.store-service-overview-card-image img')?.getAttribute('src') || '',
    imageLoaded: Boolean(card.querySelector('.store-service-overview-card-image img')?.complete
      && card.querySelector('.store-service-overview-card-image img')?.naturalWidth)
  }));
  await check(Promise.resolve(snapshot.id === establishedId), '기존 관리 가게 ID가 대표 ID로 유지됨', snapshot);
  await check(Promise.resolve(Boolean(snapshot.image) && snapshot.imageLoaded), '통합 검색 카드에 가게 대표사진이 실제로 표시됨', snapshot);
  await check(Promise.resolve(snapshot.text.includes('영업시간 확인') && snapshot.text.includes('12:00–24:00') && !snapshot.text.includes('시간 미확인')),
    '신규 수집 ID의 확인 영업시간이 기존 가게 검색 카드에 표시됨', snapshot);

  await cards.first().tap();
  await page.waitForSelector(`#modal:not([hidden]) .store-detail[data-store-id="${establishedId}"]`, {timeout: 5000});
  const detailSnapshot = await page.evaluate(() => {
    const detail = document.querySelector('#modal .store-detail');
    return {
      slides: detail?.querySelectorAll('#detailPhotoCarousel .carousel-slide').length || 0,
      naverMap: detail?.querySelector('a[data-detail-only="naver"]')?.getAttribute('href') || '',
      phone: detail?.querySelector('a[data-route-key="phone"]')?.getAttribute('href') || ''
    };
  });
  await check(Promise.resolve(detailSnapshot.slides >= 3), '상세 화면에서 기존 사진과 신규 수집 사진을 함께 보존', detailSnapshot);
  await check(Promise.resolve(detailSnapshot.naverMap === 'https://map.naver.com/p/entry/place/1511961967'),
    '주소·전화가 확인된 신규 수집 네이버 장소 링크를 상세 화면에 표시', detailSnapshot);
  await check(Promise.resolve(/^tel:\d{9,12}$/.test(detailSnapshot.phone)),
    '전화주문을 모바일에서 직접 누를 수 있는 tel 링크로 표시', detailSnapshot);
  await page.evaluate(() => document.querySelector('[data-rc3-other-methods]')?.click());
  await page.waitForFunction(() => document.querySelector('#modalTitle')?.textContent === '다른 주문방법 보기', null, {timeout: 2000});
  const orderMethodsText = await page.locator('#modalContent').textContent();
  await check(Promise.resolve(orderMethodsText?.includes('요기요')), '병합 뒤에도 요기요 주문경로를 보존', {orderMethodsText});
  await page.screenshot({path: 'browser-yogiyo-duplicate-store-merge.png', fullPage: false});
  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  report.diagnostics = await page.evaluate(() => ({
    readyState: document.readyState,
    cards: document.querySelectorAll('.store-service-overview-card').length,
    text: document.body?.innerText?.slice(0, 1600) || ''
  })).catch(diagnosticError => ({error: diagnosticError.message}));
  await page.screenshot({path: 'browser-yogiyo-duplicate-store-merge-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-yogiyo-duplicate-store-merge-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
