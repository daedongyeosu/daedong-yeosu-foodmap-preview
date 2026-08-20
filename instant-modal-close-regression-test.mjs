import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const menu = fs.readFileSync('store-menu-preview.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

assert.match(app, /function suppressNextModalPop\(\)[\s\S]*ignoreNextPop \+= 1/,
  '메뉴 이력 정리 중 상세 팝업이 함께 닫히지 않도록 popstate 억제 기능이 필요합니다.');
assert.match(app, /if\s*\(ignoreNextPop\s*>\s*0\)[\s\S]*ignoreNextPop\s*-=\s*1;[\s\S]*return;/,
  '억제할 popstate는 정확히 한 번씩 소비해야 합니다.');
assert.match(app, /dataset\.daedongMenuHistoryClose\s*===\s*'1'[\s\S]*delete document\.documentElement\.dataset\.daedongMenuHistoryClose;[\s\S]*return;/,
  '메뉴 이력 정리 표시는 상세 팝업 popstate보다 먼저 소비해야 합니다.');
assert.match(app, /function hardClose\([\s\S]*dataset\.daedongMenuCloseGesture\s*===\s*'1'[\s\S]*return;/,
  '메뉴 닫기 터치가 아래 상세 닫기 버튼으로 관통하면 안 됩니다.');
assert.match(app, /modalCloseButton\.addEventListener\('pointerdown',[\s\S]*?hardClose\(\);/,
  '상세창 닫기는 모바일 pointerdown 순간 바로 처리해야 합니다.');
assert.match(app, /if \(typeof rc2ReplaceModal === 'function'\) rc2ReplaceModal\(\);\s*openModal\(`<article class="store-detail"/,
  '상세 로딩 뼈대에서 완성 화면으로 바뀔 때 뒤로가기 스택을 추가하면 안 됩니다.');
assert.match(menu, /function requestCloseMenuPreview\(\)[\s\S]*closeMenuPreview\(\);[\s\S]*history\.go\(-depth\)/,
  '메뉴 닫기는 이력 이동을 기다리지 않고 화면부터 즉시 닫아야 합니다.');
assert.match(menu, /dataset\.daedongMenuHistoryClose\s*=\s*'1'[\s\S]*history\.go\(-depth\)/,
  '메뉴 닫기 이력 이동은 상세 팝업을 보존한다는 표시를 남겨야 합니다.');
assert.match(menu, /function guardMenuCloseGesture\(\)[\s\S]*dataset\.daedongMenuCloseGesture\s*=\s*'1'[\s\S]*600/,
  '메뉴 닫기 제스처에는 짧은 터치 관통 방지 구간이 필요합니다.');
assert.match(menu, /function requestMenuLayerBack\(layer, fallback\)[\s\S]*fallback\(\);[\s\S]*history\.back\(\)/,
  '메뉴 내부 시트도 이력 이동 전에 즉시 닫혀야 합니다.');
assert.match(menu, /const menuPromise = loadMenu\(storeId\);[\s\S]*Promise\.all\(\[detailPromise, menuPromise\]\)/,
  '상세정보와 메뉴 데이터는 직렬이 아니라 병렬로 받아야 합니다.');
assert.match(html, /app\.js\?v=[^"\n]*instant-modal-close-3/);
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*parallel-load-1-instant-close-1/);

console.log('instant modal close regression: PASS');
