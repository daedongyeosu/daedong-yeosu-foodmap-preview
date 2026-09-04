import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if (!runtimeModules) throw new Error('CODEX_PRIMARY_RUNTIME_NODE_MODULES is required');
const {chromium} = await import(pathToFileURL(path.join(runtimeModules, 'playwright', 'index.mjs')).href);

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const browser = await chromium.launch({headless: true, executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const context = await browser.newContext({viewport: {width: 390, height: 844}, locale: 'ko-KR'});
const page = await context.newPage();
const pageErrors = [];
page.on('pageerror', error => pageErrors.push(error.message));
await page.route('**/api/events', route => route.fulfill({status: 204, body: ''}));

await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
await page.waitForTimeout(700);
const introClose = page.locator('#communityIntroClose');
if (await introClose.isVisible()) await introClose.click();
const section = page.locator('#yeosuLifeSection');
await section.waitFor({state: 'visible', timeout: 10000});

const homeAudit = await page.evaluate(() => ({
  viewport: [window.innerWidth, window.innerHeight],
  orderText: document.querySelector('.order-grid')?.textContent || '',
  highlightCount: document.querySelectorAll('#yeosuLifeHighlights .yeosu-life-highlight').length,
  sectionWidth: document.querySelector('#yeosuLifeSection')?.getBoundingClientRect().width || 0,
  horizontalOverflow: document.documentElement.scrollWidth > document.documentElement.clientWidth
}));
if (homeAudit.viewport.join('x') !== '390x844') throw new Error(`unexpected viewport ${homeAudit.viewport.join('x')}`);
if (/CHAK|섬섬여수페이/.test(homeAudit.orderText)) throw new Error('CHAK leaked into order methods');
if (homeAudit.highlightCount !== 3) throw new Error(`expected 3 highlights, got ${homeAudit.highlightCount}`);
if (homeAudit.sectionWidth > 390 || homeAudit.horizontalOverflow) throw new Error('mobile horizontal overflow detected');

fs.mkdirSync('artifacts', {recursive: true});
await page.evaluate(() => {
  window.daedongMarkHomeInteraction?.();
  document.querySelector('#yeosuLifeSection')?.scrollIntoView({block: 'start'});
});
await page.waitForTimeout(250);
await page.screenshot({path: 'artifacts/yeosu-life-home-390x844.png', fullPage: false});

await page.locator('#chakBenefitBtn').click();
const chakModal = page.locator('#modal:not([hidden]) .chak-guide');
await chakModal.waitFor({state: 'visible'});
const chakText = await chakModal.innerText();
for (const text of ['주문앱이 아닙니다', '최대 20% 혜택', 'CHAK 앱에서 최종 확인', '먹깨비나 땡겨요 주문 결제에 자동으로 적용된다고 표시하지 않습니다.']) {
  if (!chakText.includes(text)) throw new Error(`missing CHAK safeguard: ${text}`);
}
if (await chakModal.locator('[data-life-url]').count() !== 3) throw new Error('CHAK install/official links missing');
await page.screenshot({path: 'artifacts/chak-guide-390x844.png', fullPage: false});

await page.locator('.modal-close').click();
await page.locator('#yeosuLifeMoreBtn').click();
const lifeModal = page.locator('#modal:not([hidden]) .yeosu-life-modal');
await lifeModal.waitFor({state: 'visible'});
if (await lifeModal.locator('.yeosu-life-tabs button').count() !== 6) throw new Error('life news category tabs missing');
await lifeModal.locator('[data-life-filter="교통"]').click();
const trafficText = await page.locator('#modal:not([hidden]) .life-news-list').innerText();
if (!trafficText.includes('여객선 운임 반값') || trafficText.includes('숙박 할인')) throw new Error('category filtering failed');

if (pageErrors.length) throw new Error(`page errors: ${pageErrors.join(' | ')}`);
console.log(JSON.stringify({success: true, homeAudit, pageErrors}, null, 2));
await browser.close();
