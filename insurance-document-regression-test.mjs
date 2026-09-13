import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createHash} from 'node:crypto';

const source = fs.readFileSync('local-service-ads.js', 'utf8');
const listeners = {};
const context = {window: {}, location: {hostname: 'preview.daedongmap.com'}, ACTIVE_REGION: {code: 'yeosu'}, document: {
  readyState: 'complete', addEventListener(type, handler) { listeners[type] = handler; }, getElementById() { return null; }
}};
vm.runInNewContext(source, context);
const markup = context.window.daedongLocalServices.detail('hyundai-sinwansu');
assert.match(markup, /Hi2601\) 상품요약서/);
assert.match(markup, /전체 9쪽/);
assert.match(markup, /별도의 공식 상품요약서/);
assert.match(markup, /담당자 제공 전단 4장 펼쳐 보기/);
assert.match(markup, /20260109095156269\.pdf/);
assert.ok(markup.indexOf('선명한 PDF 원본') < markup.indexOf('담당자 제공 전단 4장 펼쳐 보기'));
assert.equal((markup.match(/src="[^"]*hyundai-summary-/g) || []).length, 1, 'Load only the current high-resolution page, not all nine');
assert.doesNotMatch(context.window.daedongLocalServices.detail('coway-leehyangmi'), /local-service-reader|Hi2601/);
const pdf = fs.readFileSync('assets/local-services/hyundai-hibike-hi2601-summary.pdf');
assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
assert.equal(createHash('sha256').update(pdf).digest('hex'), 'c354d2169c5996ebb3e1a10a24c8358fc179c9faab1153391c8914fa752a86e2', 'Official PDF must remain byte-for-byte unchanged');
for (let page = 1; page <= 9; page++) {
  const png = fs.readFileSync(`assets/local-services/hyundai-summary-${page}.png`);
  assert.equal(png.subarray(1, 4).toString(), 'PNG');
  assert.equal(png.readUInt32BE(16), 3600, 'All pages need a real high-resolution render');
  assert.ok(png.readUInt32BE(20) >= 2540);
}
const elements = Object.fromEntries([
  '[data-document-status]', '[data-document-scale]', '[data-document-action="previous"]',
  '[data-document-action="next"]', '[data-document-action="out"]',
  '.local-service-document-error', '.local-service-document-viewport'
].map(key => [key, {}]));
elements['.local-service-document-viewport img'] = {style: {}, clientWidth: 1800, clientHeight: 1274};
const reader = {dataset: {documentPage: '1', documentZoom: '100'}, querySelector(key) { assert.ok(elements[key], key); return elements[key]; }};
function click(action) {
  const button = {dataset: {documentAction: action}, closest() { return reader; }};
  listeners.click({target: {closest(selector) { return selector === '[data-document-action]' ? button : null; }}});
}
click('previous');
assert.equal(reader.dataset.documentPage, '1');
assert.equal(elements['[data-document-action="previous"]'].disabled, true);
click('read');
assert.equal(reader.dataset.documentZoom, '600');
assert.equal(elements['.local-service-document-viewport img'].style.width, '600%');
assert.equal(elements['.local-service-document-viewport'].scrollLeft, 180);
assert.equal(elements['.local-service-document-viewport'].scrollTop, 102);
click('next');
assert.equal(reader.dataset.documentPage, '2');
assert.equal(reader.dataset.documentZoom, '600', 'Preserve reading zoom across pages');
assert.match(elements['.local-service-document-viewport img'].src, /hyundai-summary-2\.png$/);
assert.match(elements['.local-service-document-viewport img'].alt, /2 \/ 9쪽/);
for (let n = 0; n < 12; n++) click('next');
assert.equal(reader.dataset.documentPage, '9');
assert.equal(elements['[data-document-action="next"]'].disabled, true);
assert.equal(elements['[data-document-status]'].textContent, '9 / 9쪽');
click('out'); assert.equal(reader.dataset.documentZoom, '300');
click('out'); assert.equal(reader.dataset.documentZoom, '100');
click('out'); assert.equal(reader.dataset.documentZoom, '100');
assert.equal(elements['[data-document-action="out"]'].disabled, true);
click('read'); click('fit'); assert.equal(reader.dataset.documentZoom, '100');
assert.equal(elements['.local-service-document-viewport'].scrollLeft, 0);
reader.dataset.documentPage = '-100'; reader.dataset.documentZoom = 'NaN';
click('previous'); assert.equal(reader.dataset.documentPage, '1'); assert.equal(reader.dataset.documentZoom, '100');
listeners.error({target: {matches() { return true; }, closest() { return reader; }}});
assert.equal(elements['.local-service-document-error'].hidden, false);
click('next'); assert.equal(elements['.local-service-document-error'].hidden, true);
for (const file of ['index.html', 'services/index.html']) {
  const html = fs.readFileSync(file, 'utf8');
  assert.match(html, /local-service-ads\.css\?v=insurance-readable-20260913/);
  assert.match(html, /local-service-ads\.js\?v=insurance-readable-20260913/);
}
const css = fs.readFileSync('local-service-ads.css', 'utf8');
assert.match(css, /\.local-service-document-viewport\{[^}]*overflow:auto/);
assert.match(css, /\.local-service-document-viewport img\{[^}]*max-width:none!important/);
console.log('Insurance document: exact official PDF, nine sharp pages, lazy page loading, navigation limits, zoom, error fallback and cache PASS');
