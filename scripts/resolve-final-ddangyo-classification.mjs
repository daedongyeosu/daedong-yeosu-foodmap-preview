import fs from 'node:fs/promises';
import path from 'node:path';

const inputPath = process.argv[2] || 'ddangyo-final-classification-output/final-stores.json';
const outputDir = path.resolve('ddangyo-final-ready-output');
await fs.rm(outputDir, {recursive: true, force: true});
await fs.mkdir(outputDir, {recursive: true});
const rows = JSON.parse(await fs.readFile(inputPath, 'utf8'));

const clean = value => String(value ?? '').trim().replace(/\s+/g, ' ');
function compact(value) {
  return clean(value).normalize('NFKC').toLocaleLowerCase('ko-KR')
    .replace(/피나치공/g, '피자나라치킨공주')
    .replace(/only/g, '온리')
    .replace(/bbq/g, '비비큐')
    .replace(/&/g, '앤')
    .replace(/[\s·()\-_/.,'"\[\]]/g, '');
}
function addressKey(value) {
  return clean(value)
    .replace(/^대한민국\s*/, '')
    .replace(/^전라남도\s*/, '전남 ')
    .replace(/전남광주통합특별시/g, '전남')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+(?:지하\s*)?\d+층(?:\s+.*)?$/i, '')
    .replace(/\s+\d+(?:호|동)(?:\s+.*)?$/i, '')
    .toLocaleLowerCase('ko-KR')
    .replace(/^(전남|전라남도)\s*/, '')
    .replace(/^여수시\s*/, '')
    .replace(/[\s,·]/g, '');
}
function hasRoadAddress(value) {
  return /[가-힣A-Za-z0-9]+(?:대로|로|길)\s*\d+(?:-\d+)?/.test(clean(value));
}
function longestCommonSubstring(a, b) {
  const previous = new Array(b.length + 1).fill(0);
  let best = 0;
  for (let i = 1; i <= a.length; i += 1) {
    const current = new Array(b.length + 1).fill(0);
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        current[j] = previous[j - 1] + 1;
        best = Math.max(best, current[j]);
      }
    }
    for (let j = 0; j <= b.length; j += 1) previous[j] = current[j];
  }
  return best;
}
function sameBusinessName(left, right) {
  const a = compact(left), b = compact(right);
  if (!a || !b) return false;
  if (a === b || (Math.min(a.length, b.length) >= 3 && (a.includes(b) || b.includes(a)))) return true;
  const common = longestCommonSubstring(a, b);
  return common >= 3 && common / Math.min(a.length, b.length) >= 0.55;
}
function sameBrandWithMissingCurrentAddress(left, right, candidateAddress) {
  if (hasRoadAddress(candidateAddress)) return false;
  const a = compact(left), b = compact(right);
  if (!a || !b) return false;
  const common = longestCommonSubstring(a, b);
  if (common >= 3) return true;
  const shorter = a.length <= b.length ? a : b;
  const longer = a.length <= b.length ? b : a;
  return shorter.length >= 2 && longer.startsWith(shorter);
}

let restoredExisting = 0;
const output = rows.map(row => {
  if (row?.error || row?.match?.status === 'existing') return row;
  const rejected = row.rejectedMatch;
  if (rejected?.status === 'existing' && rejected?.storeId) {
    const candidate = rejected.candidate || {};
    const sameAddress = Boolean(addressKey(candidate.address)) && addressKey(candidate.address) === addressKey(row.address);
    const sameName = sameBusinessName(candidate.storeName, row.name);
    const sameBrandMissingAddress = sameBrandWithMissingCurrentAddress(candidate.storeName, row.name, candidate.address);
    if (sameAddress || sameName || sameBrandMissingAddress) {
      restoredExisting += 1;
      return {
        ...row,
        match: {
          status: 'existing',
          method: sameAddress
            ? 'restored-existing-same-address'
            : sameName
              ? 'restored-existing-same-business-name'
              : 'restored-existing-same-brand-current-address-missing',
          storeId: rejected.storeId,
          candidate,
          rejectedConflictCheck: row.match
        }
      };
    }
  }
  return row;
});

const valid = output.filter(row => row && !row.error);
const targetCounts = valid.filter(row => row.match?.status === 'existing' && row.match?.storeId).reduce((map, row) => {
  const id = row.match.storeId;
  if (!map[id]) map[id] = [];
  map[id].push({patstoNo: row.patstoNo, name: row.name});
  return map;
}, {});
const duplicateTargets = Object.fromEntries(Object.entries(targetCounts).filter(([, list]) => list.length > 1));
const summary = {
  generatedAt: new Date().toISOString(),
  inputStores: output.length,
  existing: valid.filter(row => row.match?.status === 'existing').length,
  newStores: valid.filter(row => row.match?.status === 'new').length,
  review: valid.filter(row => row.match?.status === 'review').length,
  failures: output.filter(row => row?.error).length,
  restoredExisting,
  duplicateTargetStoreIds: Object.keys(duplicateTargets).length,
  duplicateTargets
};
await fs.writeFile(path.join(outputDir, 'final-stores.json'), JSON.stringify(output, null, 2));
await fs.writeFile(path.join(outputDir, 'summary.json'), JSON.stringify(summary, null, 2));
await fs.writeFile(path.join(outputDir, 'review-stores.json'), JSON.stringify(valid.filter(row => row.match?.status === 'review'), null, 2));
await fs.writeFile(path.join(outputDir, 'new-stores.json'), JSON.stringify(valid.filter(row => row.match?.status === 'new'), null, 2));
console.log(JSON.stringify(summary, null, 2));
