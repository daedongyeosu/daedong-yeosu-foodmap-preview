import fs from "node:fs";
import assert from "node:assert/strict";

const html = fs.readFileSync("index.html", "utf8");
const css = fs.readFileSync("app.css", "utf8");
const icons = fs.readFileSync("assets/ui/ui-icons.svg", "utf8");

assert.match(html, /class="chuseok-seasonal-hero"/);
assert.match(html, /마음까지 넉넉해지는 한가위/);
assert.match(html, /여수의 맛처럼 풍성하고/);
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
assert.match(css, /chuseok-continuous-shell \.yeosu-night-shell\{[^}]*background:[^}]*!important/);
assert.doesNotMatch(css.match(/chuseok-continuous-shell \.yeosu-night-shell\{[^}]*\}/)?.[0] || "", /dolsan-day|dolsan-night/);
for (const file of ["assets/seasonal/chuseok-2026-continuous.webp","assets/brand/yeosugage-app-icon.png"]) assert.ok(fs.existsSync(file), `missing ${file}`);
console.log("chuseok homepage and life information regression checks passed");

