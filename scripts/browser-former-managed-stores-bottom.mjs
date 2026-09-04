import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const targetIds = ['361f855efc21c1c2', 'b8267998349b16e1', '14feb7cbd67ef7e2'];
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  locale: 'ko-KR',
  geolocation: {latitude: 34.7475, longitude: 127.7005},
  permissions: ['geolocation'],
  serviceWorkers: 'block'
});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1', '1');
});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('https://daedong-yeosu-data-api-preview.sisakim.workers.dev/api/**', async route => {
  const response = await fetch(route.request().url(), {
    headers: {
      Accept: 'application/json',
      Origin: 'https://preview.daedongmap.com',
      'X-Daedong-Client': 'daedong-preview-web-v1-20260804'
    }
  });
  await route.fulfill({
    status: response.status,
    headers: {'content-type': response.headers.get('content-type') || 'application/json'},
    body: Buffer.from(await response.arrayBuffer())
  });
});
await context.route('**/*.woff2', route => route.abort());
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(ids => typeof rc6OwnershipTier === 'function'
    && ids.every(id => stores.some(store => String(store.id) === id && store.deprioritized === true)), targetIds, {timeout: 25000});

  const result = await page.evaluate(ids => {
    const targets = ids.map(id => stores.find(store => String(store.id) === id));
    const names = Object.fromEntries(targets.map(store => [String(store.id), store.name]));
    const categoryChecks = {};
    for (const category of ['전체', '치킨', '피자']) {
      state.query = '';
      state.brandId = '';
      state.category = category;
      state.location = REGION_DEFAULT_AREA;
      state.sortByDistance = false;
      const ranked = filteredStores();
      categoryChecks[category] = ids.filter(id => ranked.some(store => String(store.id) === id)).map(id => {
        const targetIndex = ranked.findIndex(store => String(store.id) === id);
        const status = storeBusinessStatusPriority(ranked[targetIndex]);
        const lastOrdinaryIndex = ranked.reduce((last, store, index) => (
          !store.deprioritized && storeBusinessStatusPriority(store) === status ? index : last
        ), -1);
        return {id, name: names[id], targetIndex, lastOrdinaryIndex, behindOrdinarySameStatus: targetIndex > lastOrdinaryIndex};
      });
    }
    const nearby = fxRankStores({id: 'near', kind: 'near', title: '가까운 가게', desc: ''});
    const nearbyChecks = ids.map(id => {
      const targetIndex = nearby.findIndex(store => String(store.id) === id);
      const status = targetIndex >= 0 ? storeBusinessStatusPriority(nearby[targetIndex]) : -1;
      const lastOrdinaryIndex = nearby.reduce((last, store, index) => (
        !store.deprioritized && storeBusinessStatusPriority(store) === status ? index : last
      ), -1);
      return {id, name: names[id], targetIndex, lastOrdinaryIndex, excludedFromPriority: targetIndex < 0, behindOrdinarySameStatus: targetIndex < 0 || targetIndex > lastOrdinaryIndex};
    });
    const heroTargetIds = [...document.querySelectorAll('[data-rc6-banner-store]')]
      .map(node => node.getAttribute('data-rc6-banner-store'));
    return {
      viewport: {width: innerWidth, height: innerHeight},
      targets: targets.map(store => ({id: store.id, name: store.name, managed: store.managed, deprioritized: store.deprioritized, tier: rc6OwnershipTier(store)})),
      categoryChecks,
      nearbyChecks,
      heroTargetIds,
      targetInHero: heroTargetIds.filter(id => ids.includes(id))
    };
  }, targetIds);

  const checks = [
    [result.viewport.width === 390 && result.viewport.height === 844, '390×844 모바일 화면'],
    [result.targets.every(store => store.managed === false && store.deprioritized === true && store.tier === 3), '세 가게를 후순위 3단계로 지정'],
    [Object.values(result.categoryChecks).flat().every(row => row.behindOrdinarySameStatus), '전체·치킨·피자 목록에서 일반 가게 뒤에 배치'],
    [result.nearbyChecks.every(row => row.behindOrdinarySameStatus), '가까운 가게 우선추천에서 제외하거나 일반 가게 뒤에 배치'],
    [result.targetInHero.length === 0, '메인 가게배너에서 세 가게 제외'],
    [errors.length === 0, '브라우저 실행 오류 없음']
  ].map(([ok, message]) => ({ok, message}));
  const output = {success: checks.every(check => check.ok), checks, result, errors};
  console.log(JSON.stringify(output, null, 2));
  if (!output.success) process.exitCode = 1;
} finally {
  await browser.close();
}
