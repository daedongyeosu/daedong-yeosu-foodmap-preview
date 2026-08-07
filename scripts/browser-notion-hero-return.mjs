import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'https://preview.daedongmap.com';
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

try {
  await page.goto(baseURL, {waitUntil: 'domcontentloaded'});
  await page.waitForSelector('#heroTrack > [data-rc6-banner-notion]', {timeout: 30000});
  const selected = await page.evaluate(() => {
    const slide = [...document.querySelectorAll('#heroTrack > [data-rc6-banner-notion]')]
      .find(item => item.getAttribute('aria-label')?.includes('여수 소상공인 소식'))
      || document.querySelector('#heroTrack > [data-rc6-banner-notion]');
    const image = slide?.querySelector('img');
    if (!slide || !image) return null;
    const notionUrl = new URL(slide.dataset.rc6BannerNotion, location.href).href;
    const snapshot = {
      notionUrl,
      image: image.getAttribute('src') || image.currentSrc,
      alt: image.getAttribute('alt') || '',
      displayIndex: Number(slide.dataset.heroIndex) || 0,
      savedAt: Date.now()
    };
    sessionStorage.setItem('daedongNotionHeroReturnV1', JSON.stringify(snapshot));
    return snapshot;
  });
  await check(Promise.resolve(Boolean(selected?.notionUrl && selected?.image)), '노션 광고 복귀 상태 저장');

  await page.reload({waitUntil: 'domcontentloaded'});
  const immediate = await page.evaluate(expected => {
    const hero = document.querySelector('.hero');
    const slide = document.querySelector('#heroTrack > [data-rc6-banner-notion]');
    const image = slide?.querySelector('img');
    return {
      visible: Boolean(hero && !hero.hidden && slide && image),
      sameNotion: (() => {
        try { return new URL(slide?.dataset.rc6BannerNotion || '', location.href).href === expected.notionUrl; }
        catch { return false; }
      })(),
      sameImage: image?.getAttribute('src') === expected.image,
      snapshot: slide?.dataset.rc6NotionReturnSnapshot === '1'
    };
  }, selected);
  report.immediate = immediate;
  await check(Promise.resolve(immediate.visible), '뒤로오기 초기 화면에서 슬라이드 영역 즉시 표시');
  await check(Promise.resolve(immediate.sameNotion), '뒤로오기 초기 화면에서 보던 노션 광고 유지');
  await check(Promise.resolve(immediate.sameImage), '뒤로오기 초기 화면에서 보던 광고 이미지 유지');
  await page.locator('.hero').screenshot({path: 'browser-notion-hero-return-immediate.png'});

  await page.waitForFunction(() => {
    const saved = sessionStorage.getItem('daedongNotionHeroReturnV1');
    return !saved && document.querySelectorAll('#heroTrack > [data-hero-index]').length > 2;
  }, null, {timeout: 30000});
  await page.evaluate(() => { try { heroCarousel?.stop(); } catch {} });
  const settled = await page.evaluate(expected => {
    const dots = [...document.querySelectorAll('#heroCarousel .carousel-dots > button')];
    const activeIndex = dots.findIndex(dot => dot.classList.contains('active'));
    const slide = document.querySelector(`#heroTrack > [data-hero-index="${activeIndex}"]`);
    let notionUrl = '';
    try { notionUrl = new URL(slide?.dataset.rc6BannerNotion || '', location.href).href; } catch {}
    return {
      activeIndex,
      notionUrl,
      selectedIndex: Number(expected.displayIndex),
      storageCleared: !sessionStorage.getItem('daedongNotionHeroReturnV1')
    };
  }, selected);
  report.settled = settled;
  await check(Promise.resolve(settled.storageCleared), '전체 슬라이드 준비 후 임시 복귀 상태 정리');
  await check(Promise.resolve(settled.notionUrl === selected.notionUrl), '전체 슬라이드 준비 후에도 보던 노션 광고 위치 유지');
  await page.locator('.hero').screenshot({path: 'browser-notion-hero-return-settled.png'});
  report.success = report.errors.length === 0;
} catch (error) {
  report.failure = error.stack || String(error);
} finally {
  fs.writeFileSync('browser-notion-hero-return-report.json', `${JSON.stringify(report, null, 2)}\n`);
  await browser.close();
}

if (!report.success) process.exit(1);
