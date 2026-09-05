import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';

const approved = [
  ['7bc7239e6b509c44','수라상궁조선국밥 여서점'],
  ['d86586aaef8454c9','조선밀면&냉면 여수여서점'],
  ['84c118675c0caa4c','바오탕수 여서점'],
  ['04910f606ba038a6','오워래 수제돈까스 여서점'],
];
const read = file => readFileSync(file,'utf8');
const data = JSON.parse(read('data/hero-campaigns.json'));
const links = JSON.parse(read('data/store-campaign-links.json'));
for(const [id,name] of approved){
  const campaign = data.campaigns[id];
  assert.ok(campaign,`${name}: dedicated campaign must exist`);
  assert.equal(campaign.storeId,id);
  assert.equal(campaign.title,name);
  assert.equal(campaign.slides.length,8,`${name}: eight verified food photos must be preserved`);
  assert.equal(new Set(campaign.slides.map(s=>s.image)).size,8);
  assert.equal(data.virtualStores?.[id],undefined,'Existing live store must not be shadowed by copied routes');
  for(const slide of campaign.slides){
    assert.equal(slide.storeId,id,'Another store must never be shown in this dedicated campaign');
    assert.equal(slide.title,name);
    assert.match(slide.image,/^https:\/\/dwdwaxgahvp6i\.cloudfront\.net\/shbimg\/biz\/img\//);
    assert.ok(slide.meta.trim());
    assert.doesNotMatch(slide.meta,/\d[\d,]*\s*원|와우\s*회원|^(?:코카콜라|콜라|사이다)(?:\s|$)|배달비|공기밥추가|깍두기추가/);
  }
  const matches = links.campaigns.filter(x=>x.storeId===id);
  assert.equal(matches.length,1);
  const link = matches[0];
  assert.equal(link.name,name);
  assert.equal(link.url,`https://daedongmap.com/?hero=${id}`);
  assert.equal(link.previewUrl,`https://preview.daedongmap.com/?hero=${id}`);
  assert.ok(existsSync(link.qrAsset));
  const svg = read(link.qrAsset);
  assert.ok(svg.includes(`<desc>${link.url.replace(/&/g,'&amp;')}</desc>`),'QR metadata must identify its permanent destination');
  assert.match(svg,/<svg[^>]+viewBox=/);
}
assert.match(read('rc6-fixes.js'),/hero-campaigns\.json\?v=store-campaign-standard-1-four-store-qr-1/);
assert.match(read('final-experience.js'),/rc6-fixes\.js\?v=[^'\n]*four-store-qr-1/);
assert.match(read('index.html'),/final-experience\.js\?v=[^"\n]*four-store-qr-1/);
console.log('four-store-campaign-regression-test: pass');
