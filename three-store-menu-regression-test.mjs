import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

// Invented fixtures only: never publish collected menu IDs or full inventories.
const source = fs.readFileSync(new URL('./menu-family-model.js', import.meta.url), 'utf8');
const digest = value => createHash('sha256').update(value).digest('hex');
const tidy = value => String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
const plain = value => JSON.parse(JSON.stringify(value));
const owner = 'synthetic-three-store-review';
const family = digest('invented-reviewed-family');
const photoHash = 'a'.repeat(64);
const media = (hash, host = 'https://media.example.test') => `${host}/api/media/yogiyo-menu/v1/${hash}.jpg`;
const row = (id, name, extra = {}) => ({ id, name, description: '', category: '', image: '', ...extra });
const meals = [
  row('invented-first', '[추천] 가상 검증면 300g', {
    itemId: 'invented-search-first', __sourceIds: ['invented-history-first'],
    description: '원본 Ａ 조리 안내', category: '가상 주메뉴',
    image: 'https://images.example.test/first.jpg',
    price: 12000, options: [{ name: '추가 선택 2,000원', unitPrice: 2000 }]
  }),
  row('invented-second', '가상 한그릇 요리 350g', {
    description: '원본 B 조리 안내', category: '',
    image: 'https://images.example.test/second.jpg'
  })
];
const mismatch = row('invented-label-mismatch', '가상 배 음료 340ml', { image: media(photoHash) });
const guarded = item => ({ descriptionHash: digest(tidy(item.description)), categoryHash: digest(tidy(item.category)) });
const specs = [
  ...meals.map(item => [item, { family, ...guarded(item) }]),
  [mismatch, { suppressImageHash: digest(photoHash), ...guarded(mismatch) }]
];

function loadModel(entries = specs) {
  const stores = /const REVIEWED_STORE_HASHES = new Set\(\[[\s\S]*?\]\);/;
  const rules = /const REVIEWED_CLEANUP = new Map\(\[[\s\S]*?\]\);/;
  assert.match(source, stores, 'reviewed store test hook must remain available');
  assert.match(source, rules, 'reviewed rule test hook must remain available');
  const fingerprints = entries.map(([item, rule]) => [digest(JSON.stringify([owner, item.id, tidy(item.name)])), rule]);
  const code = source.replace(stores, `const REVIEWED_STORE_HASHES = new Set(${JSON.stringify(entries.length ? [digest(owner)] : [])});`)
    .replace(rules, `const REVIEWED_CLEANUP = new Map(${JSON.stringify(fingerprints)});`);
  const context = vm.createContext({});
  vm.runInContext(code, context);
  return context.daedongMenuFamilies;
}
const model = loadModel();
const baseline = loadModel([]);
const menu = (items, storeId = owner) => ({ storeId, items });
let checks = 0;
function check(label, run) { run(); checks += 1; console.log(`PASS ${label}`); }
function freezeDeep(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freezeDeep); Object.freeze(value); }
  return value;
}
function coverage(input, result) {
  const variants = result.items.flatMap(card => card.__variants);
  const all = [...variants, ...result.__audit.excluded];
  assert.deepEqual(all.map(item => item.__inputIndex).sort((a, b) => a - b), input.items.map((_, index) => index));
  assert.equal(result.__audit.mappedCount + result.__audit.excluded.length, input.items.length);
  input.items.forEach((item, index) => {
    const represented = all.find(entry => entry.__inputIndex === index);
    const ids = represented.__sourceIds || represented.sourceIds;
    for (const id of [item.id, item.itemId, ...(item.__sourceIds || [])].filter(Boolean)) assert.ok(ids.includes(id));
  });
}
function assertGeneric(input) {
  assert.deepEqual(plain(model.project(input)), plain(baseline.project(input)), 'changed evidence must use unchanged generic behavior');
}

