import assert from 'node:assert/strict';
import fs from 'node:fs';

const service = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const menu = fs.readFileSync(new URL('./store-menu-preview.js', import.meta.url), 'utf8');
const finalExperience = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const rc3 = fs.readFileSync(new URL('./rc3-fixes.js', import.meta.url), 'utf8');
const appStyle = fs.readFileSync(new URL('./app.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} 함수가 있어야 합니다.`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} 함수 끝을 찾지 못했습니다.`);
}

class FakeNode {
  constructor(name, selector, parent) {
    this.name = name;
    this.selector = selector;
    this.parent = parent;
  }
  matches(selector) {
    return selector === this.selector;
  }
  get nextElementSibling() {
    const index = this.parent.children.indexOf(this);
    return this.parent.children[index + 1] || null;
  }
  after(node) {
    const children = this.parent.children;
    children.splice(children.indexOf(node), 1);
    children.splice(children.indexOf(this) + 1, 0, node);
  }
}

const fixture = {children: []};
for (const [name, selector] of [
  ['meta', '.store-detail-meta-row'],
  ['utilities', '.detail-quick-links'],
  ['service', '[data-store-service-detail]'],
  ['other', '.store-other-wrap'],
  ['routes', '.local-detail-routes'],
  ['brand', '.brand-store-actions'],
  ['menu', '[data-store-menu-preview]'],
  ['status', '[data-store-service-top-status]'],
  ['actions', '.detail-personal-actions']
]) fixture.children.push(new FakeNode(name, selector, fixture));

const arrangeStoreDetail = new Function(
  `${extractFunction(service, 'directDetailChild')};${extractFunction(service, 'arrangeStoreDetail')};return arrangeStoreDetail;`
)();
arrangeStoreDetail(fixture);
assert.deepEqual(
  fixture.children.map(node => node.name),
  ['meta', 'status', 'menu', 'routes', 'brand', 'other', 'service', 'utilities', 'actions'],
  '삽입 시점과 관계없이 고객 우선순서로 다시 정렬해야 합니다.'
);

const expectedOrder = [
  "directDetailChild(detail, '[data-store-service-top-status]')",
  "directDetailChild(detail, '[data-store-menu-preview]')",
  "directDetailChild(detail, '.local-detail-routes') || directDetailChild(detail, '.detail-routes')",
  "directDetailChild(detail, '.store-other-wrap')",
  "directDetailChild(detail, '[data-store-service-detail]')",
  "directDetailChild(detail, '.detail-quick-links')",
  "directDetailChild(detail, '.detail-personal-actions')"
];
let previousIndex = -1;
for (const marker of expectedOrder) {
  const index = service.indexOf(marker);
  assert.ok(index > previousIndex, `가게 팝업 순서가 어긋났습니다: ${marker}`);
  previousIndex = index;
}

assert.match(menu, /if \(meta\) meta\.insertAdjacentHTML\('afterend', markup\)/);
assert.match(service, /detailBenefitItems\(info\)\.filter\(item => item\.state === 'available'\)/);
assert.doesNotMatch(service, /detailBenefitItems\(info\)\.map\(detailBenefitMarkup\)/);
assert.match(service, /window\.daedongArrangeStoreDetail = arrangeStoreDetail/);
assert.match(service, /naver\.classList\.add\('store-detail-map-quick'\)/);
assert.match(service, /giftSource\.cloneNode\(true\)/);
assert.match(service, /item\.key === 'yeosu-seomseom-pay' && item\.state === 'available'/);
assert.match(service, /giftButton\.classList\.add\('store-service-gift-app-link'\)/);
assert.match(service, /topStatus\.dataset\.storeServiceStatusSignature !== topStatusSignature/);
assert.match(service, /topStatus\.dataset\.storeServiceStatusSignature = topStatusSignature/);
assert.match(
  service,
  /if \(topStatus\.dataset\.storeServiceStatusSignature !== topStatusSignature\) \{[\s\S]*?topStatus\.className = `store-service-status store-service-top-status is-\$\{status\.state\}`;[\s\S]*?topStatus\.innerHTML =/,
  '같은 영업상태는 다시 렌더링하지 않아 MutationObserver 반복 실행을 막아야 합니다.'
);

const directIndex = rc3.indexOf('${direct}');
const brandIndex = rc3.indexOf('${apps}', directIndex);
const communityIndex = rc3.indexOf('${community}', brandIndex);
const phoneIndex = rc3.indexOf('${phone', communityIndex);
assert.ok(directIndex >= 0 && directIndex < brandIndex && brandIndex < communityIndex && communityIndex < phoneIndex, '주문방법은 가게바로주문 → 브랜드앱 → 지역 주문앱 → 전화주문 순서여야 합니다.');
assert.match(finalExperience, /rc3-fixes\.js\?v=[^'\n]*store-popup-order-1/);

assert.match(appStyle, /\.store-modal \.modal-close\{position:absolute;/);
assert.doesNotMatch(appStyle, /\.store-modal \.modal-close\{position:sticky;/);
assert.match(appStyle, /\.final-personal-actions \[data-share-store\]\{grid-column:1\/-1\}/);

assert.match(html, /app\.css\?v=[^"\n]*store-popup-order-1/);
assert.match(html, /store-service-info\.css\?v=store-service-11-map-gift-placement-1/);
assert.match(html, /store-service-info\.js\?v=store-service-19-mobile-freeze-fix-1/);
assert.match(html, /store-menu-preview\.js\?v=store-menu-19-map-gift-placement-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*store-popup-order-1/);

console.log('PASS: 가게 팝업 고객 우선순서·혜택 정리·닫기·하단버튼 배치 유지');
