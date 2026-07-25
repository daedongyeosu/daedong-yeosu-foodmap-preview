import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app = readFileSync('app.js', 'utf8');
const css = readFileSync('app.css', 'utf8');
const html = readFileSync('index.html', 'utf8');
const stores = JSON.parse(readFileSync('data/stores.json', 'utf8'));
const riderImage = readFileSync('assets/promos/rider-recruitment-portrait-v2.webp');
const merchantImage = readFileSync('assets/promos/merchant-recruitment.webp');

function assertWebp(buffer, label) {
  assert.equal(buffer.subarray(0, 4).toString('ascii'), 'RIFF', `${label}가 RIFF 형식이 아닙니다.`);
  assert.equal(buffer.subarray(8, 12).toString('ascii'), 'WEBP', `${label}가 WebP 형식이 아닙니다.`);
  assert.ok(buffer.length < 250000, `${label} 용량이 모바일 표시에 너무 큽니다.`);
}

assert.match(app, /const PROMO_CAROUSEL_DETAILS = \{/);
assert.match(app, /rider:\s*\{[\s\S]*title: '배송기사님 모집'/);
assert.match(app, /rider:\s*\{[\s\S]*image: 'assets\/promos\/rider-recruitment-portrait-v2\.webp'/);
assert.match(app, /rider:\s*\{[\s\S]*imageWidth: 853,[\s\S]*imageHeight: 1844,[\s\S]*imageOnly: true/);
assert.match(app, /store:\s*\{[\s\S]*image: 'assets\/promos\/merchant-recruitment\.webp'/);
assert.match(app, /join:\s*\{[\s\S]*phone: '010-4797-7803'/);
assert.match(app, /const description = promo\.kind === 'rider' \? '' : promo\.desc/);
assert.match(app, /promo-cta">자세히보기 <small>\(화면터치\)<\/small>/);
assert.match(app, /<button type="button" class="carousel-slide promo-card \$\{promo\.kind\} is-interactive" data-promo-kind=/);
assert.match(app, /function openPromoCarouselDetail\(kind\)/);
assert.match(app, /const heading = details\.imageOnly \? `<h2 id="modalTitle" class="promo-visually-hidden">/);
assert.match(app, /promo-detail promo-detail-image-only/);
assert.match(app, /promo-detail-image-only'\)\) modal\.classList\.add\('promo-detail-modal', 'promo-image-only-modal'\)/);
assert.match(app, /promoTrack\.addEventListener\('pointerdown'/);
assert.match(app, /promoShell\.addEventListener\('pointerup'/);
assert.match(app, /Math\.hypot\(event\.clientX - tap\.x, event\.clientY - tap\.y\) > 18/);
assert.match(app, /performance\.now\(\) - promoTapOpenedAt <= 500/);
assert.match(app, /promoShell\.addEventListener\('click'[\s\S]*promoTrack\.contains\(promo\)[\s\S]*\}, true\)/);
assert.match(app, /#promoTrack'\)\.addEventListener\('keydown'/);
assert.match(app, /promo-signup-detail/);

assert.match(css, /\.promo-card\.is-interactive\{[\s\S]*appearance:none;[\s\S]*text-align:left/);
assert.match(css, /\.promo-card \.promo-cta\{/);
assert.match(css, /\.promo-detail-modal \.modal-card\{/);
assert.match(css, /\.promo-detail img\{[\s\S]*object-fit:contain/);
assert.match(css, /\.promo-visually-hidden\{[\s\S]*clip:rect\(0,0,0,0\)/);
assert.match(css, /\.promo-image-only-modal \.modal-card\{[\s\S]*max-height:calc\(100dvh - 8px\)/);
assert.match(css, /\.promo-image-only-modal \.promo-detail-image-only img\{[\s\S]*max-height:calc\(100dvh - 16px\)/);
assert.match(css, /\.promo-signup-detail strong\{/);
assert.match(html, /app\.css\?v=[^"]*lower-promo-details-4/);
assert.match(html, /app\.js\?v=[^"]*lower-promo-details-4/);

assertWebp(riderImage, '배송기사 모집 광고');
assertWebp(merchantImage, '가맹점 모집 광고');

const totalRoutes = stores.reduce((sum, store) => sum + (store.routes || []).length, 0);
assert.equal(stores.length, 698, '가게 데이터 수가 변경됐습니다.');
assert.equal(totalRoutes, 4910, '주문링크 수가 변경됐습니다.');

console.log(JSON.stringify({
  riderSlideTitle: '배송기사님 모집',
  riderVeteranCopyRemovedFromSlide: true,
  riderImage: {width: 853, height: 1844, bytes: riderImage.length},
  merchantImage: {width: 1760, height: 894, bytes: merchantImage.length},
  signupPhone: '010-4797-7803',
  totalStores: stores.length,
  totalRoutes,
  status: 'PASS'
}, null, 2));
