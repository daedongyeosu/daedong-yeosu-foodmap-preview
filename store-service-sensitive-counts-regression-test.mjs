import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(runtime, /\['open', '지금 영업 중', counts\.openNow\]/);
assert.match(runtime, /\['closing-soon', '곧 종료', counts\['closing-soon'\]\]/);
assert.match(runtime, /\['closed', '영업 종료', null\]/);
assert.match(runtime, /\['unknown', '시간 미확인', null\]/);

assert.match(runtime, /activeStatus === 'open'\) return `지금 영업 중 \$\{entries\.length\}곳`/);
assert.match(runtime, /activeStatus === 'closing-soon'\) return `곧 종료 \$\{entries\.length\}곳`/);
assert.match(runtime, /activeStatus === 'closed'\) return '영업 종료 가게'/);
assert.match(runtime, /activeStatus === 'unknown'\) return '영업시간 미확인 가게'/);
assert.doesNotMatch(runtime, /`영업 종료[^`]*\$\{entries\.length\}/);
assert.doesNotMatch(runtime, /`영업시간 미확인[^`]*\$\{entries\.length\}/);

assert.doesNotMatch(runtime, /data-store-service-source-count/);
assert.match(runtime, /renderedSourceCount !== sourceStores\(\)\.length/);
assert.match(html, /store-service-25-menu-search-status-order-1[^"'\n]*seomseom-merchant-label-1/);
assert.match(runtime, /benefit\?\.key === 'yeosu-seomseom-pay'/);
assert.match(runtime, /return '먹깨비·땡겨요'/);
assert.match(runtime, /여수섬섬페이 가맹점/);
assert.doesNotMatch(runtime, /여수섬섬페이 사용 가능 확인/);

console.log('PASS: 민감 가게 수는 숨기고 여수섬섬페이는 먹깨비·땡겨요 가맹점으로 표시');
