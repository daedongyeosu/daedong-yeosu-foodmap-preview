import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source = readFileSync('rc6-fixes.js', 'utf8');
const api = readFileSync('data-api.js', 'utf8');
const apiBase = api.split(/\r?\n/).find(line => /\bconst BASE_URL\s*=/.test(line)) || '';
const production = apiBase.includes("'https://daedong-yeosu-data-api.sisakim.workers.dev'");
assert.ok(production || apiBase.includes("'https://daedong-yeosu-data-api-preview.sisakim.workers.dev'"), 'Known API environment required');
const start = source.indexOf('function rc6CampaignHeroEntries(){');
const end = source.indexOf('\nfunction rc6HeroEntries()', start);
assert.ok(start >= 0 && end > start, 'Test must execute the actual campaign runtime function');
const functionSource = source.slice(start, end);
const constants = [...source.matchAll(/^const RC6_CAMPAIGN_(?:STORE_HERO_LIMIT|SPECIAL_HERO_KEYS)=[^\r\n]+/gm)].map(match => match[0]).join('\n');
const script = new vm.Script(constants + '\n' + functionSource + '\nrc6CampaignHeroEntries();');
const clone = value => JSON.parse(JSON.stringify(value));
const fixtureStore = {id:'fixture-store', name:'Fixture Store', area:'Fixture Area', cat:'Food'};
const fixturePeer = {id:'fixture-peer', name:'Fixture Peer', area:'Fixture Area', cat:'Food'};
const targets = Object.fromEntries(['18','19','20','99'].map(key => [key, {
  label:'Fixture advertisement ' + key,
  status:'notion',
  notionUrl:'https://example.test/advertisement/' + key,
  image:'https://example.test/advertisement/' + key + '.jpg',
}]));
function slides(count) {
  return Array.from({length:count}, (_, index) => ({
    storeId:fixtureStore.id, image:'https://example.test/food/' + index + '.jpg',
    title:fixtureStore.name, meta:'Fixture Food ' + index,
  }));
}
function campaign(count, extra = {}) {
  return {storeId:fixtureStore.id, title:fixtureStore.name, label:'Fixture Campaign', slides:slides(count), ...extra};
}
function freeze(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
}
function execute(input, options = {}) {
  const stableInput = freeze(clone(input));
  const before = JSON.stringify(stableInput);
  const storeList = options.stores || [fixtureStore, fixturePeer];
  const byId = new Map(storeList.map(store => [String(store.id), store]));
  const store = byId.get(String(stableInput.storeId));
  const context = vm.createContext({
    RC6_IS_GOHEUNG: options.goheung || false,
    rc6RequestedHeroCampaign: () => options.noRequest ? null : {campaign:stableInput, store},
    rc6CampaignStoreById: id => byId.get(String(id)),
    rc6CampaignMenuSlides: new Map(),
    rc6BannerTargets: freeze(clone(options.targets || targets)),
    HERO_BANNERS: Array.from({length:21}, () => ({})),
  });
  const result = clone(script.runInContext(context, {timeout:1000}));
  assert.equal(JSON.stringify(stableInput), before, 'Projection must not mutate campaign input');
  return result;
}

