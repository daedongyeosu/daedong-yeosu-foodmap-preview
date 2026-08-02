import fs from 'node:fs/promises';

const inputPath = 'data/ddangyo-new-store-services.json';
const data = JSON.parse(await fs.readFile(inputPath, 'utf8'));
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

function clean(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function canonicalName(value) {
  return clean(value)
    .toLocaleLowerCase('ko-KR')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/피나치공/g, '피자나라치킨공주')
    .replace(/only/g, '온리')
    .replace(/&/g, '앤')
    .replace(/[\s·()\-_/.,]/g, '');
}

function longestCommonSubstringLength(a, b) {
  if (!a || !b) return 0;
  const dp = new Array(b.length + 1).fill(0);
  let best = 0;
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = b.length; j >= 1; j -= 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[j] = dp[j - 1] + 1;
        if (dp[j] > best) best = dp[j];
      } else {
        dp[j] = 0;
      }
    }
  }
  return best;
}

function compatibleName(left, right) {
  const a = canonicalName(left);
  const b = canonicalName(right);
  if (!a || !b) return false;
  if (a === b || a.includes(b) || b.includes(a)) return true;
  return longestCommonSubstringLength(a, b) >= 3;
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

function roadSignature(value) {
  const text = roadBase(value);
  const matches = [...text.matchAll(/([가-힣A-Za-z0-9]+(?:대로|로|길))\s*(\d+(?:-\d+)?)/g)];
  if (!matches.length) return '';
  const last = matches[matches.length - 1];
  return `${last[1]}${last[2]}`.toLocaleLowerCase('ko-KR');
}

function candidateFromObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return null;
  const id = clean(obj.id || obj.placeId || obj.place_id || obj.businessId || obj.business_id || obj.sid);
  const name = clean(obj.name || obj.title || obj.placeName || obj.businessName || obj.business_name);
  const roadAddress = clean(obj.roadAddress || obj.road_address || obj.roadAddr || obj.newAddress || obj.new_address);
  const address = clean(obj.address || obj.jibunAddress || obj.jibun_address || obj.commonAddress);
  if (!id || !name || !(roadAddress || address)) return null;
  return {id, name, roadAddress, address};
}

function collectCandidates(value, output = [], seen = new Set()) {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      try {
        collectCandidates(JSON.parse(trimmed), output, seen);
      } catch {}
    }
    return output;
  }
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

function uniqueCandidates(rows) {
  const seen = new Set();
  return rows.filter(row => {
    const key = `${row.id}|${row.name}|${row.roadAddress}|${row.address}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function queryNaver(row, query) {
  const encoded = encodeURIComponent(query);
  const lng = Number(row.longitude);
  const lat = Number(row.latitude);
  const searchCoord = Number.isFinite(lng) && Number.isFinite(lat)
    ? `${lng};${lat}`
    : '127.66;34.76';
  const endpoint = `https://map.naver.com/p/api/search/allSearch?query=${encoded}&type=all&searchCoord=${encodeURIComponent(searchCoord)}&boundary=`;
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
    return {query, status: `http-${response.status}`, candidates: [], preview: text.slice(0, 500)};
  }
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return {query, status: 'invalid-json', candidates: [], preview: text.slice(0, 500)};
  }
  return {
    query,
    status: 'ok',
    candidates: collectCandidates(json),
    rootKeys: Object.keys(json || {}).slice(0, 30),
    preview: text.slice(0, 500)
  };
}

async function searchNaver(row) {
  const queryList = [
    row.name,
    `${row.name} 여수`,
    `${row.name} ${roadBase(row.address)}`,
    roadBase(row.address)
  ];
  const attempts = [];
  const allCandidates = [];
  for (const query of [...new Set(queryList.map(clean).filter(Boolean))]) {
    const attempt = await queryNaver(row, query);
    attempts.push({
      query: attempt.query,
      status: attempt.status,
      candidateCount: attempt.candidates.length,
      rootKeys: attempt.rootKeys || [],
      preview: attempt.candidates.length ? '' : attempt.preview
    });
    allCandidates.push(...attempt.candidates);
    await sleep(120);
  }

  const candidates = uniqueCandidates(allCandidates);
  const targetSignature = roadSignature(row.address);
  const sameAddress = candidates.filter(candidate => {
    const candidateSignature = roadSignature(candidate.roadAddress || candidate.address);
    return Boolean(targetSignature && candidateSignature === targetSignature);
  });
  const exact = sameAddress.filter(candidate => compatibleName(candidate.name, row.name));

  if (exact.length === 1) {
    return {
      status: 'verified',
      candidate: exact[0],
      roadSignature: targetSignature,
      attempts,
      sameAddressCandidates: sameAddress,
      naverMap: `https://map.naver.com/p/entry/place/${exact[0].id}`
    };
  }
  return {
    status: exact.length > 1 ? 'ambiguous-exact-match' : 'no-exact-match',
    roadSignature: targetSignature,
    attempts,
    exactMatches: exact,
    sameAddressCandidates: sameAddress,
    candidates: candidates.slice(0, 30),
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
    console.log(`${index + 1}/${data.stores.length} ${row.name} -> ${result.status} (${result.sameAddressCandidates?.length || 0} same address)`);
  } catch (error) {
    row.naverStatus = 'request-error';
    row.naverMap = '';
    row.naverEvidence = {error: String(error?.stack || error)};
    omitted += 1;
    console.error(`${index + 1}/${data.stores.length} ${row.name} failed`, error);
  }
  await sleep(160);
}

data.generatedAt = new Date().toISOString();
data.stats = {
  newStores: data.stores.length,
  chakRoutes: data.stores.length,
  naverVerified: verified,
  naverOmitted: omitted
};
await fs.writeFile(inputPath, JSON.stringify(data, null, 2));
console.log(JSON.stringify(data.stats, null, 2));
