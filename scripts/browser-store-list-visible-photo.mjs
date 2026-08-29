import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const loadBrowserRuntime = async () => {
  try {
    const playwright = await import('playwright');
    return playwright.chromium;
  } catch {}
  const runtimeModules = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
  if (!runtimeModules) throw new Error('playwright 패키지를 찾을 수 없습니다.');
  const playwright = await import(pathToFileURL(path.join(runtimeModules, 'playwright', 'index.mjs')).href);
  return playwright.chromium;
};

const chromium = await loadBrowserRuntime();
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const photo = 'assets/app-icons/daedong-app-icon-512.png';
const stores = Array.from({length: 18}, (_, index) => ({
  store_id: `visible-photo-${String(index + 1).padStart(2, '0')}`,
  name: `가로 사진 검증 가게 ${index + 1}`,
  district: '여서동',
  category: '한식',
  categories: ['한식'],
  image: photo,
  lat: 34.75 + index / 10000,
  lng: 127.7 + index / 10000,
  channelKeys: ['phone'],
  routes: [{name:'전화주문', key:'phone', url:'tel:0610000000', enabled:true}]
}));

const report = {success:false, checks:[], errors:[]};
const browser = await chromium.launch({
  headless:true,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath:process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})
});
const context = await browser.newContext({
  viewport:{width:390,height:844},
  isMobile:true,
  hasTouch:true,
  locale:'ko-KR',
  userAgent:'Mozilla/5.0 (Linux; Android 15; SM-S938N) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.7.2'
});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV2', '1');
});
await context.route('**/api/events', route => route.fulfill({status:204,body:''}));
await context.route('**/*.woff2', route => route.abort());
await context.route('**/api/catalog', route => route.fulfill({
  status:200,
  contentType:'application/json',
  body:JSON.stringify(stores)
}));
await context.route('**/api/services', route => route.fulfill({
  status:200,
  contentType:'application/json',
  body:JSON.stringify({programs:[],stores:{}})
}));

const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));
try {
  await page.goto(`${baseURL}?visible-photo-test=1`, {waitUntil:'domcontentloaded'});
  await page.locator('#storeGrid .store-card').nth(8).waitFor({state:'attached', timeout:15000});
  await page.locator('#storeGrid').evaluate(grid => { grid.scrollLeft = Math.max(0, grid.scrollWidth * .55); });
  await page.waitForTimeout(450);
  const visible = await page.locator('#storeGrid').evaluate(grid => {
    const gridRect = grid.getBoundingClientRect();
    return [...grid.querySelectorAll('.store-card')]
      .filter(card => {
        const rect = card.getBoundingClientRect();
        return rect.right > gridRect.left && rect.left < gridRect.right;
      })
      .map(card => {
        const image = card.querySelector('img.store-photo');
        return {
          name:card.querySelector('h3')?.textContent?.trim() || '',
          src:image?.getAttribute('src') || '',
          deferred:image?.hasAttribute('data-photo-src') || false,
          complete:image?.complete || false,
          naturalWidth:image?.naturalWidth || 0
        };
      });
  });
  const ok = visible.length > 0 && visible.every(item => item.src && !item.deferred && item.complete && item.naturalWidth > 0);
  report.checks.push({message:'가로로 이동해 새로 보이는 모든 가게카드 사진이 실제 src로 로드됨',ok,visible});
  if (!ok) throw new Error('가로 목록의 보이는 카드 사진이 완전히 로드되지 않았습니다.');
  await page.screenshot({path:'browser-store-list-visible-photo.png',fullPage:false});
  report.success = report.errors.length === 0;
} catch (error) {
  report.errors.push(error.message);
} finally {
  fs.writeFileSync('browser-store-list-visible-photo-report.json', `${JSON.stringify(report,null,2)}\n`);
  await browser.close();
}

console.log(JSON.stringify(report,null,2));
if (!report.success) process.exit(1);
