import fs from 'node:fs';

const index = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('app.css', 'utf8');

for (const marker of ['id="yeosuGageBtn"', 'id="holidayMedicalBtn"', 'id="publicToiletBtn"', 'id="carAccidentBtn"', 'id="usedMarketBtn"', 'id="localNewsBtn"', 'id="chakBenefitBtn"', 'id="yeosuLifeNewsBtn"', 'yeosu-life-gateways']) {
  if (!index.includes(marker)) throw new Error(`missing preview gateway markup: ${marker}`);
}

for (const marker of [
  "const EGEN_HOLIDAY_MEDICAL_URL = 'https://www.e-gen.or.kr/egen/holiday_medical.do'",
  "const YEOSU_GAGE_URL = 'https://play.google.com/store/apps/details?id=com.yeosugage.app'",
  'function openHolidayMedicalGuide()',
  'function openPublicToiletGuide()',
  'function openYeosuGageGuide()',
  'function openUsedMarketGuide()',
  'function openLocalNewsGuide()',
  'function openCarAccidentGuide()',
  "$('#holidayMedicalBtn')?.addEventListener('click', openHolidayMedicalGuide)",
  "$('#yeosuGageBtn')?.addEventListener('click', openYeosuGageGuide)",
  "$('#publicToiletBtn')?.addEventListener('click', openPublicToiletGuide)",
  "$('#carAccidentBtn')?.addEventListener('click', openCarAccidentGuide)",
  "$('#usedMarketBtn')?.addEventListener('click', openUsedMarketGuide)",
  "$('#localNewsBtn')?.addEventListener('click', openLocalNewsGuide)",
  "$('#yeosuLifeNewsBtn')?.addEventListener('click', () => openYeosuLifeNews('전체'))"
]) {
  if (!app.includes(marker)) throw new Error(`missing preview gateway behavior: ${marker}`);
}

if (!css.includes('@media(max-width:700px){.yeosu-life-gateways{grid-template-columns:repeat(3,minmax(0,1fr))')) {
  throw new Error('mobile gateway layout contract missing');
}

if ((index.match(/id="chakBenefitBtn"/g) || []).length !== 1) throw new Error('CHAK gateway must appear exactly once');
if (index.includes('id="yeosuLifeMoreBtn"') || app.includes('openYeosuLifeHub')) throw new Error('obsolete hidden life hub remains');
if (index.indexOf('id="yeosuGageBtn"') > index.indexOf('id="holidayMedicalBtn"')) throw new Error('Yeosu Gage must be the first gateway');
if (!css.includes('.yeosu-life-gateway.is-merchant{border:2px solid #1767ad')) throw new Error('Yeosu Gage visual emphasis missing');

if (/YEOSU_GAGE_URL[\s\S]{0,500}(?:order|주문방법)/.test(app)) {
  throw new Error('Yeosu Gage must remain separate from restaurant order routes');
}

for (const url of ['https://www.daangn.com/', 'https://m.bunjang.co.kr/', 'https://cafe.naver.com/joonggonara', 'https://map.naver.com/p/search/%EA%B3%B5%EC%A4%91%ED%99%94%EC%9E%A5%EC%8B%A4', 'https://www.iyosu.com/', 'https://www.yeosuro.com/', 'https://www.findall.co.kr/', 'https://www.yeosu.go.kr/www/', 'https://ysmbc.co.kr/']) {
  if (!app.includes(url)) throw new Error(`missing external directory URL: ${url}`);
}

for (const phone of ['1588-5114', '1588-5656', '1588-0100', '1544-0114', '1566-7711', '1566-8000', '1588-3344', '1688-1688', '1566-1566', '1566-0300', '1566-3000']) {
  if (!app.includes(`phone: '${phone}'`)) throw new Error(`missing verified car insurance phone: ${phone}`);
}

console.log('PASS Yeosu life medical, Yeosu Gage, marketplace and local information preview gateways');
