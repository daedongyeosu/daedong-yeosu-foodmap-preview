import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync('store-service-info.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

function functionSource(text, name) {
  const start = text.indexOf(`function ${name}`);
  assert.notEqual(start, -1, `${name} 함수가 있어야 합니다.`);
  const body = text.indexOf('{', start);
  let depth = 0;
  for (let cursor = body; cursor < text.length; cursor += 1) {
    if (text[cursor] === '{') depth += 1;
    if (text[cursor] === '}' && --depth === 0) return text.slice(start, cursor + 1);
  }
  throw new Error(`${name} 함수 범위를 찾지 못했습니다.`);
}

const context = {
  SEOMSEOM_APP_SCOPE: Object.freeze({
    appKeys: Object.freeze(['mukkebi', 'ddangyo']),
    appLabel: '먹깨비·땡겨요'
  }),
  escapeHtml: value => String(value ?? ''),
  String,
  Array
};
vm.createContext(context);
vm.runInContext(`
  ${functionSource(source, 'benefitScope')};
  ${functionSource(source, 'scopedBenefitLabel')};
  ${functionSource(source, 'detailBenefitMarkup')};
  this.scope=benefitScope;
  this.scopedLabel=scopedBenefitLabel;
  this.detailMarkup=detailBenefitMarkup;
`, context);

const seomseom = context.scope(
  {key: 'yeosu-seomseom-pay', appKeys: ['ddangyo'], appLabel: '땡겨요'},
  {key: 'yeosu-seomseom-pay'}
);
assert.deepEqual(Array.from(seomseom.appKeys), ['mukkebi', 'ddangyo']);
assert.equal(seomseom.appLabel, '먹깨비·땡겨요');
assert.equal(
  context.scopedLabel({...seomseom, label: '여수섬섬페이'}),
  '먹깨비·땡겨요 여수섬섬페이'
);
assert.match(
  context.detailMarkup({
    key: 'yeosu-seomseom-pay',
    label: '여수섬섬페이',
    kind: 'payment',
    state: 'available',
    ...seomseom
  }),
  /먹깨비·땡겨요 · 여수섬섬페이 사용 가능 확인/
);

const onnuri = context.scope(
  {key: 'onnuri-gift-certificate', appKeys: ['ddangyo'], appLabel: '땡겨요'},
  {key: 'onnuri-gift-certificate'}
);
assert.deepEqual(Array.from(onnuri.appKeys), ['ddangyo']);
assert.equal(onnuri.appLabel, '땡겨요', '온누리상품권 주문앱 표기는 변경하면 안 됩니다.');
assert.doesNotMatch(
  context.detailMarkup({
    key: 'onnuri-gift-certificate',
    label: '온누리상품권',
    kind: 'payment',
    state: 'available',
    ...onnuri
  }),
  /먹깨비/,
  '온누리상품권에 먹깨비를 추가하면 안 됩니다.'
);

const fuelSupport = context.scope(
  {key: 'high-fuel-price-support', appKeys: ['ddangyo'], appLabel: '땡겨요'},
  {key: 'high-fuel-price-support'}
);
assert.deepEqual(Array.from(fuelSupport.appKeys), ['ddangyo']);
assert.equal(fuelSupport.appLabel, '땡겨요', '고유가 피해지원금 주문앱 표기는 변경하면 안 됩니다.');
assert.doesNotMatch(
  context.detailMarkup({
    key: 'high-fuel-price-support',
    label: '고유가 피해지원금',
    kind: 'payment',
    state: 'available',
    ...fuelSupport
  }),
  /먹깨비/,
  '고유가 피해지원금에 먹깨비를 추가하면 안 됩니다.'
);

assert.match(source, /const scope = benefitScope\(null, definition\);/,
  '혜택 검색에서도 먹깨비·땡겨요 공동 범위를 사용해야 합니다.');
assert.match(source, /serviceData\.programs[\s\S]{0,180}?benefitScope\(null, program\)\.appLabel/,
  '혜택 선택 버튼에도 먹깨비·땡겨요 공동 범위를 사용해야 합니다.');
assert.match(html, /store-service-info\.js\?v=[^\"]*seomseom-joint-apps-1/,
  '브라우저가 여수섬섬페이 공동 안내 수정본을 받아야 합니다.');

console.log('seomseom joint app scope regression: PASS');
