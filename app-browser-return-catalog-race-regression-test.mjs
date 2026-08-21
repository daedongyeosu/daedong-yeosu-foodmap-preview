import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

function extractFunction(name) {
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
    if (character === '"' || character === "'" || character === '`') { quote = character; continue; }
    if (character === '{') depth += 1;
    if (character === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} 함수의 끝을 찾지 못했습니다.`);
}

const restoreSource = extractFunction('fxRestoreAppBrowserReturn');
const saved = {key: 'mukkebi', category: '추천', savedAt: Date.now(), pageScroll: 0};

function restoreScenario({catalogComplete, visible, cardCount}) {
  let opened = 0;
  let cleared = 0;
  let stabilized = 0;
  const modal = {
    hidden: !visible,
    dataset: visible ? {appBrowserKey: 'mukkebi'} : {},
    querySelectorAll: selector => selector === '[data-app-store-order]' ? Array.from({length: cardCount}, () => ({})) : []
  };
  const context = {
    window: {
      __daedongCatalogProgress: {complete: catalogComplete},
      daedongReadExternalReturnState: () => saved,
      daedongStabilizeReturnPosition: () => { stabilized += 1; },
      daedongClearExternalReturnState: () => { cleared += 1; },
      scrollTo() {}
    },
    sessionStorage: {getItem() { return null; }, removeItem() {}},
    Date,
    JSON,
    $: selector => selector === '#modal' ? modal : null,
    hardClose() { modal.hidden = true; },
    openAppBrowser(key) {
      opened += 1;
      modal.hidden = false;
      modal.dataset.appBrowserKey = key;
      modal.querySelectorAll = selector => selector === '[data-app-store-order]' ? [{}] : [];
    }
  };
  vm.createContext(context);
  const restored = vm.runInContext(`const FX_APP_BROWSER_RETURN='daedongAppBrowserReturnV1';${restoreSource};fxRestoreAppBrowserReturn();`, context);
  return {restored, opened, cleared, stabilized};
}

assert.deepEqual(
  restoreScenario({catalogComplete: false, visible: false, cardCount: 0}),
  {restored: false, opened: 0, cleared: 0, stabilized: 0},
  '가게목록 준비 전에는 빈 먹깨비 목록을 만들거나 복귀 상태를 지우면 안 됩니다.'
);
assert.deepEqual(
  restoreScenario({catalogComplete: false, visible: true, cardCount: 0}),
  {restored: false, opened: 0, cleared: 0, stabilized: 0},
  '먼저 열린 빈 목록도 가게목록 준비 전에는 정상 복귀로 확정하면 안 됩니다.'
);
assert.deepEqual(
  restoreScenario({catalogComplete: true, visible: true, cardCount: 0}),
  {restored: true, opened: 1, cleared: 1, stabilized: 1},
  '가게목록 준비 뒤에는 먼저 열린 빈 목록을 실제 먹깨비 가게목록으로 다시 그려야 합니다.'
);
assert.deepEqual(
  restoreScenario({catalogComplete: false, visible: true, cardCount: 3}),
  {restored: true, opened: 0, cleared: 1, stabilized: 1},
  '첫 화면 스냅샷에 실제 가게가 있으면 즉시 복귀를 유지해야 합니다.'
);

assert.match(html, /final-experience\.js\?v=[^"\n]*app-browser-return-catalog-ready-1/);

console.log('app-browser-return-catalog-race-regression-test: pass');

