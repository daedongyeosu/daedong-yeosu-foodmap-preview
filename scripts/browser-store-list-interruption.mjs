import fs from 'node:fs';
import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const stores = Array.from({length: 36}, (_, index) => ({
  store_id: `pager-store-${String(index + 1).padStart(3, '0')}`,
  name: `페이지 전환 검증 가게 ${index + 1}`,
  district: index % 2 ? '문수동' : '여서동',
  category: index % 3 ? '한식' : '치킨',
  categories: [index % 3 ? '한식' : '치킨'],
  lat: 34.75 + index / 10000,
  lng: 127.69 + index / 10000,
  channelKeys: ['phone'],
  routes: [{name: '전화주문', url: 'tel:0610000000', enabled: true}]
}));

const report = {success: false, checks: [], errors: []};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH
    ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH}
    : {})
});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  isMobile: true,
  hasTouch: true,
  locale: 'ko-KR',
  userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.6.0'
});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV1', '1');
});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
await context.route('**/api/catalog', route => route.fulfill({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify(stores)
}));
await context.route('**/api/services', async route => {
  await new Promise(resolve => setTimeout(resolve, 3500));
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      programs: [],
      stores: {
        'pager-store-001': {
          hours: {
            displayLines: [
              '2026-08-13 확인 08:00–14:00, 15:00–19:00',
              '휴무일 매월 첫번째 월요일'
            ]
          }
        }
      }
    })
  });
});
await context.route('**/data/store-coordinates.json*', async route => {
  await new Promise(resolve => setTimeout(resolve, 4500));
  await route.fulfill({status: 200, contentType: 'application/json', body: '{}'});
});

const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));

