import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const rc2 = fs.readFileSync(new URL('./rc2-fixes.js', import.meta.url), 'utf8');
const finalExperience = fs.readFileSync(new URL('./final-experience.js', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

const selectedCta = app.match(/const selectedCta = selectedRoute \? `([^`]+)` : '';/)?.[1] || '';
const externalAppKeys = app.match(/const EXTERNAL_APP_KEYS = \[([^\]]+)\];/)?.[1]
  ?.split(',')
  .map(value => value.trim().replaceAll("'", '')) || [];
assert.deepEqual(externalAppKeys, ['yogiyo', 'coupang', 'baemin'],
  '공통 바로가기 검사는 요기요·쿠팡이츠·배달의민족 전체를 대상으로 해야 합니다.');
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
for (const handlerName of ['handleDdangyoOrderLinkClick', 'handleKakaoOrderLinkClick', 'handleMobileOrderLinkClick']) {
  const handlerStart = app.indexOf(`function ${handlerName}(`);
  const handlerEnd = app.indexOf("document.addEventListener('click'", handlerStart);
  assert.ok(handlerStart >= 0 && handlerEnd > handlerStart, `${handlerName}: 모바일 주문앱 클릭 처리기를 찾아야 합니다.`);
  const handler = app.slice(handlerStart, handlerEnd);
  assert.match(handler, /data-community-original[^\n]*return/,
    `${handlerName}: 비교화면 주문앱 링크는 같은 탭 실행기보다 별도 복귀 경로가 처리해야 합니다.`);
  assert.match(handler, /rc2RememberExternalReturn\(link\)/,
    `${handlerName}: 직접 실행 전에 선택 앱과 가게 복귀 상태를 함께 저장해야 합니다.`);
  assert.match(handler, /daedongLaunchMobileRoute|openDdangyoRoute/,
    `${handlerName}: 구글 플레이 웹페이지 대신 앱 직접 실행 경로를 사용해야 합니다.`);
}
const comparedHandlerStart = rc2.indexOf("const comparedExternal = event.target.closest('a[data-community-original]')");
const comparedHandlerEnd = rc2.indexOf('const externalLink =', comparedHandlerStart);
assert.ok(comparedHandlerStart >= 0 && comparedHandlerEnd > comparedHandlerStart,
  '선택 주문앱 전용 클릭 처리를 찾아야 합니다.');
const comparedHandler = rc2.slice(comparedHandlerStart, comparedHandlerEnd);
assert.match(comparedHandler, /if \(comparedExternal\) \{[\s\S]*?event\.preventDefault\(\)[\s\S]*?event\.stopImmediatePropagation\(\)[\s\S]*?rc2RememberExternalReturn\(comparedExternal\)[\s\S]*?rc2LaunchComparedExternal\(comparedExternal, href\)/,
  '가게 상세 유무와 관계없이 선택 주문앱 링크를 가로채 앱 직접 실행과 복귀 저장을 해야 합니다.');
assert.doesNotMatch(comparedHandler, /hasStoreDetailInModalFlow|window\.open|target.?_blank/,
  '앱목록에서 들어온 비교화면도 일반 웹 새 창이나 가게상세 존재 조건으로 빠지면 안 됩니다.');
assert.match(rc2, /function rc2LaunchComparedExternal\(link, href\) \{[\s\S]*?window\.open\(href, '_blank', 'noopener'\)[\s\S]*?return true/, '비교화면 주문앱은 원본 상세 DOM을 남긴 채 별도 실행해야 합니다.');
const writeStart = rc2.indexOf('function rc2WriteReturnState(key, value)');
const writeEnd = rc2.indexOf('function rc2ClearReturnState', writeStart);
const writeReturnState = rc2.slice(writeStart, writeEnd);
assert.match(writeReturnState, /history\.replaceState\(/,
  '각 주문앱 출발은 현재 Preview 기록에 새로운 일회용 토큰을 기록해야 합니다.');
assert.doesNotMatch(writeReturnState, /history\.pushState\(|history\.back\(/,
  '반복 실행 때마다 Android 임시 방문기록을 쌓거나 자동 뒤로가기를 실행하면 안 됩니다.');
assert.doesNotMatch(rc2, /rc2ExpectedExternalHistoryPopToken|rc2NormalizeReturnedHistory|rc2ConsumeExpectedExternalHistoryPop/,
  '복귀 이후 늦게 도착해 화면을 닫는 과거 임시 방문기록 정리 경로를 다시 만들면 안 됩니다.');
assert.match(rc2, /function rc2ArmRestoredReturnLease\(key, saved\)[\s\S]*?rc2RestoredReturnLease = \{key, saved\}/,
  '각 복귀는 고객의 첫 조작까지 정확한 복귀표를 유지해야 합니다.');
assert.match(rc2, /function rc2SettleRestoredReturnLease\(\)[\s\S]*?rc2ClearReturnState\(lease\.key, lease\.saved\)/,
  '복귀표는 고객이 돌아온 화면을 조작한 뒤에만 소비해야 다음 주문앱 실행과 섞이지 않습니다.');

assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*repeated-selected-app-return-1/);
assert.match(html, /app\.js\?v=[^"\n]*repeated-selected-app-return-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*repeated-selected-app-return-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*stable-separated-order-return-1/);
assert.match(html, /app\.js\?v=[^"\n]*stable-separated-order-return-1/);
assert.match(html, /final-experience\.js\?v=[^"\n]*stable-separated-order-return-2/);

console.log('PASS 요기요·쿠팡이츠·배달의민족 즉시 실행 및 앱별 연속 2회 동일 화면 복귀');
