import assert from 'node:assert/strict';
import fs from 'node:fs';

const app = fs.readFileSync('app.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');
const menu = fs.readFileSync('store-menu-preview.js', 'utf8');
const service = fs.readFileSync('store-service-info.js', 'utf8');
const finalExperience = fs.readFileSync('final-experience.js', 'utf8');
const rc2 = fs.readFileSync('rc2-fixes.js', 'utf8');
const rc3 = fs.readFileSync('rc3-fixes.js', 'utf8');
const regionConfig = fs.readFileSync('region-config.js', 'utf8');

// D-001/D-002: customer home must not expose reviewer tools or a huge aggregate count.
assert.match(html, /id="collectorReviewEntry"[^>]*hidden/);
assert.match(app, /get\('collector-review'\) === '1'/);
assert.doesNotMatch(service, /data-store-finder-open-count/);

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
assert.match(app, /data-photo-kind="menu-entry"[\s\S]*photoCropAuditAttributes\(entryImage\)/);
assert.match(menu, /data-photo-kind="menu-entry"[\s\S]*menuCropAuditAttributes\(entryImage\)/);
assert.match(menu, /categoryCandidates\.length > 1 \? categoryCandidates\.slice\(0, 3\) : \[\]/);

// D-014/D-015: Korean region particles must be grammatically correct, and a
// completed detail response with no route must not pretend to be loading forever.
assert.match(regionConfig, /function regionWithEulReul\(name\)/);
assert.match(regionConfig, /regionWithEulReul\(active\.shortName\)/);
assert.doesNotMatch(regionConfig, /`\$\{active\.shortName\}을 한 번 더 생각해 주세요\.`/);
assert.match(rc3, /현재 확인된 주문방법이 없습니다\. 정보 수정 요청으로 알려주세요\./);
assert.doesNotMatch(rc3, /등록된 주문방법을 확인 중입니다\./);

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
