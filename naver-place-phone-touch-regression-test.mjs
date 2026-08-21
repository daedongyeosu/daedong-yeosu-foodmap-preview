import assert from 'node:assert/strict';
import fs from 'node:fs';

const runtime = fs.readFileSync('data-api-runtime.js', 'utf8');
const rc3 = fs.readFileSync('rc3-fixes.js', 'utf8');
const experience = fs.readFileSync('final-experience.js', 'utf8');
const html = fs.readFileSync('index.html', 'utf8');

const helperStart = runtime.indexOf('function detailHasTrustedNaverPlace');
const helperEnd = runtime.indexOf('function mergeStoreDetails', helperStart);
assert.ok(helperStart >= 0 && helperEnd > helperStart, '상세 API의 네이버 장소 검증 함수를 유지해야 합니다.');

const {detailHasTrustedNaverPlace} = Function(`
  ${runtime.slice(helperStart, helperEnd)}
  return {detailHasTrustedNaverPlace};
`)();

const livingStore = {
  address: '전남 여수시 망마로 106 1층 생생연어',
  phone: '0507-1391-0226',
  naverMap: 'https://map.naver.com/p/entry/place/1511961967'
};
assert.equal(detailHasTrustedNaverPlace(livingStore), true,
  '주소와 전화가 일치하는 정확한 네이버 place URL은 고객 상세에 표시해야 합니다.');
assert.equal(detailHasTrustedNaverPlace({...livingStore, phone: ''}), false,
  '전화 검증 없이 새 네이버지도 링크를 자동 승인하면 안 됩니다.');
assert.equal(detailHasTrustedNaverPlace({...livingStore, naverMap: 'https://map.naver.com/p/search/생생연어'}), false,
  '검색 결과 URL은 특정 가게의 검증된 장소 링크로 취급하면 안 됩니다.');
assert.equal(detailHasTrustedNaverPlace({...livingStore, naverMap: 'https://example.com/p/entry/place/1511961967'}), false,
  '네이버 이외의 호스트는 지도 링크로 승인하면 안 됩니다.');

assert.match(runtime, /__verifiedPhysicalMapSource:\s*trustedPhysicalMapDetail/,
  '검증된 상세 API의 네이버 장소를 실제 상세 가게 객체에 전달해야 합니다.');
assert.match(rc3, /\{key: 'phone', name: '전화주문', phone, url: `tel:\$\{phone\}`\}/,
  '검증된 전화번호는 모바일에서 직접 누를 수 있는 tel 링크여야 합니다.');
assert.match(experience, /trusted-naver-place-1-direct-phone-link-1/,
  '휴대전화가 네이버지도·전화 수정본을 즉시 받도록 rc3 캐시 버전을 올려야 합니다.');
assert.match(html, /trusted-naver-place-1/,
  '상세 API 신뢰 규칙의 캐시 버전을 올려야 합니다.');
assert.match(html, /final-experience\.js\?v=[^"']*trusted-naver-place-1-direct-phone-link-1/,
  '상위 스크립트 캐시도 갱신해 새 rc3 전화 링크 수정본을 실제로 불러와야 합니다.');

console.log('Naver place and phone touch regression: PASS');
