import fs from 'node:fs';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

assert.match(source, /key: '빙수'[\s\S]*?queries: \['빙수', '설빙'\][\s\S]*?terms: \['빙수', '설빙'\]/,
  '빙수 검색은 실제 메뉴의 설빙 표기를 함께 조회하고 근거로 인정해야 합니다.');
assert.match(source, /key: '김밥'[\s\S]*?queries: \['김밥', '김빱', '주먹밥'\][\s\S]*?terms: \[[^\]]*'꼬마김밥'[^\]]*'충무김밥'[^\]]*'삼각김밥'[^\]]*'주먹밥'/,
  '김밥 검색은 안전한 표기 변형과 김밥류 메뉴를 함께 조회해야 합니다.');
assert.match(source, /function menuSearchQueries\(query\)[\s\S]*?new Set\(\(spec\.queries/,
  '메뉴군 검색어는 중복 없이 동의어 조회어로 확장해야 합니다.');
assert.match(source, /function mergeMenuSearchResults\(results\)[\s\S]*?seen\.has\(itemId\)[\s\S]*?target\.i\.push\(item\)/,
  '여러 동의어 검색 결과는 메뉴 ID 기준으로 병합해야 합니다.');
assert.match(source, /Promise\.all\(searchQueries\.map\(searchQuery => \([\s\S]*?menuSearch\(searchQuery/,
  '고객의 메뉴군 검색은 모든 안전한 동의어를 실제 메뉴 API에서 조회해야 합니다.');
assert.match(html, /grounded-menu-search-2-menu-family-synonyms-1/,
  '브라우저가 동의어 검색 수정본을 즉시 받도록 캐시 키를 갱신해야 합니다.');

console.log('menu family synonyms regression: PASS');
