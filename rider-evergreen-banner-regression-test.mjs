import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const app = readFileSync(new URL('./app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('./app.css', import.meta.url), 'utf8');
const prWorkflow = readFileSync(new URL('./.github/workflows/preview-api-client-checks.yml', import.meta.url), 'utf8');
const deployWorkflow = readFileSync(new URL('./.github/workflows/post-deploy-preview-checks.yml', import.meta.url), 'utf8');

const heroEnd = html.indexOf('</section>', html.indexOf('aria-label="메인 슬라이드 배너"'));
const riderBanner = html.indexOf('id="riderRecruitmentBanner"');
const categories = html.indexOf('class="section category-section"');

assert.ok(heroEnd >= 0 && riderBanner > heroEnd && categories > riderBanner, '상시모집 배너는 메인 슬라이드와 음식 카테고리 사이에 있어야 합니다.');
assert.match(html, /<strong>배송기사님 상시모집<\/strong>/, '존중 표현을 사용한 고정 문구를 유지해야 합니다.');
assert.match(html, /aria-haspopup="dialog"/, '상시모집 배너는 팝업을 연다는 접근성 정보를 제공해야 합니다.');
assert.match(app, /riderRecruitmentBanner[^\n]+openPromoCarouselDetail\('rider'\)/, '고정 배너는 기존 배송기사 모집 사진 팝업을 열어야 합니다.');
assert.match(app, /image:\s*'assets\/promos\/rider-recruitment-portrait-v2\.webp'/, '사용자가 등록한 기존 모집 사진을 그대로 사용해야 합니다.');
assert.match(app, /imageOnly:\s*true/, '모집 사진은 별도 설명 화면 없이 즉시 보여야 합니다.');
assert.match(css, /\.rider-evergreen-button\s*\{[\s\S]*?min-height:68px/, '고정 배너는 모바일에서 누르기 쉬운 높이를 유지해야 합니다.');
assert.match(prWorkflow, /browser-rider-evergreen-banner\.mjs/, 'PR에서 390×844 모바일 배너 동작을 검사해야 합니다.');
assert.match(deployWorkflow, /browser-rider-evergreen-banner\.mjs/, '프리뷰 배포 후에도 실제 배너 동작을 다시 검사해야 합니다.');

console.log('rider evergreen banner regression test passed');
