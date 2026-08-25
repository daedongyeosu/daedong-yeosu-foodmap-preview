import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const bootScript = html.match(/<script>\s*([\s\S]*?daedongFinishExternalReturnBoot[\s\S]*?)<\/script>/)?.[1] || '';

assert.ok(bootScript, '첫 화면 복귀 판별 스크립트를 찾아야 합니다.');

function makeStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem(key) { return values.has(key) ? values.get(key) : null; },
    setItem(key, value) { values.set(key, String(value)); },
    removeItem(key) { values.delete(key); },
    has(key) { return values.has(key); }
  };
}

function runBoot({href = 'https://preview.daedongmap.com/', historyState = null, session = {}, local = {}} = {}) {
  const classes = new Set();
  const replaced = [];
  const sessionStorage = makeStorage(session);
  const localStorage = makeStorage(local);
  const history = {
    state: historyState,
    replaceState(nextState, _title, nextUrl) {
      this.state = nextState;
      replaced.push(nextUrl);
    }
  };
  const context = {
    document: {documentElement: {classList: {add: value => classes.add(value), remove: value => classes.delete(value)}}},
    location: {href},
    sessionStorage,
    localStorage,
    history,
    window: {},
    URL,
    String,
    Date,
    JSON
  };
  vm.createContext(context);
  vm.runInContext(bootScript, context);
  return {classes, replaced, sessionStorage, localStorage, history, window: context.window};
}

const now = Date.now();
const saved = JSON.stringify({storeId: 'store-1', returnToken: 'return-token-1', savedAt: now});
const marker = JSON.stringify({returnToken: 'return-token-1', savedAt: now});

const freshKakao = runBoot({
  session: {daedongExternalReturnRc2: saved},
  local: {
    daedongExternalReturnRc2: saved,
    daedongExternalAppDepartureV1: marker
  }
});
assert.equal(freshKakao.classes.has('daedong-external-return-pending'), false,
  '카카오톡의 일반 루트 링크는 과거 주문앱 복귀 기록이 남아 있어도 새 방문이어야 합니다.');
assert.equal(freshKakao.sessionStorage.has('daedongExternalReturnRc2'), false,
  '새 방문에서 세션 복귀 기록을 지워 이후의 잘못된 중간 화면 복원을 막아야 합니다.');
assert.equal(freshKakao.localStorage.has('daedongExternalAppDepartureV1'), false,
  '새 방문에서 과거 주문앱 출발 표식을 지워야 합니다.');

const urlReturn = runBoot({
  href: 'https://preview.daedongmap.com/?__ddret=return-token-1',
  local: {daedongExternalReturnRc2: saved}
});
assert.equal(urlReturn.classes.has('daedong-external-return-pending'), true,
  '안드로이드가 화면을 재생성해도 일회용 URL 표식이 일치하면 실제 주문앱 복귀를 허용해야 합니다.');

const liveReturn = runBoot({
  historyState: {daedongExternalReturnToken: 'return-token-1'},
  session: {daedongExternalReturnRc2: saved}
});
assert.equal(liveReturn.classes.has('daedong-external-return-pending'), true,
  '같은 화면의 history 표식이 일치하면 보던 위치 복귀를 허용해야 합니다.');

const mismatchedUrl = runBoot({
  href: 'https://preview.daedongmap.com/?store=abc&__ddret=wrong-token#app',
  historyState: {daedongExternalReturnToken: 'wrong-token'},
  local: {daedongExternalReturnRc2: saved}
});
assert.equal(mismatchedUrl.classes.has('daedong-external-return-pending'), false);
assert.equal(mismatchedUrl.replaced.at(-1), '/?store=abc#app',
  '일치하지 않는 일회용 표식만 제거하고 다른 공유주소 정보는 보존해야 합니다.');

assert.match(app, /const DAEDONG_SHOULD_RESET_ENTRY_SCROLL = !globalThis\.daedongPendingExternalReturn/);
assert.match(rc2, /const RC2_RETURN_TOKEN_PARAM = '__ddret'/);
assert.match(rc2, /returnUrl\.searchParams\.set\(RC2_RETURN_TOKEN_PARAM, returnToken\)/,
  '주문앱 출발 전에 같은 화면에만 일회용 복귀표식을 기록해야 합니다.');
assert.match(rc2, /savedToken === historyToken \|\| savedToken === urlToken/,
  '저장소에 값이 있다는 이유만으로 복귀하지 말고 현재 화면 표식도 일치해야 합니다.');
assert.doesNotMatch(rc2, /if \(rc2FreshReturnState\(sessionSaved\)\) return sessionSaved/,
  '과거 세션 값만으로 카카오톡 새 방문을 중간 위치로 보내면 안 됩니다.');
assert.match(html, /final-experience\.js\?v=[^"\n]*kakao-fresh-entry-token-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*kakao-fresh-entry-token-1/);

console.log('kakao-fresh-entry-scroll-regression-test: pass');