const check = async (condition, message, detail = null) => {
  const ok = await condition;
  report.checks.push({message, ok, ...(detail ? {detail} : {})});
  if (!ok) throw new Error(message);
};

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => document.querySelectorAll('#storeGrid .store-card').length >= 16, null, {timeout: 10000});
  await check(page.locator('.promo-section .section-head h2').evaluate(node => node.textContent?.trim() === '여수와 함께하는 소식'),
    '여수 지역 소식 제목의 와/과 표기가 정확함');
  const grid = page.locator('#storeGrid');
  await check(page.locator('#storePagerControls').isHidden(),
    '전체 가게 목록의 하단 이전·다음 화살표를 표시하지 않음');

  await page.evaluate(() => {
    // A real customer begins a vertical scroll with a touch/pointer gesture.
    // Signal that intent before Playwright performs its programmatic
    // scrollIntoView so the fresh-entry guard does not classify this
    // test-only jump as a late WebView scroll restoration.
    document.body.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 180,
      clientY: 420
    }));
    document.body.dispatchEvent(new PointerEvent('pointermove', {
      bubbles: true,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 180,
      clientY: 390
    }));
  });
  await grid.scrollIntoViewIfNeeded();
  const beforeSwipe = await page.evaluate(() => ({
    gridTop: document.querySelector('#storeGrid')?.getBoundingClientRect().top ?? -1,
    scrollY: window.scrollY
  }));
  const startedAt = Date.now();
  await grid.evaluate(node => {
    // Native overflow scrolling is performed by the browser compositor, so a
    // synthetic touchend must not invoke an application-side page jump. Set a
    // deliberately non-card-aligned position and emit the same interaction
    // signals the pager observes. The exact offset is also the regression
    // check that the list stays wherever the customer stops it.
    node.dispatchEvent(new PointerEvent('pointerdown', {
      bubbles: true,
      pointerType: 'touch',
      isPrimary: true
    }));
    node.scrollLeft = Math.min(137, Math.max(0, node.scrollWidth - node.clientWidth));
    node.dispatchEvent(new Event('scroll'));
  });
  await page.waitForFunction(() => document.querySelector('#storeGrid')?.scrollLeft > 20, null, {timeout: 800});
  await page.waitForTimeout(60);
  const transitionMs = Date.now() - startedAt;
  await check(Promise.resolve(transitionMs < 250), '자유 스크롤 위치가 250ms 안에 반영됨', {transitionMs});
  await check(page.evaluate(() => {
    const left = document.querySelector('#storeGrid')?.scrollLeft || 0;
    return left >= 130 && left <= 144;
  }), '고객이 멈춘 중간 위치를 카드 끝점으로 자동 고정하지 않음');
  const revealedPage = await page.evaluate(() => ({
    gridTop: document.querySelector('#storeGrid')?.getBoundingClientRect().top ?? -1,
    scrollY: window.scrollY,
    status: document.querySelector('#storePagerStatus')?.textContent?.trim() || '',
    controlsDisplay: getComputedStyle(document.querySelector('#storePagerControls')).display
  }));
  await check(Promise.resolve(
    Math.abs(revealedPage.gridTop - beforeSwipe.gridTop) < 2
      && Math.abs(revealedPage.scrollY - beforeSwipe.scrollY) < 2
  ), '좌우 스와이프가 세로 화면 위치를 움직이지 않음', {beforeSwipe, revealedPage});
  await check(Promise.resolve(revealedPage.controlsDisplay === 'none'),
    '스와이프 전환 후에도 하단 화살표 영역이 나타나지 않음', revealedPage);
  await check(Promise.resolve(/^가게 3–4 \/ 전체 36곳$/.test(revealedPage.status)),
    '현재 표시 중인 가게 범위를 내부 상태로 정확히 갱신', revealedPage);
  await check(page.evaluate(() => window.daedongHasHomeInteraction?.() === true), '첫 목록 스와이프를 고객 상호작용으로 기록');

  const beforeRanking = await page.evaluate(() => ({
    left: document.querySelector('#storeGrid')?.scrollLeft || 0,
    previousVisible: !document.querySelector('#storePrevBtn')?.hidden,
    visibleCount: document.querySelectorAll('#storeGrid .store-card').length,
    gridTop: document.querySelector('#storeGrid')?.getBoundingClientRect().top ?? -1,
    promoTop: document.querySelector('.promo-section')?.getBoundingClientRect().top ?? -1,
    scrollY: window.scrollY
  }));
  await Promise.all([
    page.evaluate(() => window.daedongLocationRankingReady),
    page.evaluate(() => window.daedongStoreServiceInfo?.ready)
  ]);
  await page.waitForTimeout(250);
  const afterRanking = await page.evaluate(() => ({
    left: document.querySelector('#storeGrid')?.scrollLeft || 0,
    previousVisible: !document.querySelector('#storePrevBtn')?.hidden,
    visibleCount: document.querySelectorAll('#storeGrid .store-card').length,
    gridTop: document.querySelector('#storeGrid')?.getBoundingClientRect().top ?? -1,
    promoTop: document.querySelector('.promo-section')?.getBoundingClientRect().top ?? -1,
    scrollY: window.scrollY,
    viewportHeight: window.innerHeight,
    confirmedHoursText: document.querySelector('#storeGrid .store-card[data-id="pager-store-001"] [data-store-service-card-meta]')?.textContent?.replace(/\s+/g, ' ').trim() || '',
    introHidden: document.querySelector('#communityIntro')?.hidden,
    eventHidden: document.querySelector('#mukkebiSummerEvent')?.hidden
  }));
  await check(Promise.resolve(beforeRanking.left > 20 && afterRanking.left > 20 && afterRanking.previousVisible),
    '늦은 위치 정렬 뒤에도 스와이프한 다음 가게 페이지 상태 유지', {beforeRanking, afterRanking});
  await check(Promise.resolve(afterRanking.visibleCount >= beforeRanking.visibleCount),
    '늦은 위치 정렬이 표시 중인 가게 수를 첫 페이지로 줄이지 않음');
  const beforePromoGap = beforeRanking.promoTop - beforeRanking.gridTop;
  const afterPromoGap = afterRanking.promoTop - afterRanking.gridTop;
  await check(Promise.resolve(
    Math.abs(afterPromoGap - beforePromoGap) < 16
      && afterRanking.gridTop >= 0
      && afterRanking.gridTop < afterRanking.viewportHeight / 2
  ), '늦은 추천·영업시간 갱신 중 가게목록과 소식 배너 사이에 다른 화면이 끼어들지 않음', {beforeRanking, afterRanking});
  await check(Promise.resolve(
    afterRanking.confirmedHoursText.includes('영업시간 확인')
      && afterRanking.confirmedHoursText.includes('08:00–14:00, 15:00–19:00')
      && !afterRanking.confirmedHoursText.includes('시간 미확인')
  ), '요일별 구조가 없어도 수집된 요기요 영업시간을 가게 카드에 표시', {text: afterRanking.confirmedHoursText});
  await check(Promise.resolve(afterRanking.introHidden && afterRanking.eventHidden),
    '목록 사용 중 안내창과 행사창이 뒤늦게 끼어들지 않음');

  await page.screenshot({path: 'browser-store-list-interruption.png', fullPage: false});
  report.transitionMs = transitionMs;
  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  report.diagnostics = await page.evaluate(() => ({
    url: location.href,
    readyState: document.readyState,
    cards: document.querySelectorAll('#storeGrid .store-card').length,
    scrollLeft: document.querySelector('#storeGrid')?.scrollLeft || 0,
    nextHidden: document.querySelector('#loadMoreBtn')?.hidden,
    previousHidden: document.querySelector('#storePrevBtn')?.hidden,
    introHidden: document.querySelector('#communityIntro')?.hidden,
    eventHidden: document.querySelector('#mukkebiSummerEvent')?.hidden
  })).catch(diagnosticError => ({error: diagnosticError.message}));
  await page.screenshot({path: 'browser-store-list-interruption-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-store-list-interruption-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
