import assert from 'node:assert/strict';
import {
  applyReviewedPhotos,
  buildPhotoCoverageAudit,
  comparableMenuKey,
  duplicateMenuGroups,
  exactMenuKey,
  menuNameHash,
  storeBrandKeys
} from './scripts/audit-menu-photo-coverage.mjs';

assert.equal(exactMenuKey(' 누텔라 오레오 와플 '), '누텔라오레오와플');
assert.equal(comparableMenuKey('[베스트] 누텔라 오레오 와플'), '누텔라오레오와플');
assert.equal(comparableMenuKey('[스페셜 컴포즈콤보] 붕어는 T입니다'), '붕어는t입니다');
assert.equal(storeBrandKeys({name: '컴포즈커피 문수광장점', searchAliases: ['컴포즈커피']})[0].key, '컴포즈커피');
assert(!storeBrandKeys({name: '감성낙곱새-문수점', searchAliases: ['감성낙곱새 여수문수점', '대패가1900(문수점)']}).some(item => item.key.startsWith('대패가1900')), 'a shop-in-shop alias must not become the target brand');

const rawMenu = {storeId: 'aaaaaaaaaaaaaaaa', items: [{id: 'm1', name: '가래떡떡볶이', description: '', image: ''}]};
const reviewedImage = 'assets/reviewed-menu-photos/aaaaaaaaaaaaaaaa/01.jpg';
const patched = applyReviewedPhotos('aaaaaaaaaaaaaaaa', rawMenu, {stores: {aaaaaaaaaaaaaaaa: {items: {m1: {nameHash: menuNameHash('가래떡떡볶이'), descriptionHash: menuNameHash(''), image: reviewedImage}}}}});
assert.equal(patched.items[0].image, reviewedImage);
assert.equal(rawMenu.items[0].image, '', 'audit must not mutate source menus');
assert.equal(applyReviewedPhotos('aaaaaaaaaaaaaaaa', {...rawMenu, items: [{...rawMenu.items[0], name: '다른 메뉴'}]}, {stores: {aaaaaaaaaaaaaaaa: {items: {m1: {nameHash: menuNameHash('가래떡떡볶이'), image: reviewedImage}}}}}).items[0].image, '', 'name guard must block a stale reviewed mapping');

assert.equal(duplicateMenuGroups([{id: '1', name: '순대'}, {id: '2', name: '순 대'}, {id: '3', name: '떡볶이'}]).length, 1);

const stores = [
  {id: 'aaaaaaaaaaaaaaaa', name: '컴포즈커피 문수광장점', brandName: '컴포즈커피', searchAliases: ['컴포즈커피'], channelKeys: ['mukkebi', 'ddangyo']},
  {id: 'bbbbbbbbbbbbbbbb', name: '컴포즈커피 쌍봉사거리점', brandName: '컴포즈커피', searchAliases: ['컴포즈커피'], channelKeys: ['mukkebi']},
  {id: 'cccccccccccccccc', name: '서로다른카페 문수점', searchAliases: ['서로다른카페']}
];
const menus = new Map([
  ['aaaaaaaaaaaaaaaa', {items: [{id: 'target', name: '[베스트] 아메리카노', image: ''}, {id: 'dup1', name: '와플'}, {id: 'dup2', name: '와 플'}]}],
  ['bbbbbbbbbbbbbbbb', {items: [{id: 'source', name: '아메리카노', image: 'assets/reviewed-menu-photos/bbbbbbbbbbbbbbbb/01.jpg', __reviewedPhoto: true}]}],
  ['cccccccccccccccc', {items: [{id: 'foreign', name: '아메리카노', image: 'assets/reviewed-menu-photos/cccccccccccccccc/01.jpg', __reviewedPhoto: true}]}]
]);
const audit = buildPhotoCoverageAudit(stores, menus);
assert.equal(audit.summary.auditedStores, 3);
assert.equal(audit.summary.missingPhotos, 3);
assert.equal(audit.summary.duplicateGroups, 1);
assert.equal(audit.candidates.length, 1, 'only the same brand may donate a photo candidate');
assert.equal(audit.candidates[0].storeId, 'aaaaaaaaaaaaaaaa');
assert.equal(audit.candidates[0].candidateImages.length, 1);
assert.equal(audit.candidates[0].safeToAutoFill, false, 'marketing-tag normalization still requires review');
assert.equal(menus.get('aaaaaaaaaaaaaaaa').items[0].image, '', 'audit must never modify customer data');

console.log('PASS menu photo coverage audit safety contract');
