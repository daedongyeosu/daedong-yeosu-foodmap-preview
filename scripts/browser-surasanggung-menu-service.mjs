import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const storeId = '7bc7239e6b509c44';
const onnuriStoreId = 'dc42166bad88a929';
const freeDeliveryStoreId = '11442d3b3328f951';
const report = {success: false, checks: [], errors: []};
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  locale: 'ko-KR',
  timezoneId: 'Asia/Seoul'
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

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('#storeGrid .store-card', {timeout: 15000});
  await page.waitForFunction(() => (
    typeof fxStoreById === 'function'
    && typeof openStore === 'function'
    && window.daedongStoreServiceInfo
  ));
  await page.evaluate(() => window.daedongStoreServiceInfo.ready);
  await check(
    page.locator('[data-store-service-search-open]').isVisible(),
    '검색영역에 영업시간·결제혜택 찾기 진입버튼 표시'
  );
  await check(
    page.evaluate(() => {
      const searchRowNode = document.querySelector('.main-search-row');
      const serviceEntryNode = document.querySelector('.store-service-search-entry');
      const searchRow = searchRowNode?.getBoundingClientRect();
      const serviceEntry = serviceEntryNode?.getBoundingClientRect();
      const searchRowStyle = searchRowNode ? getComputedStyle(searchRowNode) : null;
      const contentLeft = searchRow
        ? searchRow.left + Number.parseFloat(searchRowStyle?.paddingLeft || '0')
        : 0;
      const contentRight = searchRow
        ? searchRow.right - Number.parseFloat(searchRowStyle?.paddingRight || '0')
        : 0;
      return Boolean(
        searchRow
        && serviceEntry
        && Math.abs(contentLeft - serviceEntry.left) <= 1
        && Math.abs(contentRight - serviceEntry.right) <= 1
      );
    }),
    '영업시간·결제혜택 찾기 버튼을 기존 검색영역 세로선에 맞춤'
  );
  await check(
    page.locator('#storeGrid .store-card [data-store-service-card-meta]').count().then(count => count > 0),
    '일반 가게카드에 영업시간·결제혜택 상태 표시'
  );
  await check(
    page.locator('#storeGrid .store-card [data-store-service-card-meta] .store-service-card-unknown').count().then(count => count > 0),
    '미등록 혜택을 사용불가가 아닌 미확인으로 표시'
  );

  await page.evaluate(() => {
    const search = document.querySelector('#mainSearch');
    if (search) search.value = '수라상궁';
    state.query = '수라상궁';
    state.category = '전체';
    state.brandId = '';
    renderStores({resetCount: true});
  });
  await page.waitForSelector(`#storeGrid .store-card[data-id="${storeId}"]`);
  await check(
    page.locator(`#storeGrid .store-card[data-id="${storeId}"] [data-store-service-card-meta]`).count().then(count => count === 1),
    '가게목록에 영업·결제 배지 표시'
  );
  await check(
    page.locator(`#storeGrid .store-card[data-id="${storeId}"] [data-store-service-card-meta]`).innerText().then(value => value.includes('여수섬섬페이')),
    '가게목록에 여수섬섬페이 확인 표시'
  );

  await page.evaluate(id => openStore(fxStoreById(id)), storeId);
  await page.waitForSelector(`#modal:not([hidden]) .store-detail[data-store-id="${storeId}"]`);
  await check(
    page.locator(`#modal .store-detail[data-store-id="${storeId}"] [data-store-service-detail]`).isVisible(),
    '가게 상세카드에 영업시간·상품권·무료배달 정보 표시'
  );
  await check(
    page.locator(`#modal .store-detail[data-store-id="${storeId}"] [data-store-service-detail]`).innerText()
      .then(value => (
        value.includes('월–토 11:00–다음 날 01:00')
        && value.includes('여수섬섬페이 사용 가능')
        && !value.includes('사용 불가')
        && !value.includes('없음 확인')
        && !value.includes('미확인')
      )),
    '가게 상세카드에는 이용 가능한 혜택만 표시'
  );
  await check(
    page.evaluate(id => {
      const detail = document.querySelector(`#modal .store-detail[data-store-id="${id}"]`);
      const metaRow = detail?.querySelector('.store-detail-meta-row');
      const naver = metaRow?.querySelector('[data-detail-only="naver"]');
      const topStatus = detail?.querySelector('[data-store-service-top-status]');
      const menuEntry = detail?.querySelector('[data-store-menu-preview]');
      const routes = detail?.querySelector('.local-detail-routes');
      const servicePanel = detail?.querySelector('[data-store-service-detail]');
      const giftApp = servicePanel?.querySelector('[data-detail-only="chak"]');
      const actions = detail?.querySelector('.detail-personal-actions');
      const order = [metaRow, topStatus, menuEntry, routes, servicePanel, actions];
      return Boolean(naver && giftApp) && order.every(Boolean) && order.every((node, index) => (
        index === 0 || Boolean(order[index - 1].compareDocumentPosition(node) & Node.DOCUMENT_POSITION_FOLLOWING)
      ));
    }, storeId),
    '기본정보·지도 → 영업상태 → 음식보기 → 주문방법 → 영업·혜택·지역상품권앱 → 하단기능 순서 유지'
  );
  await check(
    page.locator(`[data-store-menu-preview="${storeId}"] strong`).innerText().then(value => value.trim() === '46개 ›'),
    '수라상궁 음식보기 46개 표시'
  );
  await page.locator(`[data-store-menu-preview="${storeId}"]`).click();
  await page.waitForSelector('.store-menu-preview', {timeout: 5000});
  await check(page.locator('#storeMenuTitle').innerText().then(value => value.trim() === '수라상궁 조선국밥'), '수라상궁 음식보기 열림');
  await check(page.locator('.store-menu-order').count().then(count => count === 0), '메뉴 목록 끝의 중복 주문방법 영역을 표시하지 않음');
  await check(page.locator('[data-menu-card]').count().then(count => count === 46), '정리된 고유 메뉴 46개 로드');
  await check(
    page.locator('[data-menu-category]').allInnerTexts().then(values => values.join('|') === '전체|세트·정식|국밥·탕|수육|만두·딤섬|곁들임|음료|주류'),
    '수라상궁 전용 메뉴 분류 표시'
  );
  await check(
    page.locator('.store-menu-photo-placeholder').count().then(count => count === 0)
      .then(first => first && page.locator('[data-menu-card][data-menu-has-photo="false"]').count().then(count => count === 8))
      .then(first => first && page.locator('[data-menu-card][data-menu-has-photo="false"] .store-menu-photo').count().then(count => count === 0)),
    '사진 없는 메뉴는 빈 사진칸 없이 설명 카드로 표시'
  );
  await check(
    page.locator('[data-menu-card][data-menu-has-photo="false"]').allInnerTexts()
      .then(values => values.every(value => !value.includes('사진 미제공'))),
    '사진 없는 메뉴에 사진 미제공 문구를 노출하지 않음'
  );
  await check(
    page.locator('.store-menu-photo-disclaimer').innerText().then(value => value.includes('실제 조리된 음식과 다를 수 있습니다')),
    '실제 음식과 다를 수 있다는 안내 표시'
  );
  await check(
    page.locator('[data-store-service-menu-summary]').count().then(count => count === 0),
    '음식보기 안에는 영업시간·결제혜택 정보를 넣지 않음'
  );
  await check(
    page.locator('[data-menu-sticky-order] > b').allInnerTexts().then(values => (
      values.join('|') === '가게바로주문|먹깨비|땡겨요|전화주문'
    )),
    '음식보기 하단에는 주요 주문방법을 먼저 표시'
  );
  await check(
    page.locator('[data-menu-sticky-other-toggle]').isVisible(),
    '외부 주문앱은 다른 주문앱 버튼으로 묶어 표시'
  );
  await check(
    page.locator('[data-menu-sticky-external]').count().then(count => count === 2)
      .then(first => first && page.locator('[data-menu-sticky-other-list]').evaluate(node => node.hidden)),
    '등록된 외부 주문앱을 처음에는 숨김'
  );
  await check(
    page.locator('[data-menu-sticky-order="direct"]').getAttribute('href')
      .then(value => value === 'https://app.notion.com/p/398da158dd2a80b6ba32fa75d2f4c137'),
    '음식보기 하단 가게바로주문 링크 유지'
  );
  await check(
    page.locator('[data-menu-sticky-order="phone"]').getAttribute('href')
      .then(value => value === 'tel:0616543511'),
    '음식보기 하단 전화주문 번호 유지'
  );
  await page.locator('[data-menu-sticky-other-toggle]').click();
  await check(
    page.locator('[data-menu-sticky-other-list]').evaluate(node => !node.hidden),
    '다른 주문앱 버튼을 누르면 외부 주문앱을 펼침'
  );
  await check(
    page.locator('[data-menu-sticky-external] > b').allInnerTexts().then(values => (
      values.join('|') === '쿠팡이츠|배달의민족'
    )),
    '다른 주문앱 안에 실제 등록된 외부 주문앱만 표시'
  );

  const menuSearch = page.locator('[data-menu-search]');
  await menuSearch.focus();
  await menuSearch.fill('갈비찜');
  await check(page.locator('[data-menu-card]:visible').count().then(count => count === 1), '메뉴 검색 결과 한 개 표시');
  await page.locator('[data-menu-card]:visible').click();
  await check(page.locator('[data-menu-order-sheet]').evaluate(node => !node.hidden), '검색 메뉴 터치 시 주문방법 선택창 열림');
  await check(page.locator('[data-menu-order-sheet] [data-selected-menu-image]').isHidden(), '사진 미제공 메뉴에 빈 이미지 노출 없음');
  await check(
    page.locator('[data-menu-order-sheet] [data-menu-order="direct"]').getAttribute('href')
      .then(value => value === 'https://app.notion.com/p/398da158dd2a80b6ba32fa75d2f4c137'),
    '기존 가게바로주문 링크 유지'
  );
  await check(
    page.locator('[data-menu-order-sheet] [data-menu-order="phone"]').getAttribute('href')
      .then(value => value === 'tel:0616543511'),
    '기존 전화주문 번호 유지'
  );
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('[data-menu-order-sheet]')?.hidden === true);
  await page.goBack();
  await page.waitForFunction(() => !document.querySelector('.store-menu-preview')?.classList.contains('menu-search-active'));
  await page.goBack();
  await page.waitForFunction(() => document.querySelector('[data-store-menu-overlay]')?.hidden === true);
  await check(
    page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${storeId}"]`).isVisible(),
    '음식보기 뒤로가기 후 수라상궁 가게화면 유지'
  );

  await page.locator('#modal .modal-close').click();
  await page.locator('[data-store-service-search-open]').click();
  await check(page.locator('.store-service-overview').isVisible(), '영업시간·결제혜택 찾기 화면 열림');
  await check(
    page.locator('[data-store-service-location-mode="nearby"].active').isVisible(),
    '기본값을 내 위치 가까운 동네순으로 표시'
  );
  await check(
    page.locator('[data-store-service-location-mode="selected"]').isVisible()
      .then(first => first && page.locator('[data-store-service-location-mode="all"]').isVisible()),
    '동네만 보기와 여수 전체 범위 제공'
  );
  await page.locator('[data-store-service-location-mode="all"]').click();
  const publicStoreCount = await page.evaluate(() => stores.length);
  await check(
    page.locator('[data-store-service-store-id]').count().then(count => (
      count === publicStoreCount && publicStoreCount > 650
    )),
    '현재 공개된 여수 전체 가게를 기존 가게순서로 표시'
  );
  await check(
    page.locator('[data-store-service-status="all"] small').count().then(count => count === 0)
      .then(first => first && page.locator('.store-service-overview-result b').innerText().then(value => value.trim() === '전체 가게')),
    '전체 가게 수를 고객 화면에 표시하지 않음'
  );
  await check(
    page.locator('[data-store-service-status="open"] small').innerText().then(value => /^\d+$/.test(value.trim())),
    '지금 영업 중 가게 수는 그대로 표시'
  );
  await check(
    page.locator('.store-service-status.is-unknown').count().then(count => count > 0),
    '시간 미등록 가게를 회색 미확인으로 표시'
  );
  await check(
    page.locator(`[data-store-service-store-id="${storeId}"]`).innerText().then(value => value.includes('수라상궁') && value.includes('여수섬섬페이')),
    '확인된 가게를 영업상태·혜택과 함께 표시'
  );
  await page.locator('[data-store-service-benefit="onnuri-gift-certificate"]').click();
  await check(
    page.locator(`[data-store-service-store-id="${onnuriStoreId}"]`).isVisible(),
    '온누리상품권 확인 업장만 필터로 표시'
  );
  await page.locator('[data-store-service-benefit="free-delivery"]').click();
  await check(
    page.locator(`[data-store-service-store-id="${freeDeliveryStoreId}"]`).innerText()
      .then(value => value.includes('무료배달 가능')),
    '무료배달 확인 업장을 초록 배지와 필터로 표시'
  );
  await check(
    page.locator(`[data-store-service-store-id="${freeDeliveryStoreId}"] .is-delivery`).isVisible(),
    '무료배달을 결제상품권과 구분한 색상으로 표시'
  );
  await page.locator('[data-store-service-benefit="yeosu-seomseom-pay"]').click();
  await check(
    page.locator(`[data-store-service-store-id="${storeId}"]`).isVisible(),
    '여수섬섬페이 가능 가게만 골라 표시'
  );
  await page.locator('[data-store-service-status="open"]').click();
  await check(
    page.locator('[data-store-service-status="open"].active').isVisible(),
    '영업상태와 결제혜택 필터를 함께 적용'
  );
  await check(
    page.evaluate(id => window.daedongStoreServiceInfo.status(id, new Date('2026-08-01T15:30:00.000Z')).state, storeId)
      .then(value => value === 'closing-soon'),
    '마감 60분 이내를 곧 영업 종료로 계산'
  );
  await check(
    page.evaluate(() => window.daedongStoreServiceInfo.status('unverified-store').state)
      .then(value => value === 'unknown'),
    '영업시간 미등록 가게를 미확인으로 계산'
  );
  await page.screenshot({path: 'browser-surasanggung-menu-service.png', fullPage: false});

  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  await page.screenshot({path: 'browser-surasanggung-menu-service-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-surasanggung-menu-service-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

if (!report.success) process.exit(1);
