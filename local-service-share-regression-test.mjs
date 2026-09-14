import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('local-service-ads.js', 'utf8');
function setup({navigator = {}, hostname = 'preview.daedongmap.com', standalone = false, id = 'coway-leehyangmi'} = {}) {
  const listeners = {};
  const page = {innerHTML: ''};
  const document = {readyState: 'loading', title: '', addEventListener(name, handler) { listeners[name] = handler; }, getElementById() { return standalone ? page : null; }};
  const context = {window: {}, navigator, document, URLSearchParams, location: {hostname, origin: 'http://localhost:4196', search: `?ad=${id}&store=do-not-share&token=private`}};
  vm.runInNewContext(source, context);
  listeners.DOMContentLoaded();
  const api = context.window.daedongLocalServices;
  const status = {textContent: ''};
  const input = {hidden: true, value: api.shareUrl(id), focus() { this.focused = true; }, select() { this.selected = true; }, setSelectionRange(a, b) { this.range = [a, b]; }};
  const box = {querySelector(selector) { return selector === '[role="status"]' ? status : input; }};
  async function click(action, adId = id) {
    const button = {dataset: {localServiceShare: adId, shareAction: action}, closest() { return box; }};
    listeners.click({target: {closest(selector) { return selector === '[data-local-service-share]' ? button : null; }}, preventDefault() {}});
    await new Promise(resolve => setImmediate(resolve));
  }
  return {api, click, status, input, page, document};
}

const sent = [];
const shared = setup({navigator: {share: async payload => { sent.push(payload); }}});
await shared.click('share');
assert.equal(sent.length, 1);
assert.equal(sent[0].url, 'https://preview.daedongmap.com/services/?ad=coway-leehyangmi');
assert.match(sent[0].title, /코웨이.*이향미.*대동여수음식지도/);
assert.doesNotMatch(sent[0].url, /token|store=/);
assert.match(shared.status.textContent, /공유 창/);

const copied = [];
const copy = setup({navigator: {clipboard: {writeText: async text => copied.push(text)}}});
await copy.click('share');
await copy.click('copy');
assert.equal(copied.length, 2);
assert.equal(copied[0], sent[0].url);
assert.match(copy.status.textContent, /복사했습니다/);

const cancelled = setup({navigator: {share: async () => { throw {name: 'AbortError'}; }, clipboard: {writeText: async () => assert.fail('Cancellation must not write clipboard')}}});
await cancelled.click('share');
assert.match(cancelled.status.textContent, /취소/);

const rejected = setup({navigator: {share: async () => { throw {name: 'NotAllowedError'}; }, clipboard: {writeText: async () => { throw Error('Denied'); }}}});
await rejected.click('share');
assert.equal(rejected.input.hidden, false);
assert.equal(rejected.input.selected, true);
assert.equal(rejected.input.focused, true);
assert.match(rejected.status.textContent, /길게 눌러/);
assert.doesNotMatch(rejected.status.textContent, /복사했습니다/);

for (const id of ['hyundai-sinwansu', 'coway-leehyangmi']) {
  const direct = setup({standalone: true, id});
  assert.match(direct.page.innerHTML, new RegExp(`data-service-detail="${id}"`));
  assert.match(direct.document.title, /대동여수음식지도/);
  const markup = direct.api.detail(id);
  assert.equal((markup.match(/data-local-service-share=/g) || []).length, 2);
  assert.ok(markup.indexOf('data-service-share-box') < markup.indexOf('<h2'), 'Sharing must be visible before the long brochure');
  assert.match(markup, /대동여수음식지도 둘러보기/);
  assert.match(markup, /readonly hidden aria-label="복사할 광고 전용 링크"/);
  assert.equal((direct.api.card(direct.api.advertisers.findIndex(x => x.id === id)).match(/data-local-service-share=/g) || []).length, 1, 'Compact feed keeps one share action; detail retains share and copy');
}
assert.equal(shared.api.shareUrl('unknown'), '');
assert.doesNotMatch(shared.api.detail('unknown'), /data-local-service-share/);
assert.match(setup({standalone: true, id: 'missing'}).page.innerHTML, /광고를 찾을 수 없습니다/);
const production = setup({hostname: 'daedongmap.com'});
assert.equal(production.api.shareUrl('hyundai-sinwansu'), 'https://daedongmap.com/services/?ad=hyundai-sinwansu');
assert.equal(setup({hostname: 'localhost'}).api.shareUrl('coway-leehyangmi'), 'http://localhost:4196/services/?ad=coway-leehyangmi');
for (const file of ['index.html', 'services/index.html']) {
  const html = fs.readFileSync(file, 'utf8');
  for (const ext of ['js', 'css']) assert.match(html, new RegExp(`local-service-ads\\.${ext}\\?v=[^"\\s]*ad-share-20260914`));
}
console.log('Ad sharing: exact advertiser URLs, native share, copy, cancellation, denied permissions, direct entry and cache versions PASS');
