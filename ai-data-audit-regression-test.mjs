import assert from 'node:assert/strict';
import {buildReviewCandidates, parseAiJson, publicAuditView, routeKeys} from './scripts/ai-data-audit.mjs';

const stores = [
  {id: 'a', name: '검증 김밥 미평점', address: '여수시 미평로 1', phone: '061-000-0000', image: 'food.jpg', routes: [{key: 'mukkebi', url: 'https://example.test/a'}]},
  {id: 'b', name: '검증김밥(미평점)', address: '여수시 미평로 1', phone: '061-000-0000', images: [], channelKeys: []},
  {id: 'c', name: '사진없는집', address: '', phone: '', routes: []}
];

assert.deepEqual(routeKeys(stores[0]), ['mukkebi']);
const safe = publicAuditView(stores[0]);
assert.equal(safe.phoneFingerprint.length, 12);
assert(!JSON.stringify(safe).includes('061-000-0000'), 'raw phone must not be sent to the model');
assert.equal(safe.flags.length, 0);

const candidates = buildReviewCandidates(stores);
assert.equal(candidates.length, 3, 'duplicate and incomplete records must enter the review queue');
assert(candidates.find(item => item.id === 'a').possibleDuplicates.some(group => group.ids.includes('b')));
assert(candidates.find(item => item.id === 'b').flags.includes('missing-photo'));
assert.deepEqual(candidates.find(item => item.id === 'c').flags.sort(), ['missing-address', 'missing-order-route', 'missing-phone', 'missing-photo'].sort());

assert.deepEqual(parseAiJson('{"reviews":[]}'), {reviews: []});
assert.throws(() => parseAiJson('{"items":[]}'), /reviews array/);

console.log('PASS AI data audit safety contract');
