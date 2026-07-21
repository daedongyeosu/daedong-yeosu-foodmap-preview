import fs from 'node:fs';
import crypto from 'node:crypto';

const key = process.env.KAKAO_REST_API_KEY;
if (!key) throw new Error('KAKAO_REST_API_KEY is not configured');
const stores = JSON.parse(fs.readFileSync('data/stores.json', 'utf8'));
const base = JSON.parse(fs.readFileSync('data/coordinate-review/store-coordinates.json', 'utf8'));
const excel = JSON.parse(fs.readFileSync('data/coordinate-source/excel-naver-address-source.json', 'utf8'));
const priorReasons = JSON.parse(fs.readFileSync('data/coordinate-source/unresolved-after-onenote-reasons.json', 'utf8'));
const normal = stores.filter((s) => String(s.name || '').trim() && String(s.name).trim() !== '제목 없음');
if (stores.length !== 471 || normal.length !== 470 || Object.keys(base).length !== 470) throw new Error('Unexpected baseline counts');

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
const haversine = (a, b) => {
  const rad = (v) => v * Math.PI / 180, R = 6371000;
  const dLat = rad(b.latitude - a.latitude), dLon = rad(b.longitude - a.longitude);
  const q = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.latitude)) * Math.cos(rad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(q));
};
const csv = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };

const result = structuredClone(base);
const detail = [];
const conflicts = [];
let multipleResults = 0, extractionFailed = 0, outsideYeosu = 0, added = 0;
for (const s of normal) {
  const evidence = excel[s.id];
  if (!evidence) { detail.push({ store_id: s.id, name: s.name, baselineStatus: base[s.id].status, excelStatus: 'no-match' }); continue; }
  const inputAddress = evidence.roadAddress || evidence.jibunAddress || '';
  const docs = inputAddress ? await addressSearch(inputAddress) : [];
  const candidates = [...new Map(docs.map((d) => {
    const matchedAddress = d.road_address?.address_name || d.address?.address_name || d.address_name || '';
    return [`${Number(d.y).toFixed(7)},${Number(d.x).toFixed(7)}`, { latitude: Number(d.y), longitude: Number(d.x), matchedAddress }];
  })).values()];
  const yeosu = candidates.filter((x) => /여수시/.test(x.matchedAddress));
  let status = 'verified';
  if (!candidates.length) { status = 'address-extraction-failed'; extractionFailed++; }
  else if (yeosu.length !== 1) { status = yeosu.length > 1 ? 'multiple-results' : 'outside-yeosu'; if (yeosu.length > 1) multipleResults++; else outsideYeosu++; }
  const chosen = status === 'verified' ? yeosu[0] : null;
  if (base[s.id].status === 'verified') {
    if (chosen) {
      const distanceMeters = haversine(base[s.id], chosen);
      if (distanceMeters > 100) conflicts.push({ store_id: s.id, store_name: s.name, existing_address: base[s.id].matchedAddress || '', existing_latitude: base[s.id].latitude, existing_longitude: base[s.id].longitude, excel_naver_url: evidence.naverMapUrl, excel_address: inputAddress, conflict_reason: `기존 좌표와 엑셀 주소 좌표가 약 ${Math.round(distanceMeters)}m 차이`, recommended_action: '기존 좌표와 네이버 장소 페이지를 수동 대조' });
    }
    detail.push({ store_id: s.id, name: s.name, baselineStatus: 'verified', excelStatus: status });
  } else if (chosen) {
    result[s.id] = { latitude: chosen.latitude, longitude: chosen.longitude, source: 'excel-naver-map', sourceSheet: evidence.sourceSheet, naverMapUrl: evidence.naverMapUrl, inputAddress, matchedAddress: chosen.matchedAddress, status: 'verified', confidence: 'exact' };
    added++;
    detail.push({ store_id: s.id, name: s.name, baselineStatus: base[s.id].status, excelStatus: 'verified', matchedAddress: chosen.matchedAddress });
  } else {
    result[s.id] = { ...base[s.id], latitude: null, longitude: null };
    detail.push({ store_id: s.id, name: s.name, baselineStatus: base[s.id].status, excelStatus: status });
  }
  await sleep(60);
}

