import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const coverage = read('data/all-store-campaign-coverage.json');
const hero = read('data/hero-campaigns.json');
const manifest = read('data/store-campaign-links.json');
const links = new Map(manifest.campaigns.map(item => [item.storeId, item]));
const ids = new Set(coverage.catalogIds);
const added = new Set(coverage.addedCampaignIds);

assert.equal(coverage.sourceCatalogCount, 2388, '2026-09-23 고객용 전체 가게 스냅샷 수를 보존해야 합니다.');
assert.equal(ids.size, coverage.sourceCatalogCount, '전체 가게 ID가 중복되면 안 됩니다.');
assert.equal(coverage.addedCampaignCount, 1913, '기존 전용화면을 제외한 신규 전용화면 수를 보존해야 합니다.');
assert.equal(added.size, coverage.addedCampaignCount, '신규 전용화면 ID가 중복되면 안 됩니다.');

for (const id of ids) {
  const campaign = hero.campaigns[id];
  const link = links.get(id);
  assert.ok(campaign, `${id}: 전체 가게에 전용화면이 있어야 합니다.`);
  assert.ok(link, `${id}: 전체 가게에 전용 링크가 있어야 합니다.`);
  assert.equal(campaign.storeId, id);
  assert.equal(link.url, `https://daedongmap.com/?hero=${id}`);
  assert.equal(link.previewUrl, `https://preview.daedongmap.com/?hero=${id}`);
}

for (const id of added) {
  const campaign = hero.campaigns[id];
  const link = links.get(id);
  assert.equal(campaign.layout, 'food14-plus3');
  assert.equal(campaign.menuHydration, 'runtime');
  assert.ok(Array.isArray(campaign.slides) && campaign.slides.length >= 1 && campaign.slides.length <= 3);
  assert.ok(campaign.slides.every(slide => slide.storeId === id && slide.image && slide.title === campaign.title));
  assert.equal(link.qrAsset, `assets/qr/all-${id}.svg`);
  assert.ok(fs.existsSync(link.qrAsset), `${id}: QR SVG가 있어야 합니다.`);
  const svg = fs.readFileSync(link.qrAsset, 'utf8');
  assert.match(svg, new RegExp(`data-target-url="https://daedongmap\\.com/\\?hero=${id}"`));
  const size = Number(svg.match(/viewBox="0 0 (\d+) \1"/)?.[1]);
  assert.equal(size, 41, `${id}: 작은 인쇄용 QR은 33모듈 본체와 4모듈 인식영역을 유지해야 합니다.`);
  const cells = [...svg.matchAll(/M(\d+) (\d+)h1v1h-1z/g)].map(match => [Number(match[1]), Number(match[2])]);
  assert.ok(cells.length > 0);
  assert.ok(Math.min(...cells.flat()) >= 4, `${id}: QR 필수 흰색 인식영역이 잘리면 안 됩니다.`);
  assert.ok(Math.max(...cells.flat()) <= 36, `${id}: QR 필수 흰색 인식영역이 잘리면 안 됩니다.`);
}

assert.equal(new Set(manifest.campaigns.map(item => item.storeId)).size, manifest.campaigns.length, '전용 링크 ID가 중복되면 안 됩니다.');
console.log(`All-store dedicated campaigns: ${coverage.sourceCatalogCount} catalog stores covered; ${coverage.addedCampaignCount} new; print-safe QR quiet zones verified`);
