import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const menu = fs.readFileSync('store-menu-preview.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(app, /function suppressNextModalPop\(\)[\s\S]*ignoreNextPop \+= 1/,
  '메뉴 이력 정리 중 상세 팝업이 함께 닫히지 않도록 popstate 억제 기능이 필요합니다.');
assert.match(app, /if\(ignoreNextPop>0\)\{ignoreNextPop-=1;return;\}/,
  '억제할 popstate는 정확히 한 번씩 소비해야 합니다.');
assert.match(app, /modalCloseButton\.addEventListener\('pointerdown',[\s\S]*?hardClose\(\);/,
  '상세창 닫기는 모바일 pointerdown 순간 바로 처리해야 합니다.');
assert.match(app, /if \(typeof rc2ReplaceModal === 'function'\) rc2ReplaceModal\(\);\s*openModal\(`<article class="store-detail"/,
  '상세 로딩 뼈대에서 완성 화면으로 바뀔 때 뒤로가기 스택을 추가하면 안 됩니다.');
assert.match(menu, /function requestCloseMenuPreview\(\)[\s\S]*closeMenuPreview\(\);[\s\S]*history\.go\(-depth\)/,
  '메뉴 닫기는 이력 이동을 기다리지 않고 화면부터 즉시 닫아야 합니다.');
assert.match(menu, /function requestMenuLayerBack\(layer, fallback\)[\s\S]*fallback\(\);[\s\S]*history\.back\(\)/,
  '메뉴 내부 시트도 이력 이동 전에 즉시 닫혀야 합니다.');
assert.match(menu, /const menuPromise = loadMenu\(storeId\);[\s\S]*Promise\.all\(\[detailPromise, menuPromise\]\)/,
  '상세정보와 메뉴 데이터는 직렬이 아니라 병렬로 받아야 합니다.');
assert.match(html, /app\.js\?v=[^"\n]*instant-modal-close-3/);
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*parallel-load-1-instant-close-1/);

console.log('instant modal close regression: PASS');
