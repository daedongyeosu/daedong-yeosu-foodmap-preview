import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const loadBrowserRuntime = async () => {
  try {
    return {playwright: await import('playwright'), launchOptions: {headless: true}};
  } catch {}
  const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (!runtimeModules) throw new Error('playwright package is required');
  const playwright = await import(pathToFileURL(path.join(runtimeModules, 'playwright-core', 'index.mjs')).href);
  const executablePath = process.env.CODEX_BROWSER_EXECUTABLE_PATH;
  if (!executablePath) throw new Error('CODEX_BROWSER_EXECUTABLE_PATH is required with playwright-core');
  return {
    playwright,
    launchOptions: {
      headless: true,
      executablePath
    }
  };
};

const {playwright, launchOptions} = await loadBrowserRuntime();
const {chromium} = playwright;

const baseURL = process.env.BASE_URL || 'https://preview.daedongmap.com';
const proxyApiOrigin = process.env.PERF_PROXY_API_ORIGIN || '';
const targetStoreId = process.env.PERF_STORE_ID || 'a089d1d54720b48e';
const numberFromEnv = (name, fallback) => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};
const budgets = {
  homeReadyMs: numberFromEnv('PERF_HOME_READY_MS', 7500),
  detailSkeletonMs: numberFromEnv('PERF_DETAIL_SKELETON_MS', 250),
  detailReadyMs: numberFromEnv('PERF_DETAIL_READY_MS', 3000),
  menuSkeletonMs: numberFromEnv('PERF_MENU_SKELETON_MS', 250),
  menuReadyMs: numberFromEnv('PERF_MENU_READY_MS', 3500),
  menuBackMs: numberFromEnv('PERF_MENU_BACK_MS', 700),
  homeDomNodes: numberFromEnv('PERF_HOME_DOM_NODES', 2200),
  detailDomNodes: numberFromEnv('PERF_DETAIL_DOM_NODES', 2500),
  menuDomNodes: numberFromEnv('PERF_MENU_DOM_NODES', 3500),
  maxLongTaskMs: numberFromEnv('PERF_MAX_LONG_TASK_MS', 1000),
  totalLongTaskMs: numberFromEnv('PERF_TOTAL_LONG_TASK_MS', 4000)
};

const report = {
  success: false,
  baseURL,
  targetStoreId,
  profile: {viewport: '390x844', network: 'Fast 4G', cpuSlowdown: 4},
  budgets,
  measurements: {},
  checks: [],
  errors: [],
  relevantNetworkFailures: []
};

const browser = await chromium.launch(launchOptions);
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  locale: 'ko-KR',
  hasTouch: true,
  isMobile: true
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
  sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV1', '1');
  window.__qaLongTasks = [];
  new PerformanceObserver((list) => {
    window.__qaLongTasks.push(...list.getEntries().map((entry) => ({
      startTime: entry.startTime,
      duration: entry.duration
    })));
  }).observe({type: 'longtask', buffered: true});
});
await context.route('**/api/events', (route) => route.fulfill({status: 204, body: ''}));

const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('Network.emulateNetworkConditions', {
  offline: false,
  latency: 150,
  downloadThroughput: 200 * 1024,
  uploadThroughput: 90 * 1024,
  connectionType: 'cellular4g'
});
await cdp.send('Emulation.setCPUThrottlingRate', {rate: 4});

const relevantURL = (url) => {
  try {
    const parsed = new URL(url);
    return parsed.origin === new URL(baseURL).origin
      || parsed.hostname.endsWith('.workers.dev');
  } catch {
    return false;
  }
};
page.on('pageerror', (error) => report.errors.push(error.message));
page.on('requestfailed', (request) => {
  if (!relevantURL(request.url())) return;
  report.relevantNetworkFailures.push({
    url: request.url(),
    type: request.resourceType(),
    error: request.failure()?.errorText || 'request failed'
  });
});
page.on('response', (response) => {
  if (response.status() < 400 || !relevantURL(response.url())) return;
  report.relevantNetworkFailures.push({
    url: response.url(),
    type: response.request().resourceType(),
    error: `HTTP ${response.status()}`
  });
});

const elapsed = (startedAt) => Math.round(performance.now() - startedAt);
const domNodes = () => page.locator('*').count();
const check = (name, actual, maximum) => {
  const ok = actual <= maximum;
  report.checks.push({name, ok, actual, maximum});
  return ok;
};
const exactCheck = (name, actual, expected) => {
  const ok = actual === expected;
  report.checks.push({name, ok, actual, expected});
  return ok;
};

