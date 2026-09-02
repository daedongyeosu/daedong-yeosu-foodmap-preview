import assert from 'node:assert/strict';
import fs from 'node:fs';

const source = fs.readFileSync('final-experience.js', 'utf8');
const match = source.match(/function fxStoreById\(id\)\{([^\n]+)\}/);
assert.ok(match, '대표 가게 및 병합된 이전 ID 검색 함수를 유지해야 합니다.');

const stores = [
  {id: '1111111111111111', name: '대표 가게', mergedStoreIds: ['2222222222222222']},
  {id: '3333333333333333', name: '다른 가게', mergedStoreIds: []}
];
const fxStoreById = Function('stores', `return function fxStoreById(id){${match[1]}}`)(stores);

assert.equal(fxStoreById('1111111111111111')?.name, '대표 가게', '대표 ID로 가게를 열 수 있어야 합니다.');
assert.equal(fxStoreById('2222222222222222')?.name, '대표 가게', '병합 전 QR의 이전 ID도 대표 가게로 연결해야 합니다.');
assert.equal(fxStoreById('3333333333333333')?.name, '다른 가게', '관계없는 가게 ID는 그대로 유지해야 합니다.');
assert.equal(fxStoreById('4444444444444444'), undefined, '알 수 없는 ID를 임의 가게로 연결하면 안 됩니다.');

const html = fs.readFileSync('index.html', 'utf8');
assert.match(html, /store-duplicate-alias-1/, '휴대폰이 이전 QR 호환 수정본을 즉시 받도록 캐시 버전을 올려야 합니다.');

console.log('Store duplicate alias regression: PASS');
