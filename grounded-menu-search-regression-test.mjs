import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const matcher = source.match(/function entryMatchesQuery\(entry\) \{([\s\S]*?)\n  \}/)?.[1] || '';

assert.match(source, /function overviewIdentitySearchText\(entry\)/,
  '상호·브랜드·지점명 검색과 카테고리 검색을 분리해야 합니다.');
assert.match(source, /function overviewMenuContextText\(entry\)/,
  '메뉴 검색의 지역 문맥은 카테고리·태그와 분리해야 합니다.');
assert.match(matcher, /if \(identityText\.includes\(compact\)\) return true;/,
  '상호명 자체가 검색어와 일치하는 가게 검색은 유지해야 합니다.');
assert.match(matcher, /if \(spec && MENU_FAMILIES\.includes\(spec\)\) \{[\s\S]*return entry\.menuMatches\.length > 0/,
  '알려진 메뉴군 검색은 실제 메뉴 일치 근거가 있어야 합니다.');
assert.ok(matcher.indexOf('MENU_FAMILIES.includes(spec)') < matcher.indexOf('if (text.includes(compact)) return true'),
  '카테고리·태그의 문자열 일치가 메뉴 근거 검증을 우회하면 안 됩니다.');
assert.match(html, /store-service-info\.js\?v=[^"\s]*grounded-menu-search-1/);

console.log('grounded menu search regression: PASS');
