import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const excludedTests = new Map([
  ['ddangyo-yeseo-batch-regression-test.mjs', '비공개 API 전환으로 공개 저장소에서 생성 보고서를 제거함'],
  ['ddangyo-yeseo-completeness-regression-test.mjs', '비공개 API 전환으로 공개 저장소에서 생성 보고서를 제거함'],
  ['store-service-customer-ux-regression-test.mjs', '비공개 API 전환으로 공개 store-service-info.json을 제거함'],
  ['store-service-hours-24h-regression-test.mjs', '비공개 API 전환으로 공개 store-service-info.json을 제거함']
]);

const discovered = fs.readdirSync(repositoryRoot)
  .filter(file => file.endsWith('-regression-test.mjs'))
  .sort((a, b) => a.localeCompare(b, 'en'));

for (const file of excludedTests.keys()) {
  if (!discovered.includes(file)) throw new Error(`제외 목록에만 남은 회귀검사입니다: ${file}`);
}

const active = discovered.filter(file => !excludedTests.has(file));
if (!active.length) throw new Error('실행할 회귀검사가 없습니다.');

console.log(`회귀검사 자동 발견: 전체 ${discovered.length}개 / 실행 ${active.length}개 / 제외 ${excludedTests.size}개`);
for (const [file, reason] of excludedTests) console.log(`SKIP ${file}: ${reason}`);

const failures = [];
const results = [];
for (const file of active) {
  console.log(`\nRUN ${file}`);
  const startedAt = Date.now();
  const result = spawnSync(process.execPath, [file], {
    cwd: repositoryRoot,
    env: process.env,
    stdio: 'inherit'
  });
  const row = {file, success: result.status === 0, status: result.status, signal: result.signal, durationMs: Date.now() - startedAt};
  results.push(row);
  if (!row.success) failures.push(row);
}

const report = {
  success: failures.length === 0,
  discovered: discovered.length,
  active: active.length,
  excluded: [...excludedTests].map(([file, reason]) => ({file, reason})),
  results,
  failures
};
fs.writeFileSync(path.join(repositoryRoot, 'regression-suite-report.json'), `${JSON.stringify(report, null, 2)}\n`);

if (failures.length) {
  console.error('\n실패한 회귀검사:');
  for (const failure of failures) console.error(`- ${failure.file} (${failure.signal || failure.status})`);
  process.exit(1);
}

console.log(`\nPASS 활성 회귀검사 ${active.length}개`);
