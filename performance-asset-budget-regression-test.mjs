import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const menu = fs.readFileSync(new URL('./store-menu-preview.js', import.meta.url), 'utf8');

assert.doesNotMatch(html, /rel="preload"[^>]+images\/01\.png/,
  '현재 홈에서 사용하지 않는 1MB 이미지를 선다운로드하면 안 됩니다.');
assert.match(html, /data-deferred-src="images\/burgerking\.png"[^>]+loading="lazy"[^>]+decoding="async"/,
  '화면 아래 브랜드 아이콘은 가게목록 뒤에 지연 로딩해야 합니다.');
assert.match(html, /data-deferred-src="assets\/ondongne\.png"[^>]+loading="lazy"[^>]+decoding="async"/,
  '화면 아래 주문앱 아이콘은 가게목록 뒤에 지연 로딩해야 합니다.');
assert.match(app, /function hydrateDeferredHomeImages\(\)[\s\S]*image\.src = image\.dataset\.deferredSrc/);
assert.match(app, /finishCatalogReady\(result\);\s*window\.setTimeout\(hydrateDeferredHomeImages, 6000\)/,
  '지연 이미지는 반드시 가게목록을 먼저 표시한 뒤 요청해야 합니다.');
assert.match(menu, /const menu = await loadMenu\(storeId\)/);
assert.doesNotMatch(menu, /loadMenu\(storeId\)[\s\S]{0,160}daedongStoreServiceInfo\?\.ready/,
  '메뉴 본문은 큰 영업정보 전체 다운로드를 기다리면 안 됩니다.');

console.log('PASS: 초기 화면의 불필요한 대형 자산을 막고 주문앱 아이콘 용량 예산을 지킵니다.');
