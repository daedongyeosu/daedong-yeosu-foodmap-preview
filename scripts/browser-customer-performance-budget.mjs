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
const cpuSlowdown = numberFromEnv('PERF_CPU_SLOWDOWN', 4);
const budgets = {
  homeReadyMs: numberFromEnv('PERF_HOME_READY_MS', 7500),
  detailSkeletonMs: numberFromEnv('PERF_DETAIL_SKELETON_MS', 250),
  detailReadyMs: numberFromEnv('PERF_DETAIL_READY_MS', 3000),
  menuSkeletonMs: numberFromEnv('PERF_MENU_SKELETON_MS', 250),
  menuReadyMs: numberFromEnv('PERF_MENU_READY_MS', 3500),
  menuBackMs: numberFromEnv('PERF_MENU_BACK_MS', 700),
  detailCloseMs: numberFromEnv('PERF_DETAIL_CLOSE_MS', 300),
  repeatMenuReadyMs: numberFromEnv('PERF_REPEAT_MENU_READY_MS', 1800),
  homeDomNodes: numberFromEnv('PERF_HOME_DOM_NODES', 1600),
  detailDomNodes: numberFromEnv('PERF_DETAIL_DOM_NODES', 2500),
  menuDomNodes: numberFromEnv('PERF_MENU_DOM_NODES', 3500),
  homeStoreCards: numberFromEnv('PERF_HOME_STORE_CARDS', 16),
  menuCardsAtReady: numberFromEnv('PERF_MENU_CARDS_AT_READY', 12),
  loadedMenuImagesAfterIdle: numberFromEnv('PERF_LOADED_MENU_IMAGES_AFTER_IDLE', 24),
  homeTransferBytes: numberFromEnv('PERF_HOME_TRANSFER_BYTES', 6 * 1024 * 1024),
  totalTransferBytes: numberFromEnv('PERF_TOTAL_TRANSFER_BYTES', 10 * 1024 * 1024),
  maxLongTaskMs: numberFromEnv('PERF_MAX_LONG_TASK_MS', 1000),
  totalLongTaskMs: numberFromEnv('PERF_TOTAL_LONG_TASK_MS', 4000)
};

