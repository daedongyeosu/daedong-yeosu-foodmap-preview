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
assert.match(html, /<strong>맛지도 배달대행<\/strong><em>가게·기사님 상시 모집<\/em>/, '브랜드를 크게 표시하고 가게와 기사님을 함께 모집해야 합니다.');
assert.match(html, /id="riderRecruitmentBanner"[^>]+href="\/delivery\/"/, '상시모집 배너는 맛지도 배달대행 소개 페이지로 연결되어야 합니다.');
assert.match(html, /공공주문앱 전문배송 업체/, '상시모집 배너에서 공공주문앱 전문배송 정체성을 명확히 표시해야 합니다.');
assert.match(app, /rider:\s*\{[\s\S]*?externalUrl:\s*'\/delivery\/'/, '하단 배송기사 모집 카드도 새 소개 페이지로 연결되어야 합니다.');
assert.match(app, /store:\s*\{[\s\S]*?externalUrl:\s*'\/delivery\/'/, '하단 가맹 문의 카드도 새 소개 페이지로 연결되어야 합니다.');
assert.doesNotMatch(app, /꼬르륵 배달대행/, '고객 화면의 이전 배달대행 브랜드 문구를 제거해야 합니다.');
assert.match(css, /\.rider-evergreen-button\s*\{[\s\S]*?min-height:92px/, '세 줄 정보가 들어간 고정 배너는 모바일에서 누르기 쉬운 높이를 유지해야 합니다.');
assert.match(css, /\.autumn-continuous-shell \.order-section\{[\s\S]*?autumn-dolsan-bridge-2026-extended\.svg\?v=20261001-home-glass/, '바다 배경은 주문방법 영역 아래까지 이어지며 이미 받은 홈 배경을 재사용해야 합니다.');
assert.match(prWorkflow, /browser-rider-evergreen-banner\.mjs/, 'PR에서 390×844 모바일 배너 동작을 검사해야 합니다.');
assert.match(deployWorkflow, /browser-rider-evergreen-banner\.mjs/, '프리뷰 배포 후에도 실제 배너 동작을 다시 검사해야 합니다.');

console.log('rider evergreen banner regression test passed');
