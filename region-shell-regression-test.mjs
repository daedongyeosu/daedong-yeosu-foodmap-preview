import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const index = read('./index.html');
const region = read('./region-config.js');
const api = read('./data-api.js');
const app = read('./app.js');
const finalExperience = read('./final-experience.js');
const rc2 = read('./rc2-fixes.js');
const rc3 = read('./rc3-fixes.js');
const rc6 = read('./rc6-fixes.js');
const rc7 = read('./rc7-address-map.js');
const turtle = read('./turtle-ship-hero.js');
const summerEvent = read('./mukkebi-summer-event.js');
const goheung = JSON.parse(read('./data/goheung-catalog.json'));

assert.match(index, /class="yeosu-night-shell"/, '여수·고흥은 같은 홈 쉘을 사용해야 합니다.');
assert.equal((index.match(/class="order-item/g) || []).length, 7, '주문방법 7개 구조가 바뀌면 안 됩니다.');
assert.match(index, /region-config\.js[^>]+defer/, '지역 설정이 데이터 API보다 먼저 로드되어야 합니다.');
assert.ok(index.indexOf('region-config.js') < index.indexOf('data-api.js'), '지역 설정 로드 순서가 잘못되었습니다.');

assert.match(region, /requested === 'goheung' \? REGIONS\.goheung : REGIONS\.yeosu/, '기본 지역은 여수여야 합니다.');
assert.match(region, /active\.code === 'yeosu' \? key : `\$\{key\}:\$\{active\.code\}`/, '고흥 기기 저장소는 여수와 분리되어야 합니다.');
assert.match(app, /regionStorageKey\('daedongFavoriteStoresV2'\)/, '찜 정보는 지역별로 분리되어야 합니다.');
assert.match(app, /regionStorageKey\('daedongRecentStoresV2'\)/, '최근 방문은 지역별로 분리되어야 합니다.');
assert.match(app, /regionStorageKey\('daedongDeliveryAddressV2'\)/, '주소는 지역별로 분리되어야 합니다.');

assert.match(api, /IS_GOHEUNG \? '' : 'https:\/\/daedong-yeosu-data-api-preview/, '고흥에서 여수 API를 호출하면 안 됩니다.');
assert.match(api, /payload\?\.regionCode !== 'goheung'/, '고흥 자료의 지역 코드를 검증해야 합니다.');
assert.match(app, /ACTIVE_REGION\.code !== 'yeosu'\) return;/, '고흥 이용기록을 여수 분석 서버로 보내면 안 됩니다.');
assert.match(app, /notice: ACTIVE_REGION\.code === 'yeosu'/, '여수 소상공인 링크를 고흥 소식에 노출하면 안 됩니다.');
assert.match(finalExperience, /FX_YEOSU_ONLY_DATA_PATHS/, '고흥에서 여수 보조자료 호출을 차단해야 합니다.');
assert.match(rc2, /RC2_IS_GOHEUNG \? Promise\.resolve/, '고흥에서 여수 주문채널 보조자료를 읽으면 안 됩니다.');
assert.match(rc3, /RC3_IS_GOHEUNG \? \{stores: \[\]\}/, '고흥에서 여수 내부 전화자료를 읽으면 안 됩니다.');
assert.match(rc6, /if\(RC6_IS_GOHEUNG\)return\[\];/, '고흥 메인 슬라이드에 여수 광고를 섞으면 안 됩니다.');
assert.match(turtle, /DAEDONG_REGION\?\.code === 'goheung'\) return;/, '고흥에서 여수 거북선 연출을 실행하면 안 됩니다.');
assert.match(summerEvent, /DAEDONG_REGION\?\.code === 'goheung'/, '고흥에서 여수 먹깨비 행사를 실행하면 안 됩니다.');
assert.equal(goheung.regionCode, 'goheung');
assert.equal(goheung.storeCountVisibleToCustomers, false, '고객에게 전체 가게 수를 노출하면 안 됩니다.');
assert.deepEqual(goheung.stores, [], '검증된 고흥 수집본이 없을 때 여수 가게로 채우면 안 됩니다.');
assert.match(rc7, /DAEDONG_REGION\?\.code[^\n]+!== 'yeosu'/, '여수 전용 주소 지도는 고흥에서 실행되면 안 됩니다.');

console.log('PASS 여수 운영 기본값·고흥 공통 쉘·지역 데이터 격리');
