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
const stores = campaignDefinitions.map((entry, index) => ({
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
  channelKeys: ['phone'],
  routes: [{ name: '전화주문', url: 'tel:0610000000', enabled: true }],
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
await context.addInitScript(() => sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV1', '1'));
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
