import assert from 'node:assert/strict';
import {auditMenu, auditCrossStore, publicPriceIssues, sourceIds} from './scripts/audit-menu-families.mjs';

function baseProject(menu, {store = {}} = {}) {
  if (menu.__menuFamilyVersion === 'audit-fixture') return structuredClone(menu);
  const items = [];
  const excluded = [];
  (menu.items || []).forEach((raw, index) => {
    const ids = sourceIds(raw, index);
    if (raw.name === '안내') { excluded.push({__inputIndex: index, sourceIds: ids, reason: 'notice'}); return; }
    const variant = {...structuredClone(raw), id: raw.id || raw.itemId || ids[0], __sourceIds: ids, __inputIndex: index};
    delete variant.price;
    items.push({...variant, storeId: store.id || raw.storeId || menu.storeId, __familyKey: `${store.id || raw.storeId || menu.storeId}:item-${index}`, __kind: 'food', __variants: [variant]});
  });
  return {...structuredClone(menu), items, __menuFamilyVersion: 'audit-fixture', __audit: {inputCount: menu.items.length, mappedCount: items.length, familyCount: items.length, variantCount: items.length, excluded, review: []}};
}
const model = {
  project: baseProject,
  classify: item => item.name === '안내' ? 'notice' : 'food',
  groupSearchRows(rows) {
    const groups = new Map();
    rows.forEach(row => { if (!groups.has(row.storeId)) groups.set(row.storeId, []); groups.get(row.storeId).push(row); });
    return [...groups].flatMap(([storeId, items]) => baseProject({storeId, items}, {store: {id: storeId}}).items);
  }
};
const store = {id: 'aaaaaaaaaaaaaaaa', name: '감사 시험 가게'};
const input = {storeId: store.id, items: [
  {id: 'repeated', name: '식사', image: 'photo-a.jpg', description: '첫 설명\n그대로 보존'},
  {id: 'repeated', itemId: 'second-origin', name: '식사', image: 'photo-b.jpg', description: '두 번째 설명'},
  {name: 'ID 없는 식사', image: 'photo-c.jpg', price: 10000},
  {id: 'guide', name: '안내'}
]};
const before = JSON.stringify(input);
const good = auditMenu(input, model, {store});
assert.equal(good.passed, true, JSON.stringify(good.failures));
assert.equal(good.variantCount, 3);
assert.equal(good.excludedCount, 1);
assert.equal(good.photoChecks, 3);
assert.equal(JSON.stringify(input), before);

function altered(change) {
  return {...model, project(menu, options) { const value = baseProject(menu, options); if (menu.__menuFamilyVersion !== 'audit-fixture') change(value, menu); return value; }};
}
assert.ok(auditMenu(input, altered(value => { value.items[0].__variants = []; }), {store}).failures.some(item => item.code === 'source-occurrence-conservation'));
assert.ok(auditMenu(input, altered(value => { value.items[0].__variants[0].image = ''; }), {store}).failures.some(item => item.code === 'variant-photo-lost'));
assert.ok(auditMenu(input, altered(value => { value.items[0].__variants[0].description = ''; }), {store}).failures.some(item => item.code === 'variant-description-changed'));
assert.ok(auditMenu(input, altered(value => { value.items[0].__variants[0].price = 100; }), {store}).failures.some(item => item.code === 'public-price-field'));
assert.ok(auditMenu(input, altered(value => { value.items[0].__variants[0].__sourceIds.push('foreign'); }), {store}).failures.some(item => item.code === 'foreign-source-id'));
assert.ok(auditMenu(input, altered((value, source) => { source.items[0].name = 'MUTATED'; }), {store}).failures.some(item => item.code === 'input-mutated'));
input.items[0].name = '식사';
const illegalExclusion = altered(value => {
  const card = value.items.shift();
  value.__audit.excluded.push({__inputIndex: 0, sourceIds: card.__sourceIds, reason: 'notice'});
});
assert.ok(auditMenu(input, illegalExclusion, {store}).failures.some(item => item.code === 'food-excluded'));
let callCount = 0;
assert.ok(auditMenu(input, {...model, project(menu, options) { return {...baseProject(menu, options), nondeterministic: ++callCount}; }}, {store}).failures.some(item => item.code === 'not-deterministic'));
assert.ok(auditMenu(input, {...model, project(menu, options) { const value = baseProject(menu, options); if (menu.__menuFamilyVersion) value.items[0].name += '!'; return value; }}, {store}).failures.some(item => item.code === 'not-idempotent'));
assert.equal(publicPriceIssues({name: '콜라 350ml', description: '2인분'}).length, 0);
assert.equal(publicPriceIssues({description: '추가 1,000원'}).length, 1);
assert.equal(publicPriceIssues({price: null}).length, 1);
const crossRows = [{storeId: 'aaaaaaaaaaaaaaaa', id: 'same', name: '식사'}, {storeId: 'bbbbbbbbbbbbbbbb', id: 'same', name: '식사'}];
assert.equal(auditCrossStore(crossRows, model).passed, true);
assert.equal(auditCrossStore(crossRows, {...model, groupSearchRows: rows => [{storeId: rows[0].storeId, __familyKey: 'unsafe', __variants: rows}]}).passed, false);
console.log('Menu family audit regression: PASS');
