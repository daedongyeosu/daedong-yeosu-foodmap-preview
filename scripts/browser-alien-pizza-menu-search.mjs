import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const proxyApiOrigin = process.env.PERF_PROXY_API_ORIGIN || '';
const report = {success: false, checks: [], errors: []};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH
    ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH}
    : {})
});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  locale: 'ko-KR'
});
if (proxyApiOrigin) {
  const localOrigin = new URL(baseURL).origin;
  await context.route(`${proxyApiOrigin}/api/**`, async route => {
    const response = await route.fetch({
      headers: {...route.request().headers(), origin: 'https://preview.daedongmap.com'}
    });
    await route.fulfill({
      response,
      headers: {...response.headers(), 'access-control-allow-origin': localOrigin}
    });
  });
}
await context.addInitScript(() => {
  sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV1', '1');
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

const revealAllMenuCards = async expectedCount => {
  const scroll = page.locator('.store-menu-scroll');
  const deadline = Date.now() + 7000;
  let renderedCount = 0;
  while (Date.now() < deadline) {
    renderedCount = await page.locator('[data-menu-card]').count();
    if (renderedCount >= expectedCount) return renderedCount;
    await scroll.evaluate(node => {
      node.scrollTop = node.scrollHeight - node.clientHeight;
    });
    await page.waitForTimeout(180);
  }
  return renderedCount;
};

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('#storeGrid .store-card', {timeout: 15000});
  await page.waitForFunction(() => typeof fxStoreById === 'function' && typeof openStore === 'function');
  await page.evaluate(() => openStore(fxStoreById('a089d1d54720b48e')));
  await page.waitForSelector('#modal:not([hidden]) .store-detail[data-store-id="a089d1d54720b48e"]', {timeout: 5000});
  await page.locator('[data-store-menu-preview="a089d1d54720b48e"]').click();
  await page.waitForSelector('.store-menu-preview', {timeout: 5000});
  await check(page.evaluate(() => history.state?.daedongMenuPreview === true), '음식 미리보기를 브라우저 뒤로가기 단계로 등록');
  await check(page.locator('.store-menu-hero > img').getAttribute('src').then(value => value === 'store-menu-content/a089d1d54720b48e/main.jpg'), '외계인피자 대표 음식사진 복원');
  const expectedMenuCount = await page.locator('[data-menu-result-count]').innerText().then(value => Number.parseInt(value, 10));
  report.expectedMenuCount = expectedMenuCount;
  await check(Number.isInteger(expectedMenuCount) && expectedMenuCount >= 53, '외계인피자 전체 메뉴 개수 안내');
  const initialMenuCount = await page.locator('[data-menu-card]').count();
  report.initialMenuCount = initialMenuCount;
  await check(initialMenuCount > 0 && initialMenuCount <= expectedMenuCount, '첫 화면에 메뉴를 즉시 표시');
  await check(page.locator('[data-menu-card][data-menu-has-photo="true"]').count().then(count => count === initialMenuCount), '첫 메뉴 묶음의 음식사진 복원');
  const mobileOrderDock = await page.locator('.store-menu-sticky-actions').evaluate(node => ({
    height: node.getBoundingClientRect().height,
    headerDisplay: getComputedStyle(node.querySelector('header')).display,
    navRows: getComputedStyle(node.querySelector('nav')).gridTemplateRows
  }));
  report.mobileOrderDock = mobileOrderDock;
  await check(
    mobileOrderDock.height <= 60 && mobileOrderDock.headerDisplay === 'none' && !String(mobileOrderDock.navRows).includes(' '),
    `휴대폰 하단 주문창을 버튼 한 줄로 표시: ${JSON.stringify(mobileOrderDock)}`
  );

  const preview = page.locator('.store-menu-preview');
  const scroll = page.locator('.store-menu-scroll');
  const search = page.locator('[data-menu-search]');
  await scroll.evaluate(node => { node.scrollTop = 900; });
  await page.waitForTimeout(1350);
  await check(
    preview.evaluate(node => node.classList.contains('menu-chrome-hidden')),
    '아래로 메뉴를 읽고 멈춰도 주문창이 메뉴사진을 다시 가리지 않음'
  );
  await scroll.evaluate(node => { node.scrollTop = 600; });
  await page.waitForTimeout(120);
  await check(
    preview.evaluate(node => !node.classList.contains('menu-chrome-hidden')),
    '위로 이동하면 주문창을 다시 표시'
  );
  await scroll.evaluate(node => { node.scrollTop = 0; });
  const revealedMenuCount = await revealAllMenuCards(expectedMenuCount);
  report.revealedMenuCount = revealedMenuCount;
  await check(revealedMenuCount === expectedMenuCount, '스크롤하면 외계인피자 전체 메뉴 복원');
  await check(page.locator('[data-menu-card][data-menu-has-photo="true"]').count().then(count => count === expectedMenuCount), '외계인피자 전체 메뉴 음식사진 복원');
  await check(page.locator('[data-menu-card].is-text-only').count().then(count => count === 0), '사진이 저장된 메뉴를 글자 카드로 대체하지 않음');
  const maxScroll = await scroll.evaluate(node => {
    node.scrollTop = node.scrollHeight - node.clientHeight;
    return node.scrollTop;
  });
  await page.waitForTimeout(600);

  await search.focus();
  await page.waitForFunction(() => document.querySelector('.store-menu-scroll')?.scrollTop === 0);
  await check(preview.evaluate(node => node.classList.contains('menu-search-active')), '검색 포커스 시 전용 검색 모드 진입');
  await check(scroll.evaluate(node => node.scrollTop === 0), '검색 모드 진입 시 결과 시작 위치로 이동');
  await check(page.locator('.store-menu-hero').evaluate(node => getComputedStyle(node).display === 'none'), '검색 중 가게 소개 영역 숨김');
  await check(page.locator('.store-menu-tools nav').evaluate(node => getComputedStyle(node).display === 'none'), '검색 중 카테고리 버튼 숨김');
  await check(page.locator('.store-menu-sticky-actions').evaluate(node => getComputedStyle(node).pointerEvents === 'none'), '검색 중 주문 버튼이 결과를 가리지 않음');

  await search.fill('베지');
  await page.waitForFunction(() => {
    const count = document.querySelector('[data-menu-result-count]')?.textContent;
    const name = document.querySelector('[data-menu-card]:not([hidden]) h3')?.textContent || '';
    return count === '1' && name.includes('베지');
  });
  await check(page.locator('[data-menu-card]:visible').count().then(count => count === 1), '베지 검색 결과 한 개만 표시');
  const searchResultName = String(await page.locator('[data-menu-card]:visible h3').textContent()).trim();
  report.searchResultName = searchResultName;
  await check(searchResultName.includes('베지'), '검색 결과 메뉴를 즉시 확인');
  await check(page.locator('[data-menu-card]:visible mark').count().then(count => count > 0), '메뉴명에서 일치 검색어 강조');
  await check(page.locator('[data-menu-card]:visible').boundingBox().then(box => Boolean(box && box.y < 500)), '키보드 위에서도 첫 검색 결과가 보이는 위치에 표시');
  await check(page.locator('[data-menu-card]:visible .store-menu-card-action').evaluate(node => getComputedStyle(node).display !== 'none'), '검색 결과에 주문 연결 동작 표시');
  await check(page.locator('.store-menu-sticky-actions .primary').isDisabled(), '하단 가게바로주문 준비중 비활성화');
  await check(page.locator('.store-menu-sticky-actions .primary').getAttribute('href').then(value => value === null), '비활성 가게바로주문 이동주소 미노출');
  await page.locator('[data-menu-card]:visible').click();
  await check(page.locator('[data-menu-order-sheet]').evaluate(node => !node.hidden), '검색 결과 메뉴 터치 시 주문방법 선택창 열림');
  await check(page.locator('[data-selected-menu-name]').innerText().then(value => value === searchResultName), '선택한 메뉴명을 주문방법 선택창에 유지');
  await check(page.locator('[data-selected-menu-image]').getAttribute('src').then(value => Boolean(value)), '선택한 메뉴 사진을 주문방법 선택창에 유지');
  await check(page.locator('[data-menu-order-sheet] .menu-order-more-tip').innerText().then(value => value.includes('다른 메뉴도 함께 주문할 수 있어요')), '주문앱에서 다른 메뉴도 추가할 수 있음을 안내');
  await check(page.locator('[data-menu-order-sheet] [data-menu-order="direct"]').isDisabled(), '주문방법 선택창 가게바로주문 준비중 비활성화');
  await check(page.locator('[data-menu-order-sheet] [data-menu-order="direct"]').innerText().then(value => value.includes('준비중')), '주문방법 선택창 준비중 표시');
  await check(page.locator('[data-menu-order-sheet] [data-menu-order="direct"] .menu-order-icon svg path').count().then(count => count === 2), '가게바로주문 아이콘을 외부 파일 없이 표시');
  await check(page.locator('[data-menu-order-sheet] [data-menu-order="phone"]').getAttribute('href').then(value => String(value).startsWith('tel:')), '전화주문 링크 제공');
  await check(page.locator('[data-menu-order-sheet] [data-menu-order="phone"] .menu-order-icon svg circle').count().then(count => count === 1), '전화주문 아이콘을 주문방법 선택창에 표시');
  await check(page.locator('.store-menu-sticky-actions .phone svg circle').count().then(count => count === 1), '전화주문 아이콘을 하단 고정 버튼에 표시');
  await check(page.evaluate(() => history.state?.daedongMenuOrder === true), '주문방법 선택창을 브라우저 뒤로가기 단계로 등록');
  await check(search.evaluate(node => document.activeElement !== node), '메뉴 선택 시 검색 키보드 닫힘');

  const otherToggle = page.locator('[data-menu-order-sheet] [data-menu-other-toggle]');
  await otherToggle.click();
  await page.waitForTimeout(350);
  await check(otherToggle.getAttribute('aria-expanded').then(value => value === 'true'), '다른 주문앱 버튼의 펼침 상태 표시');
  await check(page.locator('[data-menu-order-sheet] [data-menu-other-list]').isVisible(), '다른 주문앱 목록을 즉시 표시');
  await check(page.locator('[data-menu-order-sheet] [data-menu-other-list] a').count().then(count => count === 3), '등록된 다른 주문앱 3개 표시');
  await check(page.locator('[data-menu-order-sheet] [data-menu-other-list]').boundingBox().then(box => Boolean(box && box.y >= 0 && box.y < 700)), '펼친 다른 주문앱을 현재 화면 안으로 이동');
  await page.screenshot({path: 'browser-alien-pizza-menu-search.png', fullPage: false});

  await page.evaluate(() => history.back());
  await page.waitForFunction(() => document.querySelector('[data-menu-order-sheet]')?.hidden === true);
  await check(page.locator('[data-menu-order-sheet]').evaluate(node => node.hidden), '주문방법 선택창 닫기');
  await check(page.locator('.store-menu-preview').isVisible(), '휴대폰 뒤로가기 후 음식 미리보기 유지');
  await check(page.locator('#modal:not([hidden]) .store-detail[data-store-id="a089d1d54720b48e"]').isVisible(), '휴대폰 뒤로가기 후 대동여수음식지도 가게화면 유지');
  await check(preview.evaluate(node => node.classList.contains('menu-search-active')), '주문방법 선택창을 닫아도 검색 결과 유지');

  await page.locator('[data-menu-search-clear]').click();
  await check(page.locator('[data-menu-result-count]').innerText().then(value => Number.parseInt(value, 10) === expectedMenuCount), '검색어 지우기 시 전체 메뉴 개수 복원');
  await check(preview.evaluate(node => node.classList.contains('menu-search-active')), '검색어를 지워도 검색 모드 유지');
  await page.waitForTimeout(500);

  await page.locator('[data-menu-search-cancel]').click();
  await page.waitForFunction(() => !document.querySelector('.store-menu-preview')?.classList.contains('menu-search-active'), null, {timeout: 5000});
  await page.waitForFunction(() => history.state?.daedongMenuSearch !== true, null, {timeout: 5000});
  await page.waitForFunction(expected => {
    const grid = document.querySelector('[data-menu-grid]');
    return document.querySelectorAll('[data-menu-card]').length === expected
      && grid?.getAttribute('aria-busy') === 'false';
  }, expectedMenuCount, {timeout: 7000});
  await page.waitForFunction(target => {
    const node = document.querySelector('.store-menu-scroll');
    if (!node) return false;
    const effectiveTarget = Math.min(target, Math.max(0, node.scrollHeight - node.clientHeight));
    return node.scrollTop > 0 && Math.abs(node.scrollTop - effectiveTarget) <= Math.max(24, node.clientHeight * 1.25);
  }, maxScroll, {timeout: 3000});
  const restoredScroll = await scroll.evaluate(node => ({
    top: node.scrollTop,
    max: Math.max(0, node.scrollHeight - node.clientHeight),
    clientHeight: node.clientHeight
  }));
  const effectiveReturn = Math.min(maxScroll, restoredScroll.max);
  const restoreTolerance = Math.max(24, restoredScroll.clientHeight * 1.25);
  report.scrollRestore = {requested: maxScroll, effectiveReturn, tolerance: restoreTolerance, ...restoredScroll};
  await check(restoredScroll.top > 0 && Math.abs(restoredScroll.top - effectiveReturn) <= restoreTolerance, '검색 취소 시 이전 메뉴 위치 복귀');
  await check(page.locator('[data-menu-result-count]').innerText().then(value => Number.parseInt(value, 10) === expectedMenuCount), '검색 취소 후 전체 분류 상태 복원');
  await check((await revealAllMenuCards(expectedMenuCount)) === expectedMenuCount, '검색 취소 후 스크롤하면 전체 메뉴 복원');
  await page.waitForFunction(() => {
    const node = document.querySelector('.store-menu-sticky-actions');
    return node && getComputedStyle(node).pointerEvents !== 'none';
  }, null, {timeout: 3000});
  await check(page.locator('.store-menu-sticky-actions').evaluate(node => getComputedStyle(node).pointerEvents !== 'none'), '검색 취소 후 주문 버튼 복원');

  report.historyBeforePreviewBack = await page.evaluate(() => ({
    state: history.state,
    modalHidden: document.querySelector('#modal')?.hidden,
    menuHidden: document.querySelector('[data-store-menu-overlay]')?.hidden
  }));
  await page.evaluate(() => history.back());
  await page.waitForFunction(() => document.querySelector('[data-store-menu-overlay]')?.hidden === true);
  report.historyAfterPreviewBack = await page.evaluate(() => ({
    state: history.state,
    modalHidden: document.querySelector('#modal')?.hidden,
    detailVisible: Boolean(document.querySelector('#modal:not([hidden]) .store-detail[data-store-id="a089d1d54720b48e"]'))
  }));
  await check(page.locator('#modal:not([hidden]) .store-detail[data-store-id="a089d1d54720b48e"]').isVisible(), '음식 미리보기에서 뒤로가기 시 가게화면으로 복귀');

  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  await page.screenshot({path: 'browser-alien-pizza-menu-search-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-alien-pizza-menu-search-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
