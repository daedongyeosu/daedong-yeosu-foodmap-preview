import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('./store-menu-preview.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const popstate = source.match(/window\.addEventListener\('popstate', event => \{([\s\S]*?)\n  \}, true\);/)?.[1] || '';

assert.match(popstate, /if \(sheet && !sheet\.hidden\) \{[\s\S]*closeMenuOrderSheet\(preview\);[\s\S]*event\.stopImmediatePropagation\(\);[\s\S]*return;/,
  '브라우저 뒤로가기는 열린 주문방법 팝업만 닫고 즉시 처리를 끝내야 합니다.');
assert.match(popstate, /if \(preview\.classList\.contains\('menu-search-active'\)\) \{[\s\S]*exitMenuSearch\(preview\);[\s\S]*return;/,
  '주문방법 팝업이 없을 때만 메뉴 검색 단계를 닫아야 합니다.');
assert.ok(popstate.indexOf('closeMenuOrderSheet(preview)') < popstate.indexOf("if (!event.state?.[MENU_HISTORY.preview])"),
  '주문방법 팝업 처리가 음식 미리보기 이력 처리보다 우선해야 합니다.');
assert.match(html, /store-menu-preview\.js\?v=[^"\s]*order-back-layer-1/);

console.log('menu order sheet browser back regression: PASS');
