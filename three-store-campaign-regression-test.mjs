import assert from 'node:assert/strict';
import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import vm from 'node:vm';

const read = file => readFileSync(file, 'utf8');
const hash = value => createHash('sha256').update(typeof value === 'string' ? value : JSON.stringify(value)).digest('hex');
const clone = value => JSON.parse(JSON.stringify(value));
const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value).forEach(freeze);
  }
  return value;
};
const source = read('rc6-fixes.js');
const apiLine = read('data-api.js').split(/\r?\n/).find(line => /\bconst BASE_URL\s*=/.test(line)) || '';
const production = apiLine.includes("'https://daedong-yeosu-data-api.sisakim.workers.dev'");
assert.ok(production || apiLine.includes("'https://daedong-yeosu-data-api-preview.sisakim.workers.dev'"), 'Known API environment required');
const mediaHost = production ? 'daedong-yeosu-data-api.sisakim.workers.dev' : 'daedong-yeosu-data-api-preview.sisakim.workers.dev';
const data = JSON.parse(read('data/hero-campaigns.json'));
const links = JSON.parse(read('data/store-campaign-links.json'));
const targets = JSON.parse(read('data/banner-targets.json'));
const adKeys = ['18', '19', '20'];

// Only public campaign metadata is pinned here. Private menu source records and
// complete menu inventories must never be copied into this repository.
const approved = [
  {id:'2017de4f9111f3ce', name:'김사장 삼겹 통김치찜', slug:'kim-samgyeop-kimchi-jjim',
    first:'1인분 삼겹살 통김치찜', content:'ff5e66c9caa2baf12844d618b91c6469d84255d8c0a5ca921d645c9550ede331',
    qr:'a98dfa2bb0b26c9fa31706b8285b5505dfffda55530d393ade74be50c6270ae9'},
  {id:'93ae27237a8e75c4', name:'메밀꽃 필 막국수', slug:'memil-flower-makguksu',
    first:'속풀이 메밀꽃 물막국수', content:'c5b9b9ac872bb317a42fc6c98e128b4f1e3ed9935e0f33918594a6088bd96ef1',
    qr:'d75430e7f372a5364550f1aa0c04cd64422ae349080544f5d91ffc4eec8aa0bd'},
  {id:'1d691d8e74499d31', name:'조쉐프의 쌀국수', slug:'cho-chef-pho',
    first:'[주문율 1위] 소고기 쌀국수', content:'0de7d434106b04a7a1e1234f194d7f182b97f3f4af4b5464ab97b5cc67526ea7',
    qr:'c91455bb29817b90d9e12b806e7c505681b99553ea5ece090171b7c367214366'},
];

// Baseline HEAD: the Kongsanso eight-slide family and all existing virtual
// records are unchanged, including the production-only existing virtual store.
assert.equal(data.campaigns.cfde2617224f33a0.slides.length, 8);
assert.equal(hash(data.campaigns.cfde2617224f33a0), '917ab83086f1299c22573a67254e614f55367bbc76ee11a60934adc6b0c6d264');
assert.equal(hash(data.virtualStores), production
  ? '24a766e6d06eabe45598fedf09e2b1c426296683caff19d877f2acc548ebab87'
  : '88eb6fcedc47abfe3601ff841934f2a4d2e60efd0826e805de20614949dfd254');
assert.equal(hash(adKeys.map(key => targets[key])), '21ac623690772af84a5052fe04660132868f5c85290895a1710e486ff69c7615', 'The three original advertisements must not change');

const start = source.indexOf('function rc6CampaignHeroEntries(){');
const end = source.indexOf('\nfunction rc6HeroEntries()', start);
assert.ok(start >= 0 && end > start, 'Execute the actual campaign runtime');
const constants = [...source.matchAll(/^const RC6_CAMPAIGN_(?:STORE_HERO_LIMIT|SPECIAL_HERO_KEYS)=[^\r\n]+/gm)].map(match => match[0]).join('\n');
const script = new vm.Script(constants + '\n' + source.slice(start, end) + '\nrc6CampaignHeroEntries();');
function render(campaign) {
  const input = freeze(clone(campaign));
  const before = JSON.stringify(input);
  const store = {id:input.storeId, name:input.title, area:'문수동', cat:'음식'};
  const context = vm.createContext({
    RC6_IS_GOHEUNG:false,
    rc6RequestedHeroCampaign:() => ({campaign:input, store}),
    rc6CampaignStoreById:id => String(id) === store.id ? store : null,
    rc6BannerTargets:freeze(clone(targets)),
    HERO_BANNERS:Array.from({length:21}, () => ({})),
  });
  const entries = clone(script.runInContext(context, {timeout:1000}));
  assert.equal(JSON.stringify(input), before, 'Runtime must not mutate public campaign data');
  return entries;
}

