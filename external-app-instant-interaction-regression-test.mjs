import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');

const snapshotBoot = html.match(/<script id="externalReturnSnapshotBoot">([\s\S]*?)<\/script>/)?.[1] || '';
assert.ok(snapshotBoot, '외부 주문앱 복귀 스냅샷 부팅 코드를 찾아야 합니다.');
assert.match(snapshotBoot, /window\.daedongImmediateExternalReturnSurface = surface;/,
  '실제 복귀 화면이 주입됐다는 상태를 기록해야 합니다.');
assert.match(snapshotBoot, /window\.daedongImmediateExternalReturnSurface = surface;\s*window\.daedongFinishExternalReturnBoot\?\.\(\);/,
  '메뉴 복원 여부와 무관하게 저장 화면을 즉시 보여줘야 합니다.');
assert.doesNotMatch(snapshotBoot, /if \(!storeSaved\?\.menuState\)\s*window\.daedongFinishExternalReturnBoot/,
  '메뉴 복원이 끝날 때까지 고객 화면을 가리면 안 됩니다.');

assert.match(rc2, /fxInstallEvents = function rc2InstallEvents\(\) \{\s*if \(window\.daedongCoreEventsInstalled\) return;\s*window\.daedongCoreEventsInstalled = true;/,
  '핵심 클릭 이벤트는 일찍 설치해도 중복 등록되지 않아야 합니다.');

const rc2Load = finalExperience.slice(finalExperience.indexOf('fxRc2Script.onload=()=>{'));
const earlyEvents = rc2Load.indexOf('fxInstallEvents();');
const rc3Creation = rc2Load.indexOf("document.createElement('script')");
assert.ok(earlyEvents > -1 && earlyEvents < rc3Creation,
  '복귀 화면의 주문앱 버튼은 RC3~RC7 보조 기능 로딩 전에 활성화돼야 합니다.');

assert.match(html, /final-experience\.js\?v=[^"\n]*instant-external-interaction-1/);
assert.match(finalExperience, /rc2-fixes\.js\?v=[^'\n]*instant-external-interaction-1/);

console.log('external-app-instant-interaction-regression-test: pass');
