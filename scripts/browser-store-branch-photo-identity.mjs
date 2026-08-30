import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const loadBrowserRuntime = async () => {
  try {
    return (await import('playwright')).chromium;
  } catch {}
  const moduleRoot = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (!moduleRoot) throw new Error('playwright 패키지를 찾을 수 없습니다.');
  return (await import(pathToFileURL(path.join(moduleRoot, 'playwright', 'index.mjs')).href)).chromium;
};

const chromium = await loadBrowserRuntime();
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const officialLogo = 'assets/app-icons/daedong-app-icon-512.png?v=official-brand-20260830-1';
const foodPhoto = 'assets/brand-apps/banolim-pizza.jpg';
const stores = [
  {store_id: 'big-hand-main', name: '큰손닭강정 여수본점(학동)', district: '학동', category: '치킨', categories: ['치킨'], image: foodPhoto, hasMenu: true, latitude: 34.764, longitude: 127.665, channelKeys: ['yogiyo']},
  {store_id: 'big-hand-yeseo', name: '큰손닭강정-여수여서점', district: '여서', category: '치킨', categories: ['치킨'], image: officialLogo, hasMenu: true, latitude: 34.758, longitude: 127.704, channelKeys: ['yogiyo']}
];
const menuSearch = {stores: {
  'big-hand-main': {i: [['main-menu', '큰손 닭강정', '치킨', foodPhoto]]},
  'big-hand-yeseo': {i: [['yeseo-menu', '큰손 닭강정', '치킨', foodPhoto]]}
}};

const report = {success: false, viewport: {width: 390, height: 844}, cards: [], errors: []};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})
});
const context = await browser.newContext({viewport: report.viewport, isMobile: true, hasTouch: true, locale: 'ko-KR'});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV2', '1');
});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/api/catalog', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(stores)}));
await context.route('**/api/services', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({programs: [], stores: {}})}));
await context.route('**/api/menu-search*', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(menuSearch)}));
await context.route('**/*.woff2', route => route.abort());

const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.locator('[data-store-service-overview-open]').first().waitFor({state: 'visible', timeout: 15000});
  await page.locator('[data-store-service-overview-open]').first().click();
  const input = page.locator('[data-store-service-query]');
  await input.fill('큰손');
  await page.waitForFunction(() => document.querySelectorAll('.store-service-overview-card').length > 0, null, {timeout: 10000});
  await page.waitForTimeout(900);
  report.cards = await page.locator('.store-service-overview-card').evaluateAll(cards => cards.map(card => ({
    name: card.querySelector('strong')?.textContent?.trim() || '',
    title: card.querySelector('strong')?.getAttribute('title') || '',
    branch: card.querySelector('.store-service-branch-badge')?.textContent?.trim() || '',
    image: card.querySelector('img')?.getAttribute('src') || '',
    source: card.querySelector('img')?.getAttribute('data-photo-source') || ''
  })));
  const main = report.cards.find(card => card.name.includes('본점'));
  const yeseo = report.cards.find(card => card.name.includes('여서점'));
  if (report.cards.length !== 2) throw new Error(`지점 두 곳이 분리되어야 합니다: ${report.cards.map(card => card.name).join(', ')}`);
  if (main?.branch !== '본점') throw new Error('본점 지점 배지가 표시되지 않았습니다.');
  if (yeseo?.branch !== '여서점') throw new Error('여서점 지점 배지가 표시되지 않았습니다.');
  if (yeseo?.image !== foodPhoto || yeseo?.source !== 'verified-menu-search-fallback') {
    throw new Error('공식 로고 대신 검증된 첫 메뉴 사진이 표시되지 않았습니다.');
  }
  if (yeseo?.title !== yeseo?.name) throw new Error('가게 전체 이름 확인용 제목이 보존되지 않았습니다.');
  await page.locator('.store-service-overview-card').first().scrollIntoViewIfNeeded();
  await page.screenshot({path: 'browser-store-branch-photo-identity.png', fullPage: false});
  report.success = report.errors.length === 0;
} catch (error) {
  report.errors.push(error.message);
  await page.screenshot({path: 'browser-store-branch-photo-identity-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-store-branch-photo-identity-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
if (!report.success) process.exit(1);
