import fs from 'node:fs';
import vm from 'node:vm';

const checks = [];
const errors = [];
const check = (condition, message) => (condition ? checks : errors).push(message);
const read = file => fs.readFileSync(file, 'utf8');

for (const file of [
  'index.html',
  'app.css',
  'app.js',
  'data-api.js',
  'data-api-runtime.js',
  'final-experience.css',
  'final-experience.js',
  'data/naver-map-runtime.json',
  'data/phone-order-runtime.json'
]) check(fs.existsSync(file), `필수 파일 존재: ${file}`);

const index = read('index.html');
const app = read('app.js');
const dataApi = read('data-api.js');
const dataApiRuntime = read('data-api-runtime.js');
const finalExperience = read('final-experience.js');

for (const [file, source] of [
  ['app.js', app],
  ['data-api.js', dataApi],
  ['data-api-runtime.js', dataApiRuntime],
  ['final-experience.js', finalExperience]
]) {
  try {
    new vm.Script(source, {filename: file});
    check(true, `${file} 문법 검사`);
  } catch (error) {
    errors.push(`${file} 문법 오류: ${error.message}`);
  }
}

check(index.includes('id="locationBtn"'), '위치 설정 버튼 유지');
check(index.includes('id="homeShareBtn"'), '홈 공유 버튼 유지');
check(index.includes('id="heroTrack"'), '메인 슬라이드 유지');
check(index.includes('id="storeGrid"'), '가게 목록 유지');
check(index.includes('id="startupAd" class="startup-ad" hidden'), '첫 접속 모집 팝업 중단 유지');
check(!index.includes('가게카드 보기'), '메인 슬라이드 가게카드 보기 제거 유지');
check(!index.includes('콩산소 전용 대동여수음식지도'), '콩산소 전용 표기 제거 유지');
check(!index.includes('손수김밥 전용 대동여수음식지도'), '손수김밥 전용 표기 제거 유지');
check(index.includes('anonymous-analytics-1'), '운영 분석 코드 캐시 버전');
check(index.indexOf('data-api.js') < index.indexOf('app.js'), '보안 API를 앱보다 먼저 연결');
check(index.indexOf('data-api-runtime.js') < index.indexOf('app.js'), '가게 상세 API를 앱 코어보다 먼저 연결');
check(app.includes('await secureDetail.enrich(store, normalizedStore)'), '가게 상세를 완전히 받은 뒤 최종 화면 표시');
check(!app.includes('data/stores.json'), '공개 가게 원본 런타임 참조 제거');
check(app.includes('window.daedongDataApi?.catalog?.({timeoutMs: 6500})'), '가게 목록 보안 API 사용');
check(!index.includes('ddangyo-menu-map.js'), '공개 메뉴 경로표 런타임 제거');
check(!index.includes('ddangyo-preview-runtime.js'), '공개 보강 원본 런타임 제거');

check(app.includes("const ANALYTICS_ENDPOINT = 'https://daedong-yeosu-admin.sisakim.chatgpt.site/api/events'"), '관리자 통계 수집 주소');
check(app.includes("sendAnalyticsEvent('visit'"), '방문 통계 이벤트');
check(app.includes("sendAnalyticsEvent('store_open'"), '가게 열람 통계 이벤트');
check(app.includes("'order_click'"), '주문경로 통계 이벤트');
check(app.includes("'utility_click'"), '지도·상품권 통계 분리');
check(app.includes('navigator.sendBeacon'), '페이지 이동을 막지 않는 전송');
check(app.includes("params.has('hero')"), '가게 QR 주소 호환');
check(app.includes("params.has('store')"), '가게 공유 주소 호환');

const report = {
  success: errors.length === 0,
  pass: checks.length,
  warn: 0,
  fail: errors.length,
  checks,
  warnings: [],
  errors
};
fs.writeFileSync('static-validation-report.json', `${JSON.stringify(report, null, 2)}\n`);
for (const item of checks) console.log('PASS', item);
for (const item of errors) console.error('FAIL', item);
if (errors.length) process.exit(1);
