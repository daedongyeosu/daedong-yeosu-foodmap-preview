import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => fs.readFileSync(new URL(file, import.meta.url), 'utf8');
const index = read('./index.html');
const app = read('./app.js');
const finalExperience = read('./final-experience.js');
const rc2 = read('./rc2-fixes.js');
const rc3 = read('./rc3-fixes.js');

const notice = '앱 이름은 주문 경로 안내를 위해 표시되며, 대동여수음식지도와 해당 앱의 공식 제휴·후원을 의미하지 않습니다.';
const externalAssets = [
  'assets/yogiyo.jpg',
  'assets/coupang-eats.jpg',
  'assets/baemin.jpg'
];

for (const asset of externalAssets) {
  assert(!index.includes(`<img src="${asset}"`), `정적 다른 주문앱 팝업에 ${asset} 아이콘이 남아 있습니다.`);
  assert(!rc2.includes(`<img src="${asset}"`), `활성 다른 주문앱 팝업에 ${asset} 아이콘이 남아 있습니다.`);
}

assert(index.includes(notice), '정적 다른 주문앱 팝업 안내 문구가 없습니다.');
assert(app.includes(`const EXTERNAL_APP_NOTICE_TEXT = '${notice}'`), '공통 안내 문구가 정확하지 않습니다.');
assert(app.includes('if (EXTERNAL_APP_KEYS.includes(key)) return `<span'), '외부 주문앱 아이콘의 글자 대체 안전장치가 없습니다.');
assert(finalExperience.includes('isExternal?externalAppNoticeMarkup()'), '기본 외부 주문앱 목록 안내 문구가 없습니다.');
assert(rc2.includes('isExternal ? externalAppNoticeMarkup()'), '활성 외부 주문앱 목록 안내 문구가 없습니다.');
assert(rc2.includes('class="external-app-choice-label">요기요</span>'), '요기요 글자 선택지가 없습니다.');
assert(rc2.includes('class="external-app-choice-label">쿠팡이츠</span>'), '쿠팡이츠 글자 선택지가 없습니다.');
assert(rc2.includes('class="external-app-choice-label">배달의민족</span>'), '배달의민족 글자 선택지가 없습니다.');
assert(rc3.includes('class="detail-route external-text-route"'), '가게별 다른 주문방법이 글자 전용 행으로 바뀌지 않았습니다.');
assert(rc3.includes('<div class="order-methods-list">${routeMarkup}</div>${externalAppNoticeMarkup()}'), '가게별 다른 주문방법 안내 문구가 없습니다.');

console.log('external-app-text-regression: PASS');
