import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const model = require('./menu-family-model.js');
const { project, groupSearchRows, classify, familyKey, VERSION } = model;
const store = { id: '1d691d8e74499d31', name: '조쉐프의 쌀국수' };
let checks = 0;
function check(label, run) { run(); checks += 1; console.log(`PASS ${label}`); }
function freezeDeep(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freezeDeep); Object.freeze(value); }
  return value;
}
function coverage(input, output) {
  const occurrences = output.items.flatMap(card => card.__variants.map(variant => variant.__inputIndex))
    .concat(output.__audit.excluded.map(item => item.__inputIndex)).sort((a, b) => a - b);
  assert.deepEqual(occurrences, input.items.map((_, index) => index));
  assert.equal(output.__audit.mappedCount + output.__audit.excluded.length, input.items.length);
  for (const card of output.items) {
    for (const variant of card.__variants) {
      const original = input.items[variant.__inputIndex];
      for (const id of [original.id, original.itemId, ...(original.__sourceIds || [])].filter(Boolean)) {
        assert.ok(variant.__sourceIds.includes(String(id)));
        assert.ok(card.__sourceIds.includes(String(id)));
      }
    }
  }
}

check('UMD exports the same frozen interface for Node and the browser', () => {
  const context = vm.createContext({});
  vm.runInContext(fs.readFileSync(new URL('./menu-family-model.js', import.meta.url), 'utf8'), context);
  assert.equal(context.daedongMenuFamilies.VERSION, VERSION);
  for (const name of ['project', 'groupSearchRows', 'classify', 'familyKey']) assert.equal(typeof context.daedongMenuFamilies[name], 'function');
  assert.equal(Object.isFrozen(model), true);
});

check('explicit 나시고랭 parenthetical order is a controlled alias, not generic word sorting', () => {
  const input = freezeDeep({ storeId: store.id, items: [
    { id: 'ddangyo-egg', name: '계란 나시고랭 (볶음밥)', description: '', image: '', category: '나시고랭 메뉴' },
    { itemId: 'coupang-egg', name: '계란볶음밥(나시고랭)', description: '계란을 넣은 볶음밥', image: 'https://example.com/egg.jpg', category: '' },
    { id: 'ddangyo-beef', name: '[강력추천] 불맛 연탄불고기 나시고랭 (볶음밥)', image: 'https://example.com/beef-a.jpg', description: '불맛 설명' },
    { id: 'yogiyo-beef', name: '[강력추천] 불맛 연탄불고기 나시고랭', image: 'https://example.com/beef-b.jpg', description: '다른 원본 설명' },
    { id: 'plain-egg', name: '계란볶음밥' },
  ] });
  const before = JSON.stringify(input), result = project(input, { store });
  assert.equal(result.items.length, 3);
  assert.equal(result.items[0].__variants.length, 2);
  assert.equal(result.items[1].__variants.length, 2);
  assert.equal(result.items[0].image, 'https://example.com/egg.jpg');
  assert.ok(result.items[0].__sourceIds.includes('coupang-egg'));
  assert.ok(result.items[0].__searchText.includes('계란볶음밥(나시고랭)'));
  assert.ok(result.items[1].__variants.some(item => item.description === '다른 원본 설명'));
  assert.notEqual(familyKey({ name: '치킨 카레' }, store.id), familyKey({ name: '카레 치킨' }, store.id));
  assert.equal(JSON.stringify(input), before);
  coverage(input, result);
});

check('only standalone trailing NEW/BEST/HIT badges normalize and all original labels survive', () => {
  for (const suffix of [' new', ' BEST', ' HiT', '(NEW)', '[best]', '【HIT】', '（ＮＥＷ）', ' new [BEST]']) {
    assert.equal(familyKey({ name: `순두부육개장${suffix}` }, store.id), familyKey({ name: '순두부육개장' }, store.id), suffix);
  }
  const input = freezeDeep({ storeId: store.id, items: [
    { id: 'soft-new', name: '순두부육개장 new', image: 'https://example.com/soft.jpg' },
    { id: 'soft', name: '순두부육개장' },
    { id: 'mushroom-new', name: '버섯육개장 new' },
    { id: 'mushroom', name: '버섯육개장' },
  ] });
  const before = JSON.stringify(input), result = project(input);
  assert.deepEqual(result.items.map(item => item.name), ['순두부육개장', '버섯육개장']);
  assert.deepEqual(result.items.map(item => item.__variants.length), [2, 2]);
  assert.equal(result.items[0].__variants[0].name, '순두부육개장 new');
  assert.ok(result.items[0].__searchText.includes('순두부육개장 new'));
  assert.deepEqual(project(result), result);
  assert.equal(JSON.stringify(input), before);
  coverage(input, result);
  for (const name of ['순두부육개장new', '순두부육개장-NEW', 'renew', 'NEWburger', 'bestburger', 'hitburger', '순두부 new 육개장', '순두부육개장 new york']) {
    assert.ok(familyKey({ name }, store.id).includes(name.normalize('NFKC').toLowerCase().replace(/[^\p{L}\p{N}]/gu, '')), name);
  }
});