const coordGroups = new Map();
for (const s of normal.filter((x) => result[x.id].status === 'verified')) {
  const c = result[s.id], k = `${c.latitude.toFixed(7)},${c.longitude.toFixed(7)}`;
  if (!coordGroups.has(k)) coordGroups.set(k, []);
  coordGroups.get(k).push({ store_id: s.id, name: s.name, matchedAddress: c.matchedAddress });
}
const duplicateCoordinates = [...coordGroups.entries()].filter(([, rows]) => rows.length > 1).map(([coordinate, rows]) => ({ coordinate, stores: rows }));
const addressGroups = new Map();
for (const s of normal.filter((x) => result[x.id].status === 'verified')) {
  const c = result[s.id], k = String(c.matchedAddress || '').replace(/\s+/g, ' ').trim();
  if (!k) continue; if (!addressGroups.has(k)) addressGroups.set(k, []);
  addressGroups.get(k).push({ store_id: s.id, name: s.name, latitude: c.latitude, longitude: c.longitude });
}
const sharedAddresses = [...addressGroups.entries()].filter(([, rows]) => rows.length > 1).map(([address, rows]) => ({ address, stores: rows }));
const naverGroups = new Map();
for (const [id, e] of Object.entries(excel)) { if (!naverGroups.has(e.naverMapUrl)) naverGroups.set(e.naverMapUrl, []); naverGroups.get(e.naverMapUrl).push({ store_id: id, name: normal.find((s) => s.id === id)?.name || '' }); }
const sharedNaverUrls = [...naverGroups.entries()].filter(([, rows]) => rows.length > 1).map(([url, rows]) => ({ url, stores: rows }));
const stats = { target: 470, baselineVerified: Object.values(base).filter((x) => x.status === 'verified').length, excelSourceMatches: Object.keys(excel).length, excelMatchedUnresolved: normal.filter((s) => base[s.id].status !== 'verified' && excel[s.id]).length, excelVerifiedAdded: added, multipleResults, addressExtractionFailed: extractionFailed, outsideYeosu, existingConflicts: conflicts.length, finalVerified: Object.values(result).filter((x) => x.status === 'verified').length, finalUnresolved: Object.values(result).filter((x) => x.status !== 'verified').length, duplicateCoordinateGroups: duplicateCoordinates.length, sharedAddressGroups: sharedAddresses.length, sharedNaverUrlGroups: sharedNaverUrls.length, excludedUntitled: 1 };
fs.mkdirSync('coordinate-output', { recursive: true });
fs.writeFileSync('coordinate-output/store-coordinates.json', JSON.stringify(result, null, 2) + '\n');
fs.writeFileSync('coordinate-output/coordinate-validation.json', JSON.stringify({ stats, conflicts, duplicateCoordinates, sharedAddresses, sharedNaverUrls, stores: detail }, null, 2) + '\n');
const conflictHeaders = ['store_id','store_name','existing_address','existing_latitude','existing_longitude','excel_naver_url','excel_address','conflict_reason','recommended_action'];
fs.writeFileSync('coordinate-output/coordinate-existing-conflicts-after-excel.csv', [conflictHeaders.join(','), ...conflicts.map((r) => conflictHeaders.map((h) => csv(r[h])).join(','))].join('\n') + '\n');
const unresolvedHeaders = ['store_id','store_name','neighborhood','excel_sheet','excel_naver_url_exists','extracted_address','kakao_query','unresolved_reason','recommended_action'];
const unresolvedRows = normal.filter((s) => result[s.id].status !== 'verified').map((s) => {
  const e = excel[s.id]; const d = detail.find((x) => x.store_id === s.id);
  let reason = priorReasons[s.id]?.unresolvedReason || '기타 오류';
  let action = priorReasons[s.id]?.recommendedAction || '원본 자료 수동 검수';
  if (d?.excelStatus === 'multiple-results') { reason = '검색 결과가 여러 개라 자동 확정 불가'; action = '카카오 주소 후보와 네이버 장소를 수동 대조'; }
  if (d?.excelStatus === 'address-extraction-failed') { reason = '주소 문구는 있으나 카카오 주소검색 결과 없음'; action = '도로명·지번주소를 수동 확인'; }
  if (d?.excelStatus === 'outside-yeosu') { reason = '여수 외 좌표'; action = '다른 지점 또는 잘못된 링크 여부 수동 확인'; }
  return { store_id: s.id, store_name: s.name, neighborhood: s.district || '', excel_sheet: e?.sourceSheet || '', excel_naver_url_exists: e?.naverMapUrl ? 'yes' : 'no', extracted_address: e?.roadAddress || e?.jibunAddress || '', kakao_query: e?.roadAddress || e?.jibunAddress || `${s.name} ${s.district || ''}`.trim(), unresolved_reason: reason, recommended_action: action };
});
fs.writeFileSync('coordinate-output/coordinate-unresolved-after-excel.csv', [unresolvedHeaders.join(','), ...unresolvedRows.map((r) => unresolvedHeaders.map((h) => csv(r[h])).join(','))].join('\n') + '\n');
const duplicateCoordinateRows = duplicateCoordinates.flatMap((g) => g.stores.map((s) => ({ coordinate: g.coordinate, store_id: s.store_id, store_name: s.name, matched_address: s.matchedAddress })));
const duplicateCoordinateHeaders = ['coordinate','store_id','store_name','matched_address'];
fs.writeFileSync('coordinate-output/coordinate-duplicate-coordinates-after-excel.csv', [duplicateCoordinateHeaders.join(','), ...duplicateCoordinateRows.map((r) => duplicateCoordinateHeaders.map((h) => csv(r[h])).join(','))].join('\n') + '\n');
const sharedAddressRows = sharedAddresses.flatMap((g) => g.stores.map((s) => ({ address: g.address, store_id: s.store_id, store_name: s.name, latitude: s.latitude, longitude: s.longitude })));
const sharedAddressHeaders = ['address','store_id','store_name','latitude','longitude'];
fs.writeFileSync('coordinate-output/coordinate-shared-addresses-after-excel.csv', [sharedAddressHeaders.join(','), ...sharedAddressRows.map((r) => sharedAddressHeaders.map((h) => csv(r[h])).join(','))].join('\n') + '\n');
const sharedNaverRows = sharedNaverUrls.flatMap((g) => g.stores.map((s) => ({ naver_map_url: g.url, store_id: s.store_id, store_name: s.name })));
const sharedNaverHeaders = ['naver_map_url','store_id','store_name'];
fs.writeFileSync('coordinate-output/coordinate-shared-naver-links-after-excel.csv', [sharedNaverHeaders.join(','), ...sharedNaverRows.map((r) => sharedNaverHeaders.map((h) => csv(r[h])).join(','))].join('\n') + '\n');
const sha = crypto.createHash('sha256').update(fs.readFileSync('coordinate-output/store-coordinates.json')).digest('hex');
fs.writeFileSync('coordinate-output/SHA256.txt', `${sha}  store-coordinates.json\n`);
console.log(JSON.stringify(stats));
