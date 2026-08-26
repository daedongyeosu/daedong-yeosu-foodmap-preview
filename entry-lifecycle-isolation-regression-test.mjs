import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('app.js', 'utf8');
const bootSource = source.slice(0, source.indexOf('const DAEDONG_TAP_MOVE_TOLERANCE'));
assert.ok(bootSource.length > 0, '진입 생명주기 코드를 분리할 수 있어야 합니다.');
assert.match(bootSource, /const DAEDONG_INSTALLED_APP_CONTEXT = isInstalledAppLaunchContext\(\)/);
assert.match(bootSource, /if \(DAEDONG_INSTALLED_APP_CONTEXT && typeof window\.launchQueue/,
  'LaunchQueue는 설치형 앱에서만 등록해야 합니다.');
assert.match(bootSource, /if \(DAEDONG_INSTALLED_APP_CONTEXT && typeof window !== 'undefined'/,
  '재개 감시 묶음 전체를 설치형 앱 조건으로 감싸야 합니다.');

function createRuntime({search = '', standalone = false, launchReloaded = false} = {}) {
  let reloads = 0;
  const intervals = [];
  const windowListeners = new Map();
  const documentListeners = new Map();
  const sessionValues = new Map(launchReloaded ? [['daedong-installed-launch-reloaded', '1']] : []);
  const scrollingElement = {scrollTop: 900};
  const body = {scrollTop: 900};
  let launchConsumer = null;

  const addListener = (registry, type, listener, options = {}) => {
    const current = registry.get(type) || [];
    current.push({listener, once: Boolean(options?.once)});
    registry.set(type, current);
  };
  const dispatch = (registry, type) => {
    const current = [...(registry.get(type) || [])];
    registry.set(type, current.filter(item => !item.once));
    current.forEach(item => item.listener({type}));
  };
  const sandbox = {
    console,
    URLSearchParams,
    Date,
    performance: {now: () => 3000},
    history: {scrollRestoration: 'auto'},
    navigator: {standalone: false},
    location: {search, reload: () => { reloads += 1; }},
    sessionStorage: {
      getItem: key => sessionValues.get(key) ?? null,
      setItem: (key, value) => sessionValues.set(key, String(value)),
      removeItem: key => sessionValues.delete(key)
    },
    document: {
      readyState: 'complete',
      visibilityState: 'visible',
      scrollingElement,
      documentElement: scrollingElement,
      body,
      addEventListener: (type, listener, options) => addListener(documentListeners, type, listener, options)
    },
    launchQueue: {setConsumer: consumer => { launchConsumer = consumer; }},
    matchMedia: () => ({matches: standalone}),
    requestAnimationFrame: listener => listener(),
    setTimeout: listener => { listener(); return 1; },
    setInterval: listener => { intervals.push(listener); return intervals.length; },
    addEventListener: (type, listener, options) => addListener(windowListeners, type, listener, options),
    scrollTo: (_x, y) => { scrollingElement.scrollTop = y; body.scrollTop = y; }
  };
  sandbox.window = sandbox;
  vm.runInNewContext(bootSource, sandbox, {filename: 'entry-lifecycle-boot.js'});
  return {
    sandbox,
    scrollingElement,
    body,
    windowListeners,
    documentListeners,
    intervals,
    get launchConsumer() { return launchConsumer; },
    get reloads() { return reloads; },
    dispatchWindow: type => dispatch(windowListeners, type),
    dispatchDocument: type => dispatch(documentListeners, type)
  };
}

const kakaoWeb = createRuntime();
assert.equal(kakaoWeb.launchConsumer, null,
  '일반 카카오 웹 진입에는 설치 앱 LaunchQueue 소비자를 등록하면 안 됩니다.');
for (const type of ['resume', 'visibilitychange', 'pointerdown', 'touchstart']) {
  assert.equal(kakaoWeb.documentListeners.has(type), false,
    `일반 카카오 웹 진입에는 설치 앱 ${type} 감시를 등록하면 안 됩니다.`);
}
for (const type of ['blur', 'focus']) {
  assert.equal(kakaoWeb.windowListeners.has(type), false,
    `일반 카카오 웹 진입에는 설치 앱 ${type} 감시를 등록하면 안 됩니다.`);
}
assert.equal(kakaoWeb.intervals.length, 0,
  '일반 카카오 화면에서 설치 앱 재개용 heartbeat를 실행하면 안 됩니다.');
kakaoWeb.scrollingElement.scrollTop = 720;
kakaoWeb.body.scrollTop = 720;
kakaoWeb.dispatchWindow('focus');
kakaoWeb.dispatchDocument('resume');
kakaoWeb.dispatchDocument('pointerdown');
assert.equal(kakaoWeb.scrollingElement.scrollTop, 720,
  '카카오 화면의 고객 위치를 설치 앱 재개 로직이 강제로 바꾸면 안 됩니다.');
assert.equal(kakaoWeb.reloads, 0,
  '카카오 화면의 재개 이벤트는 절대로 location.reload를 호출하면 안 됩니다.');

const installedApp = createRuntime({search: '?source=android-app', launchReloaded: true});
assert.equal(typeof installedApp.launchConsumer, 'function',
  'Android 설치형 앱에서는 LaunchQueue 처리를 유지해야 합니다.');
assert.equal(installedApp.documentListeners.has('resume'), true,
  'Android 설치형 앱에서는 resume 처리를 유지해야 합니다.');
assert.equal(installedApp.intervals.length, 1,
  'Android 설치형 앱에서는 누락된 런처 재개 신호를 감지해야 합니다.');
installedApp.scrollingElement.scrollTop = 640;
installedApp.body.scrollTop = 640;
installedApp.dispatchDocument('resume');
assert.equal(installedApp.scrollingElement.scrollTop, 0,
  '설치형 앱을 다시 실행하면 홈 최상단으로 이동해야 합니다.');
assert.equal(installedApp.reloads, 0,
  '이미 한 번 새로고침된 설치형 앱은 재실행 루프를 만들면 안 됩니다.');

console.log('entry lifecycle isolation regression: PASS');
