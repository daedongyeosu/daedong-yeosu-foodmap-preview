import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const app = read('./app.js');
const rc3 = read('./rc3-fixes.js');
const service = read('./store-service-info.js');
const menu = read('./store-menu-preview.js');
const style = read('./app.css');
const serviceStyle = read('./store-service-info.css');
const finalExperience = read('./final-experience.js');
const html = read('./index.html');

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

const openStoreSource = extractFunction(app, 'openStore');
const popupStart = openStoreSource.indexOf('openModal(`<article class="store-detail"');
const popupMarkup = openStoreSource.slice(popupStart);
const metaIndex = popupMarkup.indexOf('<div class="detail-meta-row">');
const menuIndex = popupMarkup.indexOf('${menuEntry}');
const routesIndex = popupMarkup.indexOf('<div class="detail-routes local-detail-routes">');
const actionsIndex = popupMarkup.indexOf('<div class="detail-personal-actions">');

assert.ok(metaIndex >= 0, '기본정보·지도 묶음이 최초 팝업 HTML에 있어야 합니다.');
assert.ok(metaIndex < menuIndex && menuIndex < routesIndex && routesIndex < actionsIndex,
  '최초 팝업 골격은 기본정보·지도 → 음식보기 → 주문수단 → 하단기능 순서여야 합니다.');
assert.match(app, /function storeMenuPreviewEntryMarkup\(store\)/);
assert.match(app, /store\?\.hasMenu !== true/);
assert.doesNotMatch(openStoreSource, /routeFor\(store,'chak'\).*quick\.push/);

const rc3Enhance = extractFunction(rc3, 'rc3EnhanceStoreDetail');
assert.match(rc3Enhance, /const utilities = \[channels\.utilities\.naverMap\]/);
assert.doesNotMatch(rc3Enhance, /utilities = \[[^\]]*localGiftApp/);
assert.match(rc3Enhance, /const orderAnchor = menuEntry \|\| detail\.querySelector\('\.detail-meta-row'\) \|\| gallery/);
assert.match(rc3Enhance, /\$\{direct\}\$\{apps\}\$\{community\}\$\{phone/);

const decorateDetails = extractFunction(service, 'decorateStoreDetails');
assert.match(decorateDetails, /const topStatusTarget = detail\.querySelector\('\[data-store-menu-preview\]'\)[\s\S]*?detail\.querySelector\('\.detail-routes'\)[\s\S]*?detail\.querySelector\('\.detail-personal-actions'\)/);
assert.match(decorateDetails, /topStatusTarget\.before\(topStatus\)/);
assert.match(decorateDetails, /const actionsTarget = detail\.querySelector\('\.detail-personal-actions'\)/);
assert.match(decorateDetails, /actionsTarget\.before\(panel\)/);
assert.match(service, /detailBenefitItems\(info\)\.filter\(item => item\.state === 'available'\)/);
assert.match(service, /giftAvailable && giftRoute\?\.url/);
assert.match(service, /class="store-service-gift-app-link"/);

const menuFallback = extractFunction(menu, 'ensureMenuEntryButton');
assert.match(menuFallback, /detail\.querySelector\('\[data-store-service-top-status\]'\)[\s\S]*?detail\.querySelector\('\.detail-routes'\)/);
assert.doesNotMatch(menuFallback, /detail\.querySelector\('\[data-store-service-detail\]'\)/);
assert.doesNotMatch(`${app}\n${rc3}\n${service}\n${menu}`, /daedongArrangeStoreDetail/);

assert.match(style, /\.store-modal \.modal-close\{position:absolute;/);
assert.doesNotMatch(style, /\.store-modal \.modal-close\{position:sticky;/);
assert.match(style, /\.detail-meta-row\{display:grid;/);
assert.match(style, /\.final-personal-actions \[data-share-store\]\{grid-column:1\/-1\}/);
assert.match(serviceStyle, /\.store-service-gift-app-link \{/);
assert.match(serviceStyle, /\.store-service-top-status \{/);

assert.match(finalExperience, /rc3-fixes\.js\?v=[^'\n]*store-popup-native-order-1/);
assert.match(html, /app\.css\?v=[^"\n]*store-popup-native-order-1/);
assert.match(html, /app\.js\?v=[^"\n]*store-popup-native-order-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*store-popup-native-order-1/);
assert.match(html, /store-service-info\.css\?v=store-service-11-customer-popup-order-1/);
assert.match(html, /store-service-info\.js\?v=store-service-23-customer-popup-order-1/);
assert.match(html, /store-menu-preview\.js\?v=store-menu-22-customer-popup-order-1/);

console.log('PASS: 가게 팝업 최초 생성 순서·혜택·지도·하단버튼·모바일 반복방지 유지');
