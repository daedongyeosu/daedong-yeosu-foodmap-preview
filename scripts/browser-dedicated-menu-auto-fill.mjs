import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const storeId = process.env.CAMPAIGN_STORE_ID || '884d23981fd2429a';
const base = process.env.BASE_URL || 'https://daedongmap.com/';
const screenshotPath = process.env.OUTPUT_PATH || path.join(root, 'dedicated-menu-auto-fill.png');
const hero = JSON.parse(fs.readFileSync(path.join(root, 'data/hero-campaigns.json'), 'utf8'));
const campaign = hero.campaigns[storeId];
assert.ok(campaign?.layout === 'food14-plus3');
assert.ok(campaign.slides.length < 14, 'Fixture must prove runtime menu-photo filling instead of a completed static campaign');

let playwright;
try { playwright = await import('playwright'); }
catch (error) {
  if (!process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES) throw error;
  playwright = await import(pathToFileURL(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES, 'playwright/index.mjs')).href);
}

const browser = await playwright.chromium.launch({headless:true});
const context = await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,locale:'ko-KR',serviceWorkers:'block'});
await context.addInitScript(() => {
  sessionStorage.setItem('daedongCommunityIntroPlayedV4', '1');
  sessionStorage.setItem('daedongMukkebiIslandExpoEventSeenSessionV1', '1');
});
await context.route('**/api/events', route => route.fulfill({status:204,body:''}));
await context.route('**/*posthog.com/**', route => route.abort());
await context.route(new URL('/**', base).href, route => {
  const file = new URL(route.request().url()).pathname.slice(1) || 'index.html';
  if (!['index.html','final-experience.js','rc6-fixes.js','data/hero-campaigns.json','data/store-campaign-links.json'].includes(file)) return route.continue();
  return route.fulfill({
    status:200,
    body:fs.readFileSync(path.join(root, file)),
    contentType:file.endsWith('.json')?'application/json':file.endsWith('.js')?'application/javascript':'text/html',
  });
});

const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
await page.goto(new URL(`?hero=${storeId}`, base).href, {waitUntil:'domcontentloaded'});
const detail = page.locator(`#modal:not([hidden]) .store-detail:not(.store-detail-loading):not(.store-detail-degraded)[data-store-id="${storeId}"]`);
await detail.waitFor({timeout:30000});
await page.locator('#modal .modal-close').tap();
await page.waitForFunction(id => document.querySelector('#modal')?.hidden && new URL(location.href).searchParams.get('hero') === id, storeId);
await page.waitForFunction(id => {
  const entries = [...new Map([...document.querySelectorAll('#heroTrack > [data-hero-index]')].map(node => [node.dataset.heroIndex, node])).values()];
  return entries.filter(node => node.dataset.rc6BannerStore === id).length === 14
    && entries.filter(node => node.dataset.rc6BannerNotion).length === 3;
}, storeId, {timeout:30000});

const entries = await page.locator('#heroTrack > [data-hero-index]').evaluateAll(nodes => [...new Map(nodes.map(node => [node.dataset.heroIndex, {
  index:Number(node.dataset.heroIndex),
  storeId:node.dataset.rc6BannerStore || '',
  notion:node.dataset.rc6BannerNotion || '',
  image:node.querySelector('img')?.getAttribute('src') || '',
  title:node.querySelector('.rc6-store-hero-copy strong')?.textContent?.trim() || '',
  meta:node.querySelector('.rc6-store-hero-copy > span')?.textContent?.trim() || '',
}])).values()].sort((left,right) => left.index-right.index));
const foods = entries.filter(entry => entry.storeId);
const ads = entries.filter(entry => entry.notion);
assert.equal(entries.length, 17);
assert.equal(foods.length, 14);
assert.equal(ads.length, 3);
assert.ok(foods.every(entry => entry.storeId === storeId && entry.title === campaign.title && entry.meta));
assert.equal(new Set(foods.map(entry => entry.image)).size, 14, 'Runtime must use fourteen different menu photos');
assert.deepEqual(ads.map(entry => entry.index), [4,9,14]);
assert.equal(errors.length, 0, JSON.stringify(errors));
await page.locator(`#heroTrack > [data-rc6-banner-store="${storeId}"][data-hero-index="0"]`).first().locator('.rc6-store-hero-media > img').evaluate(image => image.decode());
await page.screenshot({path:screenshotPath});
console.log(JSON.stringify({success:true,storeId,name:campaign.title,foodSlides:foods.length,generalAds:ads.length,total:entries.length,screenshotPath}, null, 2));
await browser.close();
