import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const service = fs.readFileSync(new URL('./store-service-info.js', import.meta.url), 'utf8');
const appCss = fs.readFileSync(new URL('./app.css', import.meta.url), 'utf8');
const serviceCss = fs.readFileSync(new URL('./store-service-info.css', import.meta.url), 'utf8');
const html = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');

const branchFunction = app.match(/function storeBranchLabel\(store\) \{[\s\S]*?\n\}/u)?.[0];
assert.ok(branchFunction, '지점명 판별 함수를 찾을 수 있어야 합니다.');
const storeBranchLabel = Function(`${branchFunction}; return storeBranchLabel;`)();

assert.equal(storeBranchLabel({ name: '큰손닭강정-여수여서점' }), '여서점');
assert.equal(storeBranchLabel({ name: '큰손닭강정 여수본점(학동)' }), '본점');
assert.equal(storeBranchLabel({ name: '미미꼬마김밥 여서점' }), '여서점');
assert.equal(storeBranchLabel({ name: '큰손분식' }), '');
assert.equal(storeBranchLabel({ name: '임의 가게', branchName: '여수학동점' }), '학동점');

assert.match(app, /function isOfficialStorePlaceholderImage\(path\)/u);
assert.match(app, /!isOfficialStorePlaceholderImage\(value\)/u);
assert.match(app, /daedong-app-icon\(\?:-maskable\)\?/u);
assert.match(service, /verified-menu-search-fallback/u);
assert.match(service, /menuMatches\.find\(item => item\.image\)/u);
assert.match(service, /storeBranchBadgeMarkup\(entry\.store, 'store-service-branch-badge'\)/u);

const titleRule = serviceCss.match(/\.store-service-overview-card-main strong\s*\{[\s\S]*?\}/u)?.[0] || '';
assert.match(titleRule, /-webkit-line-clamp:\s*2/u);
assert.doesNotMatch(titleRule, /white-space:\s*nowrap/u);
assert.match(appCss, /\.store-branch-badge\s*\{/u);
assert.match(serviceCss, /\.store-service-branch-badge\s*\{/u);

assert.match(html, /app\.js\?v=[^"\s]*official-logo-photo-placeholder-1-branch-identity-1/u);
assert.match(html, /store-service-info\.js\?v=[^"\s]*menu-photo-card-fallback-1-branch-identity-1/u);

console.log('PASS 전체 가게 사진 대체 및 지점 식별 회귀검사');
