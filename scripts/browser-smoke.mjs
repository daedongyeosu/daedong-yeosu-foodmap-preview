import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const report = {success: false, checks: [], warnings: [], errors: []};
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  locale: 'ko-KR',
  geolocation: {latitude: 34.7604, longitude: 127.6622},
  permissions: ['geolocation']
});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));

const check = async (condition, message) => {
  const ok = await condition;
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};
const expectedPizzaPriority = ['도미노피자 문수점', '외계인피자 여수점', '피자스쿨 여문점'];
const expectedPizzaCycles = expectedPizzaPriority.map((_, offset) => [
  ...expectedPizzaPriority.slice(offset),
  ...expectedPizzaPriority.slice(0, offset)
]);
const checkPizzaPriority = async (savedLocation, message) => {
  await page.evaluate(location => {
    localStorage.setItem('savedLocation', JSON.stringify(location));
    localStorage.setItem('location', location.area);
  }, savedLocation);
  await page.reload({waitUntil: 'domcontentloaded'});
  await page.waitForSelector('#storeGrid .store-card', {timeout: 15000});
  await page.locator('[data-cat="피자"]').click();
  await page.waitForTimeout(1500);
  const cards = await page.locator('#storeGrid').evaluate(grid => [...grid.children].slice(0, 3).map(card => ({
    className: card.className,
    name: card.innerText.split('\n').map(value => value.trim()).find(Boolean) || ''
  })));
  const names = cards.map(card => card.name);
  const gridText = await page.locator('#storeGrid').innerText();
  await check(
    Promise.resolve(expectedPizzaCycles.some(order => JSON.stringify(names) === JSON.stringify(order))),
    `${message} 순환 상단 3곳: ${names.join(' → ') || `${cards.map(card => card.className).join(', ')} / ${gridText.slice(0, 120)}`}`
  );
};

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('#storeGrid .store-card', {timeout: 15000});
  await check(page.locator('#locationBtn').isVisible(), '위치 버튼 표시');
  await check(page.locator('#homeShareBtn').isVisible(), '공유 버튼 표시');
  await check(page.locator('#heroTrack .carousel-slide').count().then(count => count > 2), '메인 슬라이드 표시');
  await check(page.locator('#storeGrid .store-card').count().then(count => count > 0), '가게 목록 표시');
  await check(page.locator('#startupAd').isHidden(), '첫 접속 모집 팝업 중단');
  await check(page.getByText('가게카드 보기', {exact: true}).count().then(count => count === 0), '가게카드 보기 문구 제거');
  const categoryMoreName = '국밥/찜/탕/찌개/조림';
  await page.locator(`[data-cat="${categoryMoreName}"]`).click();
  await page.waitForSelector('#loadMoreBtn[data-rc5-more]', {timeout: 5000});
  await page.locator('#loadMoreBtn[data-rc5-more]').click();
  await page.waitForSelector('#modal:not([hidden]) .rc4-category-all-list .store-card[data-id]', {timeout: 5000});
  const categoryMoreCard = page.locator('#modal .rc4-category-all-list .store-card[data-id]').first();
  const categoryMoreStoreId = await categoryMoreCard.getAttribute('data-id');
  const categoryMoreStoreName = (await categoryMoreCard.locator('h3').innerText()).trim();
  const categoryMoreFavorite = categoryMoreCard.locator('[data-favorite-store]');
  const categoryMoreFavoriteBefore = await categoryMoreFavorite.getAttribute('aria-pressed');
  await categoryMoreFavorite.click();
  const categoryMoreFavoriteAfter = await categoryMoreFavorite.getAttribute('aria-pressed');
  await check(
    Promise.resolve(categoryMoreFavoriteAfter !== categoryMoreFavoriteBefore && await page.locator('#modal .rc4-category-all').count() === 1),
    `${categoryMoreName} 더보기 찜하기 버튼 기존 동작 유지`
  );
  await categoryMoreFavorite.click();
  await categoryMoreCard.locator('.store-photo,.photo-placeholder-card').first().click();
  await check(
    page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${categoryMoreStoreId}"]`).count().then(count => count === 1),
    `${categoryMoreName} 더보기 가게카드 터치로 상세 열기: ${categoryMoreStoreName}`
  );
  await checkPizzaPriority({
    label: '오림동',
    area: '오림동',
    address: '오림동',
    detail: '',
    coords: null,
    sortByDistance: false
  }, '오림동 주소 선택 시 피자 1·2·3위 순환 우선노출');
  await checkPizzaPriority({
    label: '현재 위치',
    area: '여수시 전체',
    address: '현재 위치',
    detail: '',
    coords: {lat: 34.7558625400933, lng: 127.716615186282},
    sortByDistance: true
  }, '오림동 GPS 위치 시 피자 1·2·3위 실시간 순환 우선노출');
  await page.locator('#storeGrid > *').first().click();
  await page.waitForSelector('#modal:not([hidden])', {timeout: 5000});
  await check(page.locator('#modalContent').isVisible(), '가게 상세 팝업 작동');
  await page.locator('.modal-close').click();
  await page.locator('#locationBtn').click();
  await page.waitForSelector('#modal:not([hidden])', {timeout: 5000});
  await check(page.locator('#modalContent').isVisible(), '위치 설정 팝업 작동');
  await page.addStyleTag({content: '*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}'});
  await page.evaluate(() => {
    for (let id = 1; id < 10000; id += 1) {
      clearInterval(id);
      cancelAnimationFrame(id);
    }
  });
  const topbarBox = await page.locator('.topbar').boundingBox();
  if (topbarBox) await page.screenshot({path: 'browser-mobile.png', clip: topbarBox});
  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  await page.locator('.topbar').screenshot({path: 'browser-mobile-failure.png'}).catch(() => {});
} finally {
  fs.writeFileSync('browser-smoke-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

if (!report.success) process.exit(1);
