import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('local-service-ads.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const css = fs.readFileSync('local-service-ads.css', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const rail = fs.readFileSync('rc3-fixes.js', 'utf8');
function load(hostname = 'preview.daedongmap.com', region = 'yeosu') {
  const context = {window: {}, location: {hostname}, ACTIVE_REGION: {code: region}, document: {readyState: 'loading', addEventListener() {}}};
  vm.runInNewContext(source, context);
  return context.window.daedongLocalServices;
}
const ads = load();
assert.ok(ads.enabled());
assert.equal(ads.advertisers.length, 2, 'Only supplied, identified advertisers may be published');
assert.equal(load('daedongmap.com').enabled(), false, 'Preview approval must never enable production');
assert.equal(load('preview.daedongmap.com', 'goheung').enabled(), false);
assert.equal(load('daedongmap.com').card(), '');
const stores = Array.from({length: 33}, (_, n) => ({id: `store-${n}`, name: `food-${n}`}));
const before = JSON.stringify(stores);
const storeCard = (s, i) => `<article class="store-card" data-id="${s.id}" data-index="${i}"></article>`;
for (const count of [0, 1, 7, 8, 9, 16, 17, 32, 33]) {
  const rendered = ads.interleave(stores.slice(0, count), storeCard);
  assert.equal((rendered.match(/data-service-ad=/g) || []).length, Math.max(0, Math.floor((count - 1) / 8)), 'An ad only follows eight genuine stores with more results after it');
  assert.deepEqual([...rendered.matchAll(/data-id="([^"]+)"/g)].map(m => m[1]), stores.slice(0, count).map(s => s.id));
}
assert.equal(ads.interleave(stores, storeCard, false), stores.map(storeCard).join(''), 'Search and category lists remain ad-free');
assert.equal(load('daedongmap.com').interleave(stores, storeCard), stores.map(storeCard).join(''));
assert.equal(JSON.stringify(stores), before);
assert.notEqual(ads.card(0), ads.card(1));
assert.equal(ads.card(0), ads.card(2));
for (const ad of ads.advertisers) {
  const markup = ads.card(ads.advertisers.indexOf(ad));
  const detail = ads.detail(ad.id);
  assert.match(markup, /local-service-disclosure">광고/);
  assert.match(markup, /우리 업체도 광고하기/);
  assert.doesNotMatch(markup, /store-card|data-id=|data-rail|영업 중|찜하기|현재 위치|data-route-key|data-channel/);
  assert.doesNotMatch(detail, /리얼펍|청년다방|향미진짬뽕|사장님|수익 보장|최저가|무료 상담/);
  assert.ok(detail.includes(`tel:${ad.phone.replace(/-/g, '')}`));
  assert.ok(detail.includes(`sms:${ad.phone.replace(/-/g, '')}`));
  assert.ok(fs.existsSync('.' + ad.image));
}
const insurance = ads.detail('hyundai-sinwansu');
assert.equal((insurance.match(/data-insurance-sheet="[1-4]"/g) || []).length, 4);
assert.equal((insurance.match(/aria-label="제공 전단 [1-4]장 보기"/g) || []).length, 4);
for (let n = 1; n <= 4; n++) assert.ok(fs.existsSync(`assets/local-services/hyundai-guide-${n}.png`));
assert.match(insurance, /가입 시 유의사항/);
assert.match(insurance, /searchLoginId=1D2544&amp;userType=62/);
assert.doesNotMatch(insurance, /tel:01047977803/);
const inquiry = ads.detail('advertise');
assert.match(inquiry, /tel:01047977803/);
assert.match(inquiry, /mailto:sisakim@naver.com/);
assert.doesNotMatch(inquiry, /01092713781|01044567165/);
assert.doesNotMatch(ads.detail('<img onerror=alert(1)>'), /onerror/);
assert.match(app, /daedongLocalServices\?\.interleave\(visible, storeCard, state.category === '전체' && !state.query && !state.brandId\)/);
assert.match(rail, /if \(index === 1 \|\| index === 3\) staging.insertAdjacentHTML/);
assert.match(css, /#storeGrid>\.local-service-ad\{flex:0 0 100%/);
assert.doesNotMatch(source, /setInterval|MutationObserver|localStorage|fetch\(|sendBeacon|sendAnalyticsEvent/, 'Preview must not emit invented advertising or order metrics');
assert.ok(html.indexOf('local-service-ads.js') < html.indexOf('<script src="app.js'));
assert.match(html, /app\.js\?v=[^"\n]*local-services-preview-20260913/);
assert.match(html, /final-experience\.js\?v=[^"\n]*local-services-preview-20260913/);
assert.match(fs.readFileSync('final-experience.js', 'utf8'), /rc3-fixes\.js\?v=[^'\n]*local-services-preview-20260913/);
assert.match(fs.readFileSync('services/index.html', 'utf8'), /noindex,nofollow/);
console.log('Local service ads: spacing, rotation, store integrity, independent contacts, full materials, production isolation PASS');
