import fs from 'node:fs';
import crypto from 'node:crypto';

const key = process.env.KAKAO_REST_API_KEY;
if (!key) throw new Error('KAKAO_REST_API_KEY is not configured');

const stores = JSON.parse(fs.readFileSync('data/stores.json', 'utf8'));
const normal = stores.filter((s) => String(s.name || '').trim() && String(s.name).trim() !== '제목 없음');
if (stores.length !== 471 || normal.length !== 470) throw new Error(`Unexpected store counts: ${stores.length}/${normal.length}`);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const clean = (v) => String(v || '').normalize('NFKC').toLowerCase().replace(/여수시?|전라남도|전남|점포|매장|본점/g, '').replace(/[\s()[\]{}·&.,'"_-]/g, '');
const brand = (v) => clean(v).replace(/(소호|신기|죽림|학동|문수|여서|웅천|무선|봉계|덕충|교동|중앙|국동|돌산|여천|봉강|화장|안산|미평|오림|관문|서교|충무|공화|종화|고소|수정|월호|선원|주삼|삼일|묘도|율촌|소라|화양|남면|화정|삼산).*$/, '');
const isYeosu = (d) => /전라남도\s*여수시|전남\s*여수시|\b여수시\b/.test(`${d.address_name || ''} ${d.road_address_name || ''}`);
const districtMatch = (store, d) => !store.district || `${d.address_name || ''} ${d.road_address_name || ''}`.includes(String(store.district).replace(/\s/g, ''));
const nameMatch = (store, d) => {
  const a = clean(store.name), b = clean(d.place_name);
  const ab = brand(store.name), bb = brand(d.place_name);
  return a === b || a.includes(b) || b.includes(a) || (ab.length >= 3 && (bb.includes(ab) || ab.includes(bb)));
};

async function kakao(path, params) {
  const url = new URL(`https://dapi.kakao.com${path}`);
  for (const [k, v] of Object.entries(params)) if (v) url.searchParams.set(k, v);
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
    if (res.ok) return res.json();
    if (res.status === 429 || res.status >= 500) { await sleep(600 * (attempt + 1)); continue; }
    throw new Error(`Kakao API HTTP ${res.status}`);
  }
  throw new Error('Kakao API retries exhausted');
}

async function addressSearch(address) {
  const body = await kakao('/v2/local/search/address.json', { query: address, size: '10' });
  return body.documents || [];
}

async function keywordSearch(query) {
  const body = await kakao('/v2/local/search/keyword.json', { query, size: '15' });
  return body.documents || [];
}

const result = {};
const detail = [];
for (let i = 0; i < normal.length; i++) {
  const s = normal[i];
  const road = String(s.roadAddress || s.road_address || s.address || '').trim();
  const jibun = String(s.jibunAddress || s.jibun_address || '').trim();
  let method = null, docs = [], inputAddress = '';
  if (road) { inputAddress = road; docs = await addressSearch(road); method = 'road-address'; }
  if (!docs.length && jibun) { inputAddress = jibun; docs = await addressSearch(jibun); method = 'jibun-address'; }
  if (!docs.length && inputAddress && !/전라남도|전남/.test(inputAddress)) {
    inputAddress = `전라남도 여수시 ${inputAddress}`;
    docs = await addressSearch(inputAddress); method = `${method || 'address'}-yeosu-prefix`;
  }
  let candidates = docs.map((d) => ({
    latitude: Number(d.y), longitude: Number(d.x),
    matchedAddress: d.road_address?.address_name || d.address?.address_name || d.address_name || '',
    placeName: '', sourceType: method
  }));
  if (!candidates.length) {
    const query = `${s.name} 전라남도 여수시 ${s.district || ''}`.trim();
    inputAddress = query; method = 'keyword';
    const kd = await keywordSearch(query);
    candidates = kd.filter(isYeosu).filter((d) => nameMatch(s, d)).map((d) => ({
      latitude: Number(d.y), longitude: Number(d.x), matchedAddress: d.road_address_name || d.address_name || '',
      placeName: d.place_name || '', sourceType: 'keyword', districtMatch: districtMatch(s, d)
    }));
  }
  const inYeosu = candidates.filter((c) => /여수시/.test(c.matchedAddress));
  const exactDistrict = inYeosu.filter((c) => c.districtMatch !== false);
  const usable = exactDistrict.length ? exactDistrict : inYeosu;
  const unique = [...new Map(usable.map((c) => [`${c.latitude.toFixed(7)},${c.longitude.toFixed(7)}`, c])).values()];
  let status = 'manual-review', confidence = 'ambiguous';
  if (unique.length === 1 && /여수시/.test(unique[0].matchedAddress) && (unique[0].sourceType !== 'keyword' || unique[0].districtMatch !== false)) {
    status = 'verified'; confidence = unique[0].sourceType === 'keyword' ? 'keyword-exact' : 'exact';
  } else if (!unique.length) { status = 'search-failed'; confidence = 'none'; }
  const chosen = unique.length === 1 ? unique[0] : null;
  result[s.id] = {
    latitude: chosen?.latitude ?? null,
    longitude: chosen?.longitude ?? null,
    source: chosen ? `kakao-${chosen.sourceType}-geocoding` : 'kakao-geocoding',
    inputAddress,
    matchedAddress: chosen?.matchedAddress || '',
    status,
    confidence
  };
  detail.push({ store_id: s.id, name: s.name, district: s.district || '', status, confidence, candidateCount: unique.length, placeName: chosen?.placeName || '', matchedAddress: chosen?.matchedAddress || '' });
  await sleep(45);
  if ((i + 1) % 50 === 0) console.log(`processed ${i + 1}/${normal.length}`);
}

const coordGroups = new Map();
for (const row of detail.filter((x) => x.status === 'verified')) {
  const c = result[row.store_id]; const k = `${c.latitude.toFixed(7)},${c.longitude.toFixed(7)}`;
  if (!coordGroups.has(k)) coordGroups.set(k, []);
  coordGroups.get(k).push({ store_id: row.store_id, name: row.name, matchedAddress: row.matchedAddress });
}
const duplicateCoordinates = [...coordGroups.entries()].filter(([, rows]) => rows.length > 1).map(([coordinate, rows]) => ({ coordinate, stores: rows }));
const stats = {
  target: normal.length,
  automaticVerified: detail.filter((x) => x.status === 'verified').length,
  roadAddressVerified: detail.filter((x) => x.status === 'verified' && x.confidence === 'exact').length,
  jibunAddressVerified: 0,
  keywordVerified: detail.filter((x) => x.status === 'verified' && x.confidence === 'keyword-exact').length,
  manualReview: detail.filter((x) => x.status === 'manual-review').length,
  searchFailed: detail.filter((x) => x.status === 'search-failed').length,
  outsideYeosu: 0,
  duplicateCoordinateGroups: duplicateCoordinates.length,
  excludedUntitled: stores.length - normal.length
};
fs.mkdirSync('coordinate-output', { recursive: true });
fs.writeFileSync('coordinate-output/store-coordinates.json', JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync('coordinate-output/coordinate-validation.json', JSON.stringify({ stats, duplicateCoordinates, stores: detail }, null, 2) + '\n');
const sha = crypto.createHash('sha256').update(fs.readFileSync('coordinate-output/store-coordinates.json')).digest('hex');
fs.writeFileSync('coordinate-output/SHA256.txt', `${sha}  store-coordinates.json\n`);
console.log(JSON.stringify(stats));
