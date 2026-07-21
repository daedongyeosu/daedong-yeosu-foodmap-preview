import fs from 'node:fs';
import crypto from 'node:crypto';

const key = process.env.KAKAO_REST_API_KEY;
if (!key) throw new Error('KAKAO_REST_API_KEY is not configured');
const stores = JSON.parse(fs.readFileSync('data/stores.json', 'utf8'));
const base = JSON.parse(fs.readFileSync('coordinate-input/store-coordinates-before-txt.json', 'utf8'));
const source = JSON.parse(fs.readFileSync('data/coordinate-source/txt-naver-review-source.json', 'utf8'));
const priorCsv = fs.readFileSync('data/coordinate-review/coordinate-unresolved-after-excel.csv', 'utf8');
const normal = stores.filter((s) => String(s.name || '').trim() && String(s.name).trim() !== '제목 없음');
if (stores.length !== 471 || normal.length !== 470 || Object.keys(base).length !== 470) throw new Error('Unexpected baseline counts');
if (Object.values(base).filter((x) => x.status === 'verified').length !== 325) throw new Error('TXT baseline must contain exactly 325 verified stores');

function parseCsv(text) {
  const rows = []; let row = [], field = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) { if (c === '"' && text[i + 1] === '"') { field += '"'; i++; } else if (c === '"') quoted = false; else field += c; }
    else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field.replace(/\r$/, '')); if (row.some(Boolean)) rows.push(row); row = []; field = ''; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  const headers = rows.shift() || [];
  return rows.map((values) => Object.fromEntries(headers.map((h, i) => [h, values[i] || ''])));
}
const prior = Object.fromEntries(parseCsv(priorCsv).map((x) => [x.store_id, x]));
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function addressSearch(address) {
  const url = new URL('https://dapi.kakao.com/v2/local/search/address.json');
  url.searchParams.set('query', address); url.searchParams.set('size', '10');
  for (let attempt = 0; attempt < 4; attempt++) {
    const res = await fetch(url, { headers: { Authorization: `KakaoAK ${key}` } });
    if (res.ok) return (await res.json()).documents || [];
    if (res.status === 429 || res.status >= 500) { await sleep(600 * (attempt + 1)); continue; }
    throw new Error(`Kakao API HTTP ${res.status}`);
  }
  throw new Error('Kakao API retries exhausted');
}
const csv = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
const result = structuredClone(base);
let added = 0, multipleResults = 0, addressExtractionFailed = 0, outsideYeosu = 0;
for (const evidence of source.rows.filter((x) => x.reviewStatus === 'verified-source')) {
  if (base[evidence.store_id]?.status === 'verified') throw new Error(`Refusing to overwrite verified coordinate: ${evidence.store_id}`);
  const inputAddress = evidence.roadAddress || evidence.jibunAddress;
  const docs = await addressSearch(inputAddress);
  const unique = [...new Map(docs.map((d) => {
    const matchedAddress = d.road_address?.address_name || d.address?.address_name || d.address_name || '';
    return [`${Number(d.y).toFixed(7)},${Number(d.x).toFixed(7)}`, { latitude: Number(d.y), longitude: Number(d.x), matchedAddress }];
  })).values()];
  const yeosu = unique.filter((x) => /여수시/.test(x.matchedAddress));
  if (!unique.length) { addressExtractionFailed++; continue; }
  if (yeosu.length !== 1) { if (yeosu.length > 1) multipleResults++; else outsideYeosu++; continue; }
  const chosen = yeosu[0];
  result[evidence.store_id] = { latitude: chosen.latitude, longitude: chosen.longitude, source: 'txt-naver-map', naverMapUrl: evidence.naverMapUrl, inputAddress, matchedAddress: chosen.matchedAddress, status: 'verified', confidence: 'exact' };
  added++;
  await sleep(80);
}

for (const [id, before] of Object.entries(base)) {
  if (before.status === 'verified' && JSON.stringify(before) !== JSON.stringify(result[id])) throw new Error(`Existing verified coordinate changed: ${id}`);
}
const unresolved = normal.filter((s) => result[s.id]?.status !== 'verified');
const sourceById = Object.fromEntries(source.rows.map((x) => [x.store_id, x]));
const headers = ['store_id','store_name','neighborhood','txt_naver_url_exists','extracted_address','kakao_query','unresolved_reason','recommended_action'];
const rows = unresolved.map((s) => {
  const e = sourceById[s.id], p = prior[s.id] || {};
  let reason = p.unresolved_reason || '기타 오류', action = p.recommended_action || '원본 자료 수동 검수';
  if (e?.reviewStatus === 'address-extraction-failed') { reason = '네이버지도 링크는 있으나 주소 추출 실패'; action = '네이버 장소 단축링크와 주소를 수동 확인'; }
  if (e?.reviewStatus === 'store-name-mismatch') { reason = '가게명·지점명·동네 불일치'; action = 'TXT 표기와 네이버 장소명이 다른 가게인지 수동 확인'; }
  if (e?.reviewStatus === 'verified-source' && added === 0) { reason = multipleResults ? '검색 결과가 여러 개라 자동 확정 불가' : outsideYeosu ? '여수 외 좌표' : '주소 문구는 있으나 카카오 주소검색 결과 없음'; action = '네이버 장소와 카카오 주소 결과를 수동 대조'; }
  const address = e?.roadAddress || e?.jibunAddress || '';
  return { store_id: s.id, store_name: s.name, neighborhood: s.district || '', txt_naver_url_exists: e?.naverMapUrl ? 'yes' : 'no', extracted_address: address, kakao_query: address || p.kakao_query || `${s.name} ${s.district || ''}`.trim(), unresolved_reason: reason, recommended_action: action };
});
const stats = { target: 470, txtNaverLinksTotal: source.txtNaverLinksTotal, matchedCurrentUnresolved: source.matchedCurrentUnresolved, baselineVerified: 325, txtVerifiedAdded: added, nameOrBranchMismatch: source.rows.filter((x) => x.reviewStatus === 'store-name-mismatch').length, addressExtractionFailed: source.rows.filter((x) => x.reviewStatus === 'address-extraction-failed').length + addressExtractionFailed, multipleResults, outsideYeosu, finalVerified: Object.values(result).filter((x) => x.status === 'verified').length, finalUnresolved: unresolved.length, existingVerifiedChanged: 0, excludedUntitled: 1 };
fs.mkdirSync('coordinate-output', { recursive: true });
fs.writeFileSync('coordinate-output/store-coordinates.json', JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync('coordinate-output/coordinate-validation-after-txt.json', JSON.stringify({ stats }, null, 2) + '\n');
fs.writeFileSync('coordinate-output/coordinate-unresolved-after-txt.csv', [headers.join(','), ...rows.map((r) => headers.map((h) => csv(r[h])).join(','))].join('\n') + '\n');
fs.writeFileSync('coordinate-output/coordinate-existing-conflicts-after-txt.csv', 'store_id,store_name,existing_address,existing_latitude,existing_longitude,txt_naver_url,txt_address,conflict_reason,recommended_action\n');
const sums = ['store-coordinates.json','coordinate-unresolved-after-txt.csv','coordinate-existing-conflicts-after-txt.csv'].map((name) => `${crypto.createHash('sha256').update(fs.readFileSync(`coordinate-output/${name}`)).digest('hex')}  ${name}`);
fs.writeFileSync('coordinate-output/SHA256-after-txt.txt', sums.join('\n') + '\n');
console.log(JSON.stringify(stats));
