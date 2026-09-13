import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import crypto from 'node:crypto';

const service = fs.readFileSync('store-service-info.js','utf8');
const rc2 = fs.readFileSync('rc2-fixes.js','utf8');
const decorate = service.slice(service.indexOf('function decorateStoreCards()'),service.indexOf('function decorateStoreDetails()'));
const observed = service.slice(service.indexOf('const serviceSurfaceSelector ='),service.indexOf('const serviceDecorationSelector ='));
for (const selector of ['#modalContent .store-card[data-id]', '.app-browser-card[data-channel-store-id]',
  '.personal-store-row[data-personal-store]', '.rail-card[data-rail-card-store]', '.rc5-category-card[data-rc5-store]',
  '.channel-store-card[data-channel-store-id]', '.app-browser-card[data-search-store-id]',
  '.app-browser-card[data-app-store-id]', '.phone-order-card[data-phone-store-id]',
  '.phone-order-card[data-phone-route-store-id]', '[data-app-store-order]']) {
  assert.ok(decorate.includes(selector), `Status renderer missing ${selector}`);
  assert.ok(observed.includes(selector), `Newly opened surface not observed: ${selector}`);
}
assert.match(decorate,/storeStatus\(serviceInfoForStore\(storeId\)\)/,'Use existing verified hours and unknown state');
assert.match(decorate,/action\.before\(badge\)/,'Status must precede the detail action');
const start=rc2.indexOf('function rc2RepresentativeMethod(');
const end=rc2.indexOf('\n}',start)+2;
const context=vm.createContext({});
vm.runInContext(rc2.slice(start,end),context);
for(const store of [{id:'phone-only',phone:'0610000000'}, {id:'unhydrated',channelKeys:['mukkebi','ddangyo']}, {id:'brand'}]) {
  assert.equal(context.rc2RepresentativeMethod(store),'메뉴·주문방법 보기');
}
const rail=rc2.slice(rc2.indexOf('function rc2OpenRailList('),rc2.indexOf('fxAppBrowserMarkup ='));
assert.match(rail,/class="store-entry-action"/);
assert.match(rail,/data-channel-store-id/,'Keep the existing store-open handler');

const campaign=JSON.parse(fs.readFileSync('data/hero-campaigns.json')).campaigns.e57c51a4f6294349;
assert.equal(campaign.layout,'food14-plus3');
assert.equal(campaign.menuHydration,'curated-static');
assert.equal(campaign.storeHeroLimit,14);
assert.equal(campaign.slides.length,14);
const hashes=campaign.slides.map(slide=>{
  assert.equal(slide.storeId,'e57c51a4f6294349');
  assert.match(slide.image,/^assets\/campaigns\/gyegunsang-yeosu\/\d{2}\.webp$/);
  assert.ok(slide.meta.length>0);
  return crypto.createHash('sha256').update(fs.readFileSync(slide.image)).digest('hex');
});
assert.equal(new Set(hashes).size,14,'Fourteen distinct verified menu images');
const link=JSON.parse(fs.readFileSync('data/store-campaign-links.json')).campaigns.find(c=>c.storeId===campaign.storeId);
assert.equal(link.url,'https://daedongmap.com/?hero=e57c51a4f6294349');
assert.ok(fs.existsSync(link.qrAsset));
console.log('PASS: all store-entry surfaces, unhydrated multi-app copy, Gyegunsang 14-photo campaign and permanent QR');
