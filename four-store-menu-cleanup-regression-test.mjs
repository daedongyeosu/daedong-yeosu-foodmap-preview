import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';

// Public fixtures are invented. Real-store acceptance uses private snapshots;
// neither their source identifiers nor their menu inventory belongs here.
const source = fs.readFileSync(new URL('./menu-family-model.js', import.meta.url), 'utf8');
const digest = value => createHash('sha256').update(value).digest('hex');
const tidy = value => String(value ?? '').normalize('NFKC').replace(/\s+/g, ' ').trim();
const plain = value => JSON.parse(JSON.stringify(value));
const store = 'synthetic-reviewed-store';
const row = (id, name, extra = {}) => ({ id, name, category: '', description: '', image: '', ...extra });
const heading = { kind: 'notice', reason: 'reviewed-section-heading', emptyDescription: true };
const description = { kind: 'notice', reason: 'reviewed-description-note', noteKind: 'description' };
const delivery = { kind: 'notice', reason: 'reviewed-delivery-note', noteKind: 'delivery' };
const specs = [
  [row('heading', '가상 분류 묶음'), heading],
  [row('orphan', '조리 설명을 별도로 안내합니다'), description],
  [row('duplicate-description', '가상 재료를 반씩 담습니다'), description],
  [row('delivery', '시험동 배달비추가'), delivery],
  [row('set-two-ea', '1인 가상세트+만두 2EA'), { count: 2 }],
  [row('set-two-count', '1인 가상세트+만두2개'), { count: 2 }],
  [row('set-four-ea', '2인 가상세트+만두4EA'), { count: 4 }],
  [row('set-four-count', '2인 가상세트+만두4개'), { count: 4 }],
  [row('typo', '[검증] 치츠요리'), { correctCheeseTypo: true }],
  [row('drink', '가상 과일음료350ml'), { kind: 'drink' }],
  [row('sauce', '가상 매콤소스300g'), { kind: 'option' }]
];

function loadModel(entries = specs, owners = [store]) {
  const fingerprints = entries.map(([item, action]) => [digest(JSON.stringify([store, item.id, tidy(item.name)])), action]);
  const storePattern = /const REVIEWED_STORE_HASHES = new Set\(\[[\s\S]*?\]\);/;
  const rulesPattern = /const REVIEWED_CLEANUP = new Map\(\[[\s\S]*?\]\);/;
  assert.match(source, storePattern);
  assert.match(source, rulesPattern);
  const marker = 'return Object.freeze({ VERSION, project, groupSearchRows, classify, familyKey });';
  assert.equal(source.split(marker).length, 2, 'test hook marker must be unique');
  const code = source
    .replace(storePattern, `const REVIEWED_STORE_HASHES = new Set(${JSON.stringify(owners.map(digest))});`)
    .replace(rulesPattern, `const REVIEWED_CLEANUP = new Map(${JSON.stringify(fingerprints)});`)
    .replace(marker, 'return Object.freeze({ VERSION, project, groupSearchRows, classify, familyKey, testSha256: sha256 });');
  const context = vm.createContext({});
  vm.runInContext(code, context);
  return context.daedongMenuFamilies;
}

const model = loadModel();
const baseline = loadModel([], []);
let checks = 0;
function check(label, run) { run(); checks += 1; console.log(`PASS ${label}`); }
function freezeDeep(value) {
  if (value && typeof value === 'object') { Object.values(value).forEach(freezeDeep); Object.freeze(value); }
  return value;
}
function menu(items, owner = store) { return { storeId: owner, items }; }
function coverage(input, projected) {
  const indices = projected.items.flatMap(item => item.__variants.map(variant => variant.__inputIndex))
    .concat(projected.__audit.excluded.map(item => item.__inputIndex)).sort((a, b) => a - b);
  assert.deepEqual(plain(indices), input.items.map((_, index) => index));
  assert.equal(projected.__audit.mappedCount + projected.__audit.excluded.length, input.items.length);
  for (const entry of projected.__audit.excluded) {
    assert.ok(entry.original, 'reviewed exclusion keeps its safe original');
    const original = input.items[entry.__inputIndex];
    assert.equal(entry.original.id, original.id);
    assert.equal(entry.original.name, original.name);
    assert.equal(entry.original.image, original.image);
    assert.ok(entry.sourceIds.includes(original.id));
  }
}

