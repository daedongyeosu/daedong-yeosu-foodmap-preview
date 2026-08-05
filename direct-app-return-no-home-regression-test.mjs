import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const html = fs.readFileSync('index.html', 'utf8');
const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');

const headEnd = html.indexOf('</head>');
const bodyStart = html.indexOf('<body>');
const bootClass = html.indexOf('daedong-external-return-pending');
assert.ok(bootClass > -1 && bootClass < headEnd && headEnd < bodyStart, '복귀 차단막은 홈 본문보다 먼저 준비되어야 합니다.');
assert.match(html, /html\.daedong-external-return-pending body>\*\{visibility:hidden!important\}/);
assert.match(html, /보던 가게로 바로 돌아가는 중/);
assert.match(html, /\['daedongExternalReturnRc2', 'storeId'\]/);
assert.match(html, /\['daedongAppBrowserReturnV1', 'key'\]/);
assert.match(html, /window\.daedongFinishExternalReturnBoot/);
assert.match(html, /window\.setTimeout\(window\.daedongFinishExternalReturnBoot, 12000\)/);

const bootScript = html.match(/<script>\s*([\s\S]*?daedongFinishExternalReturnBoot[\s\S]*?)<\/script>/)?.[1] || '';
assert.ok(bootScript, '복귀 첫 화면 스크립트를 찾아야 합니다.');
const classes = new Set();
const context = {
  document: {documentElement: {classList: {add: value => classes.add(value), remove: value => classes.delete(value)}}},
  sessionStorage: {getItem: key => key === 'daedongExternalReturnRc2' ? JSON.stringify({storeId:'store-1', savedAt:Date.now()}) : null},
  window: {setTimeout() {}},
  Date,
  JSON
};
vm.createContext(context);
vm.runInContext(bootScript, context);
assert.equal(classes.has('daedong-external-return-pending'), true, '복귀 상태이면 홈을 첫 페인트부터 가려야 합니다.');
context.window.daedongFinishExternalReturnBoot();
assert.equal(classes.has('daedong-external-return-pending'), false, '가게 복원이 끝나면 차단막을 제거해야 합니다.');

assert.match(rc2, /visibleStoreId[\s\S]*?modal\.querySelector\('\.store-detail'\)[\s\S]*?saved\.storeId/);
assert.match(rc2, /rc2ModalStack\.length = 0;[\s\S]*?rc2NativeHardClose\(\{fromPop: true\}\)/);
assert.match(rc2, /scrollWindowInstant\(Number\(saved\.pageScroll \|\| 0\)\)[\s\S]*?await openStore\(store\)/);

const initializeStart = rc2.indexOf('fxInitialize = async function rc2Initialize()');
const initialize = rc2.slice(initializeStart);
assert.ok(initialize.indexOf('await rc2RestoreAfterExternalPage()') < initialize.indexOf('await fxInitWeather()'), '가게 복원은 날씨 로딩보다 먼저 끝나야 합니다.');
assert.match(initialize, /finally \{[\s\S]*?daedongFinishExternalReturnBoot/);
assert.match(initialize, /rc2StartAmbient\(!restoredStore && !restoredAppBrowser\)/);

assert.match(html, /final-experience\.js\?v=[^"\n]*direct-return-no-home-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*direct-return-no-home-1/);

console.log('direct-app-return-no-home-regression-test: pass');
