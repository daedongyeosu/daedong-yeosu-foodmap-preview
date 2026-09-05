import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const proxyApiOrigin = process.env.PERF_PROXY_API_ORIGIN || '';
const storeId = 'a089d1d54720b48e';
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
  sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1', '1');
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

// The display policy excludes quarantined/placeholder references, but never
// requires a new photo for an original which did not have one.
const usableSourcePhoto = value => {
  const clean = String(value || '').trim().split(/[?#]/, 1)[0].replace(/\\/g, '/');
  return Boolean(clean)
    && !/\/api\/media\/coupang-menu\/v1\/[a-f0-9]{64}\.jpg$/i.test(clean)
    && !/daedong-app-icon|placeholder|food-photo-preparing/i.test(clean);
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
  // Capture the real response already requested by the UI, including prefetch.
  const menuResponsePending = page.waitForResponse(response =>
    new URL(response.url()).pathname === `/api/store/${storeId}/menu`, {timeout: 30000});
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('#storeGrid .store-card', {timeout: 15000});
  await page.waitForFunction(() => typeof fxStoreById === 'function' && typeof openStore === 'function');
  await page.evaluate(() => openStore(fxStoreById('a089d1d54720b48e')));
  await page.waitForSelector('#modal:not([hidden]) .store-detail[data-store-id="a089d1d54720b48e"]', {timeout: 5000});
  await page.locator('[data-store-menu-preview="a089d1d54720b48e"]').click();
  await page.waitForSelector('.store-menu-preview', {timeout: 5000});
  const menuResponse = await menuResponsePending;
  await check(menuResponse.ok(), '실제 API 메뉴 응답을 사진 보존 대조의 원본으로 사용');
  const rawMenu = await menuResponse.json();
  const projection = await page.evaluate(menu => {
    const model = window.daedongMenuFamilies;
    if (!model?.project) throw new Error('메뉴 family 표시 모델을 찾을 수 없습니다.');
    const result = model.project(menu, {store: fxStoreById(menu.storeId)});
    return {
      families: result.items.map(item => ({id: String(item.id), sourceIds: item.__sourceIds, kind: item.__kind})),
      excluded: result.__audit.excluded
    };
  }, rawMenu);
  const rawItems = Array.isArray(rawMenu.items) ? rawMenu.items : [];
  const sourceIdsOf = item => [item.id, item.itemId, ...(item.__sourceIds || [])].filter(Boolean).map(String);
  const photoFamilies = projection.families.map(family => {
    const sources = rawItems.filter(item => sourceIdsOf(item).some(id => family.sourceIds.includes(id)));
    return {...family, sourceImages: [...new Set(sources.map(item => item.image).filter(usableSourcePhoto))]};
  });
  const coveredSourceIds = new Set(projection.families.flatMap(family => family.sourceIds));
  const excludedSourceIds = new Set(projection.excluded.flatMap(item => item.sourceIds || [item.id]));
  await check(rawItems.length > 0 && rawItems.every(item => sourceIdsOf(item).every(id =>
    coveredSourceIds.has(id) || excludedSourceIds.has(id))), '전체 원본 메뉴 ID가 family 또는 사유 있는 제외 기록에 보존');
  await check(rawItems.filter(item => usableSourcePhoto(item.image)).every(item =>
    sourceIdsOf(item).some(id => coveredSourceIds.has(id))), '사진 있는 원본 메뉴를 표시 family에서 누락하지 않음');
  report.sourceMenuCount = rawItems.length;
  report.familyCount = projection.families.length;
  await check(page.evaluate(() => history.state?.daedongMenuPreview === true), '음식 미리보기를 브라우저 뒤로가기 단계로 등록');
  await check(page.locator('.store-menu-hero > img').getAttribute('src').then(value => value === 'store-menu-content/a089d1d54720b48e/main.jpg'), '외계인피자 대표 음식사진 복원');
  const expectedMenuCount = await page.locator('[data-menu-result-count]').innerText().then(value => Number.parseInt(value, 10));
  report.expectedMenuCount = expectedMenuCount;
  await check(Number.isInteger(expectedMenuCount) && expectedMenuCount >= 53, '외계인피자 전체 메뉴 개수 안내');
  await check(expectedMenuCount === projection.families.length, '안내 개수가 원본 ID를 보존한 전체 family 수와 일치');
  const initialMenuCount = await page.locator('[data-menu-card]').count();
  report.initialMenuCount = initialMenuCount;
  await check(initialMenuCount > 0 && initialMenuCount <= expectedMenuCount, '첫 화면에 메뉴를 즉시 표시');
  const initialPhotoCards = await page.locator('[data-menu-card]').evaluateAll(nodes => nodes.map(node => ({
    id: node.dataset.menuId, hasPhoto: node.dataset.menuHasPhoto === 'true'
  })));
  await check(initialPhotoCards.every(card => card.hasPhoto === Boolean(photoFamilies.find(family =>
    family.id === card.id)?.sourceImages.length)), '첫 메뉴 묶음은 사진 있는 원본 family에 음식사진 표시');
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
  await check(page.locator('[data-menu-extras-toggle]').count().then(count => count === 0), '음료·주류·추가 메뉴를 숨기는 별도 펼침 버튼 없음');
  const revealedMenuCount = await revealAllMenuCards(expectedMenuCount);
  report.revealedMenuCount = revealedMenuCount;
  await check(revealedMenuCount === expectedMenuCount, '추가 펼침 없이 스크롤만으로 외계인피자 전체 family 표시');
  await check(page.locator('.is-compact-extra').count().then(count => count === 0), '음료·주류를 작은 별도 카드로 축소하지 않음');
  const renderedCards = await page.locator('[data-menu-card]').evaluateAll(nodes => nodes.map(node => {
    const image = node.querySelector('.store-menu-photo > img');
    const photo = node.querySelector('.store-menu-photo');
    return {id: node.dataset.menuId, hasPhoto: node.dataset.menuHasPhoto === 'true', textOnly: node.classList.contains('is-text-only'),
      image: image?.getAttribute('data-menu-image-src') || image?.getAttribute('src') || '',
      photoWidth: photo?.getBoundingClientRect().width || 0, photoHeight: photo?.getBoundingClientRect().height || 0,
      availableWidth: node.clientWidth, intrinsicWidth: image?.getAttribute('width'), intrinsicHeight: image?.getAttribute('height')};
  }));
  const renderedById = new Map(renderedCards.map(card => [card.id, card]));
  const missingPhotoFamilies = photoFamilies.filter(family => family.sourceImages.length
    && (!renderedById.get(family.id)?.hasPhoto || renderedById.get(family.id)?.textOnly));
  const ungroundedPhotos = renderedCards.filter(card => card.hasPhoto
    && !photoFamilies.find(family => family.id === card.id)?.sourceImages.includes(card.image));
  report.photoCoverage = {
    sourcePhotoCount: rawItems.filter(item => usableSourcePhoto(item.image)).length,
    expectedPhotoFamilyCount: photoFamilies.filter(family => family.sourceImages.length).length,
    renderedPhotoFamilyCount: renderedCards.filter(card => card.hasPhoto).length,
    textOnlyFamilyCount: renderedCards.filter(card => card.textOnly).length,
    missingPhotoFamilyIds: missingPhotoFamilies.map(family => family.id),
    ungroundedPhotoFamilyIds: ungroundedPhotos.map(card => card.id),
    ungroundedPhotos
  };
  await check(renderedById.size === expectedMenuCount && photoFamilies.every(family => renderedById.has(family.id)), '총 개수뿐 아니라 모든 family ID를 화면에 유지');
  await check(missingPhotoFamilies.length === 0, '사용 가능한 원본사진이 있는 모든 family를 사진카드로 유지');
  await check(ungroundedPhotos.length === 0, '사진카드는 해당 family의 실제 원본사진만 사용');
  await check(report.photoCoverage.renderedPhotoFamilyCount === report.photoCoverage.expectedPhotoFamilyCount,
    '사진 없는 원본 family에 임의 사진을 요구하거나 만들지 않음');
  const beveragePhotoCards = photoFamilies.filter(family => ['drink', 'alcohol'].includes(family.kind) && family.sourceImages.length)
    .map(family => renderedById.get(family.id));
  report.beveragePhotoCount = beveragePhotoCards.length;
  await check(beveragePhotoCards.length > 0 && beveragePhotoCards.every(card => card.hasPhoto
    && card.photoWidth >= card.availableWidth - 1 && card.photoWidth > 250 && card.photoHeight > 150
    && card.intrinsicWidth === '720' && card.intrinsicHeight === '546'), '음료·주류 원본사진을 음식과 같은 큰 전체 너비로 표시');
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
    const count = Number(document.querySelector('[data-menu-result-count]')?.textContent || 0);
    const names = [...document.querySelectorAll('[data-menu-card]:not([hidden]) h3')]
      .map(node => node.textContent || '');
    return count > 0 && names.length === count && names.every(name => name.includes('베지'));
  });
  const visibleSearchCards = page.locator('[data-menu-card]:visible');
  const firstSearchCard = visibleSearchCards.first();
  await check(visibleSearchCards.count().then(count => count > 0), '베지 검색 결과를 한 개 이상 표시');
  const searchResultName = String(await firstSearchCard.locator('h3').textContent()).trim();
  report.searchResultName = searchResultName;
  await check(searchResultName.includes('베지'), '검색 결과 메뉴를 즉시 확인');
  await check(page.locator('[data-menu-card]:visible mark').count().then(count => count > 0), '메뉴명에서 일치 검색어 강조');
  await check(firstSearchCard.boundingBox().then(box => Boolean(box && box.y < 500)), '키보드 위에서도 첫 검색 결과가 보이는 위치에 표시');
  await check(firstSearchCard.locator('.store-menu-card-action').evaluate(node => getComputedStyle(node).display !== 'none'), '검색 결과에 주문 연결 동작 표시');
  await check(page.locator('.store-menu-sticky-actions .primary').isDisabled(), '하단 가게바로주문 준비중 비활성화');
  await check(page.locator('.store-menu-sticky-actions .primary').getAttribute('href').then(value => value === null), '비활성 가게바로주문 이동주소 미노출');
  await firstSearchCard.click();
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
  await context.unrouteAll({behavior: 'ignoreErrors'});
  await browser.close();
}

if (!report.success) process.exit(1);
