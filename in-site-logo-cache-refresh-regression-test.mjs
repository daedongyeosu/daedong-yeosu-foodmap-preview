import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync('index.html', 'utf8');
const reviewHtml = fs.readFileSync('collector-review.html', 'utf8');
const privacyHtml = fs.readFileSync('privacy/index.html', 'utf8');
const shareUi = fs.readFileSync('final-experience.js', 'utf8');
const serviceWorker = fs.readFileSync('sw.js', 'utf8');

const version = 'official-brand-20260830-1';
const svgUrl = `app-icon.svg?v=${version}`;
const png192Url = `assets/app-icons/daedong-app-icon-192.png?v=${version}`;
const png512Url = `assets/app-icons/daedong-app-icon-512.png?v=${version}`;

assert.ok(html.includes(`src="${svgUrl}"`), '메인 화면 로고는 버전이 지정된 공식 SVG여야 합니다.');
assert.ok(html.includes(`href="/${svgUrl}"`), '브라우저 아이콘도 같은 버전의 공식 SVG여야 합니다.');
assert.ok(html.includes(`href="/${png192Url}"`), '홈 화면용 터치 아이콘은 공식 앱 아이콘이어야 합니다.');
assert.ok(html.includes(`https://daedongmap.com/${png512Url}`), '공유 미리보기는 공식 앱 아이콘이어야 합니다.');
assert.ok(reviewHtml.includes(`href="/${svgUrl}"`), '검수 화면 아이콘도 공식 로고로 통일해야 합니다.');
assert.ok(privacyHtml.includes(`src="../${svgUrl}"`), '개인정보 화면 로고도 공식 로고로 통일해야 합니다.');
assert.ok(shareUi.includes(png512Url), '사이트 안 공유창의 대체 로고도 공식 앱 아이콘이어야 합니다.');
assert.doesNotMatch(shareUi, /assets\/logo\.png/, '사이트 안 공유창이 예전 로고를 사용하면 안 됩니다.');
assert.ok(serviceWorker.includes(`'/${svgUrl}'`), '새 공식 로고 URL을 앱 셸에 저장해야 합니다.');
assert.ok(serviceWorker.includes(`'/${png192Url}'`), '새 터치 아이콘 URL을 앱 셸에 저장해야 합니다.');
assert.ok(serviceWorker.includes(`'/${png512Url}'`), '새 공유 대체 로고 URL을 앱 셸에 저장해야 합니다.');
assert.doesNotMatch(serviceWorker, /'\/app-icon\.svg'/, '서비스 워커가 무버전 로고를 계속 캐시하면 안 됩니다.');

console.log('In-site official logo cache refresh regression: PASS');