try {
  const homeStartedAt = performance.now();
  await page.goto(baseURL, {waitUntil: 'domcontentloaded', timeout: 30000});
  await page.waitForSelector('#storeGrid .store-card', {timeout: 45000});
  await page.waitForFunction(() => typeof window.fxStoreById === 'function' && typeof window.openStore === 'function');
  report.measurements.homeReadyMs = elapsed(homeStartedAt);
  report.measurements.homeDomNodes = await domNodes();
  report.measurements.homeStoreCards = await page.locator('#storeGrid .store-card').count();

  await page.evaluate((storeId) => {
    window.__qaDetailStart = performance.now();
    window.__qaDetailSkeletonAt = null;
    const observer = new MutationObserver(() => {
      if (document.querySelector(`#modal:not([hidden]) .store-detail-loading[data-store-id="${storeId}"]`)) {
        window.__qaDetailSkeletonAt ??= performance.now();
        observer.disconnect();
      }
    });
    observer.observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['hidden', 'class']});
    const store = window.fxStoreById(storeId);
    if (!store) throw new Error(`performance target store not found: ${storeId}`);
    window.openStore(store);
  }, targetStoreId);
  await page.waitForFunction((storeId) => window.__qaDetailSkeletonAt !== null
    || document.querySelector(`#modal:not([hidden]) .store-detail:not(.store-detail-loading)[data-store-id="${storeId}"]`), targetStoreId, {timeout: 1000});
  report.measurements.detailSkeletonMs = await page.evaluate(() => Math.round(
    (window.__qaDetailSkeletonAt || performance.now()) - window.__qaDetailStart
  ));
  await page.waitForSelector(`#modal:not([hidden]) .store-detail:not(.store-detail-loading)[data-store-id="${targetStoreId}"]`, {timeout: 10000});
  report.measurements.detailReadyMs = await page.evaluate(() => Math.round(performance.now() - window.__qaDetailStart));
  report.measurements.detailDomNodes = await domNodes();

  const menuButton = page.locator(`[data-store-menu-preview="${targetStoreId}"]`);
  if (!await menuButton.isVisible()) throw new Error(`menu preview button is not visible: ${targetStoreId}`);
  const menuStartedAt = performance.now();
  await menuButton.click();
  await page.waitForSelector('[data-store-menu-overlay]:not([hidden]) .store-menu-loading', {timeout: 1000});
  report.measurements.menuSkeletonMs = elapsed(menuStartedAt);
  await page.waitForSelector(`[data-store-menu-overlay]:not([hidden]) .store-menu-preview[data-store-id="${targetStoreId}"]`, {timeout: 5000});
  report.measurements.menuReadyMs = elapsed(menuStartedAt);
  report.measurements.menuDomNodes = await domNodes();
  report.measurements.menuCards = await page.locator('[data-store-menu-overlay]:not([hidden]) [data-menu-card]').count();

  await page.waitForTimeout(1200);
  report.measurements.visibleMenuImages = await page.locator('[data-store-menu-overlay]:not([hidden]) [data-menu-card] img:visible').count();
  report.measurements.brokenVisibleMenuImages = await page.locator('[data-store-menu-overlay]:not([hidden]) [data-menu-card] img:visible').evaluateAll((images) =>
    images.filter((image) => image.complete && image.naturalWidth === 0).length
  );

  const backStartedAt = performance.now();
  await page.goBack({waitUntil: 'commit'}).catch(() => {});
  await page.waitForFunction(() => document.querySelector('[data-store-menu-overlay]')?.hidden === true, null, {timeout: 3000});
  report.measurements.menuBackMs = elapsed(backStartedAt);
  report.measurements.detailRestoredAfterBack = await page.locator(
    `#modal:not([hidden]) .store-detail[data-store-id="${targetStoreId}"]`
  ).isVisible();

  const longTasks = await page.evaluate(() => window.__qaLongTasks || []);
  report.measurements.longTaskCount = longTasks.length;
  report.measurements.maxLongTaskMs = Math.round(Math.max(0, ...longTasks.map((entry) => entry.duration)));
  report.measurements.totalLongTaskMs = Math.round(longTasks.reduce((sum, entry) => sum + entry.duration, 0));
  report.measurements.longestTasks = longTasks
    .map(entry => ({startMs: Math.round(entry.startTime), durationMs: Math.round(entry.duration)}))
    .sort((left, right) => right.durationMs - left.durationMs)
    .slice(0, 8);
  report.measurements.transferBytes = await page.evaluate(() => Math.round(
    performance.getEntriesByType('resource').reduce((sum, entry) => sum + (entry.transferSize || 0), 0)
  ));
  report.measurements.slowestResources = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .map((entry) => ({
        url: entry.name,
        type: entry.initiatorType,
        durationMs: Math.round(entry.duration),
        transferBytes: Math.round(entry.transferSize || 0)
      }))
      .sort((left, right) => right.durationMs - left.durationMs)
      .slice(0, 12)
  );

  check('home-ready', report.measurements.homeReadyMs, budgets.homeReadyMs);
  check('detail-skeleton-immediate', report.measurements.detailSkeletonMs, budgets.detailSkeletonMs);
  check('detail-ready', report.measurements.detailReadyMs, budgets.detailReadyMs);
  check('menu-skeleton-immediate', report.measurements.menuSkeletonMs, budgets.menuSkeletonMs);
  check('menu-ready', report.measurements.menuReadyMs, budgets.menuReadyMs);
  check('menu-back-immediate', report.measurements.menuBackMs, budgets.menuBackMs);
  check('home-dom-budget', report.measurements.homeDomNodes, budgets.homeDomNodes);
  check('detail-dom-budget', report.measurements.detailDomNodes, budgets.detailDomNodes);
  check('menu-dom-budget', report.measurements.menuDomNodes, budgets.menuDomNodes);
  check('single-long-task-budget', report.measurements.maxLongTaskMs, budgets.maxLongTaskMs);
  check('total-long-task-budget', report.measurements.totalLongTaskMs, budgets.totalLongTaskMs);
  exactCheck('broken-visible-menu-images', report.measurements.brokenVisibleMenuImages, 0);
  exactCheck('relevant-network-failures', report.relevantNetworkFailures.length, 0);
  exactCheck('page-errors', report.errors.length, 0);
  exactCheck('detail-restored-after-back', report.measurements.detailRestoredAfterBack, true);
  report.success = report.checks.every((item) => item.ok);
  await page.screenshot({path: 'browser-customer-performance-budget.png', fullPage: false, timeout: 5000})
    .catch(error => { report.screenshotWarning = error.message; });
} catch (error) {
  report.failure = error.stack || String(error);
  await page.screenshot({path: 'browser-customer-performance-budget-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('browser-customer-performance-budget-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