const photoReferences = [];
for (const spec of approved) {
  const campaign = data.campaigns[spec.id];
  assert.ok(campaign, spec.name + ': dedicated campaign required');
  assert.equal(campaign.storeId, spec.id);
  assert.equal(campaign.title, spec.name);
  assert.equal(campaign.slug, spec.slug);
  assert.equal(campaign.layout, 'food14-plus3');
  assert.equal(campaign.slides.length, 14);
  assert.equal(campaign.slides[0].meta, spec.first, 'First slide must be the approved representative dish');
  assert.equal(new Set(campaign.slides.map(slide => slide.image)).size, 14);
  assert.equal(data.virtualStores[spec.id], undefined, 'Do not shadow the live canonical store');
  assert.equal(hash(JSON.stringify(campaign).replaceAll(
    'daedong-yeosu-data-api-preview.sisakim.workers.dev', 'daedong-yeosu-data-api.sisakim.workers.dev')),
    spec.content, 'Approved owner/title/photo/menu-caption/order snapshot changed');
  assert.doesNotMatch(JSON.stringify(campaign), /(?:ddangyo|yogiyo|coupang)-[0-9]|__sourceIds|__variants|itemId|menuId/, 'No private menu source identifiers');
  for (const slide of campaign.slides) {
    assert.deepEqual(Object.keys(slide).sort(), ['image', 'meta', 'storeId', 'title']);
    assert.equal(slide.storeId, spec.id);
    assert.equal(slide.title, spec.name);
    assert.ok(typeof slide.meta === 'string' && slide.meta.trim());
    assert.doesNotMatch(slide.title + ' ' + slide.meta, /\d[\d,]*\s*원|[₩￦]|\bWOW\b|와우\s*회원|배달비|할인\s*가격/i);
    const image = new URL(slide.image);
    assert.equal(image.protocol, 'https:');
    assert.equal(image.search, '');
    assert.equal(image.hash, '');
    if (image.hostname === 'dwdwaxgahvp6i.cloudfront.net') {
      assert.match(image.pathname, /^\/shbimg\/biz\/img\/\d{4}\/\d{2}\/[a-f0-9-]+\.jpg$/);
    } else {
      assert.equal(image.hostname, mediaHost, 'Media worker must match this environment');
      assert.match(image.pathname, /^\/api\/media\/yogiyo-menu\/v1\/[a-f0-9]{64}\.jpg$/);
    }
    photoReferences.push(image.pathname);
  }

  const entries = render(campaign);
  const foods = entries.filter(entry => entry.kind === 'store');
  const ads = entries.filter(entry => entry.kind === 'notion');
  assert.equal(entries.length, 17);
  assert.equal(foods.length, 14);
  assert.equal(ads.length, 3);
  assert.equal(new Set(entries.map(entry => entry.key)).size, 17);
  assert.deepEqual(foods.map(entry => [entry.store.id, entry.campaignTitle, entry.campaignMeta, entry.banner.desktop, entry.banner.mobile]),
    campaign.slides.map(slide => [spec.id, spec.name, slide.meta, slide.image, slide.image]));
  assert.ok(foods.every(entry => entry.presentation === 'campaign-photo' && entry.campaignShowCopy === true));
  assert.deepEqual(ads.map(entry => entry.key), adKeys.map(key => 'campaign-notion-' + key));
  assert.deepEqual(entries.flatMap((entry, index) => entry.kind === 'notion' ? [index] : []), [4, 9, 14]);
  assert.deepEqual(ads.map(entry => [entry.target.notionUrl, entry.banner.desktop, entry.banner.mobile, entry.store]),
    adKeys.map(key => [targets[key].notionUrl, targets[key].image, targets[key].image, null]));
  assert.deepEqual(render(campaign), entries, 'Campaign projection is deterministic');

  const matching = links.campaigns.filter(link => link.storeId === spec.id);
  assert.equal(matching.length, 1);
  const link = matching[0];
  assert.equal(link.name, spec.name);
  assert.equal(link.url, 'https://daedongmap.com/?hero=' + spec.id);
  assert.equal(link.previewUrl, 'https://preview.daedongmap.com/?hero=' + spec.id);
  assert.equal(link.qrAsset, 'assets/qr/' + spec.slug + '.svg');
  for (const field of ['url', 'previewUrl', 'qrAsset']) {
    assert.equal(links.campaigns.filter(other => other[field] === link[field]).length, 1, field + ' must be unique');
  }
  assert.ok(existsSync(link.qrAsset));
  const svg = read(link.qrAsset);
  assert.equal(hash(svg.replace(/\r\n/g, '\n')), spec.qr, 'Issued QR content changed');
  assert.match(svg, /<svg[^>]+viewBox=/);
  assert.deepEqual([...svg.matchAll(/<desc>([\s\S]*?)<\/desc>/g)].map(match => match[1]), [link.url.replaceAll('&', '&amp;')]);
  // This static check pins already issued bytes and destination metadata.
  // Actual pixel decoding is performed by the private QR acceptance workflow.
}
assert.equal(new Set(photoReferences).size, 42, 'No selected photo URL is repeated across the three campaigns');
assert.match(source, /hero-campaigns\.json\?v=[^'\n]*three-store-campaign-1/);
assert.match(read('final-experience.js'), /rc6-fixes\.js\?v=[^'\n]*three-store-campaign-1/);
assert.match(read('index.html'), /final-experience\.js\?v=[^"\n]*three-store-campaign-1/);
assert.match(read('index.html'), /menu-family-model\.js\?v=[^"\n]*three-store-campaign-1/);
console.log('three-store-campaign-regression-test: pass (3 campaigns; 42 foods + 9 original ads; 3 issued QR assets; baseline family/virtual records preserved)');
