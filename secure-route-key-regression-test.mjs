import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.notEqual(start, -1, `${name} 함수가 있어야 합니다.`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') depth -= 1;
    if (depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} 함수 끝을 찾지 못했습니다.`);
}

const context = {
  APP_META: {
    online_store: {}, phone: {}, naver: {}, mukkebi: {}, brand: {}
  },
  normalize: value => String(value || '').normalize('NFKC').toLowerCase()
};
vm.createContext(context);
vm.runInContext(`${extractFunction(app, 'routeKey')}; ${extractFunction(app, 'canonicalRouteKey')}; this.canonical = canonicalRouteKey;`, context);

assert.equal(context.canonical({key: 'online_store', name: '맛지도에서 배달 주문'}), 'online_store');
assert.equal(context.canonical({key: 'naver', name: '네이버지도'}), 'naver');
assert.equal(context.canonical({key: 'phone', name: '전화로 배달·예약'}), 'phone');
assert.equal(context.canonical({key: 'unknown', name: '먹깨비 주문'}), 'mukkebi');
assert.match(app, /const key = canonicalRouteKey\(route\)/);
assert.match(html, /app\.js\?v=[^\"]*secure-route-key-1/);

console.log('secure route key regression: PASS');
