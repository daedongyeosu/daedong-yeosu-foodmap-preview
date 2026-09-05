/* Display-only projection. Never changes API records or resolves store identity. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.daedongMenuFamilies = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 'menu-families-2-four-store-20260905';
  const tidy = value => String(value == null ? '' : value).normalize('NFKC').replace(/\s+/g, ' ').trim();
  const compact = value => tidy(value).toLowerCase().replace(/[^\p{L}\p{N}]/gu, '');
  const unique = values => [...new Set(values.map(value => String(value == null ? '' : value)).filter(Boolean))];
  const MEMBERSHIP = /(?:와우|wow)\s*회원/iu;
  const PRICE_KEY = /price|unitprc|(?:^|[_-])fee$|Fee$|가격|금액/iu;
  const PREFIX_PRICE = /(?:가격\s*[:：]?\s*)?(?:₩|\$|krw|usd)\s*(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?(?:\s*(?:원|krw|usd))?/giu;
  const SUFFIX_PRICE = /(?:가격\s*[:：]?\s*)?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:원|₩|krw|usd)(?:\s*[~～-]\s*(?:(?:₩|\$|krw|usd)\s*)?(?:\d{1,3}(?:,\d{3})+|\d+)(?:\.\d+)?\s*(?:원|₩|krw|usd)?)?/giu;
  const BARE_PRICE = /^(?:가격\s*[:：]?\s*)?(?:\d{1,3}(?:,\d{3})+|\d{4,6})$/u;
  const PROJECTION_KEYS = new Set(['__variants', '__familyKey', '__searchText', '__kind', '__quantity', '__quantityLabel', '__inputIndex', '__generatedId', '__menuFamilyVersion']);
  const has = (object, key) => Object.prototype.hasOwnProperty.call(object || {}, key);

  // Reviewed corrections use SHA-256 fingerprints, not a public source-menu
  // inventory. The tuple is [normalized store ID, exact source ID, tidy name].
  // Fingerprints are equality guards, not encryption or authentication.
  const REVIEWED_STORE_HASHES = new Set([
    '35dae42783bc9bf4f5276cba27b02eb434624d2523c93afaf2bcf1d17ef2c357',
    'f1c1fb5e77c430f08815be7ba7c4f84cb8517ccc956237d5e00a4b498850025b',
    'ce45065b3fe8459ca4a0180d1f474c166199f905fbe6ad1774bfe3e642f95011',
    '3ebed7b996fcc177f986b61d102b3ce89b908b3a6a54c5e8475c2ae94ce8c2a0'
  ]);
  const deliveryRule = { kind: 'notice', reason: 'reviewed-delivery-note', noteKind: 'delivery' };
  const headingRule = { kind: 'notice', reason: 'reviewed-section-heading', emptyDescription: true };
  const descriptionRule = { kind: 'notice', reason: 'reviewed-description-note', noteKind: 'description' };
  const REVIEWED_CLEANUP = new Map([
    ['9bb73f1f0b9c67961ec9a35aec3e25a75d57312810d1bd91e380ee11c5bb158f', deliveryRule],
    ['a75e9ce3506305693868f125987c0fd4664ccf7c9b9fc01b81bbeca78e9b1517', headingRule],
    ['53bed90594b02e73ac8a10db437f20703044ebd9786555e18bab7f2a3c6025f1', headingRule],
    ['fcb30a3ee15a4a5aa1e7502a0e179fca092dc88bfdb1e1416a6452ee277a9254', descriptionRule],
    ['9e74f2e31dde2bfaee4e0b7afaa9f15c76e77e051d65aa2a5befee8f29be6f76', descriptionRule],
    ['e65c4b94f1520839912d8b5939676969fa2cc1c90dc0f060d4244b8d797bf2f9', descriptionRule],
    ['c80ca6d4dc821f7ebe64a33c00a1748eb5d6cf3b54c423ec98baada3ebae14a0', descriptionRule],
    ['78cde0c73136f26a29e1709735073cd9b754f642532a28f95ed345059805109b', descriptionRule],
    ['abcb6a9651f10be08b33e1335197a3bfc5d891e9992d60c790b4f83d14db944f', { kind: 'drink' }],
    ['3fb1ba087f8a2217b8a42783e0322226f9159e49690ac6ee3fd6e8fa0bb13409', deliveryRule],
    ['6e084e48303123271bc85231cfb732ade4d740a2e34e8fc3f65819985f9f9767', headingRule],
    ['7ee6ebefe1703a80301e1392c5987ab9eef0a2c46b1ff99fba7139898b18f0b7', headingRule],
    ['f1887a4d447da62e59d679315285b6c5a6c81b89ca7ba1646972bbc3edba270f', headingRule],
    ['d79e9f13d36a9c3850aeb8d2efd8dbcc6f9140235355f5ec92ed087ce90a74de', headingRule],
    ['e813b7d43b6822b4ef345f96170b01195f832635f4a75b251120be1fdcb35331', descriptionRule],
    ['6b0927ac4eee39cddc0e7a7cdfbd6268fef03c870c8a8c1e0667244b030d23ca', descriptionRule],
    ['03f48a29a25c4c200b80fd2d9657f880ab97dbbdc4a9924c4248f1bb5ec8dd8d', { kind: 'drink' }],
    ['4b5b9ee75f4d18e3fdf6dc1035d1b16c0b18bddd5df34746bf9e3efcc2dbbdfc', { count: 2 }],
    ['0468f2e74d63f7c5187ef20bb30c75e6e0932074c3538ff3609c0c6e9b4ffefa', { count: 2 }],
    ['b9dd90c0966debbc0bdd416a2cae1f63fdad3c6729a02c832b9476f9fee67f17', { count: 4 }],
    ['63929b890508c67a7562683ab710c1a640092e0ec8dff910dc375645e75797a6', { count: 4 }],
    ['2d9fb4be689426eddcb823e78fd57d665028c24cd20d383baa504dd0bb628287', deliveryRule],
    ['6ab9792f153fcb923d6e53eb7fbabb7113c3467bbbf0720c15df40294611c7bf', { kind: 'option' }],
    ['722643c721b7f5c1481068ac3231195f7165294a22249850cc3c7760ee3928c3', { kind: 'option' }],
    ['ed7ded05392c37ece928103675f346f98741275f40aea65102fd2a5aa6d68941', { kind: 'option' }],
    ['b46dbfda8153e157a57dc9603895cd25e34d75240200516178ab8f4c7c70be27', { kind: 'option' }],
    ['6d11b1b65f04110decc8c1f33e97fd19f2d4171731d3b5e4f41190fa1987a902', { kind: 'option' }],
    ['dcec24af1418c354682c7b92c35030260d131c299b20cbcf6ef28d9fd2b64be0', { kind: 'option' }],
    ['b7023e665f126df350bc4b3808df0f86cd5843e06db668e533108eef59599d5e', { kind: 'option' }],
    ['a678f7e72499dbfe72236f02be8c9fda004a5f4ccdb9b368f4e3661f7995b6fe', { kind: 'option' }],
    ['969d98ad70283b18a1959cedc20108da87fce3874712ef40300e6a7e2e39eacc', { correctCheeseTypo: true }],
    ['7e1c4043b55f8116a74a2c26b656d62bbfdf3685843e7879d4041b7e788b0340', deliveryRule],
    ['faf3e24d16f3bf7c4252df6508044b068d76167b0986b1cc48356217f44946ef', { kind: 'drink' }]
  ]);
  const reviewedStoreCache = new Map();

  // Synchronous UTF-8 SHA-256 keeps project()/search synchronous in browsers.
  // No runtime dependencies, network requests or secret material are involved.
  function sha256(value) {
    const bytes = [];
    for (const character of String(value)) {
      let point = character.codePointAt(0);
      if (point >= 0xd800 && point <= 0xdfff) point = 0xfffd;
      if (point < 0x80) bytes.push(point);
      else if (point < 0x800) bytes.push(0xc0 | (point >>> 6), 0x80 | (point & 63));
      else if (point < 0x10000) bytes.push(0xe0 | (point >>> 12), 0x80 | ((point >>> 6) & 63), 0x80 | (point & 63));
      else bytes.push(0xf0 | (point >>> 18), 0x80 | ((point >>> 12) & 63), 0x80 | ((point >>> 6) & 63), 0x80 | (point & 63));
    }
    const bits = bytes.length * 8;
    bytes.push(0x80);
    while (bytes.length % 64 !== 56) bytes.push(0);
    for (let shift = 7; shift >= 0; shift -= 1) bytes.push(Math.floor(bits / (2 ** (shift * 8))) & 255);
    const state = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const constants = [
      0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
      0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
      0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
      0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
      0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
      0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
      0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
      0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
    ];
    const rotate = (word, amount) => (word >>> amount) | (word << (32 - amount));
    const words = new Uint32Array(64);
    for (let offset = 0; offset < bytes.length; offset += 64) {
      for (let i = 0; i < 16; i += 1) words[i] = (bytes[offset + i * 4] << 24) | (bytes[offset + i * 4 + 1] << 16) | (bytes[offset + i * 4 + 2] << 8) | bytes[offset + i * 4 + 3];
      for (let i = 16; i < 64; i += 1) {
        const a = words[i - 15], b = words[i - 2];
        words[i] = words[i - 16] + (rotate(a, 7) ^ rotate(a, 18) ^ (a >>> 3)) + words[i - 7] + (rotate(b, 17) ^ rotate(b, 19) ^ (b >>> 10));
      }
      let [a, b, c, d, e, f, g, h] = state;
      for (let i = 0; i < 64; i += 1) {
        const t1 = (h + (rotate(e, 6) ^ rotate(e, 11) ^ rotate(e, 25)) + ((e & f) ^ (~e & g)) + constants[i] + words[i]) | 0;
        const t2 = ((rotate(a, 2) ^ rotate(a, 13) ^ rotate(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) | 0;
        h = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      [a, b, c, d, e, f, g, h].forEach((word, i) => { state[i] = (state[i] + word) >>> 0; });
    }
    return state.map(word => word.toString(16).padStart(8, '0')).join('');
  }

  function reviewedRule(item, store) {
    const owner = storeIdOf(item, store);
    let reviewedStore = reviewedStoreCache.get(owner);
    if (reviewedStore === undefined) {
      reviewedStore = REVIEWED_STORE_HASHES.has(sha256(owner));
      if (reviewedStoreCache.size < 4096) reviewedStoreCache.set(owner, reviewedStore);
    }
    if (!reviewedStore) return null;
    const id = String(item && (item.id || item.itemId) || '');
    const rule = REVIEWED_CLEANUP.get(sha256(JSON.stringify([owner, id, tidy(item && item.name)])));
    if (!rule) return null;
    if (rule.kind === 'notice' && tidy(item && item.image)) return null;
    if (rule.emptyDescription && tidy(item && item.description)) return null;
    return rule;
  }

  function reviewedFeatures(item, rule) {
    const parts = features(item);
    if (!rule?.count) return parts;
    const name = tidy(item.name).replace(/\s*(\d+)\s*(?:EA|개)$/iu, '$1개');
    return { ...parts, base: name,
      // Keep the reviewed count in the identity and the displayed set name.
      // Unreviewed quantities and all other stores keep the original rules.
      key: compact(name.replace(/\+/g, ' 플러스 ').replace(/&/g, ' 앤드 ')),
      quantities: [{ kind: 'count', value: rule.count, unit: '개',
        label: tidy(String(item.name).match(/\d+\s*(?:EA|개)$/iu)?.[0] || `${rule.count}개`) }] };
  }

  function safeReviewedOriginal(value, field = '') {
    const copy = safeClone(value, field);
    if (Array.isArray(copy)) return copy.map(item => safeReviewedOriginal(item, field));
    if (copy && typeof copy === 'object') return Object.fromEntries(Object.entries(copy).map(([key, item]) => [key, safeReviewedOriginal(item, key)]));
    // Raw originals remain in the API. The audit copy must not reintroduce
    // membership-only copy into a customer projection, even in extra fields.
    if (typeof copy === 'string' && MEMBERSHIP.test(copy)
      && !/^(?:id|itemId|storeId|store_id|__sourceIds|sourceIds)$/u.test(field)
      && !/^(?:https?:|data:|blob:|tel:)/i.test(copy)) return '';
    return copy;
  }

  function noteText(value) {
    const text = safeText(String(value || ''), 'description');
    return MEMBERSHIP.test(text) ? '' : text;
  }

  function safeText(value, field) {
    // URLs and immutable IDs are references, not customer price text.
    if (/^(?:https?:|data:|blob:|tel:)/i.test(value) || /^(?:id|itemId|storeId|store_id|__sourceIds|sourceIds|__familyKey|familyKey)$/u.test(field)) return value;
    const without = value.replace(PREFIX_PRICE, ' ').replace(SUFFIX_PRICE, ' ');
    if (field === 'description' && BARE_PRICE.test(tidy(without))) return '';
    return without === value ? value : without.replace(/^[\s·•|/,:：;~～-]+|[\s·•|/,:：;~～-]+$/g, '').replace(/\s+/g, ' ').trim();
  }

  function safeClone(value, field) {
    if (Array.isArray(value)) return value.map(item => safeClone(item, field));
    if (value && typeof value === 'object') {
      const result = {};
      for (const key of Object.keys(value)) {
        if (key === '__proto__' || key === 'constructor' || key === 'prototype' || PRICE_KEY.test(key)) continue;
        result[key] = safeClone(value[key], key);
      }
      return result;
    }
    return typeof value === 'string' ? safeText(value, field || '') : value;
  }

  function sourceIds(item) {
    return unique([item && item.id, item && item.itemId, ...(Array.isArray(item && item.__sourceIds) ? item.__sourceIds : [])]);
  }

  function stripPromo(value) {
    let name = tidy(value);
    const badge = /^(?:(?:[\[(（【]\s*(?:new|best|hit|추천|강력추천|인기|대표|신메뉴|베스트|인기메뉴|추천메뉴)\s*[\])）】])|(?:new|best|hit)\b)\s*/iu;
    // Only an independent trailing token or a complete badge is promotional.
    // Never remove these letters inside names such as renew/NEWburger.
    const trailingBadge = /(?:\s+(?:new|best|hit)|\(\s*(?:new|best|hit)\s*\)|\[\s*(?:new|best|hit)\s*\]|【\s*(?:new|best|hit)\s*】)\s*$/iu;
    for (let count = 0; count < 8; count += 1) {
      const next = name.replace(badge, '').replace(trailingBadge, '').trim();
      if (next === name) break;
      name = next;
    }
    return name;
  }

  function features(item) {
    let base = stripPromo(safeText(String(item && item.name || ''), 'name'));
    // These two explicitly parenthesized labels explain the same term. Do not
    // equate arbitrary 볶음밥 with 나시고랭 or reorder ingredient/cooking tokens.
    base = base.replace(/나시고랭\s*\(\s*볶음밥\s*\)/gu, '나시고랭')
      .replace(/볶음밥\s*\(\s*나시고랭\s*\)/gu, '나시고랭');
    const quantities = [];
    base = base.replace(/(\d+(?:\.\d+)?)\s*(kg|ml|mg|g|l|pcs?|pieces?|p|알|개|캔|병)(?![a-z])/giu, (label, amount, rawUnit) => {
      const unit = rawUnit.toLowerCase();
      const kind = /^(?:kg|mg|g)$/.test(unit) ? 'weight' : /^(?:ml|l)$/.test(unit) ? 'volume' : 'count';
      const multiplier = unit === 'kg' || unit === 'l' ? 1000 : unit === 'mg' ? 0.001 : 1;
      const canonicalUnit = kind === 'weight' ? 'g' : kind === 'volume' ? 'ml' : /^(?:캔|병)$/.test(unit) ? unit : '개';
      quantities.push({ kind, value: Number((Number(amount) * multiplier).toFixed(6)), unit: canonicalUnit, label: tidy(label) });
      return ' ';
    });
    base = tidy(base.replace(/[\[(（【]\s*[\])）】]/gu, ' '));
    // Packaging words are presentation variants for explicitly named drinks;
    // they remain verbatim in each original variant (e.g. 쿨피스 뚱캔).
    if (/^(?:쿨피스|코카콜라|콜라|펩시|스프라이트|칠성사이다|사이다|환타|암바사|웰치스|갈아만든\s*배|카스|테라|참이슬|진로|잎새주|새로|처음처럼)/u.test(base)) {
      base = tidy(base.replace(/\s*(?:\((?:뚱캔|캔|병|페트|pet)\)|뚱캔|캔|병|페트|pet)\s*$/iu, ''));
    }
    // Size words (대/중/소/곱빼기), servings, sets, ingredients, hot/ice,
    // zero-sugar, bone/boneless and bundle operators remain in the identity.
    const key = compact(base.replace(/\+/g, ' 플러스 ').replace(/&/g, ' 앤드 '));
    return { base, key, quantities };
  }

  function guideCategory(value) {
    return /(?:주문\s*시|지역|배달비|추가요금).*(?:추가|선택|안내|주세요)|(?:공지|안내)\s*사항/iu.test(tidy(value));
  }

  function classify(item, store, skipReviewed = false) {
    const values = [item && item.name, item && item.description, item && item.category];
    if (values.some(value => MEMBERSHIP.test(tidy(value)))) return 'membership';
    const reviewed = !skipReviewed && reviewedRule(item, store);
    if (reviewed?.kind) return reviewed.kind;
    const name = tidy(item && item.name);
    const category = tidy(item && item.category);
    const key = compact(features(item).base);
    if (/^(?:공지|안내(?:사항|문)?|가게안내|주문안내|배달안내|영업안내|원산지(?:안내)?|위로이동|스탬프리워드|메뉴만족도)$/u.test(compact(name))) return 'notice';
    if (!tidy(item && item.image) && /^(?:메뉴|주메뉴|부메뉴|사이드메뉴|추가메뉴|포장메뉴|배달메뉴|음료메뉴|주류메뉴|음료|주류|준비중)$/u.test(compact(name))) return 'notice';
    const areaTokens = name.match(/[가-힣]{1,12}(?:동|읍|면|리|구)/gu) || [];
    if (guideCategory(category) && areaTokens.length && areaTokens.every(area => category.includes(area))
      && /^(?:[가-힣]{1,12}(?:동|읍|면|리|구))(?:\s*\([가-힣]{1,12}(?:동|읍|면|리|구)\))?$/u.test(name)) return 'notice';
    if (/^(?:리뷰이벤트|배달비|추가요금|수저포크|수저|포크|일회용품|봉투)(?:신청|선택|추가|요청|안내)?$/u.test(key)) return 'option';
    if (/^리뷰이벤트(?:메뉴)?(?:한가지|한개|1가지|1개)?(?:를|을)?(?:고르세요|선택해주세요|선택하세요)$/u.test(key)) return 'option';
    const packaged = key.replace(/(?:뚱캔|캔|병|페트|pet|생맥주|병맥주)$/iu, '');
    if (/^(?:참이슬(?:후레쉬|오리지널)?|진로(?:이즈백)?|잎새주|처음처럼|새로|카스(?:제로)?|테라(?:라이트)?|켈리|하이트|클라우드|코젤(?:다크)?|칭따오|하이네켄|버드와이저|기네스|소주|맥주|생맥주|막걸리|청하|매화수|복분자주)$/u.test(packaged)) return 'alcohol';
    if (/^(?:스프라이트(?:제로)?|코카콜라(?:제로)?|콜라(?:제로)?|펩시(?:콜라)?(?:제로|제로슈거)?|칠성사이다(?:제로)?|사이다(?:제로)?|환타(?:오렌지|파인|포도)?|암바사|쿨피스(?:파인|파인애플|파인애플맛|복숭아|파인맛|복숭아맛)?|갈아만든배|웰치스(?:포도|청포도)?|생수|탄산수|보리차|제로콜라)$/u.test(packaged)) return 'drink';
    if (/^(?:공기밥|햇반|주먹밥|단무지|피클|락교|초생강|와사비|고수|무순|김)$/u.test(key)) return 'side';
    if (/^(?:소스|사리|토핑|공기밥|계란|고수|단무지|양파|치즈|면|밥)(?:추가|선택)$/u.test(key)) return 'option';
    const categoryKey = compact(category);
    if (/^(?:주류|술|소주|맥주|막걸리|와인)(?:메뉴|류)?$/u.test(categoryKey)) return 'alcohol';
    if (/^(?:음료|음료수|커피|차|에이드|주스|탄산)(?:메뉴|류)?$/u.test(categoryKey)) return 'drink';
    if (/^(?:추가|추가옵션|옵션|토핑|소스)(?:메뉴)?$/u.test(categoryKey)) return 'option';
    if (/^(?:사이드|곁들임|밥류)(?:메뉴)?$/u.test(categoryKey)) return 'side';
    return 'food';
  }

  function storeIdOf(item, store) {
    return tidy((item && (item.storeId || item.store_id)) || (typeof store === 'object' ? store && (store.id || store.storeId || store.store_id) : store)).toLowerCase();
  }

  function familyKey(item, storeId) {
    const owner = storeIdOf(item, storeId) || 'unknown-store';
    const base = reviewedFeatures(item, reviewedRule(item, storeId)).key;
    return `${owner}::${base || `unnamed:${String(item && (item.id || item.itemId) || '')}`}`;
  }

  function categoryFor(item, kind) {
    const standard = { drink: '음료', alcohol: '주류', side: '사이드', option: '추가 옵션' };
    if (standard[kind]) return standard[kind];
    const category = tidy(item && item.category);
    return category && !guideCategory(category) && !MEMBERSHIP.test(category) && !/^(?:전체|기타)$/u.test(category) ? category : '메뉴';
  }

  function realPhoto(value) {
    return Boolean(tidy(value)) && !/daedong-app-icon|placeholder|food-photo-preparing|\/api\/media\/coupang-menu\/v1\/[a-f0-9]{64}\.jpg/i.test(String(value));
  }

  function photoKey(value) {
    const hash = String(value || '').match(/\/api\/(?:media\/[^/]+\/v1|menu-photo)\/([a-f0-9]{64})(?:\.jpg)?(?:[?#]|$)/iu);
    return hash ? hash[1].toLowerCase() : String(value || '');
  }

  function project(menu, options) {
    const input = menu && typeof menu === 'object' && !Array.isArray(menu) ? menu : { items: Array.isArray(menu) ? menu : [] };
    if (input.__menuFamilyVersion === VERSION && Array.isArray(input.items)
      && input.items.every(item => item && item.__familyKey && Array.isArray(item.__variants))) return safeClone(input);
    const store = options && options.store || input.storeId || input.store_id || input.id || 'anonymous-menu';
    const originals = (Array.isArray(input.items) ? input.items : []).flatMap(item => item && item.__familyKey && Array.isArray(item.__variants) ? item.__variants : [item]);
    const groups = new Map();
    const excluded = [], review = [], pendingNotes = [];
    originals.forEach((original, index) => {
      const source = original && typeof original === 'object' ? original : { name: String(original == null ? '' : original) };
      const variant = safeClone(source);
      for (const key of PROJECTION_KEYS) delete variant[key];
      const ids = sourceIds(source);
      const generated = !source.id && !source.itemId;
      if (!variant.id) variant.id = variant.itemId || `menu-family-input-${index}`;
      variant.__inputIndex = index;
      if (generated) variant.__generatedId = true;
      variant.__sourceIds = ids.length ? ids : [String(variant.id)];
      const owner = storeIdOf(source, store);
      if (owner && owner !== 'anonymous-menu') variant.storeId = owner;
      // Guard against the raw name, before price sanitization can change it.
      const rule = reviewedRule(source, store);
      const originalKind = classify(variant, store, true);
      const kind = originalKind === 'membership' ? originalKind : rule?.kind || originalKind;
      if (kind === 'notice' || kind === 'membership') {
        const entry = { id: String(variant.id), sourceIds: variant.__sourceIds.slice(), __inputIndex: index,
          reason: kind === 'membership' ? 'membership-only' : rule?.reason || 'non-food-notice' };
        if (rule) entry.original = safeReviewedOriginal(variant);
        excluded.push(entry);
        if (kind !== 'membership' && rule?.noteKind) {
          const deliveryCategory = noteText(variant.category);
          const primary = rule.noteKind === 'delivery'
            ? `${/배달비/.test(deliveryCategory) ? deliveryCategory.replace(/추가\s*배달비/gu, '추가 배달비') : noteText(variant.name)}는 주문앱에서 확인해주세요.`
            : noteText(variant.name);
          const text = unique([primary, noteText(variant.description)].filter(value => tidy(value))).join('\n');
          if (text) pendingNotes.push({ id: String(variant.id), text, kind: rule.noteKind, sourceIds: variant.__sourceIds.slice() });
        }
        return;
      }
      const parts = reviewedFeatures(variant, rule);
      variant.__quantity = parts.quantities;
      variant.__quantityLabel = parts.quantities.map(quantity => quantity.label).join(' · ') || '용량·수량 미표기';
      variant.__kind = kind;
      const key = `${owner || 'unknown-store'}::${parts.key || `unnamed:${String(variant.id || variant.itemId || '')}`}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(variant);
      if (generated) review.push({ familyKey: key, reason: 'missing-source-id', sourceIds: variant.__sourceIds.slice() });
    });

    const cards = [];
    for (const [key, variants] of groups) {
      const ranked = variants.map((variant, index) => ({ variant, index, score: (realPhoto(variant.image) ? 1000000 : 0)
        + (tidy(variant.description) ? 100000 + Math.min(tidy(variant.description).length, 10000) : 0)
        + (tidy(variant.category) && !guideCategory(variant.category) ? 10000 : 0) }))
        .sort((a, b) => b.score - a.score || a.index - b.index);
      const first = variants[0], representative = ranked[0].variant;
      const kind = representative.__kind;
      const card = safeClone(representative);
      delete card.__inputIndex;
      delete card.__generatedId;
      delete card.__quantity;
      delete card.__quantityLabel;
      card.id = first.id;
      if (has(first, 'itemId')) card.itemId = first.itemId;
      const firstRule = reviewedRule(originals[first.__inputIndex], store);
      card.name = firstRule?.correctCheeseTypo ? stripPromo(first.name).replace('치츠', '치즈')
        : firstRule?.count ? reviewedFeatures(first, firstRule).base
        : (variants.length > 1 ? features(first).base || stripPromo(first.name) : stripPromo(first.name));
      card.image = (ranked.find(entry => realPhoto(entry.variant.image)) || {}).variant?.image || '';
      // A quantity-specific description must not be attached to a different
      // variant's photo. Every other original description remains in variants.
      card.description = tidy(representative.description) ? representative.description : '';
      card.category = categoryFor(representative, kind);
      card.__kind = kind;
      if (kind === 'alcohol') card.adultOnly = true;
      card.__sourceIds = unique(variants.flatMap(variant => variant.__sourceIds));
      card.__variants = variants;
      card.__familyKey = key;
      card.__searchText = unique([card.name, ...variants.flatMap(variant => [variant.name, variant.description, variant.category])]).join(' ');
      const signatures = new Set(variants.filter(variant => variant.__quantity.length).map(variant => JSON.stringify(variant.__quantity.map(({ kind: quantityKind, value, unit }) => ({ kind: quantityKind, value, unit })))));
      if (signatures.size && variants.some(variant => !variant.__quantity.length)) review.push({ familyKey: key, reason: 'quantity-unspecified', sourceIds: card.__sourceIds.slice() });
      if (signatures.size > 1) review.push({ familyKey: key, reason: 'quantity-variation', sourceIds: card.__sourceIds.slice() });
      if (new Set(variants.map(variant => variant.image).filter(realPhoto).map(photoKey)).size > 1) review.push({ familyKey: key, reason: 'multiple-photo-references', sourceIds: card.__sourceIds.slice() });
      if (new Set(variants.map(variant => tidy(variant.description)).filter(Boolean)).size > 1) review.push({ familyKey: key, reason: 'multiple-descriptions', sourceIds: card.__sourceIds.slice() });
      if (new Set(variants.map(variant => variant.__kind)).size > 1) review.push({ familyKey: key, reason: 'kind-variation', sourceIds: card.__sourceIds.slice() });
      if (kind === 'food' && card.category === '메뉴') review.push({ familyKey: key, reason: 'category-unclassified', sourceIds: card.__sourceIds.slice() });
      cards.push(card);
    }
    const mappedCount = cards.reduce((sum, card) => sum + card.__variants.length, 0);
    const result = { ...safeClone(input), items: cards, categories: ['전체', ...new Set(cards.map(card => card.category).filter(Boolean))],
      __menuFamilyVersion: VERSION, __audit: { inputCount: originals.length, mappedCount, familyCount: cards.length,
        variantCount: mappedCount, excluded, review, sourceIds: unique(cards.flatMap(card => card.__sourceIds).concat(excluded.flatMap(item => item.sourceIds))) } };
    const existingDescriptions = new Set(cards.flatMap(card => card.__variants.map(variant => tidy(noteText(variant.description)))).filter(Boolean));
    const notes = pendingNotes.filter(note => note.kind !== 'description' || !existingDescriptions.has(tidy(note.text)));
    if (notes.length) result.__menuNotes = notes;
    return result;
  }

  function groupSearchRows(rows) {
    const inputs = Array.isArray(rows) ? rows : [];
    const byStore = new Map();
    inputs.forEach((row, index) => {
      const owner = storeIdOf(row) || `unknown-search-store-${index}`;
      if (!byStore.has(owner)) byStore.set(owner, []);
      byStore.get(owner).push(row);
    });
    return [...byStore].flatMap(([storeId, items]) => project({ storeId, items }).items);
  }

  return Object.freeze({ VERSION, project, groupSearchRows, classify, familyKey });
});
