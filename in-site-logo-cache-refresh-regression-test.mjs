import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const reviewHtml = fs.readFileSync('collector-review.html', 'utf8');
const privacyHtml = fs.readFileSync('privacy/index.html', 'utf8');
const shareUi = fs.readFileSync('final-experience.js', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

const brandVersion = 'display-20261017-1';
const iconVersion = 'preview-test-icon-20261012-1';
const png192Url = `assets/app-icons/daedong-preview-icon-192.png?v=${iconVersion}`;
const png512Url = 'assets/app-icons/daedong-preview-icon-512.png';
const officialPng192Url = 'assets/app-icons/daedong-app-icon-192.png?v=matjido-master-20261003-preview-1';
const shareImageUrl = 'assets/brand/yeosu-taste-map-share-1200x630.png';

assert.ok(html.includes(`src="assets/brand/yeosu-taste-map-logo.display.webp?v=${brandVersion}"`), '메인 화면은 같은 지역 로고의 버전이 지정된 경량 파일이어야 합니다.');
assert.ok(html.includes(`rel="icon" href="/${png192Url}"`), '브라우저 아이콘도 같은 버전의 공식 앱 아이콘이어야 합니다.');
assert.ok(html.includes(`href="/${png192Url}"`), '홈 화면용 터치 아이콘은 공식 앱 아이콘이어야 합니다.');
assert.ok(html.includes(`https://daedongmap.com/${shareImageUrl}`), '공유 미리보기는 새 여수맛지도 통합 로고여야 합니다.');
assert.ok(reviewHtml.includes(`href="/${officialPng192Url}"`), '검수 화면의 기존 공식 앱 아이콘은 보존해야 합니다.');
assert.ok(privacyHtml.includes(`src="../${officialPng192Url}"`), '개인정보 화면의 기존 공식 앱 아이콘은 보존해야 합니다.');
assert.ok(shareUi.includes(shareImageUrl), '사이트 안 공유창의 대체 로고도 새 여수맛지도 로고여야 합니다.');
assert.ok(serviceWorker.includes(`'/${shareImageUrl}'`), '새 공유 이미지 주소를 앱 셸에 저장해야 합니다.');
assert.doesNotMatch(shareUi, /assets\/logo\.png/, '사이트 안 공유창이 예전 로고를 사용하면 안 됩니다.');
assert.ok(serviceWorker.includes(`'/${png192Url}'`), '새 터치 아이콘 URL을 앱 셸에 저장해야 합니다.');
assert.ok(serviceWorker.includes(`'/${png512Url}'`), '새 미리보기 앱 아이콘 URL을 앱 셸에 저장해야 합니다.');
assert.doesNotMatch(serviceWorker, /app-icon\.svg/, '서비스 워커가 예전 SVG 아이콘을 계속 캐시하면 안 됩니다.');

console.log('In-site official logo cache refresh regression: PASS');