check('synchronous SHA-256 matches Node UTF-8 digests across blocks and Unicode', () => {
  const values = ['', 'abc', '한글 메뉴 🍲', '\ud800', '\udfff', 'a'.repeat(55), 'b'.repeat(56), 'c'.repeat(64), 'd'.repeat(1000)];
  for (let i = 0; i < 80; i += 1) values.push(JSON.stringify([`store-${i}`, `source-${i}`, `가상 ＥＡ 🍜 ${'x'.repeat(i)}`]));
  for (const value of values) assert.equal(model.testSha256(value), digest(value));
});

check('public correction inventory contains fingerprints, not source-ID fixtures', () => {
  assert.doesNotMatch(source, /\b(?:ddangyo|coupang)-\d+-\d+\b/u);
  assert.match(source, /SHA-256 fingerprints/u);
  assert.ok(Object.isFrozen(model));
});

check('store, source ID and normalized raw name must all match', () => {
  const exact = specs[0][0];
  assert.equal(model.classify(exact, store), 'notice');
  assert.equal(model.classify({ ...exact, name: '  가상   분류 묶음  ' }, store), 'notice');
  for (const [item, owner] of [
    [{ ...exact, id: 'unreviewed-id' }, store],
    [{ ...exact, name: `${exact.name} 신상품` }, store],
    [exact, 'another-store'],
    [{ ...exact, storeId: 'another-store' }, store],
    [{ ...exact, name: `${exact.name} 5,000원` }, store]
  ]) {
    const input = menu([item], owner);
    assert.deepEqual(plain(model.project(input)), plain(baseline.project(input)), 'mismatched guard uses the unchanged generic model');
    assert.equal(model.project(input).items.length, 1);
  }
});

check('every reviewed notice fails open for a new photo; headings also require empty descriptions', () => {
  for (const [item, action] of specs.filter(([, action]) => action.kind === 'notice')) {
    const changed = { ...item, image: 'https://example.com/new-food.jpg' };
    assert.equal(model.classify(changed, store), 'food');
    assert.deepEqual(plain(model.project(menu([changed]))), plain(baseline.project(menu([changed]))));
    if (action.emptyDescription) {
      const described = { ...item, description: '독립 판매 메뉴로 변경되었습니다' };
      assert.equal(model.project(menu([described])).items.length, 1);
    }
  }
});

check('headings are audited without notes; orphan descriptions remain readable without guessed targets', () => {
  const input = freezeDeep(menu([specs[0][0], specs[1][0]]));
  const before = JSON.stringify(input), projected = model.project(input);
  assert.equal(projected.items.length, 0);
  assert.equal(projected.__menuNotes.length, 1);
  assert.deepEqual(plain(projected.__menuNotes[0]), {
    id: 'orphan', text: specs[1][0].name, kind: 'description', sourceIds: ['orphan']
  });
  assert.equal(JSON.stringify(input), before);
  coverage(input, projected);
  assert.equal(Object.hasOwn(model.project(menu([specs[0][0]])), '__menuNotes'), false);
});

check('an existing retained description avoids a duplicate note while preserving both originals', () => {
  const input = menu([specs[2][0], row('actual-food', '가상 한접시', { description: specs[2][0].name })]);
  const projected = model.project(input);
  assert.equal(projected.items.length, 1);
  assert.equal(projected.items[0].description, specs[2][0].name);
  assert.equal(Object.hasOwn(projected, '__menuNotes'), false);
  assert.equal(projected.__audit.excluded[0].original.name, specs[2][0].name);
  coverage(input, projected);
});

check('delivery notes preserve the fee requirement without amounts and safe audit copies do not leak membership copy', () => {
  const input = freezeDeep(menu([{ ...specs[3][0], category: '시험동 추가배달비',
    description: '요청사항에 주소를 남겨주세요. 2,000원', price: 2000,
    extra: { explanation: 'WOW 회원 전용', price: 2000 }, __sourceIds: ['older-source-reference'] }]));
  const before = JSON.stringify(input), projected = model.project(input);
  assert.equal(projected.items.length, 0);
  assert.equal(projected.__menuNotes[0].kind, 'delivery');
  assert.match(projected.__menuNotes[0].text, /시험동 추가 배달비는 주문앱에서 확인해주세요/u);
  assert.match(projected.__menuNotes[0].text, /요청사항에 주소를 남겨주세요/u);
  assert.ok(projected.__menuNotes[0].sourceIds.includes('older-source-reference'));
  assert.doesNotMatch(JSON.stringify(projected), /2,?000|price|WOW|회원/u);
  assert.equal(JSON.stringify(input), before);
  coverage(input, projected);
  const member = model.project(menu([{ ...specs[3][0], description: '와우회원 전용' }]));
  assert.equal(member.__audit.excluded[0].reason, 'membership-only');
  assert.equal(Object.hasOwn(member, '__menuNotes'), false);
  assert.doesNotMatch(JSON.stringify(member), /와우회원/u);
});

