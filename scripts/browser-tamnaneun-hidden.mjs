import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

async function loadChromium() {
  try { return (await import('playwright')).chromium; } catch {}
  const root = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (!root) throw new Error('Set CODEX_PRIMARY_RUNTIME_NODE_MODULES to the Playwright package directory.');
  return (await import(pathToFileURL(path.join(root, 'playwright/index.mjs')).href)).chromium;
}
// Default: exercise the shipped client against deliberately unfiltered API fixtures.
// LIVE_DATA=1: read the deployed page and APIs unchanged; only telemetry/writes are blocked.
const live = process.env.LIVE_DATA === '1';
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4197/';
const output = path.resolve(process.env.OUTPUT_DIR || '../../output/hide-tamnaneun-20260905/browser');
fs.mkdirSync(output, {recursive: true});
const hidden = ['2da10529e7fb987c', '421ecef35a879687'];
const normalId = process.env.NORMAL_STORE_ID || '67a9e4f14c8c7ea4';
const normalName = live ? '손수김밥' : '숨김검사 정상가게';
const fixtureStores = [
  {id: normalId, store_id: normalId, name: normalName},
  ...hidden.map(id => ({id, store_id: id, name: '탐나는피자 여수점'}))
].map(store => ({...store, district: '여서동', area: '여서동', category: '피자', cat: '피자',
  hasMenu: true, channelKeys: ['phone'], routes: [{key: 'phone', name: '전화주문', url: 'tel:0610000000', enabled: true}]}));
const fixtureMenu = id => ({storeId: id, storeName: fixtureStores.find(store => store.id === id)?.name,
  categories: ['메뉴'], items: [{id: `${id}-pizza`, name: '검증 피자', category: '피자', description: '', image: ''}]});
const report = {success: false, mode: live ? 'live-unmodified-GET' : 'raw-API-fixtures', baseURL,
  viewport: {width: 390, height: 844}, checks: [], errors: [], hiddenResourceRequests: []};
