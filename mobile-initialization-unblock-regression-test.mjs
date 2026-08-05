import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const api = fs.readFileSync(new URL('./data-api.js', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const finalExperience = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const services = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const serviceWorker = fs.readFileSync(new URL('./sw.js', import.meta.url), 'utf8');

assert.match(api, /const REQUEST_TIMEOUT_MS = 8000/);
assert.match(api, /const requestAbort = createRequestAbort\(signal, timeoutMs\)/);
assert.match(api, /signal: requestAbort\.signal/);
assert.match(api, /\.finally\(requestAbort\.cleanup\)/);
assert.match(app, /finishCatalogReady\(\[\]\)/,
  '가게목록 준비 promise는 실패·지연 시에도 반드시 종료되어야 합니다.');
assert.match(app, /catalog\?\.\(\{timeoutMs: 6500\}\)/);
assert.match(finalExperience, /fxFinishLocationRankingReady\(false\);\s*\},15000\)/,
  '위치정렬 준비 promise는 모바일에서 무한 대기하면 안 됩니다.');
assert.match(services, /const ready = beginServiceLoad\(\)/);
assert.match(services, /catalogReadyPromise = settleWithin\([\s\S]*9000\)/);
assert.match(services, /settleWithin\(window\.daedongLocationRankingReady[\s\S]*16000\)/);
assert.doesNotMatch(services, /Promise\.all\(\[\s*loadServiceData\(\)/,
  '영업정보를 위치정렬 promise와 다시 결합하면 안 됩니다.');
assert.match(services, /loadFailed \? '다시 확인' : '확인 중'/,
  '실패 상태가 로딩 문구로 영구 위장되면 안 됩니다.');
assert.match(html, /cloudflare-preview-api-2-request-timeout-1/);
assert.match(html, /catalog-ready-watchdog-1/);
assert.match(html, /location-ranking-watchdog-1/);
assert.match(html, /store-service-21-mobile-ready-unblock-1/);
assert.match(serviceWorker, /daedong-yeosu-app-shell-v4-mobile-ready-unblock/);

const never = new Promise(() => {});
const servicePayload = {programs: [], stores: {['a'.repeat(16)]: {hours: {}}}};
const runtimeWindow = {
  daedongCatalogReady: never,
  daedongLocationRankingReady: never,
  daedongDataApi: {
    services: async () => servicePayload,
    menuSearch: async () => ({stores: {}})
  },
  setTimeout: () => 1,
  clearTimeout: () => {},
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
vm.runInContext(services, runtimeContext);
const independentReady = await Promise.race([
  runtimeWindow.daedongStoreServiceInfo.ready,
  new Promise((_, reject) => setTimeout(() => reject(new Error('영업정보 독립 로딩 실패')), 100))
]);
assert.deepEqual(JSON.parse(JSON.stringify(independentReady)), servicePayload,
  '가게목록·위치정렬 promise가 멈춰도 영업정보 ready는 독립적으로 끝나야 합니다.');

console.log('PASS: 모바일 초기화 지연이 가게·영업정보 화면 전체를 막지 않습니다.');