check('only reviewed EA/count pairs merge; displayed counts, source photos and descriptions survive', () => {
  const items = specs.slice(4, 8).map(([item], index) => ({ ...item,
    image: `https://example.com/variant-${index}.jpg`, description: `가상 원본 설명 ${index}` }));
  const input = freezeDeep(menu(items)), before = JSON.stringify(input), projected = model.project(input);
  assert.equal(projected.items.length, 2);
  assert.deepEqual(plain(projected.items.map(item => item.name)), ['1인 가상세트+만두2개', '2인 가상세트+만두4개']);
  assert.deepEqual(plain(projected.items.map(item => item.__variants.length)), [2, 2]);
  assert.deepEqual(plain(projected.items.map(item => item.__variants.map(variant => variant.__quantity[0].value))), [[2, 2], [4, 4]]);
  for (const card of projected.items) for (const variant of card.__variants) {
    const original = items[variant.__inputIndex];
    assert.equal(variant.name, original.name);
    assert.equal(variant.image, original.image);
    assert.equal(variant.description, original.description);
  }
  assert.equal(JSON.stringify(input), before);
  coverage(input, projected);
  assert.equal(model.project(menu(items, 'other-store')).items.length, 4, 'no global EA normalization');
  assert.equal(model.project(menu(items.map(item => ({ ...item, id: `unreviewed-${item.id}` })))).items.length, 4);
});

check('partial search and detail use the same reviewed family identity including itemId-only rows', () => {
  const items = specs.slice(4, 8).map(([item]) => item);
  const detail = model.project(menu(items));
  for (const item of items) {
    const search = model.groupSearchRows([{ storeId: store, itemId: item.id, name: item.name }]);
    assert.equal(search.length, 1);
    const family = detail.items.find(card => card.__sourceIds.includes(item.id));
    assert.equal(search[0].__familyKey, family.__familyKey);
    assert.equal(model.familyKey({ ...item, storeId: store }), family.__familyKey);
  }
});

check('a reviewed typo changes only the card title and never collapses a separate food', () => {
  const input = menu([specs[8][0], row('distinct-food', '[검증] 치즈요리')]);
  const projected = model.project(input);
  assert.equal(projected.items.length, 2);
  assert.equal(projected.items[0].name, '[검증] 치즈요리');
  assert.equal(projected.items[0].__variants[0].name, '[검증] 치츠요리');
  assert.notEqual(projected.items[0].__familyKey, projected.items[1].__familyKey);
  assert.equal(model.project(menu([specs[8][0]], 'other-store')).items[0].name, '[검증] 치츠요리');
});

check('reviewed sauces and drinks stay genuine visible items with quantities and photos', () => {
  const input = menu(specs.slice(9).map(([item]) => ({ ...item, image: 'https://example.com/original.jpg' })));
  const projected = model.project(input);
  assert.deepEqual(plain(projected.items.map(item => item.__kind)), ['drink', 'option']);
  assert.deepEqual(plain(projected.items.map(item => item.category)), ['음료', '추가 옵션']);
  assert.equal(projected.__audit.excluded.length, 0);
  assert.ok(projected.items.every(item => item.image && item.__variants[0].__quantity.length === 1));
  coverage(input, projected);
});

check('unchanged stores have no notes or semantic differences and reviewed projection is deterministic/idempotent', () => {
  const input = freezeDeep(menu(specs.map(([item]) => item)));
  const result = model.project(input);
  assert.deepEqual(plain(model.project(input)), plain(result));
  assert.deepEqual(plain(model.project(freezeDeep(result))), plain(result));
  coverage(input, result);
  for (let i = 0; i < 20; i += 1) {
    const unrelated = menu(specs.map(([item]) => item), `unrelated-store-${i}`);
    assert.deepEqual(plain(model.project(unrelated)), plain(baseline.project(unrelated)));
    assert.equal(Object.hasOwn(model.project(unrelated), '__menuNotes'), false);
  }
});

console.log(`four-store menu cleanup regression: PASS (${checks} checks)`);