check('reviewed family is opaque while the customer label remains readable', () => {
  assert.equal(baseline.project(menu(meals)).items.length, 2);
  const result = model.project(menu(meals));
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].__familyKey, `${owner}::reviewed-${family}`);
  assert.equal(result.items[0].name, '가상 검증면 300g');
  assert.ok(!result.items[0].name.includes(family));
  coverage(menu(meals), result);
});
check('all source IDs, amounts, photos and descriptions remain as independent variants', () => {
  const input = menu(meals);
  const result = model.project(input);
  const card = result.items[0];
  assert.equal(card.__variants.length, 2);
  card.__variants.forEach((variant, index) => {
    assert.equal(variant.name, meals[index].name);
    assert.equal(variant.image, meals[index].image);
    assert.equal(variant.description, meals[index].description);
    assert.equal(variant.__quantity[0].value, index ? 350 : 300);
    assert.equal(variant.__quantity[0].unit, 'g');
  });
  assert.ok(meals.some(item => item.description === card.description), 'do not fabricate a combined description');
  for (const item of meals) assert.ok(card.__searchText.includes(item.name));
  assert.ok(result.__audit.review.some(entry => entry.reason === 'quantity-variation'));
  assert.ok(result.__audit.review.some(entry => entry.reason === 'multiple-photo-references'));
});
check('store, ID, raw name and populated description/category are independent guards', () => {
  for (const change of [
    { id: 'invented-new-id' }, { name: `${meals[0].name} 다른 음식` },
    { description: '변경된 조리 안내' }, { description: '' },
    { category: '새로운 분류' }, { category: '' }
  ]) {
    const items = [{ ...meals[0], ...change }, meals[1]];
    assert.equal(model.project(menu(items)).items.length, 2);
    assertGeneric(menu([{ ...meals[0], ...change }]));
  }
  assertGeneric(menu(meals, 'unreviewed-store'));
  assertGeneric(menu(meals.map(item => ({ ...item, storeId: 'unreviewed-store' }))));
});
check('guard text uses NFKC whitespace normalization, not fuzzy similarity', () => {
  const normalized = { ...meals[0], name: `  ${meals[0].name.replaceAll(' ', '   ')}  `, description: ' 원본 A   조리 안내 ', category: ' 가상  주메뉴 ' };
  assert.equal(model.project(menu([normalized, meals[1]])).items.length, 1);
  assert.equal(model.project(menu([{ ...normalized, description: '원본 A 조리안내' }, meals[1]])).items.length, 2);
});
check('partial search evidence may omit guards but explicit changed fields fail open', () => {
  const rows = meals.map(({ id, name, image }) => ({ itemId: id, name, image, storeId: owner }));
  const grouped = model.groupSearchRows(rows);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].__familyKey, model.project(menu(meals)).items[0].__familyKey);
  assert.deepEqual(plain(grouped[0].__sourceIds), meals.map(item => item.id));
  assert.equal(model.groupSearchRows([{ ...rows[0], description: '' }, rows[1]]).length, 2);
  assert.equal(model.groupSearchRows([{ ...rows[0], category: '' }, rows[1]]).length, 2);
  assert.ok(grouped[0].__searchText.includes(meals[0].name));
  assert.ok(grouped[0].__searchText.includes(meals[1].name));
});
check('the same reviewed names from another store never join the reviewed family', () => {
  const rows = meals.flatMap(item => [ { ...item, storeId: owner }, { ...item, storeId: 'another-store' } ]);
  const result = model.groupSearchRows(rows);
  assert.equal(result.length, 3);
  for (const card of result) assert.ok(card.__variants.every(variant => variant.storeId === card.storeId));
});
check('a missing amount is retained as unspecified, not invented from a sibling', () => {
  const items = [row('invented-unspecified', '가상 튀김'), row('invented-quantity', '가상 튀김 300g')];
  const result = model.project(menu(items));
  assert.equal(result.items.length, 1);
  assert.deepEqual(plain(result.items[0].__variants.map(item => item.__quantity.map(q => q.value))), [[], [300]]);
  assert.ok(result.__audit.review.some(entry => entry.reason === 'quantity-unspecified'));
  coverage(menu(items), result);
});
check('known mismatched photo is hidden without removing the menu or mutating input', () => {
  const input = freezeDeep(menu([plain(mismatch)]));
  const before = JSON.stringify(input);
  const result = model.project(input);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].image, '');
  assert.equal(result.items[0].__variants[0].image, '');
  assert.ok(result.__audit.review.some(entry => entry.reason === 'reviewed-image-label-mismatch' && entry.sourceIds.includes(mismatch.id)));
  assert.equal(JSON.stringify(input), before);
  assert.equal(input.items[0].image, mismatch.image);
  coverage(input, result);
});
check('media host, route and cache query changes still identify the exact same photo', () => {
  for (const image of [
    media(photoHash, 'https://other-media.example.test'),
    `https://media.example.test/api/menu-photo/${photoHash}.jpg?cache=2`,
    `${mismatch.image}?cache=3#photo`
  ]) {
    const result = model.project(menu([{ ...mismatch, image }]));
    assert.equal(result.items[0].image, '');
    assert.ok(result.__audit.review.some(entry => entry.reason === 'reviewed-image-label-mismatch'));
  }
});
check('a corrected new photo immediately displays and is not suppressed by old evidence', () => {
  for (const image of [media('b'.repeat(64)), 'https://images.example.test/corrected-photo.jpg']) {
    const input = menu([{ ...mismatch, image }]);
    const result = model.project(input);
    assert.equal(result.items[0].image, image);
    assert.equal(result.items[0].__variants[0].image, image);
    assert.ok(!result.__audit.review.some(entry => entry.reason === 'reviewed-image-label-mismatch'));
    assertGeneric(input);
  }
});
check('changed mismatch identity or source evidence fails open without global photo removal', () => {
  for (const change of [
    { id: 'different-id' }, { name: '가상 다른 음료 340ml' },
    { description: '새 제품 설명' }, { category: '새 분류' }, { image: '' }
  ]) assertGeneric(menu([{ ...mismatch, ...change }]));
  assertGeneric(menu([mismatch], 'another-store'));
  const result = model.project(menu([mismatch, row('other-photo-owner', '별도 가상 음료', { image: mismatch.image })]));
  assert.equal(result.items.find(card => card.id === 'other-photo-owner').image, mismatch.image);
});
check('partial menu-search rows suppress only the reviewed image reference', () => {
  const search = { itemId: mismatch.id, name: mismatch.name, storeId: owner, image: mismatch.image };
  assert.equal(model.groupSearchRows([search])[0].image, '');
  const corrected = { ...search, image: media('c'.repeat(64)) };
  assert.equal(model.groupSearchRows([corrected])[0].image, corrected.image);
});
check('recursive prices and membership-only rows remain absent from customer projection', () => {
  const input = menu([...meals, row('invented-member-only', 'WOW 회원 전용', { price: 1000 })]);
  const result = model.project(input);
  assert.equal(result.items.length, 1);
  assert.equal(result.__audit.excluded[0].reason, 'membership-only');
  const serialized = JSON.stringify(result);
  assert.doesNotMatch(serialized, /"[^"]*(?:price|Price|금액|가격)[^"]*"\s*:/u);
  assert.doesNotMatch(serialized, /(?:12,?000|2,?000|1,?000)원|WOW\s*회원/u);
  assert.equal(result.items[0].__variants[0].options[0].name, '추가 선택');
  coverage(input, result);
});
check('unreviewed recipes, zero, hot, set and bone choices keep generic distinctions', () => {
  const items = [
    '가상 콜라', '가상 콜라 제로', '가상 커피 HOT', '가상 커피 ICE',
    '가상 치킨 뼈', '가상 치킨 순살', '가상 단품', '가상 단품 세트',
    '가상 고기 볶음밥', '가상 새우 볶음밥'
  ].map((name, index) => row(`unreviewed-${index}`, name));
  const input = menu(items);
  assertGeneric(input);
  assert.equal(model.project(input).items.length, items.length);
});
check('reprojection is deterministic, idempotent and never mutates the frozen source', () => {
  const input = freezeDeep(menu([...plain(meals), plain(mismatch), row('blank-image', '가상 반찬')]));
  const before = JSON.stringify(input);
  const first = model.project(input);
  assert.deepEqual(plain(model.project(input)), plain(first));
  assert.deepEqual(plain(model.project(first)), plain(first));
  assert.equal(JSON.stringify(input), before);
  coverage(input, first);
});
console.log(`three-store menu regression: ${checks} checks passed`);
