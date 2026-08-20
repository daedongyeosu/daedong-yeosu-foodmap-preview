import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const report = {success: false, viewport: {width: 390, height: 844}, checks: [], errors: []};
const browserExecutablePath = process.env.CODEX_BROWSER_EXECUTABLE_PATH || '';
const browser = await chromium.launch({
  headless: true,
  ...(browserExecutablePath ? {executablePath: browserExecutablePath} : {})
});
const context = await browser.newContext({viewport: report.viewport, locale: 'ko-KR'});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV1', '1');
});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));

const check = async (condition, message) => {
  const ok = await condition;
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  const banner = page.locator('#riderRecruitmentBanner');
  await banner.waitFor({state: 'visible', timeout: 15000});
  await banner.scrollIntoViewIfNeeded();
  await check(banner.getByText('배송기사님 상시모집', {exact: true}).count().then(count => count === 1), '존중 표현의 상시모집 문구 표시');
  await check(banner.getByText('모집내용 보기', {exact: false}).count().then(count => count === 1), '모집내용 보기 버튼 표시');
  const box = await banner.boundingBox();
  await check(Promise.resolve(Boolean(box && box.width >= 340 && box.height >= 60)), '390px 모바일에서 누르기 쉬운 고정 배너 크기');
  await page.screenshot({path: 'browser-rider-evergreen-banner.png', fullPage: false});

  await banner.click();
  const modal = page.locator('#modal:not([hidden]).promo-image-only-modal');
  await modal.waitFor({state: 'visible', timeout: 5000});
  const image = modal.locator('img[src*="rider-recruitment-portrait-v2.webp"]');
  await image.waitFor({state: 'visible', timeout: 5000});
  await check(image.isVisible(), '등록된 배송기사 모집 사진을 즉시 팝업으로 표시');
  await page.waitForFunction(
    selector => {
      const element = document.querySelector(selector);
      return element instanceof HTMLImageElement && element.complete && element.naturalWidth > 0;
    },
    '#modal:not([hidden]).promo-image-only-modal img[src*="rider-recruitment-portrait-v2.webp"]',
    {timeout: 10000}
  );
  await check(image.evaluate(element => element.complete && element.naturalWidth > 0), '배송기사 모집 사진 정상 로드');
  await check(modal.locator('.modal-close').isVisible(), '팝업 닫기 버튼 표시');
  await page.screenshot({path: 'browser-rider-evergreen-popup.png', fullPage: false});
  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  await page.screenshot({path: 'browser-rider-evergreen-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-rider-evergreen-banner-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

if (!report.success) process.exit(1);

