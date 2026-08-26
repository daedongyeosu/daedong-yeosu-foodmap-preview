import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const api = fs.readFileSync(new URL('./data-api.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const finalExperience = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const services = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const serviceWorker = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

assert.match(api, /const REQUEST_TIMEOUT_MS = 25000/);
assert.match(api, /const requestAbort = createRequestAbort\(signal, timeoutMs\)/);
assert.match(api, /signal: requestAbort\.signal/);
assert.match(api, /\.finally\(requestAbort\.cleanup\)/);
assert.match(app, /finishCatalogReady\(\[\]\)/,
  '가게목록 준비 promise는 실패·지연 시에도 반드시 종료되어야 합니다.');
assert.match(app, /catalog\?\.\(\{timeoutMs: 20000\}\)/);
assert.match(finalExperience, /fxFinishLocationRankingReady\(false\);\s*\},35000\)/,
  '위치정렬 준비 promise는 모바일에서 무한 대기하면 안 됩니다.');
assert.match(services, /const SERVICE_BOOT_DELAY_MS = 6000/);
assert.match(services, /const ready = Promise\.race\(\[\s*window\.daedongCatalogReady \|\| Promise\.resolve\(\[\]\),\s*wait\(4000\)\s*\]\)\.then\(\(\) => wait\(SERVICE_BOOT_DELAY_MS\)\)\.then\(\(\) => beginServiceLoad\(\)\)/,
  '큰 영업정보 요청은 가게목록 첫 화면과 회선을 다투지 않아야 합니다.');
assert.match(services, /catalogReadyPromise = settleWithin\([\s\S]*26000\)/);
assert.match(services, /settleWithin\(window\.daedongLocationRankingReady[\s\S]*36000\)/);
assert.doesNotMatch(services, /Promise\.all\(\[\s*loadServiceData\(\)/,
  '영업정보를 위치정렬 promise와 다시 결합하면 안 됩니다.');
assert.match(services, /quickStatus\.dataset\.storeServiceLoadState = countReady \? 'ready' : loadFailed \? 'error' : 'loading'/,
  '영업정보 준비·실패 상태는 접근성 상태로 구분되어야 합니다.');
assert.match(services, /const nextCount = countReady \? String\(count\) : loadFailed \? '다시 확인' : '확인 중'/,
  '홈 바로가기는 전체 가게 수가 아닌 현재 영업 중 숫자만 준비 완료 후 표시해야 합니다.');
assert.doesNotMatch(services, /data-store-finder-total-count/,
  '고객 화면에는 전체 등록 가게 수를 노출하면 안 됩니다.');
assert.match(html, /cloudflare-preview-api-4-curated-menu-photos-1/);
assert.match(html, /catalog-ready-watchdog-2/);
assert.match(html, /location-ranking-watchdog-2/);
assert.match(html, /store-service-26-deferred-bootstrap-1-menu-search-status-order-1/);
assert.match(serviceWorker, /daedong-yeosu-app-shell-v21-external-return-lifecycle/);
assert.match(app, /const catalogBootPromise = initialize\(\)/,
  '가게목록 요청은 후속 지연 스크립트를 기다리지 않고 시작해야 합니다.');

let resolveCatalog;
const catalogReady = new Promise(resolve => { resolveCatalog = resolve; });
const servicePayload = {programs: [], stores: {['a'.repeat(16)]: {hours: {}}}};
let serviceCalls = 0;
const runtimeWindow = {
  daedongCatalogReady: catalogReady,
  daedongLocationRankingReady: new Promise(() => {}),
  daedongDataApi: {
    services: async () => { serviceCalls += 1; return servicePayload; },
    menuSearch: async () => ({stores: {}})
  },
  setTimeout,
  clearTimeout,
  setInterval: () => 1,
  addEventListener: () => {},
  location: {reload: () => {}}
};
const runtimeDocument = {
  documentElement: {},
  body: {classList: {add: () => {}, remove: () => {}}},
  addEventListener: () => {},
  querySelector: () => null,
  querySelectorAll: () => [],
  createElement: () => ({dataset: {}, classList: {add: () => {}, remove: () => {}}})
};
const runtimeContext = {
  window: runtimeWindow,
  document: runtimeDocument,
  MutationObserver: class { observe() {} },
  Intl,
  Date,
  Promise,
  Object,
  Array,
  Map,
  Set,
  String,
  Number,
  Boolean,
  RegExp,
  JSON,
  console
};
vm.createContext(runtimeContext);
vm.runInContext(services.replace('const SERVICE_BOOT_DELAY_MS = 6000;', 'const SERVICE_BOOT_DELAY_MS = 0;'), runtimeContext);
await new Promise(resolve => setTimeout(resolve, 20));
assert.equal(serviceCalls, 0, '가게목록 준비 전에는 큰 영업정보 요청을 시작하면 안 됩니다.');
resolveCatalog([]);
const independentReady = await Promise.race([
  runtimeWindow.daedongStoreServiceInfo.ready,
  new Promise((_, reject) => setTimeout(() => reject(new Error('영업정보 독립 로딩 실패')), 100))
]);
assert.deepEqual(JSON.parse(JSON.stringify(independentReady)), servicePayload,
  '가게목록 첫 화면 뒤에는 위치정렬과 무관하게 영업정보가 준비되어야 합니다.');

console.log('PASS: 모바일 초기화 지연이 가게·영업정보 화면 전체를 막지 않습니다.');
