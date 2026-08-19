import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const serviceWorker = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

assert.match(app, /function isKakaoInAppBrowser\(\) \{ return \/KAKAOTALK\/i\.test/);
assert.match(app, /const KAKAO_SAME_TAB_ORDER_KEYS = new Set\(\['mukkebi','ddangyo','ondongne','brand','happy','yogiyo','coupang','baemin'\]\)/);
assert.match(app, /function handleKakaoOrderLinkClick\(event\)/);
assert.match(app, /event\.preventDefault\(\);[\s\S]*?event\.stopImmediatePropagation\(\);[\s\S]*?trackAnalyticsRouteClick\(event\);/);
assert.match(app, /typeof rc2RememberExternalReturn === 'function'/);
assert.match(app, /window\.location\.assign\(href\)/);
assert.match(app, /document\.addEventListener\('click', handleKakaoOrderLinkClick, true\)/);
assert.match(app, /\^http:\\\/\\\/(?:\(\?:www\\\.\)\?)?mukkebi/);
assert.match(app, /raw\.replace\(\/\^http:\/i,'https:'\)/);

const handlerStart = app.indexOf('function handleKakaoOrderLinkClick');
const handlerEnd = app.indexOf("document.addEventListener('click', handleKakaoOrderLinkClick", handlerStart);
const handler = app.slice(handlerStart, handlerEnd);
assert.doesNotMatch(handler, /window\.open|target\s*=\s*['_\"]blank/);

assert.match(html, /app\.js\?v=[^"\n]*kakao-order-same-tab-1/);
assert.match(html, /pwa-register\.js\?v=[^"\n]*kakao-cache-reset-1/);
assert.match(serviceWorker, /daedong-yeosu-app-shell-v9-main-logo/);

console.log('PASS: 카카오톡 주문앱은 현재 창 이동·복귀 저장·먹깨비 HTTPS·캐시 초기화 유지');
