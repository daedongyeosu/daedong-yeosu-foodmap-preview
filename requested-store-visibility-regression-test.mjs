import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const read = file => fs.readFileSync(file, 'utf8');
const priority = JSON.parse(read('data/store-priority.json'));
const dataApi = read('data-api.js');

const hidden = [
  ['c59a5a8f5a91ce24', '수해복마라탕 여수미평점'],
  ['9e0a2da7ddfa3d93', '다정아구 미평']
];
const deprioritized = [
  ['48a8921c93fca359', '여수대표치킨'],
  ['bc3a339f361dab7b', '신포우리만두-봉산점'],
  ['5deb911df92c645a', '포우머그 문수점'],
  ['e66f136d0e468b6e', '아주커치킨 문수점'],
  ['68ba9ebef219905e', '두마리찜닭 두찜 여수문수점']
];

test('requested stores are hidden or removed from every priority source', () => {
  const hiddenBlock = dataApi.match(/CUSTOMER_HIDDEN_STORE_IDS\s*=\s*new Set\(\[([\s\S]*?)\]\)/)?.[1] || '';
  const referralIds = Object.values(priority.referralProfiles || {}).flatMap(profile => profile.storeIds || []);

  for (const [id, name] of hidden) {
    assert.match(hiddenBlock, new RegExp(id), `${name} must be customer-hidden`);
    assert.ok(!priority.managedStoreIds.includes(id), `${name} must not remain managed`);
    assert.ok(!referralIds.includes(id), `${name} must not remain in referral priority`);
  }

  for (const [id, name] of deprioritized) {
    assert.ok(priority.deprioritizedStoreIds.includes(id), `${name} must be deprioritized`);
    assert.ok(!priority.managedStoreIds.includes(id), `${name} must not remain managed`);
    assert.ok(!priority.sharedManagedStoreIds.includes(id), `${name} must not remain shared-managed`);
    assert.ok(!referralIds.includes(id), `${name} must not remain in referral priority`);
  }

  assert.equal(priority.stats.managedCanonicalStores, priority.managedStoreIds.length);
  assert.equal(priority.stats.deprioritizedCanonicalStores, priority.deprioritizedStoreIds.length);
});
