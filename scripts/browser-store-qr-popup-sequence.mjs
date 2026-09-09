import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const reportDir = path.resolve(process.env.OUTPUT_DIR || path.join(root, 'artifacts', 'store-qr-popup-sequence'));
const report = {success: false, checks: [], errors: []};
const store = {
  store_id: 'qr-popup-sequence-001',
  id: 'qr-popup-sequence-001',
  name: '가게 QR 순서 검증점',
  district: '여서동',
  area: '여서동',
  category: '한식',
  categories: ['한식'],
  lat: 34.75,
  lng: 127.7,
  phone: '0616512345',
  image: 'assets/app-icons/daedong-app-icon-512.png',
  channelKeys: ['mukkebi', 'phone'],
  routes: [
    {name: '먹깨비', key: 'mukkebi', url: 'https://www.mukkebi.com/store/sequence-test', enabled: true},
    {name: '전화주문', key: 'phone', url: 'tel:0616512345', enabled: true},
  ],
};

const mime = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.mjs', 'application/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.webp', 'image/webp'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.woff2', 'font/woff2'],
]);

function check(condition, message) {
  report.checks.push({message, ok: Boolean(condition)});
  if (!condition) throw new Error(message);
}

const server = http.createServer((request, response) => {
  try {
    const requestPath = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
    const relative = requestPath === '/' ? 'index.html' : requestPath.replace(/^\/+/, '');
    const file = path.resolve(root, relative);
    if (!file.startsWith(`${root}${path.sep}`) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404).end('not found');
      return;
    }
    response.writeHead(200, {'content-type': mime.get(path.extname(file).toLowerCase()) || 'application/octet-stream'});
    fs.createReadStream(file).pipe(response);
  } catch (error) {
    response.writeHead(500).end(String(error));
  }
});

await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(0, '127.0.0.1', resolve);
});

let browser;
try {
  let playwright;
  try { playwright = await import('playwright'); }
  catch (error) {
    const moduleRoot = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
    if (!moduleRoot) throw error;
    playwright = await import(pathToFileURL(path.join(moduleRoot, 'playwright', 'index.mjs')).href);
  }

  fs.mkdirSync(reportDir, {recursive: true});
  browser = await playwright.chromium.launch({
    headless: true,
    ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {}),
  });
  const context = await browser.newContext({
    viewport: {width: 390, height: 844},
    isMobile: true,
    hasTouch: true,
    locale: 'ko-KR',
    serviceWorkers: 'block',
    userAgent: 'Mozilla/5.0 (Linux; Android 15; SM-S938N) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.7.2',
  });
  await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
  await context.route('**/api/catalog**', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify([store])}));
  await context.route('**/api/services**', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({programs: [], stores: {}})}));
  await context.route('**/api/store/**', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(store)}));
  await context.route('**/api/rain-mode**', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({mode: 'normal'})}));
  await context.route('**/*posthog.com/**', route => route.abort());
  await context.route('**/*.woff2', route => route.abort());

  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  const address = server.address();
  const baseURL = `http://127.0.0.1:${address.port}/`;
  await page.goto(`${baseURL}?store=${store.id}`, {waitUntil: 'domcontentloaded'});

  const detail = page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${store.id}"]`);
  await detail.waitFor({state: 'visible', timeout: 15000});
  check(await page.locator('#communityIntro').isHidden(), '가게 상세보다 일반 안내가 먼저 나오지 않음');
  check(await page.locator('#mukkebiSummerEvent').isHidden(), '가게 상세보다 쿠폰 안내가 먼저 나오지 않음');
  await page.screenshot({path: path.join(reportDir, '01-store-detail.png'), fullPage: false});

  await detail.evaluate(element => { element.closest('.modal-card').scrollTop = 120; });
  await page.locator('#modal .modal-close').tap();
  await page.locator('#communityIntro').waitFor({state: 'visible', timeout: 5000});
  check(await page.locator('#modal').isHidden(), '가게 상세를 닫은 뒤 일반 안내가 두 번째로 표시됨');
  check(await page.locator('#mukkebiSummerEvent').isHidden(), '두 번째 안내와 쿠폰 안내가 겹치지 않음');
  await page.screenshot({path: path.join(reportDir, '02-community-intro.png'), fullPage: false});

  await page.locator('#communityIntroClose').tap();
  check(await page.locator('#mukkebiSummerEvent').isHidden(), '일반 안내를 닫자마자 쿠폰이 겹쳐 뜨지 않음');
  await page.locator('#mukkebiSummerEvent').waitFor({state: 'visible', timeout: 5000});
  check(await page.locator('#communityIntro').isHidden(), '쿠폰 안내가 세 번째로 단독 표시됨');
  await page.screenshot({path: path.join(reportDir, '03-mukkebi-coupon.png'), fullPage: false});

  await page.locator('#mukkebiSummerClose').tap();
  await page.waitForTimeout(3400);
  check(await page.locator('#communityIntro').isHidden(), '닫은 일반 안내가 다시 살아나지 않음');
  check(await page.locator('#mukkebiSummerEvent').isHidden(), '닫은 쿠폰 안내가 다시 살아나지 않음');
  check(report.errors.length === 0, '브라우저 오류가 없음');
  report.success = true;
  await context.close();
} catch (error) {
  report.failure = error.stack || String(error);
} finally {
  await browser?.close().catch(() => {});
  await new Promise(resolve => server.close(resolve));
  fs.mkdirSync(reportDir, {recursive: true});
  fs.writeFileSync(path.join(reportDir, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

if (!report.success) process.exit(1);
