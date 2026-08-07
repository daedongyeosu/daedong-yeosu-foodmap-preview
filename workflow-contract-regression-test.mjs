import assert from 'node:assert/strict';
import fs from 'node:fs';

const requiredFiles = [
  'AGENTS.md',
  'docs/PROJECT_WORKFLOW.md',
  'docs/CRITICAL_UX_CONTRACT.md',
  'docs/HANDOFF_TEMPLATE.md',
  '.github/pull_request_template.md',
  '.github/ISSUE_TEMPLATE/bug_report.yml',
  '.github/workflows/post-deploy-preview-checks.yml',
  'scripts/run-regression-suite.mjs',
  'scripts/browser-notion-hero-return.mjs'
];
for (const file of requiredFiles) assert.ok(fs.existsSync(file), `표준 작업 파일 유지: ${file}`);

const agents = fs.readFileSync('AGENTS.md', 'utf8');
const workflow = fs.readFileSync('docs/PROJECT_WORKFLOW.md', 'utf8');
const contract = fs.readFileSync('docs/CRITICAL_UX_CONTRACT.md', 'utf8');
const pullRequest = fs.readFileSync('.github/pull_request_template.md', 'utf8');
const action = fs.readFileSync('.github/workflows/preview-api-client-checks.yml', 'utf8');
const postDeployAction = fs.readFileSync('.github/workflows/post-deploy-preview-checks.yml', 'utf8');
const runner = fs.readFileSync('scripts/run-regression-suite.mjs', 'utf8');

assert.match(agents, /GitHub 인증·배포 사전점검 고정 절차/);
assert.match(agents, /node scripts\/run-regression-suite\.mjs/);
assert.match(agents, /새로운 `rc8-fixes\.js`처럼 보정 레이어를 계속 추가하지 않는다/);
assert.match(workflow, /인증 경로가 없으면 코드 수정 전에 차단 사유를 알린다/);
assert.match(workflow, /preview 승인은 운영 승인과 다르다/);
assert.match(contract, /노션 광고에서 돌아오면 네트워크 재로딩을 기다리지 않고 보던 슬라이드를 즉시 표시한다/);
assert.match(contract, /`여수 소상공인 소식`, `여수 힐링요트`, `오마카세 우미`/);
assert.match(contract, /닫기 버튼 옆 장식용 원형 음영을 다시 만들지 않는다/);
assert.match(pullRequest, /사용자 병합 승인 전에는 병합하지 않는다/);
assert.match(action, /node scripts\/run-regression-suite\.mjs/);
assert.match(action, /regression-suite-report\.json/);
assert.match(postDeployAction, /deployment_status/);
assert.match(postDeployAction, /node scripts\/browser-smoke\.mjs/);
assert.match(postDeployAction, /node scripts\/browser-notion-hero-return\.mjs/);
assert.match(runner, /endsWith\('-regression-test\.mjs'\)/);
assert.match(runner, /excludedTests/);
assert.match(runner, /regression-suite-report\.json/);

console.log('workflow-contract-regression-test: pass');
