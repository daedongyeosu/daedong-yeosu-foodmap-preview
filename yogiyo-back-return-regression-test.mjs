import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const browserTest = fs.readFileSync('scripts/browser-yogiyo-back-return.mjs', 'utf8');

const helperStart = rc2.indexOf('function rc2LaunchComparedExternal(link, href)');
const helperEnd = rc2.indexOf('async function rc2RestoreAfterExternalPage', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, '주문앱 비교화면 전용 실행기가 있어야 합니다.');
const helperSource = rc2.slice(helperStart, helperEnd);

const assigned = [];
const opened = [];
const sandbox = {
  window: {
    location: {assign: href => assigned.push(href)},
    open: (...args) => opened.push(args)
  }
};
vm.runInNewContext(`${helperSource}; globalThis.launchComparedExternal = rc2LaunchComparedExternal;`, sandbox);

const urls = {
  yogiyo: 'https://orders.example.test/yogiyo/store',
  coupang: 'https://orders.example.test/coupang/store',
  baemin: 'https://orders.example.test/baemin/store'
};
sandbox.launchComparedExternal({dataset: {communityOriginal: 'yogiyo'}}, urls.yogiyo);
sandbox.launchComparedExternal({dataset: {communityOriginal: 'coupang'}}, urls.coupang);
sandbox.launchComparedExternal({dataset: {communityOriginal: 'baemin'}}, urls.baemin);

assert.deepEqual(assigned, [urls.yogiyo], '요기요만 현재 탭으로 이동해 브라우저 뒤로가기 기록을 남겨야 합니다.');
assert.deepEqual(opened, [
  [urls.coupang, '_blank', 'noopener'],
  [urls.baemin, '_blank', 'noopener']
], '쿠팡이츠와 배달의민족은 기존처럼 별도 화면으로 열어야 합니다.');

const comparedStart = rc2.indexOf("const comparedExternal = event.target.closest('a[data-community-original]')");
const comparedEnd = rc2.indexOf('const externalLink =', comparedStart);
const comparedHandler = rc2.slice(comparedStart, comparedEnd);
const rememberIndex = comparedHandler.indexOf('rc2RememberExternalReturn(comparedExternal)');
const launchIndex = comparedHandler.indexOf('rc2LaunchComparedExternal(comparedExternal, href)');
assert.ok(rememberIndex >= 0 && launchIndex > rememberIndex, '이동 전에 보고 있던 가게 상세를 저장해야 합니다.');
assert.doesNotMatch(comparedHandler, /history\.back/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*yogiyo-history-return-2/);
assert.match(html, /final-experience\.js\?v=[^"\n]*yogiyo-history-return-2/);
assert.match(browserTest, /window\.daedongCatalogReady && typeof window\.daedongCatalogReady\.then === 'function'/);
assert.match(browserTest, /await restoredDetail\.waitFor\([^\n]*\)\.catch\(async \(\) =>/);

console.log('yogiyo-back-return-regression-test: pass');

