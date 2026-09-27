import fs from "node:fs";
import assert from "node:assert/strict";

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("app.css", "utf8");
const experienceCss = fs.readFileSync("final-experience.css", "utf8");
const messageCss = fs.readFileSync("turtle-ship-hero.css", "utf8");
const serviceCss = fs.readFileSync("store-service-info.css", "utf8");
const icons = fs.readFileSync("assets/ui/ui-icons.svg", "utf8");

assert.match(html, /class="autumn-continuous-shell"/);
assert.doesNotMatch(html, /chuseok-seasonal-hero|마음까지 넉넉해지는 한가위|여수의 맛처럼 풍성하고/);
assert.doesNotMatch(html, /추석에도 문 여는 맛집 보기/);
assert.match(html, /class="brand-logo-piece piece-1"/);
assert.equal((html.match(/class="brand-logo-piece/g) || []).length, 6);
assert.match(css, /@keyframes brandLetterPop/);
assert.match(css, /prefers-reduced-motion:reduce/);
assert.match(html, /<h2>오늘의 여수 생활정보<\/h2>/);
assert.match(html, /혜택·행사·모집·교통 소식을 짧게 보고 공식 원문에서 확인하세요\./);
for (const id of ["yeosuGageBtn","holidayMedicalBtn","publicToiletBtn","carAccidentBtn","usedMarketBtn","localNewsBtn","chakBenefitBtn","yeosuLifeNewsBtn"]) assert.match(html, new RegExp(`id="${id}"`));
assert.match(html, /assets\/brand\/yeosugage-app-icon\.png/);
for (const id of ["hospital-pill","restroom","car-crash","used-exchange","news-sheet"]) assert.match(icons, new RegExp(`id="${id}"`));
assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
assert.match(css, /yeosu-life-gateway-copy small\{[^}]*font-size:13px/);
assert.match(css, /is-accident \.yeosu-life-gateway-copy strong\{[^}]*white-space:nowrap/);
assert.match(css, /autumn-continuous-shell\{[^}]*autumn-dolsan-bridge-2026-extended\.svg/);
assert.match(css, /autumn-continuous-shell\{[^}]*background-position:center top,center top[^}]*background-size:100% 100%,100% auto/,
  '가을 사진의 원래 크기와 상단 중앙 위치를 바꾸면 안 됩니다.');
assert.match(css, /autumn-continuous-shell \.yeosu-night-shell\{[^}]*background:[^}]*!important/);
assert.doesNotMatch(css, /autumn-continuous-shell \.yeosu-night-shell\{[^}]*rgba\(242,246,244,\.96\)/,
  '주문 버튼 구역을 불투명한 흰색으로 덮으면 안 됩니다.');
assert.match(html, /<div class="autumn-post-banner-shell">\s*<section class="hero"/,
  '가을 배경은 메인배너 시작선에서 정확히 끝나야 합니다.');
assert.match(css, /\.autumn-post-banner-shell\{[^}]*background:#f6f9fc/,
  '메인배너와 배송기사 광고 뒤에는 원래의 불투명 배경을 복원해야 합니다.');
assert.match(experienceCss, /autumn-continuous-shell \.order-item\{[^}]*rgba\(255,255,255,\.35\)/);
assert.match(messageCss, /autumn-continuous-shell \.main-search-row\{margin-top:72px\}/);
assert.match(messageCss, /community-order-message p strong/);
assert.match(messageCss, /community-order-message h2\{[\s\S]*?color:#fff[\s\S]*?-webkit-text-stroke:1px #073653[\s\S]*?text-shadow:0 1px 2px #073653/,
  '주문방법 제목은 상단 슬로건과 같은 흰 글자·진남색 외곽선·어두운 그림자를 사용해야 합니다.');
assert.match(messageCss, /community-order-message p\{[\s\S]*?background:linear-gradient\(90deg,rgba\(255,255,255,\.22\),rgba\(255,255,255,\.12\) 72%,rgba\(255,255,255,0\)\)[\s\S]*?backdrop-filter:blur\(1\.3px\)/,
  '주문방법 글자 뒤 물결은 투명한 국소 보정으로만 살짝 정리해야 합니다.');
assert.match(messageCss, /community-order-message p strong\{[\s\S]*?color:#242424[\s\S]*?font-size:18px[\s\S]*?-webkit-text-stroke:0[\s\S]*?text-shadow:0 1px 0 rgba\(0,0,0,\.22\)/,
  '핵심 주문방법 첫 줄은 로고처럼 진회색 단색·무외곽선·약한 그림자로 보여야 합니다.');
assert.match(messageCss, /community-order-message \.order-secondary-line\{[\s\S]*?color:#242424[\s\S]*?font-size:15px[\s\S]*?-webkit-text-stroke:0[\s\S]*?text-shadow:0 1px 0 rgba\(0,0,0,\.22\)/,
  '브랜드앱·전화주문도 진회색 단색·무외곽선·약한 그림자로 보여야 합니다.');
assert.match(experienceCss, /autumn-continuous-shell \.order-item strong\{[^}]*color:#080b0d/,
  '주문 버튼 이름도 진한 검정으로 보여야 합니다.');
assert.match(serviceCss, /store-finder-quick \{[\s\S]*?background: rgba\(255, 255, 255, \.35\)/);
for (const file of ["assets/seasonal/autumn-dolsan-bridge-2026.webp","assets/seasonal/autumn-dolsan-bridge-2026-extended.svg","assets/brand/yeosugage-app-icon.png"]) assert.ok(fs.existsSync(file), `missing ${file}`);
const extendedAutumn = fs.readFileSync("assets/seasonal/autumn-dolsan-bridge-2026-extended.svg", "utf8");
assert.match(extendedAutumn, /width="941" height="2300"/,
  '원본 가을 사진의 가로 폭을 유지한 채 주문 버튼 뒤까지 세로만 연장해야 합니다.');
assert.match(extendedAutumn, /href="data:image\/webp;base64,/,
  '브라우저가 가을 사진을 빠뜨리지 않도록 연장 파일 안에 원본을 포함해야 합니다.');
assert.match(extendedAutumn, /id="autumn-photo-reeds-lowered"/,
  '돌산대교와 하늘은 그대로 두고 갈대 구간만 아래로 내린 구성을 유지해야 합니다.');
assert.match(extendedAutumn, /viewBox="0 1000 941 180"/,
  '글자 뒤에는 바다 구간을 늘려 갈대가 더 아래에서 시작하게 해야 합니다.');
console.log("autumn homepage and life information regression checks passed");

