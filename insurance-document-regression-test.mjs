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
assert.deepEqual([...markup.matchAll(/data-insurance-sheet="(\d)"/g)].map(m => m[1]), ['1','2','3','4']);
assert.doesNotMatch(markup, /<details|<summary|<iframe|<canvas|\bdownload\b|data-document-action|hyundai-summary-\d|PDF 원본|PDF 저장|펼쳐 보기|다음 페이지/,
  'All four sheets must be readable without a viewer, accordion, download or extra navigation');
for (const phrase of ['상품특징','가입안내','가입 시 유의사항','비유상운송배달','유상운송배달','50%를 공제','비례보상','적거나 없을 수','화면용 안내']) assert.ok(markup.includes(phrase), phrase);
assert.equal((markup.match(/id="modalTitle"/g) || []).length, 1);
assert.ok(markup.indexOf('data-insurance-sheet="1"') < markup.indexOf('data-insurance-sheet="4"'));
assert.ok(markup.indexOf('data-insurance-sheet="4"') < markup.indexOf('insurance-source-links'), 'Source files are secondary, after directly readable content');
assert.match(markup, /20260109095156269\.pdf/);
assert.match(markup, /data-insurance-font aria-pressed="false"/);
assert.doesNotMatch(context.window.daedongLocalServices.detail('coway-leehyangmi'), /insurance-brochure|data-insurance-font|Hi2601/);
const pdf = fs.readFileSync('assets/local-services/hyundai-hibike-hi2601-summary.pdf');
assert.equal(createHash('sha256').update(pdf).digest('hex'), 'c354d2169c5996ebb3e1a10a24c8358fc179c9faab1153391c8914fa752a86e2', 'Official source remains unchanged');
for (let page = 1; page <= 4; page++) {
  assert.ok(fs.existsSync(`assets/local-services/hyundai-guide-${page}.png`));
  assert.ok(markup.includes(`aria-label="제공 전단 ${page}장 보기"`));
}
for (let page = 1; page <= 9; page++) {
  const png = fs.readFileSync(`assets/local-services/hyundai-summary-${page}.png`);
  assert.equal(png.readUInt32BE(16), 3600, 'Retain sharp source renders, without requiring their viewer');
}
let large = false;
const detail = {classList: {toggle(name) { assert.equal(name, 'insurance-large-text'); return large = !large; }}};
const button = {attributes: {}, closest(selector) { assert.equal(selector, '[data-service-detail="hyundai-sinwansu"]'); return detail; }, setAttribute(k,v) { this.attributes[k] = v; }};
const event = {target: {closest(selector) { return selector === '[data-insurance-font]' ? button : null; }}};
listeners.click(event);
assert.equal(large, true); assert.equal(button.attributes['aria-pressed'], 'true'); assert.match(button.textContent, /기본 글자/);
listeners.click(event);
assert.equal(large, false); assert.equal(button.attributes['aria-pressed'], 'false'); assert.match(button.textContent, /글자 더 크게/);
for (const file of ['index.html','services/index.html']) {
  const html = fs.readFileSync(file, 'utf8');
  assert.match(html, /local-service-ads\.css\?v=insurance-direct-four-20260913/);
  assert.match(html, /local-service-ads\.js\?v=insurance-direct-four-20260913/);
}
assert.doesNotMatch(fs.readFileSync('services/index.html','utf8'), /maximum-scale|user-scalable=no/, 'Standalone native pinch zoom stays available');
const css = fs.readFileSync('local-service-ads.css', 'utf8');
assert.match(css, /\.insurance-direct\{--insurance-text-size:18px\}/);
assert.match(css, /\.insurance-large-text\{--insurance-text-size:23px\}/);
assert.doesNotMatch(css, /\.insurance-sheet\{[^}]*[;{](?:height|max-height):|\.insurance-brochure\{[^}]*overflow:(?:hidden|auto)/, 'Read as one continuous page, not fixed-height nested viewports');
console.log('Insurance: four always-visible live-text sheets, one-step font enlargement, complete source access, contact isolation and cache PASS');
