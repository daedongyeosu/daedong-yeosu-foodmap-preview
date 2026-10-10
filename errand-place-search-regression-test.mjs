import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html = await readFile(new URL('./errand/index.html', import.meta.url), 'utf8');
const app = await readFile(new URL('./errand/app.js', import.meta.url), 'utf8');
const css = await readFile(new URL('./errand/styles.css', import.meta.url), 'utf8');

assert.match(html, /data-place-query="pickup"/, '픽업 장소명 검색창이 있어야 합니다.');
assert.match(html, /data-place-query="dropoff"/, '도착 장소명 검색창이 있어야 합니다.');
assert.match(html, /data-address-open="pickup"/, '공식 도로명주소 검색 대안이 유지되어야 합니다.');
assert.match(html, /여수맛지도에 등록된 모든 가게를 검색/, '일부 브랜드 전용이 아닌 전체 가게 검색임을 안내해야 합니다.');

assert.match(app, /ERRAND_CATALOG_ENDPOINT/, '전체 가게 카탈로그를 사용해야 합니다.');
assert.match(app, /ERRAND_CATALOG_FALLBACK/, '전체 가게 API 장애 때 사용할 검색 안전망이 있어야 합니다.');
assert.match(app, /store-coordinates\.json/, '검증된 주소 자료를 대조해야 합니다.');
assert.match(app, /replace\(\/bbq\/g,'비비큐'\)/, 'BBQ와 비비큐 표기를 같은 검색어로 처리해야 합니다.');
assert.match(app, /catalog\.filter\(place=>place\.searchText\.includes\(query\)\)/, '검색어를 하드코딩하지 않고 전체 카탈로그에서 찾아야 합니다.');
assert.match(app, /place\.address\?selectCatalogPlace\(kind,place\):openPostcode\(kind\)/, '주소 미검증 가게는 공식 주소검색으로 보내야 합니다.');
assert.match(app, /placeName:place\.name/, '선택한 가게명이 주문 주소 데이터에 보존되어야 합니다.');

assert.match(css, /\.place-search-box input\{[^}]*font-size:16px/, '아이폰에서도 검색 입력 글자가 읽을 수 있는 크기여야 합니다.');
assert.match(css, /\.place-result b\{font-size:16px/, '검색 결과 가게명이 충분히 크게 보여야 합니다.');

console.log('errand place search regression test passed');
