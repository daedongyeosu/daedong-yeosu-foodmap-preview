import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./delivery/index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./delivery/delivery.css', import.meta.url), 'utf8');
const sharedEntry = fs.readFileSync(new URL('./s/index.html', import.meta.url), 'utf8');

assert.match(html, /<title>여수 배달대행 \| 맛지도 배달대행<\/title>/);
assert.match(html, /<h1>배달만 하지 않습니다[\s\S]*가게가 알려지도록/);
assert.match(html, /여수맛지도를 직접 운영/);
assert.match(html, /가게 홍보부터 주문 연결·배달까지/);
assert.match(html, /연중무휴 · 24시간 배송/);
assert.match(html, /"openingHours": "Mo-Su 00:00-23:59"/);
assert.equal((html.match(/<details>/g) || []).length, 9, '차별점 6개와 필요한 FAQ 3개가 터치형 상세 설명으로 제공되어야 합니다.');
assert.match(html, /저수수료 주문 우선 안내[\s\S]*고객의 선택권을 지키면서 가게가 부담하는 수수료를 줄이는 데 도움/);
assert.match(html, /왜 이렇게 하나요\?/);
assert.match(html, /맛지도 배달대행을 이용하는 가게의 메뉴·사진·주문방법과 혜택을 여수맛지도에서 고객 위치에 따라 우선 소개/);
assert.match(html, /메인 우선 홍보/);
assert.match(html, /배달완료 문자로 지역경제 연결/);
assert.match(html, /먹깨비·땡겨요 같은 저수수료 공공·상생 주문앱/);
assert.match(html, /여수경제의 선순환/);
assert.doesNotMatch(html, /특정 배달 프로그램 전용 업체인가요\?/);
assert.match(html, /href="tel:01047977803"/);
assert.match(html, /href="mailto:sisakim@naver\.com"/);
assert.match(html, /class="header-map-link" href="\/"[^>]*>여수맛지도 보기<\/a>/, '배달대행 페이지 상단에서 여수맛지도 메인으로 바로 돌아갈 수 있어야 합니다.');
assert.match(html, /"@type": "LocalBusiness"/);
assert.match(html, /"name": "맛지도 배달대행"/);
assert.match(html, /"areaServed": \{"@type": "City", "name": "여수시"\}/);
assert.match(html, /\/assets\/delivery\/yeosu-taste-delivery-rider\.png/);
assert.doesNotMatch(html, /꼬르륵|스파이더|인프라|런 배달대행/);
assert.doesNotMatch(html, /(?:href|src)="[^"]*\/s\/?|shared-entry|shared-yeosu|referralProfiles/, '맛지도 배달대행 페이지는 공유 배달대행 전용 /s와 연결하거나 데이터를 섞으면 안 됩니다.');
assert.match(sharedEntry, /noindex,nofollow/, '공유 배달대행 /s 진입 정책은 기존대로 분리 유지해야 합니다.');
assert.doesNotMatch(sharedEntry, /delivery|맛지도 배달대행|010-4797-7803/, '공유 배달대행 /s에 맛지도 배달대행 업체정보를 추가하면 안 됩니다.');
assert.match(css, /@media\(max-width:560px\)/);
assert.match(css, /\.hero-art img\{width:min\(88vw,360px\);max-width:100%;height:auto/, '모바일 배달기사 사진은 화면 너비를 넘거나 지나치게 커지면 안 됩니다.');
assert.match(css, /\.mobile-call\{position:fixed/);

console.log('delivery business page regression checks passed');