const report = {
  success: false,
  baseURL,
  targetStoreId,
  profile: {viewport: '390x844', network: 'Fast 4G', cpuSlowdown},
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
  window.__qaRawPhotoMutations = [];
  const recordRawPhotos = (root) => {
    const images = root instanceof HTMLImageElement ? [root] : [...(root?.querySelectorAll?.('img') || [])];
    for (const image of images) {
      const src = image.getAttribute('src') || '';
      if (!/\/(?:notion-recovery-180|notion-store-photos|store-photos|brand-apps)\/.*\.(?:png|jpe?g|gif)(?:[?#]|$)/i.test(src)) continue;
      window.__qaRawPhotoMutations.push({src, className: image.className, parentClassName: image.parentElement?.className || ''});
    }
  };
  addEventListener('DOMContentLoaded', () => {
    recordRawPhotos(document);
    new MutationObserver(records => records.forEach(record => {
      if (record.type === 'attributes') recordRawPhotos(record.target);
      record.addedNodes.forEach(recordRawPhotos);
    })).observe(document.documentElement, {subtree: true, childList: true, attributes: true, attributeFilter: ['src']});
  }, {once: true});
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
await cdp.send('Emulation.setCPUThrottlingRate', {rate: cpuSlowdown});

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
  report.measurements.homeTransferBytes = await page.evaluate(() => Math.round(
    performance.getEntriesByType('resource').reduce((sum, entry) => sum + (entry.transferSize || 0), 0)
  ));
  await page.waitForFunction((storeId) => Boolean(window.fxStoreById?.(storeId)), targetStoreId, {timeout: 45000});

  await page.evaluate((storeId) => {
    window.__qaDetailStart = performance.now();
    window.__qaDetailSkeletonAt = null;
    window.__qaDetailReadyAt = null;
    const observer = new MutationObserver(() => {
      if (document.querySelector(`#modal:not([hidden]) .store-detail-loading[data-store-id="${storeId}"]`)) {
        window.__qaDetailSkeletonAt ??= performance.now();
      }
      if (document.querySelector(`#modal:not([hidden]) .store-detail:not(.store-detail-loading)[data-store-id="${storeId}"]`)) {
        window.__qaDetailReadyAt ??= performance.now();
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
  await page.waitForFunction(() => window.__qaDetailReadyAt !== null, null, {timeout: 10000});
  report.measurements.detailReadyMs = await page.evaluate(() => Math.round(window.__qaDetailReadyAt - window.__qaDetailStart));
  report.measurements.detailDomNodes = await domNodes();

  const menuButton = page.locator(`[data-store-menu-preview="${targetStoreId}"]`);
  if (!await menuButton.isVisible()) throw new Error(`menu preview button is not visible: ${targetStoreId}`);
  const menuStartedAt = performance.now();
  // Exercise the application's delegated click path without letting
  // Playwright's actionability polling become the measured bottleneck.
  await menuButton.evaluate(button => button.click());
  await page.waitForFunction((storeId) => Boolean(
    document.querySelector('[data-store-menu-overlay]:not([hidden]) .store-menu-loading')
      || document.querySelector(`[data-store-menu-overlay]:not([hidden]) .store-menu-preview[data-store-id="${storeId}"]`)
  ), targetStoreId, {timeout: 1000});
  report.measurements.menuSkeletonMs = elapsed(menuStartedAt);
  await page.waitForSelector(`[data-store-menu-overlay]:not([hidden]) .store-menu-preview[data-store-id="${targetStoreId}"]`, {timeout: 12000});
  report.measurements.menuReadyMs = elapsed(menuStartedAt);
  report.measurements.menuDomNodes = await domNodes();
  report.measurements.menuCardsAtReady = await page.locator('[data-store-menu-overlay]:not([hidden]) [data-menu-card]').count();

  await page.waitForTimeout(1200);
  report.measurements.menuCardsAfterIdle = await page.locator('[data-store-menu-overlay]:not([hidden]) [data-menu-card]').count();
  const menuImageState = await page.locator('[data-store-menu-overlay]:not([hidden]) [data-menu-card] img').evaluateAll((images) => {
    const scroll = document.querySelector('[data-store-menu-overlay]:not([hidden]) .store-menu-scroll');
    const viewport = scroll?.getBoundingClientRect();
    const intersectsViewport = (image) => {
      if (!viewport) return false;
      const rect = image.getBoundingClientRect();
      return rect.bottom >= viewport.top && rect.top <= viewport.bottom
        && rect.right >= viewport.left && rect.left <= viewport.right;
    };
    return {
      total: images.length,
      loaded: images.filter((image) => image.hasAttribute('src')).length,
      visible: images.filter(intersectsViewport).length,
      brokenVisible: images.filter((image) => intersectsViewport(image)
        && image.hasAttribute('src') && image.complete && image.naturalWidth === 0).length
    };
  });
  report.measurements.totalMenuImagesAfterIdle = menuImageState.total;
  report.measurements.loadedMenuImagesAfterIdle = menuImageState.loaded;
  report.measurements.visibleMenuImagesAfterIdle = menuImageState.visible;
  report.measurements.brokenVisibleMenuImages = menuImageState.brokenVisible;
  await page.locator('[data-store-menu-overlay]:not([hidden]) .store-menu-scroll').evaluate((scroll) => {
    scroll.scrollTop = scroll.scrollHeight;
  });
  await page.waitForFunction((initialCount) => document.querySelectorAll(
    '[data-store-menu-overlay]:not([hidden]) [data-menu-card]'
  ).length > initialCount, report.measurements.menuCardsAtReady, {timeout: 2500});
  report.measurements.menuCardsAfterScroll = await page.locator(
    '[data-store-menu-overlay]:not([hidden]) [data-menu-card]'
  ).count();
  report.measurements.progressiveMenuChunkAfterScroll = report.measurements.menuCardsAfterScroll
    > report.measurements.menuCardsAtReady;

  const menuCloseStartedAt = performance.now();
  await page.locator('[data-store-menu-overlay]:not([hidden]) [data-menu-preview-close]').last().dispatchEvent('pointerdown', {
    pointerType: 'touch',
    isPrimary: true,
    button: 0
  });
  await page.waitForFunction(() => document.querySelector('[data-store-menu-overlay]')?.hidden === true, null, {timeout: 1000});
  report.measurements.menuCloseMs = elapsed(menuCloseStartedAt);
  await page.waitForFunction(() => !document.documentElement.dataset.daedongMenuHistoryClose
    && !history.state?.daedongMenuPreview, null, {timeout: 2000});

  const repeatMenuStartedAt = performance.now();
  await menuButton.evaluate(button => button.click());
  await page.waitForSelector(`[data-store-menu-overlay]:not([hidden]) .store-menu-preview[data-store-id="${targetStoreId}"]`, {timeout: 12000});
  report.measurements.repeatMenuReadyMs = elapsed(repeatMenuStartedAt);

  const backStartedAt = performance.now();
  await page.goBack({waitUntil: 'commit'}).catch(() => {});
  await page.waitForFunction(() => document.querySelector('[data-store-menu-overlay]')?.hidden === true, null, {timeout: 3000});
  report.measurements.menuBackMs = elapsed(backStartedAt);
  report.measurements.detailRestoredAfterBack = await page.locator(
    `#modal:not([hidden]) .store-detail[data-store-id="${targetStoreId}"]`
  ).isVisible();

  const detailCloseStartedAt = performance.now();
  await page.locator('#modal:not([hidden]) .modal-close').dispatchEvent('pointerdown', {
    pointerType: 'touch',
    isPrimary: true,
    button: 0
  });
  await page.waitForTimeout(50);
  report.measurements.detailCloseStateAfter50Ms = await page.evaluate(() => ({
    hidden: document.querySelector('#modal')?.hidden === true,
    activeStoreId: document.querySelector('#modal')?.dataset.activeStoreId || '',
    historyState: history.state || null,
    bodyClasses: document.body.className
  }));
  await page.waitForFunction(() => document.querySelector('#modal')?.hidden === true, null, {timeout: 1000});
  report.measurements.detailCloseMs = elapsed(detailCloseStartedAt);

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
  report.measurements.rawPhotoRequests = await page.evaluate(() => {
    const rawPattern = /\/(?:notion-recovery-180|notion-store-photos|store-photos|brand-apps)\/.*\.(?:png|jpe?g|gif)(?:[?#]|$)/i;
    return performance.getEntriesByType('resource')
      .filter(entry => rawPattern.test(entry.name))
      .map(entry => entry.name);
  });
  report.measurements.rawPhotoElements = await page.evaluate(() => [...document.images]
    .filter(image => /\/(?:notion-recovery-180|notion-store-photos|store-photos|brand-apps)\/.*\.(?:png|jpe?g|gif)(?:[?#]|$)/i.test(image.currentSrc || image.src))
    .map(image => ({src: image.currentSrc || image.src, className: image.className, parentClassName: image.parentElement?.className || ''})));
  report.measurements.rawPhotoMutations = await page.evaluate(() => window.__qaRawPhotoMutations || []);
  report.measurements.oversizedImageRequests = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .filter(entry => entry.initiatorType === 'img' && (entry.transferSize || 0) > 260 * 1024)
      .map(entry => ({url: entry.name, transferBytes: Math.round(entry.transferSize || 0)}))
  );

  check('home-ready', report.measurements.homeReadyMs, budgets.homeReadyMs);
  check('detail-skeleton-immediate', report.measurements.detailSkeletonMs, budgets.detailSkeletonMs);
  check('detail-ready', report.measurements.detailReadyMs, budgets.detailReadyMs);
  check('menu-skeleton-immediate', report.measurements.menuSkeletonMs, budgets.menuSkeletonMs);
  check('menu-ready', report.measurements.menuReadyMs, budgets.menuReadyMs);
  check('menu-back-immediate', report.measurements.menuBackMs, budgets.menuBackMs);
  check('detail-close-immediate', report.measurements.detailCloseMs, budgets.detailCloseMs);
  check('repeat-menu-ready', report.measurements.repeatMenuReadyMs, budgets.repeatMenuReadyMs);
  check('home-dom-budget', report.measurements.homeDomNodes, budgets.homeDomNodes);
  check('detail-dom-budget', report.measurements.detailDomNodes, budgets.detailDomNodes);
  check('menu-dom-budget', report.measurements.menuDomNodes, budgets.menuDomNodes);
  check('home-store-card-budget', report.measurements.homeStoreCards, budgets.homeStoreCards);
  check('menu-cards-at-ready-budget', report.measurements.menuCardsAtReady, budgets.menuCardsAtReady);
  check('loaded-menu-images-after-idle-budget', report.measurements.loadedMenuImagesAfterIdle, budgets.loadedMenuImagesAfterIdle);
  check('home-transfer-budget', report.measurements.homeTransferBytes, budgets.homeTransferBytes);
  check('total-transfer-budget', report.measurements.transferBytes, budgets.totalTransferBytes);
  check('single-long-task-budget', report.measurements.maxLongTaskMs, budgets.maxLongTaskMs);
  check('total-long-task-budget', report.measurements.totalLongTaskMs, budgets.totalLongTaskMs);
  exactCheck('broken-visible-menu-images', report.measurements.brokenVisibleMenuImages, 0);
  exactCheck('raw-photo-requests', report.measurements.rawPhotoRequests.length, 0);
  exactCheck('oversized-image-requests', report.measurements.oversizedImageRequests.length, 0);
  exactCheck('progressive-menu-chunk-after-scroll', report.measurements.progressiveMenuChunkAfterScroll, true);
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
  await context.unrouteAll({behavior: 'ignoreErrors'}).catch(() => {});
  await browser.close();
}

if (!report.success) process.exit(1);
