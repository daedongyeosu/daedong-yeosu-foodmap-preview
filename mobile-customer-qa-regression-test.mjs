import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const menu = fs.readFileSync('store-menu-preview.js', 'utf8');
const service = fs.readFileSync('store-service-info.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');

// D-001/D-002: customer home hides the total catalog count while preserving the
// useful, time-sensitive count of stores that are currently open.
assert.match(html, /id="collectorReviewEntry"[^>]*hidden/);
assert.match(app, /get\('collector-review'\) === '1'/);
assert.match(service, /data-store-finder-open-count/);
assert.match(service, /const nextCount = countReady \? String\(count\) : loadFailed \? '다시 확인' : '확인 중'/);
assert.doesNotMatch(service, /data-store-finder-total-count/);

// D-003: the badge and the actionable notice rows share one PROMOS source of truth.
assert.match(html, /data-notice-count hidden/);
assert.match(app, /noticeCount\.textContent = String\(PROMOS\.length\)/);
assert.match(app, /data-notice-promo="\$\{escapeHtml\(promo\.kind\)\}"/);
assert.match(app, /openPromoCarouselDetail\(noticePromo\.dataset\.noticePromo\)/);

// D-004/D-005/D-007: black-band correction covers cards and menu surfaces, and a
// single menu category is not repeated beside the identical overall count.
assert.match(app, /img\[data-photo-crop-audit="yogiyo-menu"\]/);
assert.match(app, /photoCropAuditAttributes\(photo\.src\)/);
assert.match(menu, /data-photo-crop-audit="yogiyo-menu"/);
assert.match(menu, /categoryCandidates\.length > 1 \? categoryCandidates\.slice\(0, 3\) : \[\]/);

// D-008/D-009/D-010/D-012: every My Page row acts, closing restores Home, and
// the hidden control cannot retain a stale focus outline.
assert.match(app, /data-open-address>📍 저장 지역/);
assert.match(app, /data-open-ad-inquiry>✉ 광고 문의/);
assert.match(html, /data-open-ad-inquiry>광고 문의/);
assert.match(app, /function adInquiryModal\(\)/);
assert.match(app, /document\.activeElement\?\.blur\?\.\(\)/);
assert.match(app, /item\.classList\.toggle\('active', item\.dataset\.tab === 'home'\)/);

// D-006/D-011/D-013: Android package intents launch the installed app while
// preserving the Preview page underneath instead of navigating it to a fallback.
for (const [key, packageName] of Object.entries({
  mukkebi: 'mukkebi.user.app.android',
  yogiyo: 'com.fineapp.yogiyo',
  coupang: 'com.coupang.mobile.eats',
  baemin: 'com.woowahan.bros',
  naver: 'com.nhn.android.nmap'
})) {
  assert.match(app, new RegExp(`${key}: '${packageName.replaceAll('.', '\\.')}'`));
}
assert.match(app, /function handleAndroidMapLinkClick\(event\)/);
assert.match(app, /launchMobileRoute\('naver', href\)/);
assert.match(finalExperience, /daedongLaunchMobileRoute\(key,href\)/);
assert.match(rc2, /daedongLaunchMobileRoute\(key, href\)/);

console.log('PASS: fixed-number S25 customer QA regressions are guarded');
