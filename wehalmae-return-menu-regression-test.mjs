import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const dataApi = fs.readFileSync('data-api.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const menu = JSON.parse(fs.readFileSync('data/wehalmae-yeoseo-menu.json', 'utf8'));

assert.match(app, /function hardClose\(\{fromPop = false, userInitiated = false\} = \{\}\)/);
assert.match(app, /selector: '#modal \.modal-close'[\s\S]{0,180}hardClose\(\{userInitiated: true\}\)/,
  '사용자가 직접 누른 닫기와 주문앱 이동 중 내부 닫기를 구분해야 합니다.');
assert.match(dataApi, /'34817ff59a6bc66d': 'data\/wehalmae-yeoseo-menu\.json\?v=wehalmae-menu-preview-1'/);
assert.equal(menu.storeId, '34817ff59a6bc66d');
assert.equal(menu.storeName, '우리할매떡볶이 여서점');
assert.ok(menu.items.length >= 15, '공식 브랜드 메뉴를 충분히 미리볼 수 있어야 합니다.');
assert.ok(menu.items.every(item => item.name && item.category && !('price' in item)), '가격은 노출하지 않습니다.');
assert.ok(menu.items.some(item => item.name === '가래떡떡볶이'));
assert.equal(menu.source.url, 'https://wehalmae.co.kr/');
assert.match(html, /data-api\.js\?v=[^"\n]*wehalmae-menu-20260919/);
assert.match(html, /app\.js\?v=[^"\n]*explicit-store-dismiss-20260919/);

console.log('wehalmae-return-menu-regression-test: pass');
