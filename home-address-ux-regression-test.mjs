import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const addressMap = fs.readFileSync(new URL('./rc7-address-map.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const style = fs.readFileSync(new URL('./store-service-info.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

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

const shortAddressSource = extractFunction(app, 'shortAddress');
const shortAddress = new Function(
  'neighborhoodFor',
  `${shortAddressSource}; return shortAddress;`
)(value => ['신기동', '여서동', '학동'].find(area => String(value).includes(area)) || '');

assert.equal(
  shortAddress('전남광주통합특별시 여수시 신기동 쌍봉로 1', '신기동'),
  '여수시 신기동'
);
assert.equal(
  shortAddress('전라남도 여수시 학동 쌍봉로 1', '학동'),
  '여수시 학동'
);
assert.equal(shortAddress('여수시 전체', '여수시 전체'), '여수시 전체');
assert.doesNotMatch(shortAddress('전남광주통합특별시 여수시 웅천로 1'), /전남광주/);

assert.match(app, /shortAddress\(item\.label,item\.area\)/);
assert.match(app, /shortAddress\(state\.addressLabel \|\| state\.location, state\.location\)/);
assert.match(addressMap, /shortAddress\(label, state\.location\)/);

assert.doesNotMatch(service, /data-store-service-address-change/);
assert.doesNotMatch(service, />주소 변경<\/button>/);
assert.match(service, /`\$\{location\} 기준 · 가까운 순`/);
assert.match(style, /grid-template-columns:\s*auto minmax\(0, 1fr\);/);
assert.doesNotMatch(style, /\.store-finder-location button/);

assert.match(html, /home-address-short-1/);
assert.match(html, /store-service-15-single-address-control-1/);

console.log('home address UX regression checks passed');
