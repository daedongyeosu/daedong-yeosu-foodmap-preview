import fs from 'node:fs';
import {chromium} from 'playwright';

const baseURL = process.env.BASE_URL || 'https://preview.daedongmap.com/';
const report = {success: false, checks: [], errors: [], viewports: []};
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CODEX_BROWSER_EXECUTABLE_PATH ? {executablePath: process.env.CODEX_BROWSER_EXECUTABLE_PATH} : {})
});

const check = (condition, message) => {
  const ok = Boolean(condition);
  report.checks.push({message, ok});
  if (!ok) throw new Error(message);
};

try {
  for (const width of [390, 360]) {
    const context = await browser.newContext({
      viewport: {width, height: 844},
      isMobile: true,
      hasTouch: true,
      locale: 'ko-KR',
      userAgent: 'Mozilla/5.0 (Linux; Android 15) AppleWebKit/537.36 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.6.0'
    });
    await context.addInitScript(() => sessionStorage.setItem('daedongMukkebiSummerEventSeenSessionV1', '1'));
    if (process.env.PATCH_STORE_SERVICE_CSS_FROM_LOCAL === '1') {
      const css = fs.readFileSync(new URL('../store-service-info.css', import.meta.url), 'utf8');
      await context.route('**/store-service-info.css*', route => route.fulfill({status: 200, contentType: 'text/css; charset=utf-8', body: css}));
    }
    await context.route('**/api/events', route => route.fulfill({status: 204, body: ''}));
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    await page.goto(`${baseURL}${baseURL.includes('?') ? '&' : '?'}filter-fit=${width}-${Date.now()}`, {waitUntil: 'domcontentloaded'});
    await page.waitForSelector('[data-store-finder-quick] nav [data-store-service-quick-location]', {timeout: 20000});
    await page.evaluate(() => {
      const count = document.querySelector('[data-store-finder-open-count]');
      if (count) count.textContent = '확인 중';
    });
    const metrics = await page.evaluate(() => {
      const nav = document.querySelector('[data-store-finder-quick] nav');
      const buttons = [...nav.querySelectorAll('button')];
      const navRect = nav.getBoundingClientRect();
      return {
        viewportWidth: innerWidth,
        documentScrollWidth: document.documentElement.scrollWidth,
        nav: {left: navRect.left, right: navRect.right, clientWidth: nav.clientWidth, scrollWidth: nav.scrollWidth},
        buttons: buttons.map(button => {
          const rect = button.getBoundingClientRect();
          return {
            text: button.innerText.replace(/\s+/g, ' ').trim(),
            left: rect.left,
            right: rect.right,
            clientWidth: button.clientWidth,
            scrollWidth: button.scrollWidth,
            fontSize: getComputedStyle(button).fontSize
          };
        })
      };
    });
    report.viewports.push(metrics);
    check(metrics.documentScrollWidth <= width, `${width}px: 페이지 가로 넘침 없음`);
    check(metrics.nav.scrollWidth <= metrics.nav.clientWidth, `${width}px: 빠른 조건 세 버튼이 카드 내부 한 화면에 표시`);
    check(metrics.buttons.length === 3, `${width}px: 영업 중·혜택·동네 버튼 모두 표시`);
    check(metrics.buttons.every(button => button.left >= metrics.nav.left - .5 && button.right <= metrics.nav.right + .5), `${width}px: 각 버튼 경계가 카드 안에 있음`);
    check(metrics.buttons.every(button => button.scrollWidth <= button.clientWidth), `${width}px: 세 버튼 글자 잘림 없음`);
    if (width === 390) await page.screenshot({path: 'browser-home-filter-chips.png', fullPage: false});
    await context.close();
  }
  check(report.errors.length === 0, '모바일 레이아웃 브라우저 오류 없음');
  report.success = true;
} catch (error) {
  report.failure = error.stack || String(error);
} finally {
  fs.writeFileSync('browser-home-filter-chips-report.json', `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  await browser.close();
}

if (!report.success) process.exit(1);

