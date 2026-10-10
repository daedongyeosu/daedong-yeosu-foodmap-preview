import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./errand/index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('./errand/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('./errand/styles.css', import.meta.url), 'utf8');

assert.match(html, /data-place-query="pickup"/, '픽업 장소명 검색창이 있어야 합니다.');
assert.match(html, /data-place-query="dropoff"/, '도착 장소명 검색창이 있어야 합니다.');
assert.match(html, /data-address-open="pickup"/, '공식 도로명주소 검색 대안이 유지되어야 합니다.');
assert.match(html, /카카오 공식 장소검색에서 여수의 가게·시설을 찾습니다/, '장소 결과의 공식 출처를 고객에게 안내해야 합니다.');

assert.match(app, /dapi\.kakao\.com\/v2\/maps\/sdk\.js/, '카카오 지도 JavaScript SDK를 불러와야 합니다.');
assert.match(app, /libraries=services&autoload=false/, '장소검색 라이브러리를 명시적으로 사용해야 합니다.');
assert.match(app, /places\.keywordSearch\(keyword/, '임의 카탈로그가 아니라 카카오 공식 장소검색을 사용해야 합니다.');
assert.match(app, /data\.filter\(isYeosuPlace\)/, '여수시 주소의 장소만 결과로 표시해야 합니다.');
assert.match(app, /placeName:String\(place\.place_name/, '카카오가 반환한 가게명이 주문 주소 데이터에 보존되어야 합니다.');
assert.match(app, /placeId:String\(place\.id/, '카카오 장소 ID가 주문 주소 데이터에 보존되어야 합니다.');
assert.match(app, /addressSource:'kakao_places'/, '카카오 장소검색 출처가 주문 주소 데이터에 표시되어야 합니다.');
assert.doesNotMatch(app, /ERRAND_CATALOG_(?:ENDPOINT|FALLBACK)/, '내부 가게목록을 공식 주소처럼 사용하면 안 됩니다.');
assert.doesNotMatch(app, /store-coordinates\.json/, '내부 좌표 자료를 공식 주소처럼 사용하면 안 됩니다.');

assert.match(css, /\.place-search-box input\{[^}]*font-size:16px/, '아이폰에서도 검색 입력 글자가 읽을 수 있는 크기여야 합니다.');
assert.match(css, /\.place-result b\{font-size:16px/, '검색 결과 가게명이 충분히 크게 보여야 합니다.');

console.log('errand place search regression test passed');