check('unquantified, 300g and 500g are retained variants, never asserted to be equal portions', () => {
  const input = { storeId: store.id, items: [
    { id: 'plain', name: '등심 꿔바로우', image: 'https://example.com/plain.jpg', description: '원본 설명\n두 번째 줄' },
    { id: '300', name: '등심 꿔바로우(300g)', image: 'https://example.com/300.jpg', description: '300g 설명' },
    { id: '500', name: '등심 꿔바로우 500g', image: 'https://example.com/500.jpg', description: '500g 설명' },
  ] };
  const result = project(input);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].name, '등심 꿔바로우');
  assert.deepEqual(result.items[0].__variants.map(item => item.__quantity.map(quantity => quantity.value)), [[], [300], [500]]);
  assert.ok(result.__audit.review.some(item => item.reason === 'quantity-unspecified'));
  assert.ok(result.__audit.review.some(item => item.reason === 'quantity-variation'));
  result.items[0].__variants.forEach((variant, index) => {
    assert.equal(variant.image, input.items[index].image);
    assert.equal(variant.description, input.items[index].description);
  });
  coverage(input, result);
});

check('12알/12p/count and 350ml/355ml preserve every source and quantity', () => {
  const input = { storeId: store.id, items: [
    { id: 't0', name: '타코야끼' }, { id: 't1', name: '타코야끼(12알)' }, { id: 't2', name: '타코야끼12p' },
    { id: 'c1', name: '쿨피스(파인) 뚱캔 350ml' }, { id: 'c2', name: '쿨피스 파인 355ml' },
  ] };
  const result = project(input);
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items[0].__variants.map(item => item.__quantity.map(quantity => quantity.value)), [[], [12], [12]]);
  assert.deepEqual(result.items[1].__variants.map(item => item.__quantity[0].value), [350, 355]);
  assert.equal(result.items[1].__kind, 'drink');
  assert.equal(result.items[1].category, '음료');
  assert.ok(result.__audit.review.some(item => item.familyKey === result.items[1].__familyKey && item.reason === 'quantity-variation'));
  coverage(input, result);
});

check('regular/zero, hot/ice, sets, ingredients, bone and substantive sizes stay distinct', () => {
  const names = ['코카콜라355ml', '코카콜라 제로355ml', '아메리카노 HOT', '아메리카노 ICE',
    '쌀국수', '쌀국수 세트', '쌀국수+만두', '고기 쌀국수', '새우 쌀국수', '순살 치킨', '뼈 치킨',
    '꿔바로우 대', '꿔바로우 중', '꿔바로우 소', '쌀국수 곱빼기', '쌀국수 2인분',
    '불맛 연탄불고기 나시고랭', '고추장 연탄불고기 나시고랭', '설렁탕(밥포함)', '설렁탕(밥미포함)'];
  const result = project({ storeId: store.id, items: names.map((name, index) => ({ id: String(index), name })) });
  assert.equal(result.items.length, names.length);
  assert.equal(new Set(result.items.map(item => item.__familyKey)).size, names.length);
});