let checks = 0;
function check(name, run) {
  run();
  checks++;
}
function assertStandard(entries, expectedFoods = 14, expectedTargets = targets) {
  const foods = entries.filter(entry => entry.kind === 'store');
  const ads = entries.filter(entry => entry.kind === 'notion');
  assert.equal(foods.length, expectedFoods);
  assert.equal(ads.length, 3);
  assert.equal(entries.length, expectedFoods + 3);
  assert.deepEqual(ads.map(entry => entry.key), ['campaign-notion-18','campaign-notion-19','campaign-notion-20']);
  assert.deepEqual(ads.map(entry => [entry.banner.desktop, entry.target.notionUrl]),
    ['18','19','20'].map(key => [expectedTargets[key].image, expectedTargets[key].notionUrl]));
  assert.equal(new Set(foods.map(entry => entry.key)).size, expectedFoods);
  if (expectedFoods === 14) assert.deepEqual(entries.flatMap((entry, index) => entry.kind === 'notion' ? [index] : []), [4,9,14]);
}
check('Explicit layout yields exactly fourteen food slides and three original advertisements', () => {
  const entries = execute(campaign(14, {layout:'food14-plus3'}));
  assertStandard(entries);
  assert.deepEqual(entries.filter(entry => entry.kind === 'store').map(entry => entry.campaignMeta), slides(14).map(slide => slide.meta));
});
check('More than fourteen photos are capped without reordering', () => {
  const entries = execute(campaign(20, {layout:'food14-plus3'}));
  assertStandard(entries);
  assert.deepEqual(entries.filter(entry => entry.kind === 'store').map(entry => entry.banner.desktop), slides(14).map(slide => slide.image));
});
check('Insufficient food photos are never duplicated to fill the target', () => {
  assertStandard(execute(campaign(8, {layout:'food14-plus3'})), 8);
});
check('Standard layout ignores legacy unrelated advertisement keys', () => {
  assertStandard(execute(campaign(14, {layout:'food14-plus3', specialBannerKeys:['99','99']})));
});
check('Invalid photo rows are filtered before applying the fourteen-photo cap', () => {
  const input = campaign(15, {layout:'food14-plus3'});
  input.slides.unshift({...input.slides[0], image:''}, {...input.slides[0], storeId:'missing-fixture-store'});
  assertStandard(execute(input));
});
check('Missing advertisement data is not guessed or replaced by a foreign advertisement', () => {
  const broken = clone(targets);
  delete broken['19'];
  const entries = execute(campaign(14, {layout:'food14-plus3'}), {targets:broken});
  assert.equal(entries.length, 16);
  assert.deepEqual(entries.filter(entry => entry.kind === 'notion').map(entry => entry.key), ['campaign-notion-18','campaign-notion-20']);
});
for (const value of [undefined, null, false, true, '', 'Food14-plus3', 'food14-plus3 ', 'food14-plus-three', ['food14-plus3'], {layout:'food14-plus3'}]) {
  check('Every dedicated campaign uses the common fourteen-plus-three contract: ' + JSON.stringify(value), () => {
    const input = campaign(20, {layout:value, specialBannerKeys:['99','18'], copySlides:[1,3]});
    input.slides[1].storeId = fixturePeer.id;
    input.slides[2].showCopy = false;
    const entries = execute(input);
    assertStandard(entries);
    assert.deepEqual(entries.filter(entry => entry.kind === 'store').map(entry => entry.banner.desktop), slides(14).map(slide => slide.image));
  });
}
check('Legacy image-only campaigns use the common fourteen-plus-three contract', () => {
  const input = campaign(0, {images:slides(16).map(slide => slide.image), meta:'Fixture Legacy', specialBannerKeys:['99']});
  assertStandard(execute(input));
});
check('No request and isolated region produce no campaign entries', () => {
  const input = campaign(14, {layout:'food14-plus3'});
  assert.deepEqual(execute(input, {noRequest:true}), []);
  assert.deepEqual(execute(input, {goheung:true}), []);
});
check('Projection is deterministic', () => {
  const input = campaign(14, {layout:'food14-plus3'});
  assert.deepEqual(execute(input), execute(input));
});
const actualData = JSON.parse(readFileSync('data/hero-campaigns.json', 'utf8'));
const actualTargets = JSON.parse(readFileSync('data/banner-targets.json', 'utf8'));
let legacyCampaigns = 0;
for (const input of Object.values(actualData.campaigns)) {
  if (input.layout === 'food14-plus3') continue;
  check('Existing unflagged campaign uses the common dedicated-store contract', () => {
    const ids = [...new Set([input.storeId, ...(input.slides || []).map(slide => slide.storeId || input.storeId)])];
    const storeList = ids.map(id => ({id, name:'Fixture Existing Store', area:'Fixture Area', cat:'Food'}));
    const options = {stores:storeList, targets:actualTargets};
    const validPhotos = input.slides?.length
      ? input.slides.filter(slide => slide?.image && ids.includes(slide.storeId || input.storeId)).length
      : (input.images || []).filter(Boolean).length;
    assertStandard(execute(input, options), Math.min(validPhotos, 14), actualTargets);
  });
  legacyCampaigns++;
}
console.log('campaign-layout-14-plus-3-regression-test: pass (' + checks + ' checks; ' +
  (production ? 'production' : 'preview') + '; ' + legacyCampaigns + ' existing unflagged campaigns standardized)');
