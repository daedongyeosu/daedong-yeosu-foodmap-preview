import fs from 'node:fs';
import {chromium} from 'playwright';
import {NEW_NOTION_STORES} from './nine-notion-store-config.mjs';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const report = {success: false, stores: [], errors: []};
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  locale: 'ko-KR',
  geolocation: {latitude: 34.7604, longitude: 127.6622},
  permissions: ['geolocation']
});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());

try {
  for (const definition of NEW_NOTION_STORES) {
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(`${definition.name}: ${error.message}`));
    await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('#storeGrid .store-card', {timeout: 15000});
    await page.waitForFunction(
      () => typeof window.rc6Initialize === 'function' && typeof window.rc7Initialize === 'function',
      {timeout: 15000}
    );
    await page.locator('#mainSearch').fill(definition.name);
    await page.locator('#searchBtn').click();
    const searchCard = page.locator(`#fxSearchResults [data-search-store-id="${definition.id}"]`);
    await searchCard.waitFor({state: 'visible', timeout: 8000});
    await searchCard.click();

    const detail = page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${definition.id}"]`);
    await detail.waitFor({state: 'visible', timeout: 5000});
    const carousel = detail.locator('#detailPhotoCarousel');
    const originalCount = Number(await carousel.getAttribute('data-original-count'));
    const dotCount = await carousel.locator('.carousel-dots [data-slide]').count();
    const altTexts = await carousel.locator('.detail-photo-slide:not(:first-child):not(:last-child) img').evaluateAll(
      images => images.map(image => image.getAttribute('alt'))
    );
    const firstActive = await carousel.locator('.carousel-dots .active').getAttribute('data-slide');
    await carousel.locator('[data-carousel-next]').click();
    const nextActive = await carousel.locator('.carousel-dots .active').getAttribute('data-slide');

    if (
      originalCount !== 3 ||
      dotCount !== 3 ||
      altTexts.length !== 3 ||
      new Set(altTexts).size !== 3 ||
      firstActive === nextActive
    ) {
      throw new Error(`${definition.name}: 고객 사진 3장 넘김 검증 실패`);
    }
    report.stores.push({
      id: definition.id,
      name: definition.name,
      originalCount,
      dotCount,
      altTexts,
      arrowChangedPhoto: true
    });
    await page.close();
  }
  report.success = report.stores.length === NEW_NOTION_STORES.length && report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
} finally {
  fs.writeFileSync('browser-nine-store-galleries-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

if (!report.success) process.exit(1);
