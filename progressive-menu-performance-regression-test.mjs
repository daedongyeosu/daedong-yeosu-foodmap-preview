import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const menu = fs.readFileSync('store-menu-preview.js', 'utf8');
const menuStyle = fs.readFileSync('store-menu-preview.css', 'utf8');
const rc4 = fs.readFileSync('rc4-fixes.js', 'utf8');

assert.match(menu, /const INITIAL_MENU_RENDER_COUNT = 12/);
assert.match(menu, /menu\.items\.slice\(0, INITIAL_MENU_RENDER_COUNT\)\.map\(item => menuCardMarkup\(item\)\)/,
  '메뉴 전체를 첫 화면에서 한꺼번에 DOM으로 만들면 안 됩니다.');
assert.match(menu, /requestIdleCallback\(callback, \{timeout: 180\}\)/,
  '나머지 메뉴 렌더링은 브라우저 유휴 시간으로 분할해야 합니다.');
assert.match(menu, /menuRenderObserver = new IntersectionObserver[\s\S]*rootMargin: '900px 0px'/,
  '남은 메뉴 카드는 사용자가 목록 아래쪽에 접근할 때만 추가해야 합니다.');
assert.match(menu, /addEventListener\('pointerdown'[\s\S]*data-menu-preview-close[\s\S]*requestCloseMenuPreview\(\)/,
  '메뉴 닫기 버튼은 click을 기다리지 말고 터치 시작 즉시 닫혀야 합니다.');
assert.match(menu, /data-menu-image-src=/);
assert.match(menu, /const MAX_CONCURRENT_MENU_IMAGE_LOADS = 2/,
  '메뉴 사진을 한꺼번에 너무 많이 받아 터치를 막으면 안 됩니다.');
assert.match(menu, /new IntersectionObserver[\s\S]*rootMargin: '160px 0px'/,
  '메뉴 사진은 스크롤 근처에 도달할 때만 불러와야 합니다.');
assert.match(menu, /resetMenuImageLoading\(\{cancelActive: true\}\)/,
  '메뉴를 닫으면 보이지 않는 사진 로딩도 취소해야 합니다.');
assert.match(menuStyle, /content-visibility: auto/);
assert.match(menuStyle, /contain-intrinsic-size: auto 360px/);

assert.doesNotMatch(html, /<script\s+src="https:\/\/js\.sentry-cdn\.com\//,
  'Sentry Replay를 HTML 파싱 전에 동기 실행하면 안 됩니다.');
assert.match(html, /setTimeout\([\s\S]*requestIdleCallback\(loadSentry, \{timeout: 4000\}\)[\s\S]*30000\)/,
  '모니터링은 초기 터치 구간이 지난 뒤 유휴 시간에 시작해야 합니다.');
assert.doesNotMatch(rc4, /function rc4InstallEvents\(\)\{[^\n]*rc4LoadPostcode\(\)\.catch/,
  '주소검색 외부 모듈은 사용자가 주소검색을 누르기 전에 받으면 안 됩니다.');
assert.match(html, /store-menu-preview\.css\?v=[^"\n]*progressive-render-1/);
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*progressive-render-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*postcode-on-demand-1/);

console.log('progressive menu performance regression: PASS');
