import fs from 'node:fs';
import {chromium} from 'playwright';

const beforeURL = process.env.BEFORE_URL;
const afterURL = process.env.AFTER_URL;
if (!beforeURL || !afterURL) throw new Error('BEFORE_URL and AFTER_URL are required');

const browser = await chromium.launch({headless: true});
const context = await browser.newContext({viewport: {width: 390, height: 844}, locale: 'ko-KR'});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());

const inspect = async (url, snapshot) => {
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(url, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('#storeGrid .store-card', {timeout: 15000});
  const state = await page.evaluate(() => ({
    title: document.title,
    heroSlides: document.querySelectorAll('#heroTrack .carousel-slide').length,
    storeCards: document.querySelectorAll('#storeGrid .store-card').length,
    categoryButtons: document.querySelectorAll('#categoryGrid [data-cat]').length,
    startupVisible: !document.querySelector('#startupAd')?.hasAttribute('hidden'),
    forbiddenBadges: [...document.querySelectorAll('#heroTrack *')].filter(node =>
      ['가게카드 보기', '콩산소 전용 대동여수음식지도', '손수김밥 전용 대동여수음식지도'].includes(node.textContent?.trim())
    ).length
  }));
  fs.writeFileSync(snapshot, await page.content());
  await page.close();
  return {...state, errors};
};

const before = await inspect(beforeURL, 'approved-ux-before-main.html');
const after = await inspect(afterURL, 'approved-ux-after-home.html');
const checks = {
  titlePreserved: before.title === after.title,
  heroPresent: after.heroSlides > 2,
  storesPresent: after.storeCards > 0,
  categoriesPresent: after.categoryButtons > 0,
  startupPopupDisabled: after.startupVisible === false,
  forbiddenBadgesAbsent: after.forbiddenBadges === 0,
  noPageErrors: after.errors.length === 0
};
const success = Object.values(checks).every(Boolean);
fs.writeFileSync('approved-ux-comparison.json', `${JSON.stringify({success, checks, before, after}, null, 2)}\n`);
await browser.close();
if (!success) process.exit(1);
