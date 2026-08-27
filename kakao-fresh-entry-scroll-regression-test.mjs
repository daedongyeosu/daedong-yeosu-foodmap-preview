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

function runBoot({href = 'https://preview.daedongmap.com/', historyState = null, session = {}, local = {}, navigationType = 'navigate', cookie = '', userAgent = 'Mozilla/5.0 Chrome/140 Mobile Safari/537.36'} = {}) {
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
  const document = {
    cookie,
    documentElement: {classList: {add: value => classes.add(value), remove: value => classes.delete(value)}}
  };
  const context = {
    document,
    location: {href, protocol: new URL(href).protocol},
    sessionStorage,
    localStorage,
    history,
    navigator: {userAgent},
    window: {},
    URL,
    String,
    Date,
    JSON,
    performance: {
      getEntriesByType(type) { return type === 'navigation' ? [{type: navigationType}] : []; },
      navigation: {type: navigationType === 'back_forward' ? 2 : 0}
    }
  };
  vm.createContext(context);
  vm.runInContext(bootScript, context);
  return {classes, replaced, sessionStorage, localStorage, history, window: context.window, document};
}

const now = Date.now();
const saved = JSON.stringify({storeId: 'store-1', returnToken: 'return-token-1', savedAt: now});
const marker = JSON.stringify({returnToken: 'return-token-1', savedAt: now});

const freshBrowserEntry = runBoot({
  session: {daedongExternalReturnRc2: saved},
  local: {
    daedongExternalReturnRc2: saved,
    daedongExternalAppDepartureV1: marker
  }
});
assert.equal(freshBrowserEntry.classes.has('daedong-external-return-pending'), false,
  '일반 브라우저의 루트 링크는 과거 주문앱 복귀 기록이 남아 있어도 새 방문이어야 합니다.');
assert.equal(freshBrowserEntry.sessionStorage.has('daedongExternalReturnRc2'), false,
  '새 방문에서 세션 복귀 기록을 지워 이후의 잘못된 중간 화면 복원을 막아야 합니다.');
assert.equal(freshBrowserEntry.localStorage.has('daedongExternalAppDepartureV1'), false,
  '새 방문에서 과거 주문앱 출발 표식을 지워야 합니다.');

const detachedKakaoLinkReturn = runBoot({
  userAgent: 'Mozilla/5.0 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.6.0',
  session: {daedongExternalReturnRc2: saved},
  local: {
    daedongExternalReturnRc2: saved,
    daedongExternalAppDepartureV1: marker
  }
});
assert.equal(detachedKakaoLinkReturn.classes.has('daedong-external-return-pending'), true,
  '요기요가 Preview를 끊어도 30분 안에 카카오톡 링크를 다시 누르면 보던 가게를 복원해야 합니다.');
assert.equal(detachedKakaoLinkReturn.window.daedongEntryIsDetachedKakaoReturn, true,
  '런타임도 새 문서형 카카오 복귀임을 이어서 판별할 수 있어야 합니다.');

const cleanBackForwardReturn = runBoot({
  navigationType: 'back_forward',
  session: {
    daedongExternalReturnRc2: saved,
    daedongExternalAppDepartureV1: marker
  }
});
assert.equal(cleanBackForwardReturn.classes.has('daedong-external-return-pending'), true,
  '카카오가 URL 토큰을 버려도 실제 뒤로가기 재진입과 정확한 출발 표식이 함께 맞으면 복원해야 합니다.');

const durableCookieValue = encodeURIComponent(JSON.stringify({
  storageKey: 'daedongExternalReturnRc2',
  returnToken: 'return-token-1',
  savedAt: now,
  payload: JSON.parse(saved)
}));
const storageLostBackForwardReturn = runBoot({
  navigationType: 'back_forward',
  cookie: `daedongOrderReturnV1=${durableCookieValue}`
});
assert.equal(storageLostBackForwardReturn.classes.has('daedong-external-return-pending'), true,
  '카카오가 Web Storage를 모두 잃어도 실제 뒤로가기와 30분 이내 일회용 쿠키가 맞으면 복원해야 합니다.');
assert.equal(storageLostBackForwardReturn.sessionStorage.has('daedongExternalReturnRc2'), true,
  '초기 부트가 내구성 쿠키의 최소 복귀정보를 세션 저장소에 다시 세워야 합니다.');
assert.equal(storageLostBackForwardReturn.localStorage.has('daedongExternalAppDepartureV1'), true,
  '복원 전에 쿠키 토큰과 같은 출발 표식을 다시 세워야 합니다.');

const storageLostUrlReturn = runBoot({
  href: 'https://preview.daedongmap.com/?__ddret=return-token-1',
  cookie: `daedongOrderReturnV1=${durableCookieValue}`
});
assert.equal(storageLostUrlReturn.classes.has('daedong-external-return-pending'), true,
  'Web Storage가 사라져도 URL과 내구성 쿠키의 일회용 토큰이 같으면 복귀 화면을 보호해야 합니다.');

const freshEntryWithDurableCookie = runBoot({
  cookie: `daedongOrderReturnV1=${durableCookieValue}`
});
assert.equal(freshEntryWithDurableCookie.classes.has('daedong-external-return-pending'), false,
  '일반 새 링크는 내구성 쿠키가 남아 있어도 홈 최상단이어야 합니다.');
