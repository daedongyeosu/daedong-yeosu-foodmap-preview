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
  sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1', '1');
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
  await page.waitForFunction(() => !document.documentElement.classList.contains('daedong-fresh-entry-settling'), null, {timeout: 5000}).catch(() => {});
  await banner.evaluate(element => element.scrollIntoView({block: 'center'}));
  await page.waitForTimeout(250);
  await check(banner.getByText('공공주문앱 전문배송 업체', {exact: true}).count().then(count => count === 1), '공공주문앱 전문배송 정체성 표시');
  await check(banner.getByText('맛지도 배달대행', {exact: true}).count().then(count => count === 1), '확대된 배달대행 브랜드 표시');
  await check(banner.getByText('가게·기사님 상시 모집', {exact: true}).count().then(count => count === 1), '가게와 기사님 상시 모집 문구 표시');
  await check(banner.getByText('자세히 보기', {exact: false}).count().then(count => count === 1), '자세히 보기 버튼 표시');
  const box = await banner.boundingBox();
  await check(Promise.resolve(Boolean(box && box.width >= 340 && box.height >= 90)), '390px 모바일에서 세 줄 정보를 담는 배너 크기');
  await page.setViewportSize({width: 390, height: 1400});
  await page.screenshot({path: 'browser-rider-evergreen-banner.png', fullPage: false});
  await page.setViewportSize(report.viewport);

  await banner.click();
  await page.waitForURL(/\/delivery\/$/, {timeout: 5000});
  await check(page.getByRole('heading', {name: '배달만 하지 않습니다. 가게가 알려지도록 함께 뜁니다.'}).count().then(count => count === 1), '맛지도 배달대행 소개 페이지 표시');
  await check(page.locator('a[href="tel:01047977803"]').count().then(count => count >= 1), '배달대행 전화 상담 연결 표시');
  await check(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), '390px 모바일에서 가로 넘침 없음');
  await page.screenshot({path: 'browser-rider-evergreen-delivery-page.png', fullPage: false});
  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  await page.screenshot({path: 'browser-rider-evergreen-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-rider-evergreen-banner-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

if (!report.success) process.exit(1);

