import fs from 'node:fs/promises';

const inputPath = 'data/ddangyo-new-store-services.json';
const data = JSON.parse(await fs.readFile(inputPath, 'utf8'));

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function clean(value) {
  return String(value || '').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').trim();
}

function nameKey(value) {
  return clean(value)
    .toLocaleLowerCase('ko-KR')
    .replace(/\([^)]*\)/g, '')
    .replace(/[\s·&()\-_/.,]/g, '');
}

function roadBase(value) {
  return clean(value)
    .replace(/^대한민국\s*/, '')
    .replace(/^전라남도\s*/, '전남 ')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .replace(/\s+(?:지하\s*)?\d+층(?:\s+.*)?$/i, '')
    .replace(/\s+\d+(?:호|동)(?:\s+.*)?$/i, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function addressKey(value) {
  return roadBase(value)
    .toLocaleLowerCase('ko-KR')
    .replace(/^(전남|전라남도)\s*/, '')
    .replace(/^여수시\s*/, '')
    .replace(/[\s,]/g, '');
}

function compatibleName(left, right) {
  const a = nameKey(left);
  const b = nameKey(right);
  return Boolean(a && b && (a === b || a.includes(b) || b.includes(a)));
}

function candidateFromObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const id = clean(obj.id || obj.placeId || obj.place_id || obj.businessId || obj.sid);
  const name = clean(obj.name || obj.title || obj.placeName || obj.businessName);
  const roadAddress = clean(obj.roadAddress || obj.road_address || obj.roadAddr || obj.newAddress || obj.address);
  const address = clean(obj.address || obj.jibunAddress || obj.jibun_address);
  if (!id || !name || !(roadAddress || address)) return null;
  return {id, name, roadAddress, address};
}

function collectCandidates(value, output = [], seen = new Set()) {
  if (!value || typeof value !== 'object') return output;
  if (Array.isArray(value)) {
    for (const item of value) collectCandidates(item, output, seen);
    return output;
  }
  const candidate = candidateFromObject(value);
  if (candidate) {
    const key = `${candidate.id}|${candidate.name}|${candidate.roadAddress}|${candidate.address}`;
    if (!seen.has(key)) {
      seen.add(key);
      output.push(candidate);
    }
  }
  for (const child of Object.values(value)) collectCandidates(child, output, seen);
  return output;
}

async function searchNaver(row) {
  const query = `${row.name} ${roadBase(row.address)}`;
  const encoded = encodeURIComponent(query);
  const endpoint = `https://map.naver.com/p/api/search/allSearch?query=${encoded}&type=all&searchCoord=127.66%3B34.76&boundary=`;
  const referer = `https://map.naver.com/p/search/${encoded}`;
  const response = await fetch(endpoint, {
    headers: {
      accept: 'application/json, text/plain, */*',
      referer,
      'user-agent': 'Mozilla/5.0 (Linux; Android 14; SM-S928N) AppleWebKit/537.36 Chrome/142.0 Mobile Safari/537.36',
      'accept-language': 'ko-KR,ko;q=0.9'
    }
  });
  const text = await response.text();
  if (!response.ok) {
    return {status: `http-${response.status}`, query, candidates: [], preview: text.slice(0, 300)};
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return {status: 'invalid-json', query, candidates: [], preview: text.slice(0, 300)};
  }
  const candidates = collectCandidates(json);
  const targetAddress = addressKey(row.address);
  const exact = candidates.filter(candidate => {
    const candidateAddress = addressKey(candidate.roadAddress || candidate.address);
    return candidateAddress === targetAddress && compatibleName(candidate.name, row.name);
  });
  if (exact.length === 1) {
    return {
      status: 'verified',
      query,
      candidate: exact[0],
      candidates: candidates.slice(0, 20),
      naverMap: `https://map.naver.com/p/entry/place/${exact[0].id}`
    };
  }
  return {
    status: exact.length > 1 ? 'ambiguous-exact-match' : 'no-exact-match',
    query,
    exactMatches: exact,
    candidates: candidates.slice(0, 20),
    naverMap: ''
  };
}

let verified = 0;
let omitted = 0;
for (let index = 0; index < data.stores.length; index += 1) {
  const row = data.stores[index];
  try {
    const result = await searchNaver(row);
    row.naverStatus = result.status;
    row.naverMap = result.naverMap || '';
    row.naverEvidence = result;
    if (result.status === 'verified') verified += 1;
    else omitted += 1;
    console.log(`${index + 1}/${data.stores.length} ${row.name} -> ${result.status}`);
  } catch (error) {
    row.naverStatus = 'request-error';
    row.naverMap = '';
    row.naverEvidence = {error: String(error?.stack || error)};
    omitted += 1;
    console.error(`${index + 1}/${data.stores.length} ${row.name} failed`, error);
  }
  await sleep(180);
}

data.generatedAt = new Date().toISOString();
data.stats = {newStores: data.stores.length, chakRoutes: data.stores.length, naverVerified: verified, naverOmitted: omitted};
await fs.writeFile(inputPath, JSON.stringify(data, null, 2));
console.log(JSON.stringify(data.stats, null, 2));
