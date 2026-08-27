import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const menu = fs.existsSync('store-menu-preview.js') ? fs.readFileSync('store-menu-preview.js', 'utf8') : '';
const event = fs.existsSync('mukkebi-summer-event.js') ? fs.readFileSync('mukkebi-summer-event.js', 'utf8') : '';
const html = fs.readFileSync('index.html', 'utf8');

assert.match(app, /const EXTERNAL_APP_DEPARTURE_KEY = 'daedongExternalAppDepartureV1'/);
assert.match(app, /function markExternalAppDeparture\(\)[\s\S]*?JSON\.stringify\(\{savedAt: Date\.now\(\)\}\)[\s\S]*?sessionStorage\.setItem\(EXTERNAL_APP_DEPARTURE_KEY, '1'\)[\s\S]*?localStorage\.setItem\(EXTERNAL_APP_DEPARTURE_KEY, payload\)/);
assert.match(app, /const MOBILE_SAME_TAB_ORDER_KEYS = new Set\(\['mukkebi','ddangyo','ondongne','brand','happy','yogiyo','coupang','baemin'\]\)/);
assert.match(app, /link\?\.dataset\?\.menuOrder[\s\S]*?link\?\.dataset\?\.menuStickyOrder[\s\S]*?link\?\.dataset\?\.menuStickyExternal[\s\S]*?link\?\.dataset\?\.menuExternalKey/);
assert.match(app, /function handleMobileOrderLinkClick\(event\)[\s\S]*?markExternalAppDeparture\(\)[\s\S]*?rc2RememberExternalReturn[\s\S]*?daedongLaunchMobileRoute\(mobileOrderRouteKey\(link\), href\)/);
assert.match(app, /document\.addEventListener\('click', handleMobileOrderLinkClick, true\)/);

assert.match(app, /function isCustomerUsableExternalRoute\(key, value\)/);
assert.match(app, /baemin: new Set\(\['baemin\.com', 'www\.baemin\.com'\]\)/);
assert.match(app, /return \{\.\.\.route, key, url, customerUsable: isCustomerUsableExternalRoute\(key, url\)\}/);
assert.match(app, /route\?\.key === key && route\?\.customerUsable !== false/);
assert.match(app, /store\?\.__secureDetailReady === true && EXTERNAL_APP_KEYS\.includes\(key\)/);

const comparedStart = rc2.indexOf("const comparedExternal = event.target.closest('a[data-community-original]')");
const comparedEnd = rc2.indexOf('const externalLink =', comparedStart);
const comparedHandler = rc2.slice(comparedStart, comparedEnd);
assert.match(comparedHandler, /rc2RememberExternalReturn\(comparedExternal\)/);
assert.match(comparedHandler, /rc2LaunchComparedExternal\(comparedExternal, href\)/, '저장 후 주문앱별 복귀 방식으로 실행해야 합니다.');
assert.match(comparedHandler, /event\.preventDefault\(\)[\s\S]*?event\.stopImmediatePropagation\(\)/, '구형 클릭 처리기와 앵커 기본 이동을 막아야 합니다.');
assert.match(rc2, /function rc2LaunchComparedExternal\(link, href\) \{[\s\S]*?window\.open\(href, '_blank', 'noopener'\)[\s\S]*?return true/, '비교화면 주문앱은 현재 Preview 상세 DOM을 보존하는 별도 실행 경로를 사용해야 합니다.');
const comparedLauncher = rc2.match(/function rc2LaunchComparedExternal\(link, href\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.match(comparedLauncher, /routeKey === 'yogiyo'[\s\S]*?kakaoAndroid[\s\S]*?daedongLaunchMobileRoute\(routeKey, href\)/);
assert.doesNotMatch(comparedLauncher, /location\.assign/);
assert.doesNotMatch(comparedHandler, /history\.back/);
assert.match(rc2, /function rc2RememberExternalReturn\(sourceElement = null\) \{[\s\S]*?daedongMarkExternalAppDeparture/);
assert.match(finalExperience, /function fxRememberAppBrowserReturn\(key,anchorStoreId=''\)\{[\s\S]*?daedongMarkExternalAppDeparture/);

if (menu) {
  assert.match(menu, /data-menu-external-key="\$\{escapeMenuHtml\(key\)\}"/);
  assert.match(menu, /data-menu-sticky-external="\$\{escapeMenuHtml\(key\)\}"/);
}

if (event) {
  assert.match(event, /const SEEN_SESSION_KEY = 'daedongMukkebiSummerEventSeenSessionV1'/);
  assert.match(event, /const EXTERNAL_APP_DEPARTURE_KEY = 'daedongExternalAppDepartureV1'/);
  assert.match(event, /seenThisSession\(\) \|\| returningFromOrderApp\(\)/);
  assert.match(event, /sessionStorage\.setItem\(SEEN_SESSION_KEY, '1'\)/);
}

assert.match(html, /app\.js\?v=[^"\n]*simple-app-return-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*simple-app-return-1/);
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*simple-app-return-1/);
assert.match(html, /mukkebi-summer-event\.js\?v=[^"\n]*simple-app-return-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*simple-app-return-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*stable-separated-order-return-1/);
assert.match(html, /app\.js\?v=[^"\n]*stable-separated-order-return-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*stable-separated-order-return-2/);

console.log('simple-app-return-regression-test: pass');
