import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

async function loadChromium() {
  try {
    return (await import('playwright')).chromium;
  } catch {}
  const moduleRoot = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (!moduleRoot) throw new Error('playwright 패키지를 찾을 수 없습니다.');
  return (await import(pathToFileURL(path.join(moduleRoot, 'playwright', 'index.mjs')).href)).chromium;
}

const chromium = await loadChromium();
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8765/';
const output = process.env.OUTPUT_DIR || '.';
fs.mkdirSync(output, { recursive: true });
const manifest = JSON.parse(fs.readFileSync(new URL('../data/store-campaign-links.json', import.meta.url), 'utf8'));
const heroData = JSON.parse(fs.readFileSync(new URL('../data/hero-campaigns.json', import.meta.url), 'utf8'));
const dataApiSource = fs.readFileSync(new URL('../data-api.js', import.meta.url), 'utf8');
const tamnaneunHiddenStoreIds = ['2da10529e7fb987c', '421ecef35a879687'];
const bannerTargets = JSON.parse(fs.readFileSync(new URL('../data/banner-targets.json', import.meta.url), 'utf8'));
const expectedFood14Plus3Ads = ['18', '19', '20'].map((key, index) => ({
  index: [4, 9, 14][index], url: bannerTargets[key].notionUrl, image: bannerTargets[key].image,
}));
const campaignDefinitions = [...manifest.campaigns];
for (const campaign of Object.values(heroData.campaigns)) {
  for (const slide of campaign.slides || []) {
    if (!campaignDefinitions.some((entry) => entry.storeId === slide.storeId)) {
      campaignDefinitions.push({ storeId: slide.storeId, name: slide.title });
    }
  }
}
// Keep Tamnaneun's canonical ID absent from the fixture: its preserved
// campaign virtual-store fallback must not recreate a customer-hidden store.
const routeKeysByStoreId = new Map([
  ['67a9e4f14c8c7ea4', ['direct', 'mukkebi', 'ddangyo', 'phone', 'yogiyo', 'baemin', 'coupang']],
  ['068b2ae8fe32874a', ['direct', 'mukkebi', 'ddangyo', 'phone', 'yogiyo', 'baemin', 'coupang']],
  ['0abd7147b7d6b1dd', ['direct', 'mukkebi', 'ddangyo', 'phone', 'yogiyo', 'baemin', 'coupang', 'brand']],
  ['f8a71a5a2344ee7f', ['direct', 'mukkebi', 'ddangyo', 'phone', 'yogiyo', 'baemin', 'coupang']],
  ['fb798d3119a28415', ['direct', 'mukkebi', 'ddangyo', 'phone', 'yogiyo', 'baemin', 'coupang']],
  ['a089d1d54720b48e', ['direct', 'mukkebi', 'ddangyo', 'phone', 'yogiyo', 'baemin', 'coupang']],
  ['aa0a00258c22f377', ['direct', 'mukkebi', 'ddangyo', 'phone', 'yogiyo', 'baemin', 'coupang']],
  ['cfde2617224f33a0', ['direct', 'mukkebi', 'ddangyo', 'phone']],
  ['1d691d8e74499d31', ['mukkebi', 'ddangyo']],
  ['2017de4f9111f3ce', ['mukkebi', 'ddangyo']],
  ['93ae27237a8e75c4', ['mukkebi', 'ddangyo', 'coupang']],
  ['3f441930b8d18783', ['direct', 'mukkebi', 'phone', 'baemin', 'coupang']],
  ['f3cb61dd45ba9b8b', ['direct', 'mukkebi', 'phone']],
  ['665953a0453afc52', ['direct', 'mukkebi', 'ddangyo', 'phone', 'yogiyo']],
  ['7ed65c8f086f11f2', ['direct', 'mukkebi', 'phone']],
]);
const routeLabels = Object.freeze({
  direct: '가게바로주문', mukkebi: '먹깨비', ddangyo: '땡겨요', phone: '전화주문',
  yogiyo: '요기요', baemin: '배달의민족', coupang: '쿠팡이츠', brand: '브랜드앱',
});
const fixtureRoute = key => ({
  name: routeLabels[key],
  key,
  url: key === 'phone' ? 'tel:0610000000' : `https://${key}.example/store`,
  enabled: true,
});
const stores = campaignDefinitions.filter(entry => entry.storeId !== '421ecef35a879687').map((entry, index) => {
  const channelKeys = routeKeysByStoreId.get(entry.storeId) || ['phone'];
  return {
    store_id: entry.storeId,
    id: entry.storeId,
    name: entry.name,
    district: '여수시',
    area: '여수시',
    category: '음식점',
    cat: '음식점',
    categories: ['음식점'],
    rawIndex: index,
    hasMenu: false,
    channelKeys,
    routes: channelKeys.map(fixtureRoute),
  };
});
const storeById = Object.fromEntries(stores.map((store) => [store.id, store]));
const transparentPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAEAQH/2TBKAAAAAElFTkSuQmCC', 'base64');
const report = { success: false, viewport: { width: 390, height: 844 }, stores: [], errors: [] };
let activePage;

