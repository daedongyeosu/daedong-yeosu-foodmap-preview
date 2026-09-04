import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const [html, js, css] = await Promise.all([
  readFile(new URL('./index.html', import.meta.url), 'utf8'),
  readFile(new URL('./app.js', import.meta.url), 'utf8'),
  readFile(new URL('./app.css', import.meta.url), 'utf8')
]);

assert.match(html, /id="yeosuLifeSection"[^>]*hidden/);
assert.match(html, /결제혜택 · 주문앱이 아닙니다/);
assert.match(html, /id="chakBenefitBtn"/);
assert.doesNotMatch(html.match(/<div class="order-grid"[\s\S]*?<\/div>/)?.[0] || '', /CHAK|섬섬여수페이/);

for (const category of ['혜택', '행사', '모집', '교통', '뉴스']) {
  assert.match(js, new RegExp(`['\"]${category}['\"]`));
}
for (const requiredText of [
  '현재 충전 할인율과 판매 여부는 CHAK 앱에서 반드시 확인하세요.',
  '먹깨비나 땡겨요 주문 결제에 자동으로 적용된다고 표시하지 않습니다.',
  '공식 원문 보기',
  '여수시 인터넷신문 거북선여수'
]) assert.ok(js.includes(requiredText), `missing customer safeguard: ${requiredText}`);

assert.match(js, /play\.google\.com\/store\/apps\/details\?id=com\.komscochak\.m2\.client/);
assert.match(js, /apps\.apple\.com\/kr\/app/);
assert.match(js, /news\.yeosu\.go\.kr\/news\/articleView\.html\?idxno=34946/);
assert.match(js, /ACTIVE_REGION\.code === 'yeosu'/);
assert.match(css, /\.yeosu-life-section/);
assert.match(css, /\.chak-benefit-card/);
assert.match(css, /@media\(max-width:700px\)/);

console.log('yeosu life information and CHAK preview regression checks passed');