const check = (value, label) => { assert.ok(value, label); report.checks.push(label); };
const chromium = await loadChromium();
const browser = await chromium.launch({headless: true, ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})});
const context = await browser.newContext({viewport: report.viewport, isMobile: true, hasTouch: true, locale: 'ko-KR', serviceWorkers: 'block'});
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
const cors = {'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'X-Daedong-Client, Content-Type', 'Access-Control-Allow-Methods': 'GET, OPTIONS'};
const json = value => ({status: 200, contentType: 'application/json; charset=utf-8', headers: cors, body: JSON.stringify(value)});
await context.addInitScript(({hidden, normalId}) => {
  navigator.sendBeacon = () => true;
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1', '1');
  localStorage.setItem('daedongFavoriteStoresV2', JSON.stringify([...hidden, normalId]));
  localStorage.setItem('daedongRecentStoresV2', JSON.stringify([...hidden, normalId].map(storeId => ({storeId, visitedAt: new Date().toISOString()}))));
}, {hidden, normalId});
await context.route('**/*', async route => {
  const request = route.request(), url = new URL(request.url());
  const telemetry = /(?:^|\.)(?:posthog\.com|posthogusercontent\.com|google-analytics\.com|googletagmanager\.com|cloudflareinsights\.com)$/i.test(url.hostname)
    || /^\/(?:api\/events(?:\/|$)|cdn-cgi\/rum(?:\/|$))/.test(url.pathname);
  if (telemetry || !['GET', 'HEAD', 'OPTIONS'].includes(request.method())) return route.fulfill({status: 204, headers: cors, body: ''});
  if (hidden.some(id => url.pathname.startsWith('/api/store/' + id)) || /\/data\/tamnaneun-pizza-menu\.json$/.test(url.pathname)) report.hiddenResourceRequests.push(url.href);
  if (!live && url.pathname.startsWith('/api/')) {
    if (request.method() === 'OPTIONS') return route.fulfill({status: 204, headers: cors, body: ''});
    if (url.pathname === '/api/catalog') return route.fulfill(json(fixtureStores));
    if (url.pathname === '/api/services') return route.fulfill(json({}));
    if (url.pathname === '/api/menu-search') return route.fulfill(json({stores: Object.fromEntries(fixtureStores.map(store => [store.id, {i: [[store.id + '-pizza', '검증 피자', '피자', '']]}]))}));
    if (url.pathname === '/api/rain-mode') return route.fulfill(json({mode: 'normal'}));
    const match = url.pathname.match(/^\/api\/store\/([a-f0-9]{16})(\/menu)?$/);
    if (match) return route.fulfill(json(match[2] ? fixtureMenu(match[1]) : fixtureStores.find(store => store.id === match[1]) || {}));
    return route.fulfill(json({}));
  }
  return route.continue();
});
async function ready(url = baseURL) {
  await page.goto(url, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => typeof fxStoreById === 'function' && typeof rc6HeroCampaignForEntryStoreId === 'function' && window.daedongMenuPreview, {timeout: 30000});
  await page.evaluate(async () => { await window.daedongCatalogReady; await window.daedongLocationRankingReady; });
  await page.waitForFunction(id => Boolean(fxStoreById(id)), normalId);
}
async function assertNoHidden(label) {
  const state = await page.evaluate(hidden => {
    const attributes = ['data-id', 'data-store-id', 'data-personal-store', 'data-store-service-store-id', 'data-store-service-menu-store-id',
      'data-search-store-id', 'data-store-menu-preview', 'data-rc6-banner-store', 'data-photo-store-id', 'data-app-store-id'];
    const references = [];
    for (const attribute of attributes) for (const node of document.querySelectorAll('[' + attribute + ']')) {
      if (hidden.includes(node.getAttribute(attribute))) references.push({attribute, value: node.getAttribute(attribute)});
    }
    return {references, lookup: hidden.map(id => Boolean(fxStoreById(id))), campaign: hidden.map(id => Boolean(rc6HeroCampaignForEntryStoreId(id))),
      detailName: document.querySelector('.store-detail:not(.store-detail-loading) h2')?.textContent || ''};
  }, hidden);
  check(state.references.length === 0, label + ': no hidden cards, menu, personal list or banner DOM references');
  check(state.lookup.every(value => !value) && state.campaign.every(value => !value), label + ': both ID lookups and campaign resolution blocked');
  check(!state.detailName.includes('탐나는'), label + ': no hidden detail');
}
async function closeLayers() {
  await page.evaluate(() => {
    document.querySelector('[data-store-service-overview-close]')?.click();
    if (typeof closeModal === 'function') closeModal();
  });
}
try {
  await ready();
  const api = await page.evaluate(async ({hidden, normalId}) => {
    const client = window.daedongDataApi;
    const catalog = await client.catalog(), search = await client.menuSearch('피자'), services = await client.services();
    const rejections = [];
    for (const id of hidden) for (const kind of ['detail', 'menu', 'yogiyoWebRoute']) {
      try { await client[kind](id, {lat: 34.7, lng: 127.7}); rejections.push(false); }
      catch { rejections.push(true); }
    }
    return {policy: hidden.map(id => client.isCustomerHiddenStoreId(id)), normal: catalog.some(row => (row.id || row.store_id) === normalId),
      catalogIds: catalog.map(row => row.id || row.store_id), searchIds: Object.keys(search.stores || {}), serviceIds: Object.keys(services || {}), rejections};
  }, {hidden, normalId});
  check(api.policy.every(Boolean), 'shared actual client policy marks both Tamnaneun IDs hidden');
  check(api.normal, 'normal store remains in API catalog');
  for (const key of ['catalogIds', 'searchIds', 'serviceIds']) check(!api[key].some(id => hidden.includes(id)), key + ': hidden IDs filtered');
  check(api.rejections.every(Boolean), 'detail, static/API menu and Yogiyo route reject both hidden IDs');
  await assertNoHidden('home');
  check(await page.locator('#storeGrid .store-card').count() > 0, 'home has normal store cards');

  await page.evaluate(() => fxSearchModal('탐나는'));
  await page.locator('[data-store-service-query]').waitFor({state: 'visible'});
  await page.waitForTimeout(700);
  await assertNoHidden('store-name search');
  await page.locator('[data-store-service-query]').fill('피자');
  await page.locator('[data-store-service-query]').press('Enter');
  await page.waitForTimeout(1000);
  await assertNoHidden('menu search');
  check(await page.locator('[data-store-service-store-id]').count() > 0, 'menu search retains other stores');
  await closeLayers();

  for (const kind of ['favorites', 'recent']) {
    await page.evaluate(kind => kind === 'favorites' ? favoritesModal() : recentModal(), kind);
    await page.locator('.personal-list-sheet').waitFor({state: 'visible'});
    await assertNoHidden(kind);
    check(await page.locator('[data-personal-store="' + normalId + '"]').count() === 1, kind + ': normal saved store remains');
    await closeLayers();
  }
  for (const id of hidden) check(await page.evaluate(id => window.daedongMenuPreview.open(id, {menuId: 'stale-cached-menu'}), id) === null,
    'direct menu open rejects ' + id);
  check(await page.locator('[data-store-menu-overlay]:not([hidden])').count() === 0, 'no empty hidden menu overlay');

  for (const key of ['store', 'hero']) for (const id of hidden) {
    const url = new URL(baseURL); url.searchParams.set(key, id);
    await ready(url.href);
    await assertNoHidden('?' + key + '=' + id);
    check(await page.locator('#storeGrid .store-card').count() > 0, 'hidden ' + key + ' entry leaves a usable home');
  }
  const normalURL = new URL(baseURL); normalURL.searchParams.set('store', normalId);
  await ready(normalURL.href);
  await page.locator('.store-detail:not(.store-detail-loading):not(.store-detail-degraded)').waitFor({state: 'visible', timeout: 30000});
  check((await page.locator('.store-detail h2').innerText()).includes(normalName), 'other store deep link and actual detail remain usable');
  check(report.hiddenResourceRequests.length === 0, 'no hidden detail/menu network or static-menu fetch was attempted');
  check(report.errors.length === 0, 'no browser runtime errors');
  await page.screenshot({path: path.join(output, 'normal-store-preserved.png'), fullPage: false}).catch(() => {});
  report.success = true;
} catch (error) {
  report.failure = String(error.message).split('\n')[0];
  process.exitCode = 1;
} finally {
  fs.mkdirSync(output, {recursive: true});
  await page.screenshot({path: path.join(output, report.success ? 'final.png' : 'failure.png'), fullPage: false}).catch(() => {});
  fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({success: report.success, mode: report.mode, checks: report.checks, failure: report.failure, report: path.join(output, 'report.json')}, null, 2));
  await context.unrouteAll({behavior: 'ignoreErrors'});
  await context.close();
  await browser.close();
}
