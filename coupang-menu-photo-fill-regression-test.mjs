import assert from 'node:assert/strict';
import {exactUniquePhotoMatches} from './scripts/fill-coupang-menu-photos.mjs';

const target = [
  {id: 'a', name: '`내 마음대로` 아사이볼', image: ''},
  {id: 'b', name: '기존 사진', image: 'kept.jpg'},
  {id: 'c', name: '중복 메뉴', image: ''},
  {id: 'd', name: '중복메뉴', image: ''},
  {id: 'e', name: '사진 없는 출처', image: ''}
];
const source = [
  {id: '1', name: "'내 마음대로' 아사이볼", image: 'https://example.com/a.jpg'},
  {id: '2', name: '기존 사진', image: 'https://example.com/b.jpg'},
  {id: '3', name: '중복메뉴', image: 'https://example.com/c.jpg'},
  {id: '4', name: '사진 없는 출처', image: ''}
];
const matches = exactUniquePhotoMatches(target, source);
assert.deepEqual(matches.map(value => [value.target.id, value.source.id]), [['a', '1']]);
assert.equal(target[0].image, '', 'matching must not mutate the menu');
console.log('PASS Coupang photo fill accepts only one empty target and one exact pictured source');
