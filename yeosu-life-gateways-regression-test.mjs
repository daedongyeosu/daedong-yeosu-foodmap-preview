import fs from 'node:fs';

const index = fs.readFileSync('index.html', 'utf8');
const app = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('app.css', 'utf8');

for (const marker of ['id="holidayMedicalBtn"', 'id="yeosuGageBtn"', 'id="usedMarketBtn"', 'id="localNewsBtn"', 'yeosu-life-gateways']) {
  if (!index.includes(marker)) throw new Error(`missing preview gateway markup: ${marker}`);
}

for (const marker of [
  "const EGEN_HOLIDAY_MEDICAL_URL = 'https://www.e-gen.or.kr/egen/holiday_medical.do'",
  "const YEOSU_GAGE_URL = 'https://yeosu-shop--review-j1knfdmo.web.app'",
  'function openHolidayMedicalGuide()',
  'function openYeosuGageGuide()',
  'function openUsedMarketGuide()',
  'function openLocalNewsGuide()',
  "$('#holidayMedicalBtn')?.addEventListener('click', openHolidayMedicalGuide)",
  "$('#yeosuGageBtn')?.addEventListener('click', openYeosuGageGuide)",
  "$('#usedMarketBtn')?.addEventListener('click', openUsedMarketGuide)",
  "$('#localNewsBtn')?.addEventListener('click', openLocalNewsGuide)"
]) {
  if (!app.includes(marker)) throw new Error(`missing preview gateway behavior: ${marker}`);
}

if (!css.includes('@media(max-width:380px){.yeosu-life-gateways{grid-template-columns:1fr}')) {
  throw new Error('mobile gateway layout contract missing');
}

if (/YEOSU_GAGE_URL[\s\S]{0,500}(?:order|주문방법)/.test(app)) {
  throw new Error('Yeosu Gage must remain separate from restaurant order routes');
}

for (const url of ['https://www.daangn.com/', 'https://m.bunjang.co.kr/', 'https://cafe.naver.com/joonggonara', 'https://map.naver.com/p/search/%EA%B3%B5%EC%A4%91%ED%99%94%EC%9E%A5%EC%8B%A4', 'https://www.iyosu.com/', 'https://www.yeosuro.com/', 'https://www.findall.co.kr/', 'https://www.yeosu.go.kr/www/', 'https://ysmbc.co.kr/']) {
  if (!app.includes(url)) throw new Error(`missing external directory URL: ${url}`);
}

console.log('PASS Yeosu life medical, Yeosu Gage, marketplace and local information preview gateways');
