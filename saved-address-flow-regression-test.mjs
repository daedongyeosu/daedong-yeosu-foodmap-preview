import assert from 'node:assert/strict';
import fs from 'node:fs';

const addressMap = fs.readFileSync(new URL('./rc7-address-map.js', import.meta.url), 'utf8');
const style = fs.readFileSync(new URL('./rc7-address-map.css', import.meta.url), 'utf8');
const loader = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} 함수가 있어야 합니다.`);
  const bodyStart = source.indexOf(') {', start) + 2;
  assert.ok(bodyStart > 1, `${name} 함수 본문을 찾아야 합니다.`);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} 함수 끝을 찾지 못했습니다.`);
}

const localAddressSource = extractFunction(addressMap, 'localAddress');
const conciseAddressSource = extractFunction(addressMap, 'conciseAddress');
const savedAddressTitleSource = extractFunction(addressMap, 'savedAddressTitle');
const localAddress = new Function(`${localAddressSource}; return localAddress;`)();
const neighborhoodFor = value => ['학동', '둔덕동', '여서동'].find(area => String(value || '').includes(area)) || '';
const addressArea = item => neighborhoodFor(item.area) || neighborhoodFor(item.region3) || neighborhoodFor(item.address) || '';
const conciseAddress = new Function('addressArea', 'localAddress', `${conciseAddressSource}; return conciseAddress;`)(addressArea, localAddress);
const savedAddressTitle = new Function('addressArea', 'conciseAddress', `${savedAddressTitleSource}; return savedAddressTitle;`)(addressArea, conciseAddress);

assert.equal(conciseAddress({address: '전남광주통합특별시 여수시 학동 망마로 49'}), '학동 · 망마로 49');
assert.equal(savedAddressTitle({nickname: '우리집', address: '전라남도 여수시 둔덕동 쌍봉로 1'}), '우리집 · 둔덕동');

const modalSource = extractFunction(addressMap, 'addressModal');
assert.ok(modalSource.indexOf('저장된 주소') < modalSource.indexOf('새 주소 등록'), '저장 주소가 새 주소 등록보다 먼저 보여야 합니다.');
assert.ok(modalSource.indexOf('새 주소 등록') < modalSource.indexOf('data-rc7-step="map"'), '주소 검색 다음에 지도 확인 단계가 있어야 합니다.');
assert.match(modalSource, /data-rc7-step="map" hidden/);
assert.match(modalSource, /data-rc7-step="detail" hidden/);
assert.match(modalSource, /data-rc7-nickname="우리집"/);
assert.match(modalSource, /data-rc7-nickname="회사"/);

const selectSavedSource = extractFunction(addressMap, 'selectSavedAddress');
assert.match(selectSavedSource, /activateAddress\(item\)/);
assert.doesNotMatch(selectSavedSource, /openMapStep|scrollTo/);

const confirmMapSource = extractFunction(addressMap, 'confirmMapPosition');
assert.match(confirmMapSource, /searchedArea/);
assert.match(confirmMapSource, /mapArea/);
assert.match(confirmMapSource, /mismatch/);
assert.match(addressMap, /지도 핀은/);
assert.match(addressMap, /nominatim\.openstreetmap\.org\/search/);
assert.match(addressMap, /mapVerified/);

const chooseAddressSource = extractFunction(addressMap, 'chooseAddress');
assert.match(chooseAddressSource, /detail: draftValue\('detail'\)/);
assert.match(chooseAddressSource, /nickname: draftValue\('nickname'\)/);
assert.match(addressMap, /coords: null,\s*detail: '',\s*nickname: ''/);

assert.match(style, /\.rc7-saved-first \.rc7-saved-list\{max-height:none;overflow:visible\}/);
assert.match(style, /\.rc7-saved-select\{[^}]*min-height:90px/);
assert.match(style, /\.rc7-saved-copy small\{[^}]*-webkit-line-clamp:2/);
assert.match(loader, /saved-address-first-1/);
assert.match(html, /saved-address-first-1/);

console.log('saved address flow regression checks passed');
