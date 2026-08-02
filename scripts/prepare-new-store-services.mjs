import fs from 'node:fs/promises';

const file = 'data/ddangyo-store-enrichment.json';
const data = JSON.parse(await fs.readFile(file, 'utf8'));
const newStores = (data.stores || []).filter(row => row.isNew === true);

if (newStores.length !== 27) {
  throw new Error(`expected 27 new stores, got ${newStores.length}`);
}

const output = newStores.map(row => ({
  targetStoreId: row.targetStoreId,
  patstoNo: row.patstoNo,
  name: row.name,
  address: row.address,
  latitude: row.latitude || '',
  longitude: row.longitude || '',
  chakUrl: 'https://bit.ly/chak-yeosu',
  naverMap: '',
  naverStatus: 'pending-exact-name-address-match'
}));

await fs.writeFile('data/ddangyo-new-store-services.json', JSON.stringify({
  schemaVersion: 2,
  generatedAt: new Date().toISOString(),
  policy: {
    chak: 'apply-to-all-new-stores',
    naver: 'exact-road-signature-and-compatible-business-name-only',
    shopInShopWithoutExactListing: 'omit'
  },
  stores: output
}, null, 2));

console.log(JSON.stringify({newStores: output.length, chakRoutes: output.length}, null, 2));
