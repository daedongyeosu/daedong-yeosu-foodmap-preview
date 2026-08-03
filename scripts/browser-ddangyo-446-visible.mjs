import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const playwright = await import('playwright').catch(() => {
  const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (!runtimeModules) throw new Error('playwright 패키지를 찾을 수 없습니다.');
  return import(pathToFileURL(path.join(runtimeModules, 'playwright', 'index.mjs')).href);
});
const {chromium} = playwright;

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const report = {success: false, checks: [], errors: []};
const browser = await chromium.launch({headless: true});
const context = await browser.newContext({viewport: {width: 390, height: 844}, locale: 'ko-KR'});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));

const check = async (condition, message) => {
  const ok = await condition;
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};

const targets = [
  {
    id: 'f7385d8006310630',
    name: '국민학교',
    itemCount: 55,
    serviceTexts: ['매일 오후 03:00 ~ 익일 오전 01:00', '땡겨요 · 여수섬섬페이 사용 가능 확인'],
    screenshot: '/tmp/browser-ddangyo-school.png'
  },
  {
    id: '6390834d3238c3eb',
    name: '황금아구 미평점',
    itemCount: 17,
    serviceTexts: ['휴무 매주 일요일', '브레이크 타임 평일 오후 03:00 ~ 오후 05:00', '땡겨요 · 고유가 피해지원금 사용 가능 확인', '땡겨요 · 여수섬섬페이 사용 가능 확인', '땡겨요 · 무료배달 확인'],
    screenshot: '/tmp/browser-ddangyo-hwang.png'
  },
  {
    id: '2b78b30bde243ae6',
    name: '바른보쌈1990 여수웅천점',
    itemCount: 40,
    serviceTexts: ['매일 오전 10:30 ~ 오후 09:30', '땡겨요 · 여수섬섬페이 사용 가능 확인'],
    screenshot: '/tmp/browser-ddangyo-bareun.png'
  },
  {
    id: '884d23981fd2429a',
    name: '네네치킨 둔덕미평점',
    itemCount: 58,
    serviceTexts: ['시간 미확인'],
    screenshot: '/tmp/browser-ddangyo-nene.png'
  }
];

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('#storeGrid .store-card', {timeout: 15000});
  await page.waitForFunction(() => window.daedongDdangyoPreviewReport?.inputStores === 561, null, {timeout: 30000});
  await page.evaluate(() => window.daedongStoreServiceInfo.ready);
  await check(page.evaluate(() => Object.keys(window.DAEDONG_DDANGYO_MENU_STORES || {}).length === 713), '브라우저에 땡겨요 메뉴 713곳 로드');
  await check(page.evaluate(() => window.daedongDdangyoPreviewReport?.matchedExisting === 430), '기존 가게 430곳 보강');
  await check(page.evaluate(() => window.daedongDdangyoPreviewReport?.createdStores === 131), '신규 가게 131곳 생성');

  const buttonAudit = await page.evaluate(async () => {
    const failures = [];
    const ids = Object.keys(window.DAEDONG_DDANGYO_MENU_STORES || {});
    for (const id of ids) {
      const store = typeof fxStoreById === 'function' ? fxStoreById(id) : null;
      if (!store) {
        failures.push({id, reason: 'store-not-found'});
        continue;
      }
      openStore(store);
      await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      const detail = document.querySelector(`#modalContent .store-detail[data-store-id="${id}"]`);
      const button = detail?.querySelector(`[data-store-menu-preview="${id}"]`);
      if (!detail || !button) failures.push({id, reason: detail ? 'button-not-found' : 'detail-not-found'});
    }
    return {count: ids.length, failures};
  });
  report.buttonAudit = buttonAudit;
  await check(Promise.resolve(buttonAudit.count === 713 && buttonAudit.failures.length === 0), '713곳 가게화면 음식보기 버튼 전수 확인');

  for (const target of targets) {
    await page.evaluate(id => openStore(fxStoreById(id)), target.id);
    const detail = page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${target.id}"]`);
    await detail.waitFor({state: 'visible', timeout: 5000});
    const detailText = await detail.innerText();
    for (const text of target.serviceTexts) {
      await check(Promise.resolve(detailText.includes(text)), `${target.name} 가게화면: ${text}`);
    }
    const route = await page.evaluate(id => fxStoreById(id).routes.find(item => String(item.name).includes('땡겨요'))?.url || '', target.id);
    await check(Promise.resolve(Boolean(route)), `${target.name} 기존 땡겨요 주문경로 유지`);
    await page.evaluate(id => document.querySelector(`[data-store-menu-preview="${id}"]`).click(), target.id);
    const preview = page.locator('[data-store-menu-overlay]:not([hidden]) .store-menu-preview');
    await preview.waitFor({state: 'visible', timeout: 5000});
    await check(page.locator('[data-menu-result-count]').innerText().then(value => Number(value.trim()) === target.itemCount), `${target.name} 음식보기 ${target.itemCount}개`);
    await check(page.locator('[data-menu-card]').count().then(count => count === target.itemCount), `${target.name} 메뉴 카드 전부 렌더링`);
    await check(preview.innerText().then(text => text.includes('가격은 표시하지 않습니다.')), `${target.name} 가격 미표시 안내`);
    await page.screenshot({path: target.screenshot, fullPage: false});
    await page.evaluate(() => document.querySelector('[data-menu-preview-close]')?.click());
    await page.waitForFunction(() => document.querySelector('[data-store-menu-overlay]')?.hidden === true);
  }

  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
  await page.screenshot({path: '/tmp/browser-ddangyo-446-visible-failure.png', fullPage: false}).catch(() => {});
} finally {
  fs.writeFileSync('/tmp/browser-ddangyo-446-visible-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

if (!report.success) process.exit(1);
