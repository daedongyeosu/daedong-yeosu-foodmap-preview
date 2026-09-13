import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';

const source = process.argv.includes('--baseline')
  ? execFileSync('git', ['show', 'origin/main:app.js'], {encoding: 'utf8'})
  : fs.readFileSync('app.js', 'utf8');
assert.ok(source.includes('function installedAppQrTarget('), 'QR launch target handling must be present');
const code = source.slice(source.indexOf('function installedAppQrTarget('), source.indexOf("\nif (DAEDONG_INSTALLED_APP_CONTEXT && typeof window.launchQueue"));
function fixture({href = 'https://daedongmap.com/?source=android-app', active = 'old-store', pending = false, installed = true} = {}) {
  const actions = [];
  const location = {href, origin: new URL(href).origin, replace: url => actions.push(['replace', url]), reload: () => actions.push(['reload'])};
  const context = {URL, String, location, window: {}, document: {querySelector: () => active ? {dataset: {activeStoreId: active, storeId: active}} : null},
    DAEDONG_INSTALLED_APP_CONTEXT: installed, hasValidatedExternalReturnInFlight: () => pending,
    performance: {now: () => 100}, DAEDONG_APP_BOOT_AT: 0, daedongLaunchReloadComplete: true,
    settleInstalledAppAtHome: () => actions.push(['home'])};
  vm.createContext(context); vm.runInContext(code, context);
  return {context, actions};
}
const target = 'https://daedongmap.com/?hero=new-store&source=android-app';
{
  const {context, actions} = fixture({pending: true});
  context.resetInstalledAppLaunch({targetURL: target});
  assert.deepEqual(actions, [['replace', target]], 'new explicit QR wins over stale return state');
}
{
  const {context, actions} = fixture({href: target});
  context.resetInstalledAppLaunch({targetURL: target});
  assert.deepEqual(actions, [['reload']], 'changed address must not retain old modal');
}
{
  const {context, actions} = fixture({href: target, active: 'new-store', pending: true});
  context.resetInstalledAppLaunch();
  assert.deepEqual(actions, [], 'valid order-app return stays at the correct store');
}
{
  const {context, actions} = fixture({pending: true});
  context.resetInstalledAppLaunch();
  assert.deepEqual(actions, [], 'ordinary return without a QR is preserved');
}
{
  const {context, actions} = fixture({href: target, active: 'another-selected-store', pending: true});
  context.resetInstalledAppLaunch();
  assert.deepEqual(actions, [], 'valid return from another selected store must not reopen the original hero');
}
{
  const {context, actions} = fixture({installed: false});
  context.resetInstalledAppLaunch({targetURL: target});
  assert.deepEqual(actions, [], 'normal browser is not handled as installed app');
}
{
  const {context} = fixture();
  for (const url of ['https://evil.example/?hero=new-store', 'javascript:alert(1)', '/?source=android-app', '/?hero=   ']) {
    assert.equal(context.installedAppQrTarget(url), null, 'reject foreign or non-store targets');
  }
  assert.equal(context.installedAppQrTarget('/?store=new-store').storeId, 'new-store');
}
console.log('installed-qr-target-regression-test: 11 launch/return boundary checks passed');
