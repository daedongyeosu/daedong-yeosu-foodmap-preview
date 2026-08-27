import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const rc2 = fs.readFileSync(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const finalExperience = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

const selectedCta = app.match(/const selectedCta = selectedRoute \? `([^`]+)` : '';/)?.[1] || '';
assert.ok(selectedCta, '가게 상세의 선택 주문앱 바로가기 마크업을 찾아야 합니다.');
assert.match(selectedCta, /^<a /, '이미 선택한 주문앱은 안내창을 다시 열지 말고 바로 실행하는 링크여야 합니다.');
assert.match(selectedCta, /href="\$\{escapeHtml\(selectedRoute\.url\)\}"/,
  '선택 주문앱 바로가기는 해당 가게의 실제 주문 주소를 사용해야 합니다.');
assert.match(selectedCta, /data-community-original="\$\{selectedRoute\.key\}"/,
  '직접 실행 링크도 공통 외부앱 복귀 저장 흐름을 거쳐야 합니다.');
assert.match(selectedCta, /target="_blank"/,
  '카카오 원본 Preview를 교체하지 않는 별도 앱 실행 링크여야 합니다.');
assert.match(selectedCta, /로 바로 주문하기/);
assert.doesNotMatch(selectedCta, /data-external-route-key|처음 선택한/,
  '선택 앱 버튼이 비교 안내창을 두 번째로 열면 안 됩니다.');

assert.match(rc2, /function rc2ExternalAppKey\(element\)[\s\S]*?element\.dataset\?\.communityOriginal/,
  '바로 실행한 선택 앱 키도 복귀 상태에 기록해야 합니다.');
assert.match(rc2, /let rc2ExpectedExternalHistoryPopToken = '';/,
  '외부앱 복귀 뒤 정리할 방문기록을 정확한 일회용 토큰으로 추적해야 합니다.');
assert.match(rc2, /function rc2NormalizeReturnedHistory\(saved\)[\s\S]*?RC2_RETURN_GUARD_STATE[\s\S]*?history\.back\(\)/,
  '복귀할 때 Android용 임시 방문기록을 즉시 한 단계 정리해야 합니다.');
assert.match(rc2, /function rc2ConsumeExpectedExternalHistoryPop\(\)[\s\S]*?RC2_RETURN_TOKEN_STATE[\s\S]*?history\.replaceState/,
  '정리 popstate는 같은 복귀 토큰일 때만 소비하고 상세 화면을 닫지 않아야 합니다.');
assert.match(rc2, /hardClose = function rc2HardClose\(options = \{\}\) \{[\s\S]*?typeof rc2ConsumeExpectedExternalHistoryPop === 'function'[\s\S]*?rc2ConsumeExpectedExternalHistoryPop\(\)/,
  '임시 방문기록 정리 popstate를 일반 뒤로가기로 처리해 홈으로 보내면 안 됩니다.');

const visibleStoreBranch = rc2.slice(
  rc2.indexOf('if (visibleStoreMatches)'),
  rc2.indexOf('if (!modal?.hidden)', rc2.indexOf('if (visibleStoreMatches)'))
);
assert.match(visibleStoreBranch, /rc2NormalizeReturnedHistory\(saved\)[\s\S]*?rc2ClearReturnState/,
  '첫 번째와 두 번째 복귀 모두 저장 상태를 지우기 전에 임시 방문기록 정리를 예약해야 합니다.');

function extractFunction(source, name) {
  const start = source.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `${name} 함수를 찾아야 합니다.`);
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = bodyStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}' && --depth === 0) return source.slice(start, index + 1);
  }
  throw new Error(`${name} 함수의 끝을 찾지 못했습니다.`);
}

const normalizeSource = extractFunction(rc2, 'rc2NormalizeReturnedHistory');
const consumeSource = extractFunction(rc2, 'rc2ConsumeExpectedExternalHistoryPop');
const context = {
  RC2_NEEDS_EXTERNAL_HISTORY_GUARD: true,
  RC2_RETURN_GUARD_STATE: 'daedongExternalReturnGuard',
  RC2_RETURN_GUARD_PARAM: '__ddguard',
  RC2_RETURN_TOKEN_STATE: 'daedongExternalReturnToken',
  RC2_RETURN_TOKEN_PARAM: '__ddret',
  rc2ExpectedExternalHistoryPopToken: '',
  location: {href: 'https://preview.daedongmap.com/'},
  history: {state: {}, back() {}, replaceState() {}},
  URL, String
};
vm.createContext(context);
vm.runInContext(`${normalizeSource}\n${consumeSource}`, context);

for (const token of ['first-coupang-trip', 'second-coupang-trip']) {
  let backCount = 0;
  let replaced = null;
  context.location.href = `https://preview.daedongmap.com/?__ddret=${token}&__ddguard=${token}`;
  context.history.state = {
    daedongModal: true,
    rc2ModalDepth: 2,
    daedongExternalReturnToken: token,
    daedongExternalReturnGuard: token
  };
  context.history.back = () => {
    backCount += 1;
    context.location.href = `https://preview.daedongmap.com/?__ddret=${token}`;
    context.history.state = {daedongModal: true, rc2ModalDepth: 2, daedongExternalReturnToken: token};
  };
  context.history.replaceState = (state, _title, url) => { replaced = {state, url}; context.history.state = state; };
  assert.equal(vm.runInContext(`rc2NormalizeReturnedHistory({returnToken:'${token}'})`, context), true);
  assert.equal(backCount, 1, `${token}: 복귀마다 임시 방문기록을 정확히 한 번 정리해야 합니다.`);
  assert.equal(vm.runInContext('rc2ConsumeExpectedExternalHistoryPop()', context), true);
  assert.equal(replaced.state.rc2ModalDepth, 1, `${token}: 정리 뒤 가게 상세 깊이는 1이어야 합니다.`);
  assert.equal(replaced.state.daedongExternalReturnToken, undefined, `${token}: 사용한 복귀 토큰을 남기면 안 됩니다.`);
  assert.doesNotMatch(replaced.url, /__ddret|__ddguard/, `${token}: 사용한 URL 복귀표식을 남기면 안 됩니다.`);
  assert.equal(vm.runInContext('rc2ConsumeExpectedExternalHistoryPop()', context), false,
    `${token}: 같은 popstate를 두 번 소비하면 실제 뒤로가기를 막습니다.`);
}

assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*repeated-selected-app-return-1/);
assert.match(html, /app\.js\?v=[^"\n]*repeated-selected-app-return-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*repeated-selected-app-return-1/);

console.log('PASS 선택 주문앱 즉시 실행 및 연속 2회 동일 화면 복귀');
