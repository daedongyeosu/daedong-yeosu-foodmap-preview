import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const serviceWorker = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

assert.match(app, /function isKakaoInAppBrowser\(\) \{ return \/KAKAOTALK\/i\.test/);
assert.match(app, /const KAKAO_SAME_TAB_ORDER_KEYS = new Set\(\['mukkebi','ddangyo','ondongne','brand','happy','yogiyo','coupang','baemin'\]\)/);
assert.match(app, /function handleKakaoOrderLinkClick\(event\)/);
assert.match(app, /event\.preventDefault\(\);[\s\S]*?event\.stopImmediatePropagation\(\);[\s\S]*?trackAnalyticsRouteClick\(event\);/);
assert.match(app, /typeof rc2RememberExternalReturn === 'function'/);
assert.match(app, /const ANDROID_ROUTE_PACKAGES = Object\.freeze/);
assert.match(app, /mukkebi: 'mukkebi\.user\.app\.android'/);
assert.match(app, /function androidPackageIntent\(key, href\)/);
assert.match(app, /const KAKAO_APP_FALLBACK_PARAM = '__ddappfallback'/);
assert.match(app, /function kakaoPreviewFallbackUrl\(key\) \{[\s\S]*?key !== 'coupang' \|\| !isKakaoInAppBrowser\(\)[\s\S]*?new URL\(location\.href\)[\s\S]*?searchParams\.set\(KAKAO_APP_FALLBACK_PARAM, key\)[\s\S]*?fallbackUrl\.href/, '카카오+쿠팡의 브라우저 fallback은 토큰이 든 Preview URL이어야 합니다.');
assert.match(app, /function coupangDirectStoreIntent\(url, browserFallbackUrl\)[\s\S]*?web\.coupangeats\.com[\s\S]*?url\.pathname[\s\S]*?\/share[\s\S]*?storeId[\s\S]*?intent:\/\/storedetail\/\?storeId=/, '쿠팡 웹 공유 링크는 외부 웹페이지 없이 설치 앱의 가게 상세 주소로 변환해야 합니다.');
assert.match(app, /const browserFallbackUrl = kakaoPreviewFallbackUrl\(key\) \|\| url\.href[\s\S]*?S\.browser_fallback_url=\$\{encodeURIComponent\(browserFallbackUrl\)\}/, '그 밖의 주문앱과 브라우저는 원래 외부 fallback을 유지해야 합니다.');
assert.match(app, /window\.location\.assign\(androidPackageIntent\(key, href\) \|\| href\)/);
assert.match(app, /document\.addEventListener\('click', handleKakaoOrderLinkClick, true\)/);
assert.match(app, /\^http:\\\/\\\/(?:\(\?:www\\\.\)\?)?mukkebi/);
assert.match(app, /raw\.replace\(\/\^http:\/i,'https:'\)/);

const handlerStart = app.indexOf('function handleKakaoOrderLinkClick');
const handlerEnd = app.indexOf("document.addEventListener('click', handleKakaoOrderLinkClick", handlerStart);
const handler = app.slice(handlerStart, handlerEnd);
assert.doesNotMatch(handler, /window\.open|target\s*=\s*['_\"]blank/);
assert.match(handler, /daedongLaunchMobileRoute\(key, href\)/);

const intentStart = app.indexOf('const ANDROID_ROUTE_PACKAGES');
const intentEnd = app.indexOf('async function launchMobileRoute', intentStart);
assert.ok(intentStart >= 0 && intentEnd > intentStart, 'Android intent 구현을 찾을 수 없습니다.');
const intentContext = {
  URL,
  location: {href: 'https://preview.daedongmap.com/?__ddret=return-123#detail'},
  isAndroidBrowser: () => true,
  isKakaoInAppBrowser: () => true
};
vm.createContext(intentContext);
vm.runInContext(`${app.slice(intentStart, intentEnd)}\nglobalThis.testAndroidPackageIntent = androidPackageIntent;`, intentContext);
const previewFallback = 'https://preview.daedongmap.com/?__ddret=return-123&__ddappfallback=coupang#detail';
const coupangWebShare = 'https://web.coupangeats.com/share?storeId=893791&dishId=&key=return-key';
const coupangIntent = intentContext.testAndroidPackageIntent('coupang', coupangWebShare);
assert.match(
  coupangIntent,
  /^intent:\/\/storedetail\/\?storeId=893791&dishId=null#Intent;scheme=coupangeats;/,
  '쿠팡 웹 공유 링크가 설치 앱의 동일 가게 상세 intent로 변환되지 않습니다.'
);
assert.match(
  coupangIntent,
  new RegExp(`S\\.browser_fallback_url=${encodeURIComponent(previewFallback).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};end;$`),
  '카카오 쿠팡 intent가 토큰이 든 Preview 문서로 fallback하지 않습니다.'
);
assert.match(
  intentContext.testAndroidPackageIntent('yogiyo', 'https://www.yogiyo.co.kr/mobile/#/123'),
  new RegExp(`S\\.browser_fallback_url=${encodeURIComponent('https://www.yogiyo.co.kr/mobile/#/123').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};end;$`),
  '쿠팡 외 주문앱의 원래 fallback URL을 바꾸면 안 됩니다.'
);
intentContext.isKakaoInAppBrowser = () => false;
const regularBrowserCoupangIntent = intentContext.testAndroidPackageIntent('coupang', coupangWebShare);
assert.match(
  regularBrowserCoupangIntent,
  /^intent:\/\/storedetail\/\?storeId=893791&dishId=null#Intent;scheme=coupangeats;/,
  '일반 Android 브라우저도 쿠팡 가게 상세 앱 주소를 사용해야 합니다.'
);
assert.match(
  regularBrowserCoupangIntent,
  new RegExp(`S\\.browser_fallback_url=${encodeURIComponent(coupangWebShare).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};end;$`),
  '일반 Android 브라우저의 쿠팡 미설치 fallback은 원래 웹 공유 링크여야 합니다.'
);
assert.match(
  intentContext.testAndroidPackageIntent('coupang', 'https://www.coupangeats.com/store/123'),
  new RegExp(`S\\.browser_fallback_url=${encodeURIComponent('https://www.coupangeats.com/store/123').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')};end;$`),
  '일반 Android 브라우저의 쿠팡 fallback URL을 바꾸면 안 됩니다.'
);

assert.match(html, /app\.js\?v=[^"\n]*kakao-order-same-tab-1/);
assert.match(html, /app\.js\?v=[^"\n]*kakao-coupang-preview-fallback-1/);
assert.match(html, /app\.js\?v=[^"\n]*coupang-direct-store-deeplink-1/);
assert.match(html, /pwa-register\.js\?v=[^"\n]*kakao-cache-reset-1/);
assert.match(serviceWorker, /daedong-yeosu-app-shell-v30-food-photo-promotion/);

console.log('PASS: 카카오톡 주문앱은 현재 창 이동·복귀 저장·먹깨비 HTTPS·캐시 초기화 유지');
