import assert from 'node:assert/strict';
import fs from 'node:fs';

const home = fs.readFileSync(new URL('./index.html', import.meta.url), 'utf8');
const delivery = fs.readFileSync(new URL('./delivery/index.html', import.meta.url), 'utf8');
const robots = fs.readFileSync(new URL('./robots.txt', import.meta.url), 'utf8');
const sitemap = fs.readFileSync(new URL('./sitemap.xml', import.meta.url), 'utf8');

const readJsonLd = source => [...source.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
  .map(match => JSON.parse(match[1]));

assert.ok(readJsonLd(home).length >= 1, '메인 페이지 구조화 데이터가 유효한 JSON이어야 합니다.');
assert.ok(readJsonLd(delivery).length >= 1, '배달대행 페이지 구조화 데이터가 유효한 JSON이어야 합니다.');

assert.match(home, /<title>여수맛지도 \| 여수 음식점·메뉴·주문앱 한눈에<\/title>/);
assert.match(home, /<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1">/);
assert.match(home, /<meta name="Yeti" content="index,follow">/);
assert.match(home, /<link rel="canonical" href="https:\/\/daedongmap\.com\/">/);
assert.match(home, /"@type": "WebSite"/);
assert.match(home, /"name": "여수맛지도"/);

assert.match(delivery, /<title>여수 배달대행 \| 맛지도 배달대행<\/title>/);
assert.match(delivery, /<meta name="Yeti" content="index,follow">/);
assert.match(delivery, /"@type": "LocalBusiness"/);
assert.match(delivery, /"name": "맛지도 배달대행"/);
assert.match(delivery, /"name": "여수 음식 배달대행"/);
assert.match(delivery, /"name": "공공주문앱 전문배송"/);
assert.match(delivery, /"telephone": "\+82-10-4797-7803"/);

assert.match(robots, /^User-agent: \*$/m);
assert.match(robots, /^Allow: \/$/m);
assert.doesNotMatch(robots, /^Disallow: \/s\/$/m);
assert.doesNotMatch(robots, /^Disallow: \/m\/$/m);
assert.match(robots, /^Sitemap: https:\/\/daedongmap\.com\/sitemap\.xml$/m);

assert.match(sitemap, /<loc>https:\/\/daedongmap\.com\/<\/loc>/);
assert.match(sitemap, /<loc>https:\/\/daedongmap\.com\/delivery\/<\/loc>/);
assert.doesNotMatch(sitemap, /https:\/\/daedongmap\.com\/s\//);
assert.doesNotMatch(sitemap, /https:\/\/daedongmap\.com\/m\//);

console.log('SEO discovery regression checks passed');
