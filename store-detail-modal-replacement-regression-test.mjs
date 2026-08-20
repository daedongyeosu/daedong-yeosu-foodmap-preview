import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const rc2 = readFileSync(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');

const helperStart = app.indexOf('function replaceModalContent(html)');
const helperEnd = app.indexOf('\nfunction hardClose', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, '같은 팝업의 내용만 교체하는 도우미가 있어야 합니다.');
const helper = app.slice(helperStart, helperEnd);
assert.match(helper, /typeof rc2ReplaceModal === 'function'/, '복귀 스택에 새 팝업을 쌓지 않도록 교체 상태를 알려야 합니다.');
assert.match(helper, /rc2ReplaceModal\(\);[\s\S]*openModal\(html\);/, '교체 상태를 먼저 설정한 뒤 내용을 렌더링해야 합니다.');

const openStoreStart = app.indexOf('async function openStore(store)');
const openStoreEnd = app.indexOf('\nasync function fetchJson', openStoreStart);
assert.ok(openStoreStart >= 0 && openStoreEnd > openStoreStart, '가게 상세 열기 구현이 있어야 합니다.');
const openStore = app.slice(openStoreStart, openStoreEnd);

assert.equal((openStore.match(/\bopenModal\(/g) || []).length, 1, '로딩 뼈대만 새 팝업으로 열어야 합니다.');
assert.equal((openStore.match(/\breplaceModalContent\(/g) || []).length, 3, '성공·오류 전환은 모두 같은 팝업의 내용 교체여야 합니다.');
assert.match(openStore, /activeStoreId !== store\.id \|\| \$\('#modal'\)\.hidden/, '닫힌 뒤 도착한 응답이 팝업을 다시 열면 안 됩니다.');

assert.match(rc2, /if \(!wasHidden && !rc2ModalRestoring && !replacing\) rc2ModalStack\.push/, '교체 상태에서는 로딩 화면을 복귀 스택에 쌓지 않아야 합니다.');
assert.match(html, /app\.js\?v=[^"\n]*store-detail-replace-1/, '고객 브라우저가 수정된 앱 스크립트를 즉시 받아야 합니다.');

console.log('Store detail modal replacement regression: PASS');

