import path from 'node:path';
import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';

async function loadChromium() {
  try { return (await import('playwright')).chromium; }
  catch {}
  const moduleRoot = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (!moduleRoot) throw new Error('playwright 패키지를 찾을 수 없습니다.');
  return (await import(pathToFileURL(path.join(moduleRoot, 'playwright', 'index.mjs')).href)).chromium;
}

const chromium = await loadChromium();
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const previousStoreId = '996f54c7c66ec979';
const requestedStoreId = '10db3b0db6ebf8c5';
const report = {success: false, checks: [], errors: []};
const outputDir = process.env.OUTPUT_DIR;
if (outputDir) await fs.mkdir(outputDir, {recursive: true});
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({
  viewport: {width: 390, height: 844},
  isMobile: true,
  hasTouch: true,
  serviceWorkers: 'block',
  locale: 'ko-KR',
  userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.6.0',
});

const stores = [
  {
    id: previousStoreId,
    store_id: previousStoreId,
    name: '등뼈감자탕 미평점',
    district: '미평,둔덕',
    category: '한식',
    categories: ['한식'],
    image: 'assets/store-placeholder.svg',
    images: [{card: 'assets/store-placeholder.svg', detail: 'assets/store-placeholder.svg'}],
    channelKeys: ['phone'],
    routes: [{name: '전화주문', key: 'phone', url: 'tel:0610000000', enabled: true}],
  },
  {
    id: requestedStoreId,
    store_id: requestedStoreId,
    name: '맘스터치 문수점',
    district: '여서,문수',
    category: '햄버거/샌드위치/토스트/핫도그',
    categories: ['햄버거/샌드위치/토스트/핫도그'],
    image: 'assets/notion-recovery-180/10db3b0db6ebf8c5/01.jpg',
    images: [{card: 'assets/notion-recovery-180/10db3b0db6ebf8c5/01.jpg', detail: 'assets/notion-recovery-180/10db3b0db6ebf8c5/01.jpg'}],
    channelKeys: ['mukkebi'],
    routes: [{name: '먹깨비', key: 'mukkebi', url: 'https://example.com/mukkebi', enabled: true}],
  },
];

if (/^https?:\/\/(?:127\.0\.0\.1|localhost)/.test(baseURL)) {
  const json = body => ({status: 200, contentType: 'application/json', body: JSON.stringify(body)});
  await context.route('**/api/catalog', route => route.fulfill(json(stores)));
  await context.route('**/api/services', route => route.fulfill(json({programs: [], stores: {}})));
  await context.route('**/api/store/*', route => {
    const storeId = route.request().url().split('/').pop();
    route.fulfill(json(stores.find(store => store.id === storeId) || null));
  });
}

await context.addInitScript(({previousStoreId, requestedStoreId}) => {
  sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1', '1');
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  Object.defineProperty(window, 'launchQueue', {
    configurable: true,
    value: {
      setConsumer(consumer) {
        window.__daedongTestLaunchConsumer = consumer;
      },
    },
  });
  if (new URLSearchParams(location.search).get('hero') !== requestedStoreId) return;
  const returnToken = 'stale-previous-store-return';
  const savedAt = Date.now();
  const staleHtml = `
    <div class="modal-card">
      <button class="modal-close" type="button">×</button>
      <article class="store-detail" data-store-id="${previousStoreId}">
        <h2>등뼈감자탕 미평점</h2>
      </article>
    </div>`;
  const saved = JSON.stringify({
    storeId: previousStoreId,
    returnToken,
    savedAt,
    pageScroll: 0,
    modalScroll: 0,
    storeSnapshot: {html: staleHtml, scrollTop: 0},
  });
  const marker = JSON.stringify({returnToken, savedAt});
  for (const storage of [sessionStorage, localStorage]) {
    storage.setItem('daedongExternalReturnRc2', saved);
    storage.setItem('daedongExternalAppDepartureV1', marker);
  }
  sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1', '1');
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
}, {previousStoreId, requestedStoreId});

try {
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto(`${baseURL}?source=android-app&hero=${previousStoreId}`, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => window.daedongCatalogReady && typeof window.openStore === 'function' && typeof window.fxStoreById === 'function', null, {timeout: 15000});
  await page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${previousStoreId}"]`).waitFor({timeout: 15000});
  report.checks.push('설치 앱에서 기존 가게 팝업 표시');
  await page.waitForFunction(() => typeof window.__daedongTestLaunchConsumer === 'function');
  report.checks.push('설치 앱의 두 번째 실행 주소 수신 준비');
  await page.evaluate(targetURL => {
    window.__daedongTestLaunchConsumer({targetURL});
  }, `${baseURL}?hero=${requestedStoreId}&source=android-app`);
  await page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${requestedStoreId}"]`).waitFor({timeout: 15000});
  report.checks.push('설치 앱에서 다른 가게 QR을 다시 열면 새 주소로 전환');
  const opened = await page.evaluate(({previousStoreId, requestedStoreId}) => ({
    activeStoreId: document.querySelector('#modal')?.dataset.activeStoreId,
    previousVisible: Boolean(document.querySelector(`#modal:not([hidden]) .store-detail[data-store-id="${previousStoreId}"]`)),
    requestedVisible: Boolean(document.querySelector(`#modal:not([hidden]) .store-detail[data-store-id="${requestedStoreId}"]`)),
    pendingReturn: Boolean(window.daedongPendingExternalReturn),
  }), {previousStoreId, requestedStoreId});
  if (!opened.requestedVisible || opened.previousVisible || opened.activeStoreId !== requestedStoreId || opened.pendingReturn) {
    throw new Error(`새 QR가 이전 가게 상태를 완전히 대체하지 못했습니다: ${JSON.stringify(opened)}`);
  }
  report.checks.push('이전 가게 복원 기록이 있어도 새 QR 가게만 표시');
  if (outputDir) await page.screenshot({path: path.join(outputDir, 'new-qr-store.png')});

  await page.locator('#modal .modal-close').tap();
  // Preview and production use different dismissal URL markers. Assert the
  // customer contract (closed and stays closed), not one environment's marker.
  await page.waitForFunction(() => document.querySelector('#modal')?.hidden, null, {timeout: 5000});
  await page.waitForTimeout(2500);
  const closed = await page.evaluate(previousStoreId => ({
    hidden: Boolean(document.querySelector('#modal')?.hidden),
    previousVisible: Boolean(document.querySelector(`#modal:not([hidden]) .store-detail[data-store-id="${previousStoreId}"]`)),
    title: document.querySelector('#modal:not([hidden]) .store-detail h2')?.textContent?.trim() || '',
  }), previousStoreId);
  if (!closed.hidden || closed.previousVisible || closed.title) {
    throw new Error(`새 QR 팝업을 닫은 뒤 이전 가게가 나타났습니다: ${JSON.stringify(closed)}`);
  }
  report.checks.push('새 QR 가게를 닫은 뒤 이전 가게가 다시 나타나지 않음');
  if (outputDir) await page.screenshot({path: path.join(outputDir, 'closed-qr-store.png')});
  report.success = report.errors.length === 0;
} catch (error) {
  report.errors.push(error.message);
} finally {
  await browser.close();
}

console.log(JSON.stringify(report, null, 2));
if (outputDir) await fs.writeFile(path.join(outputDir, 'report.json'), JSON.stringify(report, null, 2));
if (!report.success) process.exitCode = 1;