check('notice/member exclusions are justified while real food mentioning 주의 is retained', () => {
  const input = { storeId: store.id, items: [
    { id: 'region', name: '시전동(신기동)', category: '신기동(시전동)에서 주문 시 추가해주세요.' },
    { id: 'member', name: '와우회원 전용 할인 메뉴', image: 'https://example.com/member.jpg' },
    { id: 'scroll', name: '위로 이동' },
    { id: 'snow', name: '백설공주의 황금 드레스' },
    { id: 'jeju', name: '[제주의추억] 성게 미역국' },
    { id: 'spicy', name: '[중독주의] 매운 양념게장 단품' },
    { id: 'ribs', name: '빠짐주의 매운갈비찜' },
    { id: 'actual', name: '소고기 쌀국수', category: '주문 시 요청사항을 추가해주세요.' },
    { id: 'extra', name: '고수 추가' },
  ] };
  const result = project(input);
  assert.deepEqual(result.__audit.excluded.map(item => item.id), ['region', 'member', 'scroll']);
  assert.equal(result.items.find(item => item.id === 'extra').__kind, 'option');
  assert.ok(result.items.some(item => item.id === 'actual'));
  assert.ok(result.categories.every(category => !/주세요|신기동/.test(category)));
  assert.ok(!JSON.stringify(result.items).includes('와우회원'));
  coverage(input, result);
});

check('precise missing-category classification does not mistake food names for alcohol', () => {
  for (const name of ['카스', '진로', '참이슬 후레쉬', '테라 라이트(병)(500ml)']) assert.equal(classify({ name }), 'alcohol', name);
  for (const name of ['스프라이트355mL', '코카콜라(제로)355mL', '암바사345ml', '쿨피스(파인) 뚱캔 350ml']) assert.equal(classify({ name }), 'drink', name);
  for (const name of ['소주라떼', '맥주치킨', '진로소스치킨', '카스테라']) assert.notEqual(classify({ name }), 'alcohol', name);
  assert.equal(classify({ name: '주먹밥' }), 'side');
  assert.equal(classify({ name: '칠리새우', category: '사이드 메뉴' }), 'side');
  assert.equal(classify({ name: '리뷰 이벤트 메뉴 한가지를 고르세요' }), 'option');
  assert.equal(classify({ name: '리뷰맛집 양념갈비' }), 'food');
});

check('price fields/text are removed recursively without losing quantities or non-price descriptions', () => {
  const input = { storeId: store.id, priceRange: '10,000원', items: [{
    id: 'safe', name: '등심 꿔바로우 300g · 12,000원', description: '고기 300g · 가격: 12,000원',
    price: 12000, menu_unitprc: 12000, salePrice: 11000, options: [{ name: '소스 추가 500원', price: 500 }],
    detail: { originalPrice: 13000, description: '고기 300g + 소스 2개' }, image: 'https://example.com/original.jpg',
  }, { id: 'money', name: '별도 메뉴', description: '13000' }] };
  const before = JSON.stringify(input), result = project(input), text = JSON.stringify(result);
  assert.equal(JSON.stringify(input), before);
  assert.ok(!/12000|13000|11[,.]?000|500원|가격:|salePrice|menu_unitprc|originalPrice|priceRange/.test(text));
  assert.equal(result.items[0].__variants[0].detail.description, '고기 300g + 소스 2개');
  assert.equal(result.items[0].__variants[0].image, 'https://example.com/original.jpg');
  assert.deepEqual(result.items[0].__variants[0].__quantity.map(quantity => quantity.value), [300]);
  assert.equal(result.items[1].description, '');
});

check('empty and repeated IDs retain one occurrence per original and stable fallback identities', () => {
  const input = { storeId: store.id, items: [
    { id: 'repeat', name: '만두12p', image: 'https://example.com/a.jpg' },
    { id: 'repeat', itemId: 'different-app-id', __sourceIds: ['legacy'], name: '만두(12알)', image: 'https://example.com/b.jpg' },
    { name: '만두' }, { name: '별도 메뉴' }, { id: 'blank-name', name: '' },
  ] };
  const result = project(input);
  assert.equal(result.items[0].__variants.length, 3);
  assert.ok(result.items[0].__sourceIds.includes('repeat'));
  assert.ok(result.items[0].__sourceIds.includes('different-app-id'));
  assert.ok(result.items[0].__sourceIds.includes('legacy'));
  assert.equal(result.items[0].__variants[2].id, 'menu-family-input-2');
  assert.equal(result.items[0].__variants[2].__generatedId, true);
  coverage(input, result);
});

