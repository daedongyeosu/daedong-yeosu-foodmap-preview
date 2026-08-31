import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

async function loadChromium() {
  try { return (await import('playwright')).chromium; } catch {}
  const moduleRoot = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (!moduleRoot) throw new Error('playwright 패키지를 찾을 수 없습니다.');
  return (await import(pathToFileURL(path.join(moduleRoot, 'playwright', 'index.mjs')).href)).chromium;
}

const chromium = await loadChromium();
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:8766/';
const storeId = '2da10529e7fb987c';
const report = {success: false, storeId, url: `${baseURL}?hero=${storeId}`, checks: {}};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {}),
});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  isMobile: true,
  hasTouch: true,
  locale: 'ko-KR',
  userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.6.0',
});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV2', '1');
  localStorage.setItem('hideStartup', new Date().toISOString().slice(0, 10));
});
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'X-Daedong-Client, Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};
await context.route('**/api/catalog', route => route.fulfill({status: 200, headers: corsHeaders, contentType: 'application/json', body: '[]'}));
await context.route('**/api/services', route => route.fulfill({status: 200, headers: corsHeaders, contentType: 'application/json', body: '{"programs":[],"stores":{}}'}));
await context.route('**/api/events', route => route.fulfill({status: 204, headers: corsHeaders, body: ''}));
await context.route('**/api/rain-mode', route => route.fulfill({status: 200, headers: corsHeaders, contentType: 'application/json', body: '{"mode":"normal"}'}));

const page = await context.newPage();
try {
  await page.goto(report.url, {waitUntil: 'domcontentloaded'});
  const hero = page.locator(`.rc6-campaign-hero[data-rc6-banner-store="${storeId}"][data-hero-index="0"]`).first();
  await hero.waitFor({state: 'visible', timeout: 15000});
  report.checks.heroText = (await hero.textContent()).trim();
  report.checks.heroTitle = report.checks.heroText.includes('탐나는피자');
  const heroBox = await hero.boundingBox();
  report.checks.mobileWidth = Math.round(heroBox.width);

  const introClose = page.locator('#communityIntroClose');
  if (await introClose.isVisible()) await introClose.click();
  await hero.scrollIntoViewIfNeeded();
  const tapBox = await hero.boundingBox();
  await page.touchscreen.tap(tapBox.x + tapBox.width / 2, tapBox.y + tapBox.height / 2);
  const detail = page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${storeId}"]`);
  await detail.waitFor({state: 'visible', timeout: 10000});
  report.checks.detailIsFull = !(await detail.evaluate(element => element.classList.contains('store-detail-degraded')));
  const detailText = await detail.textContent();
  report.checks.phoneRoute = detailText.includes('전화주문');
  report.checks.yogiyoRoute = detailText.includes('요기요');

  await detail.locator('[data-store-menu-preview]').click();
  const preview = page.locator(`.store-menu-preview[data-store-id="${storeId}"]`);
  await preview.waitFor({state: 'visible', timeout: 10000});
  report.checks.menuTitle = (await preview.locator('#storeMenuTitle').textContent()).trim();
  report.checks.menuCount = Number(await preview.locator('[data-menu-result-count]').textContent());
  report.checks.sampleMenu = (await preview.textContent()).includes('TamNa 피자(1+1) 두판+음료 set');
  report.success = report.checks.heroTitle
    && report.checks.mobileWidth <= 390
    && report.checks.detailIsFull
    && report.checks.phoneRoute
    && report.checks.yogiyoRoute
    && report.checks.menuTitle === '탐나는피자 여수점'
    && report.checks.menuCount === 56
    && report.checks.sampleMenu;
  await page.screenshot({path: 'browser-tamnaneun-campaign.png', fullPage: false});
} catch (error) {
  report.error = error.stack || String(error);
  report.debug = await page.evaluate(() => ({
    campaignHtml: document.querySelector('.rc6-campaign-hero')?.outerHTML?.slice(0, 4000) || '',
    modalHidden: document.querySelector('#modal')?.hidden,
    modalText: document.querySelector('#modal')?.textContent || '',
    heroTrackText: document.querySelector('#heroTrack')?.textContent || '',
  })).catch(() => null);
  await page.screenshot({path: 'browser-tamnaneun-campaign-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-tamnaneun-campaign-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
