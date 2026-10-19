import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
let playwright;
try { playwright = await import('playwright'); }
catch { playwright = await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright/index.mjs')).href); }
const origin = new URL(process.env.MARKET_TEST_ORIGIN || 'http://127.0.0.1:4201').origin;
assert.ok(['127.0.0.1', 'localhost', 'preview.daedongmap.com'].includes(new URL(origin).hostname), 'Preview/isolated QA only');
const output = process.env.OUTPUT_DIR || 'tmp/neighbor-market-entry';
await fs.mkdir(output, {recursive:true});
const browser = await playwright.chromium.launch({headless:true}), results = [];
const photos = ['camera', 'books', 'bag'].map(name => path.resolve('assets/neighbor-market/' + name + '.webp'));
async function record(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('matjido-neighbor-market-preview-v1', 1);
    request.onsuccess = () => {const db = request.result, read = db.transaction('drafts').objectStore('drafts').get('owner-draft');read.onsuccess = () => {resolve(read.result);db.close();};read.onerror = () => reject(read.error);};
    request.onerror = () => reject(request.error);
  }));
}
async function ready(page) {await page.waitForFunction(() => !document.getElementById('startMarket').disabled);}
async function entry(page, source, action) {
  await page.goto(origin + source, {waitUntil:'load'});
  // A real scroll gesture releases the existing fresh-entry top-position guard.
  // Programmatic scrollIntoView alone is intentionally ignored by that guard.
  if (!source.includes('store-alley')) {
    await page.mouse.wheel(0, 500);
    await page.waitForFunction(() => !document.documentElement.classList.contains('daedong-fresh-entry-settling'));
  }
  const section = page.locator('.matjido-neighbor-entry');
  await section.scrollIntoViewIfNeeded();
  await section.getByRole('link').first().click({trial:true});
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  assert.match(await section.innerText(), /실제 판매·결제·배송은 발생하지 않습니다/);
  for (const link of await section.getByRole('link').all()) {
    const rect = await link.boundingBox(), size = page.viewportSize();assert.ok(rect.height >= 44 && rect.x >= 0 && rect.x + rect.width <= size.width + 1 && rect.y >= 0 && rect.y + rect.height <= size.height, JSON.stringify(rect));
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  if (source.includes('store-alley')) assert.equal(await page.locator('.shop').count(), 4);
  else {
    assert.equal(await page.locator('.matjido-online-store-entry').getAttribute('href'), 'store-partner/');
    assert.match(await page.locator('#usedMarketBtn').textContent(), /당근·번개장터·중고나라/);
  }
  await section.screenshot({path:path.join(output, (source.includes('store-alley') ? 'alley' : 'home') + '-' + page.viewportSize().width + '.png'),animations:'disabled'});
  await section.getByRole('link', {name:action === 'create' ? '내 장터 만들기' : '이웃 중고장터 구경하기', exact:true}).click();
  await page.waitForURL('**/neighbor-market/index.html?**');await ready(page);
}
try {
  for (const width of [390, 1280, 320]) {
    const context = await browser.newContext({viewport:{width,height:width === 320 ? 568 : width === 390 ? 844 : 900},isMobile:width < 500,hasTouch:width < 500,locale:'ko-KR',serviceWorkers:'block'});
    const errors = [], suppressed = [];
    await context.addInitScript(() => {
      sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1','1');
      sessionStorage.setItem('daedongCommunityIntroPlayedV4','1');
    });
    await context.route('**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (!['GET','HEAD'].includes(request.method())) {suppressed.push({method:request.method(),path:url.pathname});return route.fulfill({status:204,body:''});}
      if (url.origin === origin) return route.continue();
      if (url.origin === 'https://daedong-yeosu-data-api-preview.sisakim.workers.dev' && /^\/api\/(catalog(?:\/bootstrap)?|services|store\/[a-f0-9]+(?:\/menu)?)$/.test(url.pathname)
        || url.origin === 'https://daedong-yeosu-admin.sisakim.chatgpt.site' && url.pathname.startsWith('/api/native/public/')) {
        try {
          const response = await route.fetch({headers:{...request.headers(),origin:'https://preview.daedongmap.com'}});
          await route.fulfill({response,headers:{...response.headers(),'access-control-allow-origin':origin}});
        } catch {try {await route.abort();} catch {}}
        return;
      }
      suppressed.push({method:request.method(),path:url.pathname});return route.fulfill({status:204,body:''});
    });
    const page = await context.newPage();page.on('pageerror', error => errors.push(error.message));page.on('dialog', dialog => dialog.dismiss());
    await entry(page, '/index.html', 'browse');
    assert.equal(await page.locator('#makerDialog').evaluate(node => node.open), false);
    assert.equal(await page.locator('.product-card').count(), 6);assert.equal(await record(page), undefined);
    await page.locator('[data-product-id="sample-0"]').click();await page.locator('#addToBasket').click();
    assert.match(await page.locator('#detailFeedback').innerText(), /전체 1점/);await page.locator('#reviewBasket').click();
    await page.locator('#basketItems button').click();assert.match(await page.locator('#basketSummary').innerText(), /0점.*0원/);
    await page.goBack();assert.equal(new URL(page.url()).pathname, '/index.html');
    await entry(page, '/index.html', 'create');
    assert.equal(await page.locator('#makerDialog').evaluate(node => node.open), true);
    assert.equal(await page.locator('.price-input').count(), 0);assert.equal(await record(page), undefined);
    assert.equal(await page.locator('#photos').getAttribute('capture'), null);
    await page.locator('#photos').setInputFiles(photos);
    await page.waitForFunction(() => document.querySelectorAll('.price-input').length === 3 && !document.getElementById('buildMarket').disabled);
    for (const [index, price] of [12000,9000,0].entries()) await page.locator('.price-input').nth(index).fill(String(price));
    await page.locator('#buildMarket').click();await page.waitForFunction(() => !document.getElementById('makerDialog').open);
    assert.match(await page.locator('#saveStatus').innerText(), /이 기기에 저장 완료/);
    const saved = await record(page);assert.deepEqual(saved.scene.items.map(item => item.price), [12000,9000,0]);
    await page.goto(origin + '/neighbor-market/index.html');await ready(page);assert.equal(await page.locator('.product-card').count(), 3);
    for (const source of ['/index.html', '/store-alley/index.html']) {
      await entry(page, source, 'browse');
      assert.equal(await page.locator('.product-card').count(), 6, 'Browse explicitly shows examples, not the saved owner draft');
      assert.equal(await page.locator('#makerDialog').evaluate(node => node.open), false);assert.deepEqual(await record(page), saved);
      await entry(page, source, 'create');
      assert.equal(await page.locator('#makerDialog').evaluate(node => node.open), true);
      assert.equal(await page.locator('.price-input').count(), 3, 'Existing photo/price draft must be preserved');
      assert.deepEqual(await record(page), saved);await page.locator('#closeMaker').click();assert.deepEqual(await record(page), saved);
    }
    assert.deepEqual(errors, []);results.push({width,homeAndAlleyBrowseAndCreate:true,threePhotoSaveAndRestore:true,browseDoesNotOverwriteDraft:true,createDoesNotAutoSaveOrClear:true,basketAddAndDelete:true,errors,suppressedRequests:suppressed,transmittedWrites:0});
    await context.close();
  }
  const context = await browser.newContext({viewport:{width:390,height:844},serviceWorkers:'block'});
  await context.addInitScript(() => Object.defineProperty(window,'indexedDB',{get(){throw Error('unavailable in isolated test');}}));
  await context.route('**/*', route => new URL(route.request().url()).origin === origin && ['GET','HEAD'].includes(route.request().method()) ? route.continue() : route.abort());
  const page = await context.newPage();await page.goto(origin + '/neighbor-market/index.html?action=create');await ready(page);
  assert.equal(await page.locator('#makerDialog').evaluate(node => node.open), true);assert.equal(await page.locator('#previewWithoutSave').isVisible(), true);
  assert.match(await page.locator('#saveStatus').innerText(), /이전 자료를 덮어쓰지/);await context.close();
  await fs.writeFile(path.join(output,'report.json'),JSON.stringify({success:true,origin,results,unavailableStorageSafe:true,limits:'Mobile-size Chromium QA, not a physical phone. Test photo storage is browser-local. Non-read requests are intercepted, not transmitted. No real sales/payment/dispatch or production changes.'},null,2));
  console.log('PASS neighbor entry browser: home/alley browse and create, 390/1280/320 layouts, 3-photo save, existing draft unchanged, basket add/delete, unavailable storage, no transmitted writes');
} catch (error) {console.error(error);throw error;} finally {await browser.close();}
