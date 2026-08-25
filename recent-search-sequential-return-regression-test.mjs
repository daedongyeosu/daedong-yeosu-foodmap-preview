import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const service = fs.readFileSync('store-service-info.js', 'utf8');
const css = fs.readFileSync('store-service-info.css', 'utf8');

assert.match(service, /daedongRecentSearchStoresV1/);
assert.match(service, /const RECENT_SEARCH_LIMIT = 10/);
assert.match(service, /function rememberRecentSearchStore\(storeId, query = overviewQuery\)/);
assert.match(service, /\[item, \.\.\.readRecentSearchStores\(\)\.filter\(saved => String\(saved\.storeId\) !== id\)\]/,
  '같은 가게는 중복 저장하지 않고 최신 위치로 올려야 합니다.');
assert.match(service, /최근 검색한 가게/);
assert.match(service, /data-store-service-recent-store-id/);
assert.match(service, /data-store-service-recent-clear/);
assert.match(service, /if \(String\(overviewQuery \|\| ''\)\.trim\(\)\) rememberRecentSearchStore\(storeCard\.dataset\.storeServiceStoreId, overviewQuery\)/);
assert.match(service, /if \(String\(overviewQuery \|\| ''\)\.trim\(\)\) rememberRecentSearchStore\(menuCard\.dataset\.storeServiceMenuStoreId, overviewQuery\)/);
assert.match(service, /function captureSearchState\(\)[\s\S]*?query:[\s\S]*?status:[\s\S]*?benefit:[\s\S]*?locationMode[\s\S]*?selectedArea/);
assert.match(service, /showOverview,\s*captureSearchState/);
assert.match(css, /\.store-service-recent-search/);
assert.match(css, /\.store-service-recent-list/);

assert.match(app, /sessionStorage\.setItem\(EXTERNAL_APP_DEPARTURE_KEY, '1'\)/,
  '기존 이벤트 팝업 억제와 호환되는 세션 표식을 유지해야 합니다.');
assert.match(app, /localStorage\.setItem\(EXTERNAL_APP_DEPARTURE_KEY, payload\)/,
  '안드로이드가 페이지를 재생성해도 출발 증거가 남아야 합니다.');
assert.match(rc2, /function rc2ReadDepartureMarker\(\)/);
assert.match(rc2, /savedToken === historyToken \|\| savedToken === urlToken/);
assert.match(rc2, /returnUrl\.searchParams\.set\(RC2_RETURN_TOKEN_PARAM, returnToken\)/);
assert.match(rc2, /const departureMarker = \{returnToken, savedAt: payload\.savedAt\}/);
assert.match(rc2, /searchState: window\.daedongStoreServiceInfo\?\.captureSearchState\?\.\(\) \|\| null/);
assert.match(rc2, /selectedAppKey: rc2ExternalAppKey\(sourceElement\)/);
assert.match(finalExperience, /searchState:window\.daedongStoreServiceInfo\?\.captureSearchState\?\.\(\)\|\|null/);
assert.match(rc2, /if \(rc2StoreRestorePromise\) return rc2StoreRestorePromise/);
assert.match(rc2, /if \(rc2SurfaceRestorePromise\) return rc2SurfaceRestorePromise/);
assert.match(rc2, /if \(modal\?\.hidden \|\| String\(restoredStoreId \|\| ''\) !== String\(saved\.storeId\)\) return false;[\s\S]*?rc2ClearReturnState/,
  '정확한 가게 화면이 확인되기 전에 복귀정보를 지우면 안 됩니다.');
assert.match(finalExperience, /if\(modal\?\.hidden\|\|modal\.dataset\.appBrowserKey!==saved\.key\)return false;[\s\S]*?daedongClearExternalReturnState/,
  '정확한 주문앱 가게목록이 확인되기 전에 복귀정보를 지우면 안 됩니다.');

const bootScript = html.match(/<script>\s*([\s\S]*?daedongFinishExternalReturnBoot[\s\S]*?)<\/script>/)?.[1] || '';
assert.ok(bootScript, '첫 화면 복귀 보호 스크립트를 찾아야 합니다.');

function bootWithUrlToken(urlToken) {
  const classes = new Set();
  const saved = {storeId: 'friend-chicken', returnToken: 'return-token-2', savedAt: Date.now()};
  const context = {
    document: {documentElement: {classList: {add: value => classes.add(value), remove: value => classes.delete(value)}}},
    location: {href: `https://preview.daedongmap.com/${urlToken ? `?__ddret=${urlToken}` : ''}`},
    sessionStorage: {getItem() { return null; }, removeItem() {}},
    localStorage: {getItem: key => {
      if (key === 'daedongExternalReturnRc2') return JSON.stringify(saved);
      return null;
    }, removeItem() {}},
    history: {state: null, replaceState() {}},
    window: {}, URL, String, Date, JSON
  };
  vm.createContext(context);
  vm.runInContext(bootScript, context);
  return classes.has('daedong-external-return-pending');
}

assert.equal(bootWithUrlToken('return-token-2'), true,
  '삼성 인터넷이 history와 sessionStorage를 잃어도 현재 주소의 일회용 토큰이면 보던 가게를 복원해야 합니다.');
assert.equal(bootWithUrlToken(''), false,
  '카카오톡 일반 링크에서는 과거 저장값만으로 새 방문을 잘못 복원하면 안 됩니다.');

assert.match(html, /store-service-info\.css\?v=[^"\n]*recent-search-return-1/);
assert.match(html, /store-service-info\.js\?v=[^"\n]*recent-search-return-1/);
assert.match(html, /app\.js\?v=[^"\n]*sequential-app-return-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*sequential-app-return-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*sequential-app-return-1/);

console.log('recent-search-sequential-return-regression-test: pass');
