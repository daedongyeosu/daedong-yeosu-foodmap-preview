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
assert.match(html, /store-service-19-popup-info-first-1/);

console.log('PASS: 영업 종료·시간 미확인 숫자 비노출, 곧 종료·지금 영업 중 숫자 유지');
