import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const app = fs.readFileSync('app.js', 'utf8');
const code = app.slice(app.indexOf('function analyticsEntryContext()'), app.indexOf('function analyticsRegionPart'));
function page(path) {
  const location = new URL(path, 'https://daedongmap.com');
  const ctx = vm.createContext({ URLSearchParams, URL, location, document: {referrer: ''} });
  vm.runInContext('let analyticsInitialEntry = null;\n' + code, ctx);
  return { location, entry: () => JSON.parse(vm.runInContext('JSON.stringify(analyticsEntryContext())', ctx)) };
}
for (const [path, source] of [
  ['/s?m', 'partner_sms'], ['/s?q', 'partner_qr'], ['/s', 'partner_link'],
  ['/s/?q', 'partner_qr'], ['/s/index.html?m', 'partner_sms'],
  ['/s?m&q', 'partner_link'], ['/?m&q', 'direct'],
  ['/?m', 'map_sms'], ['/?q', 'map_qr'],
  ['/?hero=aaaaaaaaaaaaaaaa', 'store_link'], ['/?store=aaaaaaaaaaaaaaaa', 'shared_link'],
  ['/?partner=shared-yeosu', 'direct'], ['/?source=store_qr_legacy', 'store_qr_legacy'],
  ['/?source=store_qr', 'store_qr'], ['/', 'direct'],
]) assert.equal(page(path).entry().entrySource, source, path);
const shared = page('/s?q&hero=aaaaaaaaaaaaaaaa&store=aaaaaaaaaaaaaaaa');
assert.deepEqual(shared.entry(), {entrySource: 'partner_qr', storeId:'aaaaaaaaaaaaaaaa'});
shared.location.search = '?store=bbbbbbbbbbbbbbbb';
shared.location.pathname = '/';
assert.deepEqual(shared.entry(), {entrySource: 'partner_qr', storeId:'aaaaaaaaaaaaaaaa'}, 'store navigation must retain the entry attribution');
assert.equal(page('/').entry().entrySource, 'direct', 'new direct page must not inherit a persisted partner profile');
assert.doesNotMatch(code, /localStorage|sessionStorage/);
assert.match(app, /if \(analyticsOwnerExcluded\(\)\) return;/);
assert.match(fs.readFileSync('index.html', 'utf8'), /partner-analytics-1/);
console.log('Partner analytics: SMS, QR, unmarked, ambiguous, dedicated, old link and fresh-entry isolation PASS');