check('projection is immutable, deterministic and idempotent including audit/variants', () => {
  const input = freezeDeep({ storeId: store.id, items: [
    { id: 'a', name: '타코야끼12p', description: '설명\n원문 보존', image: 'https://example.com/a.jpg' },
    { id: 'b', name: '별도 메뉴', category: '메인' }, { id: 'c', name: '타코야끼(12알)', image: 'https://example.com/c.jpg' },
    { id: 'd', name: 'WOW 회원 전용' },
  ] });
  const result = project(input);
  assert.deepEqual(project(input), result);
  assert.deepEqual(project(freezeDeep(result)), result);
  assert.equal(result.items[0].__variants[0].description, '설명\n원문 보존');
  coverage(input, result);
});

check('identity keys are not re-sanitized as price text when 100%원물 loses punctuation', () => {
  const input = { storeId: store.id, items: [
    { id: 'juice1', name: '세트 보쌈도시락 + 100%원물과즙 레몬즙 매실즙', category: '사이드' },
    { id: 'juice2', name: '세트 보쌈도시락 + 100%원물과즙 레몬즙 매실즙', category: '메인' },
  ] };
  const result = project(input);
  assert.ok(result.items[0].__familyKey.includes('100원물'));
  assert.deepEqual(project(result), result);
  assert.ok(result.__audit.review.some(item => item.reason === 'kind-variation'));
  assert.equal(familyKey({ name: '등심 꿔바로우300g 12,000원' }, store.id), familyKey({ name: '등심 꿔바로우300g' }, store.id));
});

check('search grouping and detail projection use the same family identity without crossing stores', () => {
  const rows = [
    { storeId: store.id, itemId: 'a', name: '등심 꿔바로우', category: '', image: 'https://example.com/a.jpg' },
    { storeId: store.id, itemId: 'b', name: '등심 꿔바로우300g', category: '', description: '300g 원본 설명' },
    { storeId: 'different-store', itemId: 'a', name: '등심 꿔바로우300g', category: '', image: 'https://example.com/other.jpg' },
  ];
  const before = JSON.stringify(rows), cards = groupSearchRows(freezeDeep(rows));
  assert.equal(cards.length, 2);
  assert.equal(cards[0].storeId, store.id);
  assert.deepEqual(cards[0].__sourceIds, ['a', 'b']);
  assert.ok(cards[0].__variants.every(item => item.storeId === store.id));
  assert.ok(cards[1].__variants.every(item => item.storeId === 'different-store'));
  assert.equal(cards[0].__familyKey, project({ storeId: store.id, items: rows.slice(0, 2) }).items[0].__familyKey);
  assert.equal(groupSearchRows([rows[1]])[0].__familyKey, cards[0].__familyKey, 'partial search does not change the family identity');
  assert.ok(cards[0].__searchText.includes('등심 꿔바로우300g'));
  assert.ok(cards[0].__searchText.includes('300g 원본 설명'));
  assert.equal(JSON.stringify(rows), before);
  assert.equal(groupSearchRows([{ id: 'a', name: '콜라' }, { id: 'b', name: '콜라' }]).length, 2, 'missing store identity must not combine unrelated search rows');
});

check('representative photos are grounded in retained variants and never revive quarantined media', () => {
  const originalImage = 'https://api.example.com/api/media/coupang-menu/v1/' + 'a'.repeat(64) + '.jpg';
  const result = project({ storeId: store.id, items: [
    { id: 'a', name: '동일 메뉴', image: originalImage },
    { id: 'b', name: '동일 메뉴', image: 'https://example.com/verified.jpg' },
    { id: 'c', name: '별도 메뉴', image: originalImage },
  ] });
  assert.equal(result.items[0].image, 'https://example.com/verified.jpg');
  assert.equal(result.items[0].__variants[0].image, originalImage, 'source photo provenance remains available to the UI quarantine boundary');
  assert.equal(result.items[1].image, '');
  for (const card of result.items) assert.ok(!card.image || card.__variants.some(item => item.image === card.image));
});

check('a 300g photo never borrows the 500g-only description of another variant', () => {
  const result = project({ storeId: store.id, items: [
    { id: 'photo-300', name: '꿔바로우300g', image: 'https://example.com/300.jpg', description: '' },
    { id: 'description-500', name: '꿔바로우500g', image: '', description: '고기 500g과 소스 2개 구성' },
  ] });
  assert.equal(result.items[0].image, 'https://example.com/300.jpg');
  assert.equal(result.items[0].description, '');
  assert.equal(result.items[0].__variants[1].description, '고기 500g과 소스 2개 구성');
});

console.log(`menu family model regression: PASS (${checks} checks)`);
