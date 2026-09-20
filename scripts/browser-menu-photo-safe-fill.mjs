import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const loadChromium = async () => {
  try { return (await import('playwright')).chromium; } catch {}
  const modules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (!modules) throw new Error('playwright 패키지를 찾을 수 없습니다.');
  return (await import(pathToFileURL(path.join(modules, 'playwright', 'index.mjs')).href)).chromium;
};

const chromium = await loadChromium();
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const proxyApiOrigin = process.env.PERF_PROXY_API_ORIGIN || '';
const storeId = '4ae622b733f163c7';
const itemId = 'ddangyo-1152738-30000530';
const itemName = '핫양념반반순살치킨';
const expectedImage = 'assets/reviewed-menu-photos/c6b947813051ac38/2a34f6adf19bfc8d98a4f7ad.jpg';
const report = {success: false, checks: [], errors: []};
const browser = await chromium.launch({headless: true, ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})});
const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, locale: 'ko-KR'});
if (proxyApiOrigin) {
  const localOrigin = new URL(baseURL).origin;
  await context.route(`${proxyApiOrigin}/api/**`, async route => {
    const response = await route.fetch({headers: {...route.request().headers(), origin: 'https://preview.daedongmap.com'}});
    await route.fulfill({response, headers: {...response.headers(), 'access-control-allow-origin': localOrigin}});
  });
}
await context.addInitScript(() => sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1', '1'));
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/api/native/public/catalog', route => route.fulfill({status: 200, contentType: 'application/json', body: '{"items":[],"cursor":null}'}));
await context.route('**/api/native/public/store/*', route => route.fulfill({status: 404, contentType: 'application/json', body: '{}'}));
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
const check = (value, message) => {
  const ok = Boolean(value);
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};
try {
  await page.goto(`${baseURL}/?store=${storeId}&hero=${storeId}`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => Boolean(window.daedongDataApi?.menu), {timeout: 15000});
  const menuItem = await page.evaluate(async ({storeId, itemId}) => {
    const menu = await window.daedongDataApi.menu(storeId);
    const item = menu.items.find(value => value.id === itemId);
    return item ? {id: item.id, name: item.name, image: item.image} : null;
  }, {storeId, itemId});
  report.menuItem = menuItem;
  check(menuItem?.name === itemName, 'same-brand target menu identity remains exact');
  check(menuItem?.image === expectedImage, 'reviewed same-brand photo fills only the missing target');
  const loaded = await page.evaluate(src => new Promise(resolve => {
    const image = new Image();
    image.onload = () => resolve({width: image.naturalWidth, height: image.naturalHeight});
    image.onerror = () => resolve(null);
    image.src = src;
  }), expectedImage);
  report.loaded = loaded;
  check(loaded?.width > 0 && loaded?.height > 0, 'shared reviewed photo file loads on a 390px mobile session');
  check(report.errors.length === 0, 'no browser JavaScript errors');
  await page.screenshot({path: 'browser-menu-photo-safe-fill.png'});
  report.success = true;
} catch (error) {
  report.failure = error.stack || String(error);
  await page.screenshot({path: 'browser-menu-photo-safe-fill-failure.png'}).catch(() => {});
} finally {
  fs.writeFileSync('browser-menu-photo-safe-fill-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await context.unrouteAll({behavior: 'ignoreErrors'});
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
if (!report.success) process.exitCode = 1;
