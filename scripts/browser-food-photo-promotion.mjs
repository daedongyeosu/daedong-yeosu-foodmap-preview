import {createRequire} from 'node:module';

const require = createRequire(import.meta.url);
const {chromium} = require('playwright');

const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const placeholder = 'assets/app-icons/daedong-app-icon-512.png?v=official-brand-20260830-1';
const targets = [
  {
    id: '576b5087e69e7d1c',
    name: '부영통닭',
    district: '신기동',
    category: '치킨',
    image: 'https://daedong-yeosu-data-api-preview.sisakim.workers.dev/api/media/yogiyo-menu/v1/1098725a7b2f219bd60094284b630d2bb6b8c6217a078a175291cc6a08ed8d2b.jpg'
  },
  {
    id: '508a76b426a6dc38',
    name: '생생연어-여천점',
    district: '신기동',
    category: '회/초밥/선어/해산물',
    image: 'https://daedong-yeosu-data-api-preview.sisakim.workers.dev/api/media/yogiyo-menu/v1/240a51b296d22c98eeb386b03346fc3adabf77b2204a78a2dae5e650dd3c252f.jpg'
  }
];

const catalog = targets.map(target => ({
  store_id: target.id,
  name: target.name,
  district: target.district,
  category: target.category,
  categories: [target.category],
  image: placeholder,
  img: placeholder,
  images: [{card: placeholder, detail: placeholder}],
  hasMenu: true,
  channelKeys: ['coupang']
}));

const report = {success: false, stores: [], errors: []};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})
});
const context = await browser.newContext({viewport: {width: 390, height: 844}, isMobile: true, hasTouch: true, locale: 'ko-KR'});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV2', '1');
});
await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
await context.route('**/*.woff2', route => route.abort());
await context.route('**/api/catalog', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify(catalog)}));
await context.route('**/api/services', route => route.fulfill({status: 200, contentType: 'application/json', body: JSON.stringify({programs: [], stores: {}})}));
for (const target of targets) {
  const detail = catalog.find(store => store.store_id === target.id);
  await context.route(`**/api/store/${target.id}`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({...detail, address: '전라남도 여수시 신기동', routes: [{name: '쿠팡이츠', key: 'coupang', url: `https://web.coupangeats.com/share?storeId=${target.id}`, enabled: true}]})
  }));
  await context.route(`**/api/store/${target.id}/menu`, route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      storeId: target.id,
      storeName: target.name,
      displayName: target.name,
      mainImage: placeholder,
      categories: [target.category],
      items: [{id: `${target.id}-menu-1`, name: `${target.name} 대표메뉴`, description: '대표 음식사진', category: target.category, image: target.image}]
    })
  }));
}

const page = await context.newPage();
page.on('pageerror', error => report.errors.push(error.message));

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForFunction(() => Array.isArray(allStores) && allStores.length === 2, null, {timeout: 15000});
  for (const target of targets) {
    await page.evaluate(id => openStore(allStores.find(store => store.id === id)), target.id);
    const detail = page.locator(`#modal:not([hidden]) .store-detail[data-store-id="${target.id}"]:not(.store-detail-loading)`);
    await detail.waitFor({state: 'visible', timeout: 10000});
    const hero = detail.locator('.detail-photo').first();
    await hero.waitFor({state: 'visible', timeout: 10000});
    await page.waitForFunction(id => {
      const image = document.querySelector(`#modal .store-detail[data-store-id="${id}"] .detail-photo`);
      return Boolean(image?.complete && image.naturalWidth > 0);
    }, target.id, {timeout: 10000});
    const heroSrc = await hero.getAttribute('src');
    const entrySrc = await detail.locator('[data-store-menu-preview] img').getAttribute('src');
    if (heroSrc !== target.image || entrySrc !== target.image) {
      throw new Error(`${target.name}: 대표사진 또는 음식보기 사진이 실제 음식사진으로 승격되지 않았습니다.`);
    }
    await page.evaluate(id => window.daedongMenuPreview.open(id), target.id);
    const menuState = await page.locator('[data-store-menu-overlay]').evaluate(overlay => ({
      hidden: overlay.hidden,
      text: overlay.textContent?.trim() || '',
      html: overlay.innerHTML.slice(0, 800)
    }));
    if (!menuState.html.includes('store-menu-preview')) {
      throw new Error(`${target.name}: 음식 미리보기 열기 실패 — ${menuState.text || menuState.html}`);
    }
    const menuHero = page.locator('[data-store-menu-overlay]:not([hidden]) .store-menu-hero img');
    await menuHero.waitFor({state: 'visible', timeout: 5000});
    const menuHeroSrc = await menuHero.getAttribute('src');
    if (menuHeroSrc !== target.image) throw new Error(`${target.name}: 음식 미리보기 상단이 공용 로고로 남았습니다.`);
    report.stores.push({name: target.name, heroSrc, entrySrc, menuHeroSrc});
    await page.locator('[data-store-menu-overlay]:not([hidden]) [data-menu-preview-close]').last().tap();
    await page.evaluate(() => closeModal());
  }
  report.success = report.errors.length === 0;
} catch (error) {
  report.errors.push(error.stack || String(error));
} finally {
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);
