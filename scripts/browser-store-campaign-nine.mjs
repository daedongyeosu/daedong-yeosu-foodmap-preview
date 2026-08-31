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
const manifest = JSON.parse(fs.readFileSync(new URL('../data/store-campaign-links.json', import.meta.url), 'utf8'));
const heroData = JSON.parse(fs.readFileSync(new URL('../data/hero-campaigns.json', import.meta.url), 'utf8'));
const campaignDefinitions = [...manifest.campaigns];
for (const campaign of Object.values(heroData.campaigns)) {
  for (const slide of campaign.slides || []) {
    if (!campaignDefinitions.some((entry) => entry.storeId === slide.storeId)) {
      campaignDefinitions.push({ storeId: slide.storeId, name: slide.title });
    }
  }
}
// The deployed preview catalog can expose a newly unified store detail before
// the catalog list itself is refreshed. Omit Tamnaneun's canonical ID from the
// fixture so this check exercises the campaign virtual-store fallback used by
// real QR visitors instead of accidentally masking it with fixture data.
const stores = campaignDefinitions.filter(entry => entry.storeId !== '421ecef35a879687').map((entry, index) => ({
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
  channelKeys: entry.storeId === '421ecef35a879687'
    ? ['mukkebi', 'ddangyo', 'phone', 'yogiyo', 'coupang']
    : ['phone'],
  routes: entry.storeId === '421ecef35a879687'
    ? [
        { name: '먹깨비', key: 'mukkebi', url: 'https://mukkebi.com/store', enabled: true },
        { name: '땡겨요', key: 'ddangyo', url: 'https://ddangyo.example/store', enabled: true },
        { name: '전화주문', key: 'phone', url: 'tel:0610000000', enabled: true },
        { name: '요기요', key: 'yogiyo', url: 'https://yogiyo.example/store', enabled: true },
        { name: '쿠팡이츠', key: 'coupang', url: 'https://coupangeats.example/store', enabled: true },
      ]
    : [{ name: '전화주문', key: 'phone', url: 'tel:0610000000', enabled: true }],
}));
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
await context.addInitScript(() => sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV2', '1'));
await context.route('**/data-api.js*', (route) => route.fulfill({
  status: 200,
  contentType: 'text/javascript; charset=utf-8',
  body: `window.daedongDataApi=Object.freeze({
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

try {
  for (const entry of manifest.campaigns) {
    const page = await context.newPage();
    activePage = page;
    page.on('pageerror', (error) => report.errors.push(`${entry.name}: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') report.errors.push(`${entry.name}: ${message.text()}`);
    });
    await page.goto(`${baseURL}?hero=${entry.storeId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(
      (storeId) => document.querySelector(`.rc6-campaign-hero[data-rc6-banner-store="${storeId}"]`),
      entry.storeId,
      { timeout: 15000 },
    );

    const campaign = heroData.campaigns[entry.storeId];
    const expectedSlides = campaign.images?.length || campaign.slides?.length || 0;
    const campaignSlides = page.locator('.rc6-campaign-hero');
    const slideIndexes = await campaignSlides.evaluateAll((slides) => slides.map((slide) => slide.dataset.heroIndex));
    const slideCount = new Set(slideIndexes).size;
    if (slideCount !== expectedSlides) throw new Error(`${entry.name}: 전용 배너 수가 ${slideCount}/${expectedSlides}입니다.`);
    if (entry.storeId === '421ecef35a879687') {
      const renderedCopy = await campaignSlides.evaluateAll((slides) => {
        const unique = new Map();
        slides.forEach(slide => {
          const index = Number(slide.dataset.heroIndex);
          if (!unique.has(index)) unique.set(index, {
            index,
            storeName: slide.querySelector('.rc6-store-hero-copy strong')?.textContent?.trim() || '',
            menuName: slide.querySelector('.rc6-store-hero-copy > span')?.textContent?.trim() || '',
          });
        });
        return [...unique.values()].sort((a, b) => a.index - b.index);
      });
      const expectedMenuNames = campaign.slides.map(slide => slide.meta);
      if (renderedCopy.some(item => item.storeName !== campaign.title)) {
        throw new Error('탐나는피자 전용 배너의 위쪽 가게명이 정확하지 않습니다.');
      }
      if (JSON.stringify(renderedCopy.map(item => item.menuName)) !== JSON.stringify(expectedMenuNames)) {
        throw new Error('탐나는피자 전용 배너의 아래쪽 메뉴명이 사진 순서와 일치하지 않습니다.');
      }
    }

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
    });
    if (entry.storeId === '068b2ae8fe32874a') {
      await page.screenshot({ path: 'browser-store-campaign-nine.png', fullPage: false });
    }
    await page.close();
  }

  const legacyEntryId = '2da10529e7fb987c';
  const canonicalStoreId = '421ecef35a879687';
  const legacyPage = await context.newPage();
  activePage = legacyPage;
  await legacyPage.goto(`${baseURL}?store=${legacyEntryId}`, { waitUntil: 'domcontentloaded' });
  await legacyPage.locator(`#modal:not([hidden]) .store-detail[data-store-id="${canonicalStoreId}"]`).waitFor({
    state: 'visible',
    timeout: 15000,
  });
  const initialLegacyHome = await legacyPage.evaluate((storeId) => ({
    slideCount: new Set([...document.querySelectorAll('#heroTrack > .hero-slide')].map(slide => slide.dataset.heroIndex)).size,
    campaignSlideCount: new Set([...document.querySelectorAll(`#heroTrack > .rc6-campaign-hero[data-rc6-banner-store="${storeId}"]`)].map(slide => slide.dataset.heroIndex)).size,
    foreignSlideCount: document.querySelectorAll(`#heroTrack > .hero-slide:not(.rc6-campaign-hero), #heroTrack > .rc6-campaign-hero:not([data-rc6-banner-store="${storeId}"])`).length,
    openedStoreId: document.querySelector('#modal:not([hidden]) .store-detail')?.dataset.storeId || '',
  }), canonicalStoreId);
  const tamnaneunCampaign = heroData.campaigns[canonicalStoreId];
  const expectedTamnaneunSlides = tamnaneunCampaign.slides?.length || tamnaneunCampaign.images?.length || 0;
  if (initialLegacyHome.openedStoreId !== canonicalStoreId) {
    throw new Error('탐나는피자 이전 QR이 통합 가게 상세를 열지 못합니다.');
  }
  if (initialLegacyHome.slideCount !== expectedTamnaneunSlides || initialLegacyHome.campaignSlideCount !== expectedTamnaneunSlides || initialLegacyHome.foreignSlideCount) {
    throw new Error('탐나는피자 이전 QR의 홈 배너에 다른 광고가 섞였습니다.');
  }
  await legacyPage.locator('#modal .modal-close').tap();
  await legacyPage.waitForFunction((storeId) => (
    document.querySelector('#modal')?.hidden
    && new URLSearchParams(location.search).get('hero') === storeId
    && !new URLSearchParams(location.search).has('store')
  ), canonicalStoreId, { timeout: 5000 });
  const closedLegacyHome = await legacyPage.evaluate((storeId) => ({
    search: location.search,
    slideCount: new Set([...document.querySelectorAll('#heroTrack > .hero-slide')].map(slide => slide.dataset.heroIndex)).size,
    campaignSlideCount: new Set([...document.querySelectorAll(`#heroTrack > .rc6-campaign-hero[data-rc6-banner-store="${storeId}"]`)].map(slide => slide.dataset.heroIndex)).size,
    foreignSlideCount: document.querySelectorAll(`#heroTrack > .hero-slide:not(.rc6-campaign-hero), #heroTrack > .rc6-campaign-hero:not([data-rc6-banner-store="${storeId}"])`).length,
  }), canonicalStoreId);
  if (closedLegacyHome.slideCount !== expectedTamnaneunSlides || closedLegacyHome.campaignSlideCount !== expectedTamnaneunSlides || closedLegacyHome.foreignSlideCount) {
    throw new Error('탐나는피자 상세를 닫은 뒤 전용 배너가 일반 광고로 바뀝니다.');
  }
  report.legacyTamnaneunQr = {
    legacyEntryId,
    canonicalStoreId,
    initialLegacyHome,
    closedLegacyHome,
  };
  await legacyPage.close();
  report.success = report.stores.length === manifest.campaigns.length && report.errors.length === 0;
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
  fs.writeFileSync('browser-store-campaign-nine-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
