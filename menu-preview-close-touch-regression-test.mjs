import assert from 'node:assert/strict';
import fs from 'node:fs';

const menu = fs.readFileSync('store-menu-preview.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const browserTest = fs.readFileSync('scripts/browser-menu-preview-close-touch.mjs', 'utf8');
const workflow = fs.readFileSync('.github/workflows/preview-api-client-checks.yml', 'utf8');

assert.equal((menu.match(/data-menu-preview-close aria-label="메뉴 미리보기 닫기"/g) || []).length, 2,
  '왼쪽 화살표와 오른쪽 X가 같은 메뉴 닫기 계약을 유지해야 합니다.');
assert.match(menu, /addEventListener\('touchstart', onMenuCloseTouchStart, \{capture: true, passive: true\}\)/,
  '카카오톡 안드로이드 웹뷰용 터치 시작 대체 경로가 필요합니다.');
assert.match(menu, /addEventListener\('touchend', onMenuCloseTouchEnd, \{capture: true, passive: false\}\)/,
  'pointer 이벤트가 누락돼도 실제 터치 종료에서 메뉴를 닫아야 합니다.');
assert.match(menu, /Math\.hypot\([\s\S]*?\) > 10\) state\.moved = true/,
  '스크롤 동작을 메뉴 닫기 터치로 오인하면 안 됩니다.');
assert.match(menu, /document\.elementFromPoint\(touch\.clientX, touch\.clientY\)/,
  '터치 종료 위치에서 닫기 버튼을 다시 확인해야 합니다.');
assert.match(menu, /menuCloseActivatedAt > 0 && now - menuCloseActivatedAt < 700/,
  'pointerdown·touchend·click이 연달아 발생해 가게 상세까지 닫히면 안 됩니다.');
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*kakao-touch-close-1/,
  '카카오톡 웹뷰가 수정된 메뉴 코드를 즉시 받도록 캐시 키를 갱신해야 합니다.');
assert.match(browserTest, /KAKAOTALK/);
assert.match(browserTest, /for \(const \{index, label\} of closeButtons\)/,
  '왼쪽 화살표와 오른쪽 X를 각각 모바일 브라우저에서 검사해야 합니다.');
assert.match(workflow, /Verify menu preview close mobile touch in current PR[\s\S]*browser-menu-preview-close-touch\.mjs/,
  'PR에서 실제 모바일 메뉴 닫기 검사를 실행해야 합니다.');

console.log('menu-preview-close-touch-regression-test: pass');
