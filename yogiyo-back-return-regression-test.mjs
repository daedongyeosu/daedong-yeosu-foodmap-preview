import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const rc3 = fs.readFileSync('rc3-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const browserTest = fs.readFileSync('scripts/browser-yogiyo-back-return.mjs', 'utf8');

const helperStart = rc2.indexOf('function rc2SubmitYogiyoBrowserNavigation(yogiyoUrl)');
const helperEnd = rc2.indexOf('async function rc2RestoreAfterExternalPage', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, '주문앱 비교화면 전용 실행기가 있어야 합니다.');
const helperSource = rc2.slice(helperStart, helperEnd);

const submitted = [];
const opened = [];
const alerts = [];
let referrerMeta = null;
const createElement = tagName => {
  if (tagName === 'form') return {
    children: [],
    appendChild(child) { this.children.push(child); },
    submit() {
      submitted.push({
        method: this.method,
        action: this.action,
        target: this.target,
        hidden: this.hidden,
        fields: Object.fromEntries(this.children.map(child => [child.name, child.value]))
      });
    }
  };
  return {dataset: {}};
};
const store = {id: 'a'.repeat(16), lat: 34.7523658, lng: 127.7031405};
const resolvedYogiyoUrl = 'https://www.yogiyo.co.kr/mobile/?lat=34.7523658&lng=127.7031405#/332930';
const sandbox = {
  URL,
  navigator: {userAgent: 'Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 SamsungBrowser/30.0 Chrome/143.0.0.0 Mobile Safari/537.36'},
  document: {
    querySelector: selector => selector === 'meta[data-daedong-yogiyo-browser-nav]' ? referrerMeta : null,
    createElement,
    head: {appendChild(element) { referrerMeta = element; }},
    body: {appendChild() {}}
  },
  fxStoreById: id => id === store.id ? store : null,
  console,
  window: {
    open: (...args) => opened.push(args),
    alert: message => alerts.push(message),
    daedongDataApi: {
      yogiyoWebRoute: async (id, coordinates) => {
        assert.equal(id, store.id);
        assert.equal(coordinates.lat, store.lat);
        assert.equal(coordinates.lng, store.lng);
        return {storeId: id, shopId: '332930', url: resolvedYogiyoUrl};
      }
    }
  }
};
vm.runInNewContext(`${helperSource}; globalThis.launchComparedExternal = rc2LaunchComparedExternal;`, sandbox);

const urls = {
  yogiyo: 'https://orders.example.test/yogiyo/store',
  coupang: 'https://orders.example.test/coupang/store',
  baemin: 'https://orders.example.test/baemin/store'
};
const link = (key, includeStore = false) => ({
  dataset: {communityOriginal: key, ...(includeStore ? {storeId: store.id} : {})},
  closest: () => null,
  setAttribute() {},
  removeAttribute() {}
});
await sandbox.launchComparedExternal(link('yogiyo', true), urls.yogiyo);
await sandbox.launchComparedExternal({
  dataset: {rc3SingleExternal: 'yogiyo', storeId: store.id},
  closest: () => null,
  setAttribute() {},
  removeAttribute() {}
}, urls.yogiyo);
await sandbox.launchComparedExternal(link('coupang'), urls.coupang);
await sandbox.launchComparedExternal(link('baemin'), urls.baemin);

assert.deepEqual(submitted, [
  {
    method: 'get',
    action: 'https://www.yogiyo.co.kr/mobile/#/332930',
    target: '_self',
    hidden: true,
    fields: {lat: '34.7523658', lng: '127.7031405'}
  },
  {
    method: 'get',
    action: 'https://www.yogiyo.co.kr/mobile/#/332930',
    target: '_self',
    hidden: true,
    fields: {lat: '34.7523658', lng: '127.7031405'}
  }
], '목록·단독 버튼의 삼성 Android 요기요는 네이티브 앱을 부르지 않는 브라우저 GET 폼으로 이동해야 합니다.');
assert.equal(referrerMeta?.name, 'referrer');
assert.equal(referrerMeta?.content, 'no-referrer');
assert.match(helperSource, /form\.method = 'get'[\s\S]*form\.target = '_self'[\s\S]*form\.submit\(\)/);
assert.doesNotMatch(helperSource, /window\.location\.assign/);
assert.deepEqual(alerts, []);
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
assert.match(rc2, /function rc2SnapshotKeepsInlineOrderMethodsOpen[\s\S]*?aria-expanded'[\s\S]*?!panel\.hidden/);
assert.match(rc2, /if \(visibleStoreMatches\)[\s\S]*?daedongRebindOrderMethodsTrigger[\s\S]*?rc2SnapshotKeepsInlineOrderMethodsOpen\(saved\.storeSnapshot\)[\s\S]*?daedongRestoreInlineOrderMethodsOpen/);
assert.match(rc2, /function rc2RestoreOpenInlineOrderMethodsFromPendingState[\s\S]*?rc2ReadReturnState\(RC2_EXTERNAL_RETURN\)[\s\S]*?daedongRestoreInlineOrderMethodsOpen/);
assert.match(rc2, /window\.daedongRestoreOpenInlineOrderMethodsFromPendingState = rc2RestoreOpenInlineOrderMethodsFromPendingState/);
assert.match(rc2, /const restoreAfterNativeResume = \(\) => \{[\s\S]*?rc2RestoreOpenInlineOrderMethodsFromPendingState\(\)[\s\S]*?rc2RestoreAfterConfirmedResume/);
assert.match(rc3, /function rc3RestoreInlineOrderMethodsOpen[\s\S]*?rc3SetInlineOrderMethods\(trigger, true\)[\s\S]*?daedongRestoreInlineOrderMethodsOpen/);
assert.match(rc3, /function rc3SchedulePendingOrderMethodsRestore[\s\S]*?__ddret[\s\S]*?daedongRestoreOpenInlineOrderMethodsFromPendingState[\s\S]*?attempt >= 50[\s\S]*?setTimeout/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*restored-open-order-methods-1/);
assert.match(finalExperience, /rc3-fixes\.js\?v=[^'\n]*restored-open-order-methods-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*restored-open-order-methods-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*restored-open-order-methods-ready-1/);
assert.match(finalExperience, /rc3-fixes\.js\?v=[^'\n]*restored-open-order-methods-ready-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*restored-open-order-methods-ready-1/);
assert.match(browserTest, /window\.daedongCatalogReady && typeof window\.daedongCatalogReady\.then === 'function'/);
assert.match(browserTest, /addEventListener\('pageshow'[\s\S]*?panel\.hidden = true[\s\S]*?allowOpen: false/, '브라우저 검사는 삼성 인터넷이 복귀 DOM의 열린 목록을 닫는 현상을 재현한 뒤 앱이 자동 복원하는지 확인해야 합니다.');
assert.match(browserTest, /delete window\.daedongRestoreInlineOrderMethodsOpen[\s\S]*?setTimeout[\s\S]*?150/, '브라우저 검사는 전체 문서 복귀에서 rc2보다 rc3 복원 함수가 늦게 준비되는 순서도 재현해야 합니다.');
assert.match(browserTest, /await restoredDetail\.waitFor\([^\n]*\)\.catch\(async \(\) =>/);
assert.match(browserTest, /yogiyo-web[\s\S]*page\.goBack[\s\S]*testStableReturn/, '실제 브라우저 검사는 요기요 웹 상세에서 뒤로가기 한 번으로 같은 상세 DOM 복귀를 확인해야 합니다.');

console.log('yogiyo-back-return-regression-test: pass');