const browser = await chromium.launch({
  headless: true,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? { executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH } : {}),
});
const context = await browser.newContext({
  viewport: report.viewport,
  isMobile: true,
  hasTouch: true,
  locale: 'ko-KR',
  userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.6.0',
});
await context.addInitScript(() => sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1', '1'));
await context.route('**/data-api.js*', (route) => route.fulfill({
  status: 200,
  contentType: 'text/javascript; charset=utf-8',
  body: `${dataApiSource}\nwindow.daedongDataApi=Object.freeze({
    ...window.daedongDataApi,
    baseUrl:'fixture',regionCode:'yeosu',
    catalog:()=>Promise.resolve(${JSON.stringify(stores)}),
    services:()=>Promise.resolve({programs:[],stores:{}}),
    detail:(id)=>Promise.resolve(${JSON.stringify(storeById)}[id]||{}),
    menu:()=>Promise.resolve({items:[]}),menuSearch:()=>Promise.resolve({stores:{}})
  });`,
}));
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'X-Daedong-Client, Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
await context.route('**/api/events', (route) => route.fulfill({ status: 204, headers: corsHeaders, body: '' }));
await context.route('**/api/rain-mode', (route) => route.fulfill({
  status: 200,
  headers: corsHeaders,
  contentType: 'application/json; charset=utf-8',
  body: JSON.stringify({ mode: 'normal' }),
}));
await context.route('https://dwdwaxgahvp6i.cloudfront.net/**', (route) => route.fulfill({
  status: 200,
  contentType: 'image/png',
  body: transparentPng,
}));
await context.route('https://daedong-yeosu-data-api-preview.sisakim.workers.dev/api/asset/**', (route) => route.fulfill({
  status: 200,
  contentType: 'image/png',
  body: transparentPng,
}));


async function assertFood14Plus3(page, campaign) {
  const entries = await page.locator('#heroTrack > [data-hero-index]').evaluateAll(nodes => (
    [...new Map(nodes.map(node => [Number(node.dataset.heroIndex), {
      index: Number(node.dataset.heroIndex),
      storeId: node.dataset.rc6BannerStore || '',
      url: node.dataset.rc6BannerNotion || '',
      image: node.querySelector('img')?.getAttribute('src') || '',
      title: node.querySelector('.rc6-store-hero-copy strong')?.textContent?.trim() || '',
      meta: node.querySelector('.rc6-store-hero-copy > span')?.textContent?.trim() || '',
    }])).values()].sort((a, b) => a.index - b.index)
  ));
  const food = entries.filter(entry => entry.storeId);
  const expectedFood = campaign.slides.map(slide => ({
    storeId: String(slide.storeId || campaign.storeId), image: slide.image, title: slide.title, meta: slide.meta,
  }));
  const ads = entries.filter(entry => entry.url).map(({index, url, image}) => ({index, url, image}));
  if (campaign.slides.length !== 14 || food.length !== 14 || entries.length !== 17
    || JSON.stringify(entries.map(entry => entry.index)) !== JSON.stringify(Array.from({length: 17}, (_, index) => index))
    || food.some(entry => entry.storeId !== campaign.storeId)
    || JSON.stringify(food.map(({storeId, image, title, meta}) => ({storeId, image, title, meta}))) !== JSON.stringify(expectedFood)
    || JSON.stringify(ads) !== JSON.stringify(expectedFood14Plus3Ads)) {
    throw new Error(`${campaign.title}: 14음식 원문·3지정광고 URL/이미지/위치(5·10·15) 구성이 다릅니다.`);
  }
}

async function assertTamnaneunHidden(page, entryLabel) {
  await page.waitForFunction(() => (
    window.__daedongCatalogProgress?.complete === true
    && typeof window.daedongResolveHeroCampaignStoreId === 'function'
    && typeof rc6HeroRenderKey === 'string' && rc6HeroRenderKey.length > 0
    && document.querySelector('#heroTrack > .hero-slide:not([data-hero-placeholder])')
  ), null, { timeout: 15000 });
  const result = await page.evaluate(hiddenIds => ({
    policyHidden: hiddenIds.every(id => window.daedongDataApi.isCustomerHiddenStoreId(id)),
    resolvedIds: hiddenIds.map(id => window.daedongResolveHeroCampaignStoreId(id)),
    storeLookups: hiddenIds.map(id => Boolean(fxStoreById(id))),
    hiddenReferences: [...document.querySelectorAll(
      '[data-store-id], [data-rc6-banner-store], [data-store-menu-preview], [data-personal-store], [data-app-store-order], [data-app-store-info]'
    )].filter(element => [...element.attributes].some(attribute => hiddenIds.includes(attribute.value))).length,
    ordinarySlides: document.querySelectorAll('#heroTrack > .hero-slide:not([data-hero-placeholder])').length,
    visibleStoreCards: document.querySelectorAll('#storeGrid .store-card').length,
  }), tamnaneunHiddenStoreIds);
  if (!result.policyHidden || result.resolvedIds.some(Boolean) || result.storeLookups.some(Boolean) || result.hiddenReferences) {
    throw new Error(`${entryLabel}: 숨긴 탐나는피자의 가게·메뉴·전용 배너 진입점이 남아 있습니다. ${JSON.stringify(result)}`);
  }
  if (!result.ordinarySlides || !result.visibleStoreCards) {
    throw new Error(`${entryLabel}: 숨김 확인 중 다른 가게와 홈 배너도 사라졌습니다.`);
  }
  return { hidden: true, ...result };
}

try {
  for (const entry of manifest.campaigns) {
    const page = await context.newPage();
    activePage = page;
    page.on('pageerror', (error) => report.errors.push(`${entry.name}: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') report.errors.push(`${entry.name}: ${message.text()}`);
    });
    await page.goto(`${baseURL}?hero=${entry.storeId}`, { waitUntil: 'domcontentloaded' });
    if (tamnaneunHiddenStoreIds.includes(entry.storeId)) {
      const hidden = await assertTamnaneunHidden(page, entry.name);
      report.stores.push({ storeId: entry.storeId, name: entry.name, ...hidden });
      await page.close();
      continue;
    }
    await page.waitForFunction(
      (storeId) => document.querySelector(`.rc6-campaign-hero[data-rc6-banner-store="${storeId}"]`),
      entry.storeId,
      { timeout: 15000 },
    );

    const campaign = heroData.campaigns[entry.storeId];
    const isFood14Plus3 = campaign.layout === 'food14-plus3';
    if (!Array.isArray(campaign.slides) || !campaign.slides.length || campaign.images?.length) {
      throw new Error(`${entry.name}: 탐나는피자 표준 slides 구조가 아닙니다.`);
    }
    const expectedSlides = campaign.slides.length;
    const expectedGeneralAds = isFood14Plus3 ? 3 : 0;
    const campaignSlides = page.locator('.rc6-campaign-hero');
    const slideIndexes = await campaignSlides.evaluateAll((slides) => slides.map((slide) => slide.dataset.heroIndex));
    const slideCount = new Set(slideIndexes).size;
    if (slideCount !== expectedSlides) throw new Error(`${entry.name}: 전용 배너 수가 ${slideCount}/${expectedSlides}입니다.`);
    const renderedSlides = await campaignSlides.evaluateAll((slides) => {
      const unique = new Map();
      slides.forEach(slide => {
        const index = Number(slide.dataset.heroIndex);
        if (!unique.has(index)) unique.set(index, {
          index,
          storeId: slide.dataset.rc6BannerStore || '',
          storeName: slide.querySelector('.rc6-store-hero-copy strong')?.textContent?.trim() || '',
          menuName: slide.querySelector('.rc6-store-hero-copy > span')?.textContent?.trim() || '',
          footer: slide.querySelector('.rc6-hero-order-footer')?.getAttribute('aria-label') || '',
        });
      });
      return [...unique.values()].sort((a, b) => a.index - b.index);
    });
    const expectedCopy = campaign.slides.map(slide => ({
      storeId: String(slide.storeId || campaign.storeId),
      storeName: slide.title,
      menuName: slide.meta,
    }));
    if (JSON.stringify(renderedSlides.map(({storeId, storeName, menuName}) => ({storeId, storeName, menuName}))) !== JSON.stringify(expectedCopy)) {
      throw new Error(`${entry.name}: 배너의 가게명·메뉴명·연결 가게가 표준 데이터와 다릅니다.`);
    }
    if (renderedSlides.some(item => !item.storeName || !item.menuName || !item.footer)) {
      throw new Error(`${entry.name}: 가게명·메뉴명·주문방법 중 비어 있는 표시가 있습니다.`);
    }
    const allowedStoreIds = new Set(campaign.slides.map(slide => String(slide.storeId || campaign.storeId)));
    const expectedAllowedCount = entry.storeId === 'cfde2617224f33a0' ? 8 : 1;
    if (allowedStoreIds.size !== expectedAllowedCount || (expectedAllowedCount === 1 && !allowedStoreIds.has(entry.storeId))) {
      throw new Error(`${entry.name}: 전용지도 허용 가게 구성이 잘못되었습니다.`);
    }
    const foreignSlideCount = await page.locator(
      isFood14Plus3
        ? '#heroTrack > .hero-slide:not(.rc6-campaign-hero):not([data-rc6-banner-notion]), #heroTrack > .rc6-campaign-hero:not([data-rc6-banner-store])'
        : '#heroTrack > .hero-slide:not(.rc6-campaign-hero), #heroTrack > .rc6-campaign-hero:not([data-rc6-banner-store])',
    ).count();
    if (foreignSlideCount) {
      throw new Error(`${entry.name}: 전용지도에 일반 광고나 연결되지 않은 가게가 섞였습니다.`);
    }

    if (isFood14Plus3) await assertFood14Plus3(page, campaign);

    const first = page.locator('.rc6-campaign-hero[data-hero-index="0"]').first();
    const box = await first.boundingBox();
    if (!box || box.width > 390 || box.x < 0 || box.x + box.width > 391) {
      throw new Error(`${entry.name}: 390px 모바일 배너가 화면을 벗어납니다.`);
    }

    const firstTarget = await first.getAttribute('data-rc6-banner-store');
    if (firstTarget !== entry.storeId) throw new Error(`${entry.name}: 배너가 다른 가게를 가리킵니다.`);
    const visibleTitle = await first.locator('.rc6-store-hero-copy strong').textContent().catch(() => '');
    if (campaign.copySlides?.includes(1) && visibleTitle?.trim() !== campaign.title) {
      throw new Error(`${entry.name}: 첫 배너 가게명이 정확하지 않습니다.`);
    }

    const introClose = page.locator('#communityIntroClose');
    if (await introClose.isVisible()) await introClose.click();
    await first.click({ force: true });
    await page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${entry.storeId}"]`).waitFor({
      state: 'visible',
      timeout: 10000,
    });

    report.stores.push({
      storeId: entry.storeId,
      name: entry.name,
      slideCount,
      targetMatched: true,
      mobileWidth: Math.round(box.width),
      detailOpened: true,
      menuNamesMatched: true,
      orderFootersPresent: true,
      allowedStoreCount: allowedStoreIds.size,
    });
    await page.locator('#modal .modal-close').tap();
    await page.waitForFunction((storeId) => (
      document.querySelector('#modal')?.hidden
      && new URLSearchParams(location.search).get('hero') === storeId
    ), entry.storeId, { timeout: 5000 });
    const closedCampaign = await page.evaluate((allowedIds) => ({
      slideCount: new Set([...document.querySelectorAll('#heroTrack > .rc6-campaign-hero')].map(slide => slide.dataset.heroIndex)).size,
      ordinarySlides: new Set([...document.querySelectorAll('#heroTrack > .hero-slide:not(.rc6-campaign-hero)')].map(slide => slide.dataset.heroIndex)).size,
      foreignSlides: [...document.querySelectorAll('#heroTrack > .rc6-campaign-hero')]
        .filter(slide => !allowedIds.includes(slide.dataset.rc6BannerStore)).length,
    }), [...allowedStoreIds]);
    if (closedCampaign.slideCount !== expectedSlides || closedCampaign.ordinarySlides !== expectedGeneralAds || closedCampaign.foreignSlides) {
      throw new Error(`${entry.name}: 상세를 닫은 뒤 전용 배너 구성이 유지되지 않습니다.`);
    }
    if (isFood14Plus3) await assertFood14Plus3(page, campaign);
    if (entry.storeId === '068b2ae8fe32874a') {
      await page.screenshot({ path: path.join(output, 'browser-store-campaign-nine.png'), fullPage: false });
    }
    await page.close();
  }

  report.hiddenTamnaneunEntries = [];
  for (const [parameter, storeId] of [
    ['store', '2da10529e7fb987c'],
    ['hero', '2da10529e7fb987c'],
    ['store', '421ecef35a879687'],
  ]) {
    const hiddenPage = await context.newPage();
    activePage = hiddenPage;
    hiddenPage.on('pageerror', error => report.errors.push(`탐나는피자 ${parameter}=${storeId}: ${error.message}`));
    hiddenPage.on('console', message => {
      if (message.type() === 'error') report.errors.push(`탐나는피자 ${parameter}=${storeId}: ${message.text()}`);
    });
    await hiddenPage.goto(`${baseURL}?${parameter}=${storeId}`, { waitUntil: 'domcontentloaded' });
    const result = await assertTamnaneunHidden(hiddenPage, `탐나는피자 ${parameter}=${storeId}`);
    report.hiddenTamnaneunEntries.push({ parameter, storeId, ...result });
    await hiddenPage.close();
  }
  report.legacyTamnaneunQr = report.hiddenTamnaneunEntries[0];
  report.success = report.stores.length === manifest.campaigns.length
    && report.hiddenTamnaneunEntries.length === 3
    && report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  report.debug = await activePage?.evaluate(() => ({
    url: location.href,
    stores: (() => { try { return eval('stores').map((store) => ({ id: store.id, name: store.name })); } catch { return null; } })(),
    requestedHero: new URLSearchParams(location.search).get('hero'),
    campaignCount: (() => { try { return Object.keys(eval('rc6HeroCampaigns')?.campaigns || {}).length; } catch { return -1; } })(),
    catalogProgress: window.__daedongCatalogProgress || null,
    dataApiSource: String(window.daedongDataApi?.catalog || '').slice(0, 200),
    requestedCampaign: (() => { try { const value = eval('rc6RequestedHeroCampaign()'); return value ? { storeId: value.store?.id, name: value.store?.name } : null; } catch (error) { return String(error); } })(),
    firstStore: (() => { try { return eval('stores[0]') || null; } catch (error) { return String(error); } })(),
    storeLengths: (() => { try { return { all: eval('allStores.length'), canonical: eval('canonicalStores.length'), searchable: eval('searchableStores.length') }; } catch (error) { return String(error); } })(),
    firstAllStore: (() => { try { const store = eval('allStores[0]'); return store ? { id: store.id, store_id: store.store_id, name: store.name, customerVisible: store.customerVisible } : null; } catch (error) { return String(error); } })(),
    storeCardCount: document.querySelectorAll('#storeGrid .store-card').length,
    heroText: document.querySelector('#heroTrack')?.innerText || '',
    heroHtml: document.querySelector('#heroTrack')?.innerHTML?.slice(0, 3000) || '',
  })).catch(() => null);
} finally {
  fs.writeFileSync(path.join(output, 'browser-store-campaign-nine-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
