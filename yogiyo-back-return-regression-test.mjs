import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const rc3 = fs.readFileSync('rc3-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const browserTest = fs.readFileSync('scripts/browser-yogiyo-back-return.mjs', 'utf8');

const helperStart = rc2.indexOf('async function rc2LaunchComparedExternal(link, href)');
const helperEnd = rc2.indexOf('async function rc2RestoreAfterExternalPage', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, '주문앱 비교화면 전용 실행기가 있어야 합니다.');
const helperSource = rc2.slice(helperStart, helperEnd);

const opened = [];
const nativeLaunches = [];
const sandbox = {
  navigator: {userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 SamsungBrowser/30.0 Chrome/143.0.0.0 Mobile Safari/537.36'},
  window: {
    open: (...args) => opened.push(args),
    daedongLaunchMobileRoute: async (...args) => nativeLaunches.push(args)
  }
};
vm.runInNewContext(`${helperSource}; globalThis.launchComparedExternal = rc2LaunchComparedExternal;`, sandbox);

const urls = {
  yogiyo: 'https://ws.yogiyo.co.kr/48zrgs',
  coupang: 'https://orders.example.test/coupang/store',
  baemin: 'https://orders.example.test/baemin/store'
};
const link = key => ({dataset: {communityOriginal: key}});
await sandbox.launchComparedExternal(link('yogiyo'), urls.yogiyo);
await sandbox.launchComparedExternal({
  dataset: {rc3SingleExternal: 'yogiyo'}
}, urls.yogiyo);
await sandbox.launchComparedExternal(link('coupang'), urls.coupang);
await sandbox.launchComparedExternal(link('baemin'), urls.baemin);

assert.deepEqual(nativeLaunches, [
  ['yogiyo', urls.yogiyo],
  ['yogiyo', urls.yogiyo]
], '목록·단독 버튼의 삼성 Android 요기요는 매번 원본 가게 링크를 네이티브 앱 실행기로 전달해야 합니다.');
assert.match(helperSource, /routeKey === 'yogiyo'[\s\S]*daedongLaunchMobileRoute\('yogiyo', href\)/);
assert.doesNotMatch(helperSource, /yogiyoWebRoute|www\.yogiyo\.co\.kr\/mobile|form\.submit/);
assert.deepEqual(opened, [
  [urls.coupang, '_blank', 'noopener'],
  [urls.baemin, '_blank', 'noopener']
], '쿠팡이츠·배달의민족은 원본 Preview 상세 DOM을 보존하는 별도 실행 경로로 열어야 합니다.');

const comparedStart = rc2.indexOf("const comparedExternal = event.target.closest('a[data-community-original]')");
const comparedEnd = rc2.indexOf('const externalLink =', comparedStart);
const comparedHandler = rc2.slice(comparedStart, comparedEnd);
const rememberIndex = comparedHandler.indexOf('rc2RememberExternalReturn(comparedExternal)');
const launchIndex = comparedHandler.indexOf('rc2LaunchComparedExternal(comparedExternal, href)');
assert.ok(rememberIndex >= 0 && launchIndex > rememberIndex, '이동 전에 보고 있던 가게 상세를 저장해야 합니다.');
assert.doesNotMatch(comparedHandler, /history\.back/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*yogiyo-history-return-2/);
assert.match(html, /final-experience\.js\?v=[^"\n]*yogiyo-history-return-2/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*stable-separated-order-return-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*stable-separated-order-return-2/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*yogiyo-live-preview-task-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*yogiyo-live-preview-task-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*yogiyo-kakao-https-return-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*yogiyo-kakao-https-return-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*yogiyo-kakao-web-return-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*yogiyo-kakao-web-return-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*yogiyo-native-bypass-form-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*yogiyo-native-bypass-form-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*yogiyo-android-browser-form-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*yogiyo-android-browser-form-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*yogiyo-native-app-return-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*yogiyo-native-app-return-1/);
assert.match(rc2, /function rc2SnapshotKeepsInlineOrderMethodsOpen[\s\S]*?aria-expanded'[\s\S]*?!panel\.hidden/);
assert.match(rc2, /if \(visibleStoreMatches\)[\s\S]*?daedongRebindOrderMethodsTrigger[\s\S]*?rc2SnapshotKeepsInlineOrderMethodsOpen\(saved\.storeSnapshot\)[\s\S]*?daedongRestoreInlineOrderMethodsOpen/);
assert.match(rc2, /function rc2RestoreOpenInlineOrderMethodsFromPendingState[\s\S]*?rc2ReadReturnState\(RC2_EXTERNAL_RETURN\)[\s\S]*?daedongRestoreInlineOrderMethodsOpen/);
assert.match(rc2, /window\.daedongRestoreOpenInlineOrderMethodsFromPendingState = rc2RestoreOpenInlineOrderMethodsFromPendingState/);
assert.match(rc2, /const restoreAfterNativeResume = \(\) => \{[\s\S]*?rc2RestoreOpenInlineOrderMethodsFromPendingState\(\)[\s\S]*?rc2RestoreAfterConfirmedResume/);
assert.match(rc3, /function rc3RestoreInlineOrderMethodsOpen[\s\S]*?rc3SetInlineOrderMethods\(trigger, true\)[\s\S]*?daedongRestoreInlineOrderMethodsOpen/);
assert.match(rc3, /function rc3SchedulePendingOrderMethodsRestore[\s\S]*?__ddret[\s\S]*?daedongRestoreOpenInlineOrderMethodsFromPendingState[\s\S]*?attempt >= 50[\s\S]*?setTimeout/);
assert.match(rc3, /data-rc3-external-href="\$\{escapeHtml\(safeHref\(route\.url\)\)\}"/);
assert.match(rc3, /const embeddedHref = safeHref\(sourceElement\?\.dataset\?\.rc3ExternalHref[\s\S]*?embeddedHref !== '#' \? embeddedHref : safeHref\(route\?\.url\)/);
assert.match(rc3, /if \(!external \|\| !routeKey\) return false/);
assert.doesNotMatch(rc3, /if \(!external \|\| !routeKey \|\| !store\) return false/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*restored-open-order-methods-1/);
assert.match(finalExperience, /rc3-fixes\.js\?v=[^'\n]*restored-open-order-methods-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*restored-open-order-methods-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*restored-open-order-methods-ready-1/);
assert.match(finalExperience, /rc3-fixes\.js\?v=[^'\n]*restored-open-order-methods-ready-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*restored-open-order-methods-ready-1/);
assert.match(browserTest, /window\.daedongCatalogReady && typeof window\.daedongCatalogReady\.then === 'function'/);
assert.match(browserTest, /addEventListener\('pageshow'[\s\S]*?panel\.hidden = true[\s\S]*?allowOpen: false/, '브라우저 검사는 삼성 인터넷이 복귀 DOM의 열린 목록을 닫는 현상을 재현한 뒤 앱이 자동 복원하는지 확인해야 합니다.');
assert.match(browserTest, /delete window\.daedongRestoreInlineOrderMethodsOpen[\s\S]*?setTimeout[\s\S]*?150/, '브라우저 검사는 전체 문서 복귀에서 rc2보다 rc3 복원 함수가 늦게 준비되는 순서도 재현해야 합니다.');
assert.match(browserTest, /catalogOnlyStore = \{\.\.\.current, routes: \[\], __secureDetailReady: false\}[\s\S]*?window\.fxStoreById = id/, '브라우저 검사는 상세를 연 뒤 전체 카탈로그 객체가 교체되어 현재 객체의 routes가 사라지는 실제 장시간 경과 조건을 재현해야 합니다.');
assert.match(browserTest, /await restoredDetail\.waitFor\([^\n]*\)\.catch\(async \(\) =>/);
assert.match(browserTest, /daedongLaunchMobileRoute[\s\S]*visibilitychange[\s\S]*testStableReturn/, '실제 브라우저 검사는 네이티브 요기요 실행과 앱 복귀 신호 뒤에도 같은 상세 DOM이 유지되는지 확인해야 합니다.');

console.log('yogiyo-back-return-regression-test: pass');

