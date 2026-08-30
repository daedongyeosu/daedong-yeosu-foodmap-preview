import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync('store-service-info.css', 'utf8');
const service = fs.readFileSync('store-service-info.js', 'utf8');
const menu = fs.readFileSync('store-menu-preview.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const storeNameRule = css.match(/\.store-service-overview-card-main strong \{([\s\S]*?)\}/)?.[1] || '';
assert.match(storeNameRule, /white-space:\s*normal/,
  '통합검색 가게명은 한 줄 말줄임이 아니라 전체 이름을 표시해야 합니다.');
assert.match(storeNameRule, /overflow-wrap:\s*anywhere/,
  '긴 가게명도 카드 폭 안에서 줄바꿈되어야 합니다.');
assert.doesNotMatch(storeNameRule, /text-overflow:\s*ellipsis|white-space:\s*nowrap|-webkit-line-clamp/,
  '통합검색 가게명에 말줄임 또는 줄 수 제한을 다시 넣으면 안 됩니다.');

assert.match(menu, /if \(wasOpen\) document\.dispatchEvent\(new CustomEvent\('daedong:menu-preview-closed'\)\)/,
  '음식 미리보기가 닫히면 부모 검색 화면에 복귀 신호를 보내야 합니다.');
assert.match(service, /document\.addEventListener\('daedong:menu-preview-closed',[\s\S]*?history\.state\?\.\[HISTORY_KEY\][\s\S]*?overviewSuspendedForChild[\s\S]*?resumeOverviewAfterChild\(\)/,
  '통합검색에서 연 음식 미리보기를 닫으면 기존 검색 결과를 복원해야 합니다.');
assert.match(html, /store-service-info\.css\?v=[^"\n]*full-store-name-1/,
  '전체 가게명 CSS가 모바일 캐시에 즉시 반영되어야 합니다.');
assert.match(html, /store-service-info\.js\?v=[^"\n]*menu-return-1/,
  '검색 결과 복귀 코드가 모바일 캐시에 즉시 반영되어야 합니다.');
assert.match(html, /store-menu-preview\.js\?v=[^"\n]*search-return-1/,
  '음식 미리보기 닫기 신호가 모바일 캐시에 즉시 반영되어야 합니다.');

console.log('store service menu return regression: PASS');
