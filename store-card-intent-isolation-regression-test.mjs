import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const rc3 = fs.readFileSync('rc3-fixes.js', 'utf8');
const service = fs.readFileSync('store-service-info.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

const confirmSource = rc2.match(/function rc2ConfirmIntentionalStoreOpen\(\) \{[\s\S]*?\n\}/)?.[0] || '';
const openSource = rc2.match(/function rc2OpenStoreFromCustomer\(store\) \{[\s\S]*?\n\}/)?.[0] || '';
assert.ok(confirmSource && openSource, '고객 가게카드 선택 격리 함수를 유지해야 합니다.');

const removed = [];
let freshEntryReleased = 0;
let bootReleased = 0;
let durableCleared = 0;
let openedStore = null;
const storage = () => ({removeItem: key => removed.push(key)});
const sandbox = {
  RC2_RETURN_STORAGE_KEYS: ['daedongExternalReturnRc2', 'daedongAppBrowserReturnV1'],
  EXTERNAL_APP_DEPARTURE_KEY: 'daedongExternalAppDepartureV1',
  RC2_RETURN_TOKEN_STATE: 'daedongExternalReturnToken',
  RC2_RETURN_GUARD_STATE: 'daedongExternalReturnGuard',
  RC2_RETURN_TOKEN_PARAM: '__ddret',
  RC2_RETURN_GUARD_PARAM: '__ddguard',
  sessionStorage: storage(),
  localStorage: storage(),
  location: {href: 'https://daedongmap.com/?fresh=1&__ddret=old&__ddguard=old'},
  history: {
    state: {daedongModal: true, daedongExternalReturnToken: 'old', daedongExternalReturnGuard: 'old'},
    replaceState(next, _title, url) { this.state = next; this.url = url; }
  },
  URL,
  rc2ResetExternalDepartureLifecycle() {},
  rc2InvalidatePendingReturnRestores() {},
  rc2CancelRestoredReturnSettlement() {},
  rc2ClearDurableReturn() { durableCleared += 1; },
  openStore(store) { openedStore = store; return true; }
};
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
sandbox.daedongMarkHomeInteraction = () => { freshEntryReleased += 1; };
sandbox.daedongFinishExternalReturnBoot = () => { bootReleased += 1; };
vm.runInNewContext(`${confirmSource}\n${openSource}`, sandbox, {filename: 'store-card-intent-guard.js'});

const chosen = {id: 'chosen-store'};
assert.equal(sandbox.rc2OpenStoreFromCustomer(chosen), true);
assert.equal(openedStore, chosen, '고객이 선택한 가게를 그대로 열어야 합니다.');
assert.equal(freshEntryReleased, 1, '가게카드 선택 즉시 첫 화면 상단 고정을 끝내야 합니다.');
assert.equal(bootReleased, 1, '지연된 외부앱 복귀 부트 화면도 끝내야 합니다.');
assert.equal(durableCleared, 1, '이전 주문앱 쿠키 복귀 상태를 제거해야 합니다.');
for (const key of ['daedongExternalReturnRc2', 'daedongAppBrowserReturnV1', 'daedongExternalAppDepartureV1']) {
  assert.equal(removed.filter(value => value === key).length, 2, `${key}를 두 저장소에서 제거해야 합니다.`);
}
assert.equal(sandbox.history.state.daedongModal, true, '현재 모달 기록은 보존해야 합니다.');
assert.equal('daedongExternalReturnToken' in sandbox.history.state, false);
assert.equal('daedongExternalReturnGuard' in sandbox.history.state, false);
assert.equal(sandbox.history.url, '/?fresh=1', '일회성 복귀 주소 표식을 제거해야 합니다.');

assert.match(rc2, /#storeGrid \.store-card\[data-id\][\s\S]*rc2OpenStoreFromCustomer/,
  '홈 가게목록 카드는 고객 선택 격리를 거쳐야 합니다.');
assert.match(app, /\$\('#storeGrid'\)\.addEventListener\('click',[\s\S]*?daedongConfirmIntentionalStoreOpen\?\.\(\); openStore\(store\)/,
  '복귀 보호기 설치 직전의 기본 가게카드 클릭도 지연 복귀 상태를 먼저 정리해야 합니다.');
assert.match(rc2, /RC2_STORE_INTENT_SELECTOR[\s\S]*\[data-rc3-rail-open\][\s\S]*function rc2PrepareStoreIntent/,
  '추천 가게카드는 손가락이 닿는 첫 순간부터 지연 초기화를 중단해야 합니다.');
assert.match(rc2, /addEventListener\('pointerdown', rc2PrepareStoreIntent, true\)/,
  '카카오 포인터 시작 시점의 추천 가게카드 의도를 가로채야 합니다.');
assert.match(rc2, /rc3RailStore[\s\S]{0,320}rc2OpenStoreFromCustomer/,
  'RC3 추천 카드의 실제 클릭도 고객 선택 격리를 거쳐야 합니다.');
assert.match(rc3, /dataset\.rc3Gesture === 'drag'[\s\S]*daedongConfirmIntentionalStoreOpen\?\.\(\)[\s\S]*openStore\(store\)/,
  'RC3 자체 예비 경로도 상세 열기 전에 지연 초기화를 종료해야 합니다.');
for (const selector of ['railStore', 'appStoreInfo', 'channelStore', 'searchStore']) {
  assert.match(rc2, new RegExp(`${selector}[\\s\\S]{0,260}rc2OpenStoreFromCustomer`), `${selector} 경로를 격리해야 합니다.`);
}
assert.match(service, /function openStoreAfterOverview\(storeId\)[\s\S]*daedongConfirmIntentionalStoreOpen\?\.\(\)[\s\S]*openStore\(store\)/,
  '통합 가게찾기 카드도 같은 격리를 사용해야 합니다.');
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*store-card-intent-2/);
assert.match(finalExperience, /fxRc3Script\.src\+='-atomic-rail-refresh-1-store-card-intent-2-return-activation-atomic-1-return-intent-cancel-1-return-early-tap-bridge-1-order-sheet-before-history-1'/);
assert.match(html, /final-experience\.js\?v=[^"\n]*store-card-intent-2/);
assert.match(html, /store-service-info\.js\?v=[^"\n]*store-card-intent-1/);
assert.match(serviceWorker, /CACHE_NAME = 'daedong-yeosu-app-shell-v27-store-card-touchstart-intent-guard'/);

console.log('store card intentional navigation isolation regression: PASS');
