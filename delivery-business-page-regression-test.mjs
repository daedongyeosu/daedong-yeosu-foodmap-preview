import assert from 'node:assert/strict';
import fs from 'node:fs';

const html = fs.readFileSync(new URL('./delivery/index.html', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('./delivery/delivery.css', import.meta.url), 'utf8');
const sharedEntry = fs.readFileSync(new URL('./s/index.html', import.meta.url), 'utf8');

assert.match(html, /<title>여수 배달대행 \| 맛지도 배달대행<\/title>/);
assert.match(html, /<h1>배달만 하지 않습니다[\s\S]*가게가 알려지도록/);
assert.match(html, /여수맛지도를 직접 운영/);
assert.match(html, /가게 홍보부터 주문 연결·배달까지/);
assert.match(html, /href="tel:01047977803"/);
assert.match(html, /href="mailto:sisakim@naver\.com"/);
assert.match(html, /"@type": "LocalBusiness"/);
assert.match(html, /"name": "맛지도 배달대행"/);
assert.match(html, /"areaServed": \{"@type": "City", "name": "여수시"\}/);
assert.match(html, /\/assets\/delivery\/yeosu-taste-delivery-rider\.png/);
assert.doesNotMatch(html, /꼬르륵|스파이더|인프라|런 배달대행/);
assert.doesNotMatch(html, /(?:href|src)="[^"]*\/s\/?|shared-entry|shared-yeosu|referralProfiles/, '맛지도 배달대행 페이지는 공유 배달대행 전용 /s와 연결하거나 데이터를 섞으면 안 됩니다.');
assert.match(sharedEntry, /noindex,nofollow/, '공유 배달대행 /s 진입 정책은 기존대로 분리 유지해야 합니다.');
assert.doesNotMatch(sharedEntry, /delivery|맛지도 배달대행|010-4797-7803/, '공유 배달대행 /s에 맛지도 배달대행 업체정보를 추가하면 안 됩니다.');
assert.match(css, /@media\(max-width:560px\)/);
assert.match(css, /\.mobile-call\{position:fixed/);

console.log('delivery business page regression checks passed');