assert.match(freshEntryWithDurableCookie.document.cookie, /Max-Age=0/,
  '일반 새 링크는 오래된 내구성 쿠키를 즉시 만료시켜야 합니다.');

const storageLostDetachedKakaoReturn = runBoot({
  userAgent: 'Mozilla/5.0 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.6.0',
  cookie: `daedongOrderReturnV1=${durableCookieValue}`
});
assert.equal(storageLostDetachedKakaoReturn.classes.has('daedong-external-return-pending'), true,
  '카카오가 저장소를 잃어도 30분 내 링크 재진입은 내구성 쿠키로 보던 가게를 복원해야 합니다.');

const expiredSaved = JSON.stringify({storeId: 'store-1', returnToken: 'expired-token', savedAt: now - (31 * 60 * 1000)});
const expiredMarker = JSON.stringify({returnToken: 'expired-token', savedAt: now - (31 * 60 * 1000)});
const expiredKakaoEntry = runBoot({
  userAgent: 'Mozilla/5.0 Chrome/140 Mobile Safari/537.36 KAKAOTALK 25.6.0',
  local: {
    daedongExternalReturnRc2: expiredSaved,
    daedongExternalAppDepartureV1: expiredMarker
  }
});
assert.equal(expiredKakaoEntry.classes.has('daedong-external-return-pending'), false,
  '30분이 지난 카카오 링크 재진입은 오래된 가게 화면을 되살리지 않아야 합니다.');

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
assert.equal(liveReturn.window.daedongEntryHadExternalReturn, true,
  '현재 진입이 실제 주문앱 복귀였다는 사실은 초기 화면 보호용으로 따로 기록해야 합니다.');
liveReturn.window.daedongFinishExternalReturnBoot();
assert.equal(liveReturn.window.daedongPendingExternalReturn, null,
  '복귀 화면 구성이 끝나면 실시간 복귀 표식을 해제해 다음 앱 재접속을 막지 않아야 합니다.');
assert.equal(liveReturn.window.daedongEntryHadExternalReturn, true,
  '실시간 표식을 해제해도 현재 진입의 화면 위치 보호 기록은 유지해야 합니다.');

const mismatchedUrl = runBoot({
  href: 'https://preview.daedongmap.com/?store=abc&__ddret=wrong-token#app',
  historyState: {daedongExternalReturnToken: 'wrong-token'},
  local: {daedongExternalReturnRc2: saved}
});
assert.equal(mismatchedUrl.classes.has('daedong-external-return-pending'), false);
assert.equal(mismatchedUrl.replaced.at(-1), '/?store=abc#app',
  '일치하지 않는 일회용 표식만 제거하고 다른 공유주소 정보는 보존해야 합니다.');

assert.match(app, /const DAEDONG_ENTRY_STARTED_WITH_EXTERNAL_RETURN = Boolean\(globalThis\.daedongEntryHadExternalReturn\)/);
assert.match(app, /resetFreshEntryScroll\(\{force: true\}\)/,
  '복귀 완료 후 재접속은 과거 진입 상태를 강제로 무시하고 홈 최상단으로 보내야 합니다.');
assert.match(rc2, /const RC2_RETURN_TOKEN_PARAM = '__ddret'/);
assert.match(rc2, /returnUrl\.searchParams\.set\(RC2_RETURN_TOKEN_PARAM, returnToken\)/,
  '주문앱 출발 전에 같은 화면에만 일회용 복귀표식을 기록해야 합니다.');
assert.match(rc2, /rc2WriteDurableReturn\(key, payload\)/,
  '카카오가 Web Storage를 잃는 실제 휴대전화에서는 최소 복귀정보를 일회용 자사 쿠키에도 남겨야 합니다.');
assert.match(rc2, /savedToken === historyToken[\s\S]*?savedToken === urlToken[\s\S]*?savedToken === departureToken/,
  '저장소에 값이 있다는 이유만으로 복귀하지 말고 URL·history 또는 실제 뒤로가기 출발 표식이 일치해야 합니다.');
assert.match(rc2, /daedongEntryIsDetachedKakaoReturn === true/,
  '새 문서로 다시 열린 카카오 복귀에서도 초기 부트가 검증한 출발 표식을 런타임이 이어받아야 합니다.');
assert.doesNotMatch(rc2, /if \(rc2FreshReturnState\(sessionSaved\)\) return sessionSaved/,
  '과거 세션 값만으로 카카오톡 새 방문을 중간 위치로 보내면 안 됩니다.');
assert.match(html, /final-experience\.js\?v=[^"\n]*kakao-fresh-entry-token-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*detached-kakao-order-return-1/,
  '카카오 링크 재진입 수정본을 즉시 받도록 최종 런타임 주소를 갱신해야 합니다.');
assert.match(html, /app\.js\?v=[^"\n]*external-return-lifecycle-1/,
  '기존 휴대폰 런타임 캐시에 남은 app.js와 구분되는 주소가 필요합니다.');
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*kakao-fresh-entry-token-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*detached-kakao-order-return-1/,
  '카카오 링크 재진입을 이어받는 RC2 수정본의 캐시 주소가 달라야 합니다.');

console.log('kakao-fresh-entry-scroll-regression-test: pass');
