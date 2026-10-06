import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const storeId = 'e0c6949efb48f4b2';
const priority = JSON.parse(await readFile(new URL('./data/store-priority.json', import.meta.url), 'utf8'));
const hamburgerRule = priority.categoryPriorityOverrides['햄버거/샌드위치/토스트/핫도그'];
const rc6 = await readFile(new URL('./rc6-fixes.js', import.meta.url), 'utf8');
const finalExperience = await readFile(new URL('./final-experience.js', import.meta.url), 'utf8');

assert.ok(priority.managedStoreIds.includes(storeId), '롯데리아 이마트점은 관리매장 우선목록에 있어야 합니다.');
assert.ok(!priority.deprioritizedStoreIds.includes(storeId), '롯데리아 이마트점은 전체 후순위 목록에 있으면 안 됩니다.');
assert.ok(!hamburgerRule.bottomStoreIds.includes(storeId), '롯데리아 이마트점은 햄버거 분류 후순위에서 제외해야 합니다.');
assert.ok(!Object.hasOwn(hamburgerRule.labels, storeId), '삭제한 후순위 항목의 설명도 남기지 않아야 합니다.');
assert.doesNotMatch(finalExperience.match(/FX_HIDDEN_STORE_IDS[\s\S]*?\]\);/)?.[0] || '', new RegExp(storeId), '롯데리아 이마트점은 고객 화면 숨김 목록에서도 빠져야 합니다.');
assert.match(rc6, /store-priority\.json\?v=[^']*lotteria-emart-priority-1/, '우선순위 데이터 캐시를 갱신해야 합니다.');
assert.match(finalExperience, /rc6-fixes\.js\?v=[^']*lotteria-emart-priority-1/, '우선순위 실행 코드 캐시를 갱신해야 합니다.');

console.log('롯데리아 이마트점 우선노출 복구 검증 통과');
