import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const menu = fs.existsSync('store-menu-preview.js') ? fs.readFileSync('store-menu-preview.js', 'utf8') : '';

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} 함수를 찾아야 합니다.`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let quote = '';
  let escaped = false;
  for (let index = bodyStart; index < source.length; index += 1) {
    const character = source[index];
    if (quote) {
      if (escaped) escaped = false;
      else if (character === '\\') escaped = true;
      else if (character === quote) quote = '';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') {
      quote = character;
      continue;
    }
    if (character === '{') depth += 1;
    if (character === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`${name} 함수의 끝을 찾지 못했습니다.`);
}

const bootScript = html.match(/<script>\s*([\s\S]*?daedongFinishExternalReturnBoot[\s\S]*?)<\/script>/)?.[1] || '';
assert.ok(bootScript, '첫 페인트 복귀 차단 스크립트를 찾아야 합니다.');
assert.doesNotMatch(bootScript, /2500|setTimeout/, '복귀 준비 전 메인 화면을 시간만으로 노출하면 안 됩니다.');

function bootContext(historyToken) {
  const classes = new Set();
  const saved = {key: 'baemin', returnToken: 'return-token-1', savedAt: Date.now()};
  const context = {
    document: {documentElement: {classList: {add: value => classes.add(value), remove: value => classes.delete(value)}}},
    sessionStorage: {getItem() { return null; }},
    localStorage: {getItem: key => key === 'daedongAppBrowserReturnV1' ? JSON.stringify(saved) : null},
    history: {state: {daedongExternalReturnToken: historyToken}},
    window: {}, Date, JSON
  };
  vm.createContext(context);
  vm.runInContext(bootScript, context);
  return classes;
}

assert.equal(bootContext('return-token-1').has('daedong-external-return-pending'), true,
  '앱 전환으로 sessionStorage가 사라져도 같은 방문 기록의 localStorage 복귀 상태를 사용해야 합니다.');
assert.equal(bootContext('different-history-entry').has('daedong-external-return-pending'), false,
  '새 방문에서 과거 localStorage 복귀 상태를 잘못 사용하면 안 됩니다.');

const rememberSource = extractFunction(finalExperience, 'fxRememberAppBrowserReturn');
let written = null;
const clickedStore = {dataset: {appStoreOrder: 'store-42'}};
const modalCard = {scrollTop: 730};
const modal = {
  dataset: {appBrowserCategory: '한식'},
  querySelector: selector => selector === '.modal-card' ? modalCard : null,
  querySelectorAll: selector => selector === '[data-app-store-order]' ? [clickedStore] : []
};
const rememberContext = {
  window: {
    scrollY: 0,
    daedongMarkExternalAppDeparture() {},
    daedongCaptureReturnAnchor: (_card, element) => ({kind: 'attribute', name: 'data-app-store-order', value: element.dataset.appStoreOrder, offset: 96}),
    daedongWriteExternalReturnState: (key, payload) => { written = {key, payload}; }
  },
  document: {body: {dataset: {lockScrollY: '188'}}},
  sessionStorage: {setItem() {}},
  Date, JSON,
  $: selector => ({'#modal': modal, '#modalContent': {innerHTML: '<section class="app-browser">목록</section>'}}[selector] || null)
};
vm.createContext(rememberContext);
vm.runInContext(`const FX_APP_BROWSER_RETURN='daedongAppBrowserReturnV1';${rememberSource};fxRememberAppBrowserReturn('baemin','store-42');`, rememberContext);
assert.equal(written.key, 'daedongAppBrowserReturnV1');
assert.equal(written.payload.anchorStoreId, 'store-42', '픽셀값만이 아니라 눌렀던 가게 ID를 저장해야 합니다.');
assert.equal(written.payload.anchor.value, 'store-42');
assert.equal(written.payload.modalScroll, 730);
assert.match(written.payload.modalSnapshot.html, /app-browser/, '앱 가게목록도 첫 페인트에서 즉시 복원할 수 있어야 합니다.');

const restoreSource = extractFunction(finalExperience, 'fxRestoreAppBrowserReturn');
const restoreSaved = {...written.payload, savedAt: Date.now()};
const restoreModal = {hidden: true, dataset: {}};
let opened = null;
let stabilized = null;
let cleared = null;
const restoreContext = {
  window: {
    daedongReadExternalReturnState: () => restoreSaved,
    daedongStabilizeReturnPosition: saved => { stabilized = saved; },
    daedongClearExternalReturnState: (key, saved) => { cleared = {key, saved}; },
    scrollTo() {}
  },
  sessionStorage: {getItem() { return null; }, removeItem() {}},
  Date, JSON,
  $: selector => selector === '#modal' ? restoreModal : null,
  hardClose() {},
  openAppBrowser: (key, category) => { opened = {key, category}; restoreModal.hidden = false; restoreModal.dataset.appBrowserKey = key; }
};
vm.createContext(restoreContext);
const restored = vm.runInContext(`const FX_APP_BROWSER_RETURN='daedongAppBrowserReturnV1';${restoreSource};fxRestoreAppBrowserReturn();`, restoreContext);
assert.equal(restored, true);
assert.deepEqual(opened, {key: 'baemin', category: '한식'});
assert.equal(stabilized.anchorStoreId, 'store-42', '재정렬 뒤에도 눌렀던 가게를 기준으로 위치를 맞춰야 합니다.');
assert.equal(cleared.key, 'daedongAppBrowserReturnV1');

const applyPositionSource = extractFunction(rc2, 'rc2ApplyReturnPosition');
const fakeCard = {scrollTop: 400, getBoundingClientRect: () => ({top: 100})};
const fakeAnchor = {getBoundingClientRect: () => ({top: 310})};
const positionContext = {rc2ResolveReturnAnchor: () => fakeAnchor, Math, Number};
vm.createContext(positionContext);
vm.runInContext(`${applyPositionSource};rc2ApplyReturnPosition(card,{anchor:{offset:60}},false);`, Object.assign(positionContext, {card: fakeCard}));
assert.equal(fakeCard.scrollTop, 550, '비동기 렌더링으로 기준 항목이 150px 밀리면 스크롤도 150px 보정해야 합니다.');

assert.match(rc2, /RC2_RETURN_STORAGE_KEYS = \[RC2_EXTERNAL_RETURN, RC2_APP_BROWSER_RETURN\]/);
assert.match(rc2, /for \(const delay of \[120, 360, 800, 1600\]\)/, '사진·메뉴 렌더링 뒤 위치를 다시 맞춰야 합니다.');
assert.match(rc2, /async function rc2RestoreExternalSurface\(\{rebuildExisting = false\} = \{\}\)[\s\S]*?rc2RestoreAfterExternalPage\(\{rebuildExisting\}\)[\s\S]*?fxRestoreAppBrowserReturn/);
assert.match(rc2, /if \(restored\) window\.daedongFinishExternalReturnBoot/);
const nativeResumeLifecycle = rc2.match(/visibilitychange[\s\S]*?window\.addEventListener\('pageshow'/)?.[0] || '';
assert.match(nativeResumeLifecycle, /rc2RestoreExternalSurface\(\{rebuildExisting: true\}\)[\s\S]*?if \(restored\)[\s\S]*?else rc2StartAmbient\(false\)/,
  '복귀 화면 복원을 먼저 시도하고 저장 상태가 없을 때만 홈 효과를 시작해야 합니다.');

if (menu) {
  assert.match(menu, /data-store-id="\$\{escapeMenuHtml\(store\.id\)\}"/);
  assert.match(menu, /function captureMenuReturnState\(\)[\s\S]*?anchorMenuId[\s\S]*?selectedMenuId/);
  assert.match(menu, /window\.daedongMenuReturn = Object\.freeze\([\s\S]*?capture: captureMenuReturnState[\s\S]*?restore:/);
}
assert.match(rc2, /const menuState = window\.daedongMenuReturn\?\.capture/);
assert.match(rc2, /await window\.daedongMenuReturn\?\.restore/);

assert.match(html, /final-experience\.js\?v=[^"\n]*all-order-app-exact-return-1/);
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*all-order-app-exact-return-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*all-order-app-exact-return-1/);

console.log('all-order-app-exact-return-regression-test: pass');
