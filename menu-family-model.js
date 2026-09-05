/* Display-only projection. Never changes API records or resolves store identity. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.daedongMenuFamilies = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const VERSION = 'menu-families-1-20260905';
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

  function classify(item, store) { // store is reserved for explicitly reviewed store-specific rules.
    const values = [item && item.name, item && item.description, item && item.category];
    if (values.some(value => MEMBERSHIP.test(tidy(value)))) return 'membership';
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
    const base = features(item).key;
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
    const excluded = [], review = [];
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
      const kind = classify(variant, store);
      if (kind === 'notice' || kind === 'membership') {
        excluded.push({ id: String(variant.id), sourceIds: variant.__sourceIds.slice(), __inputIndex: index, reason: kind === 'notice' ? 'non-food-notice' : 'membership-only' });
        return;
      }
      const parts = features(variant);
      variant.__quantity = parts.quantities;
      variant.__quantityLabel = parts.quantities.map(quantity => quantity.label).join(' · ') || '용량·수량 미표기';
      variant.__kind = kind;
      const key = familyKey(variant, store);
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
      const kind = classify(representative, store);
      const card = safeClone(representative);
      delete card.__inputIndex;
      delete card.__generatedId;
      delete card.__quantity;
      delete card.__quantityLabel;
      card.id = first.id;
      if (has(first, 'itemId')) card.itemId = first.itemId;
      card.name = variants.length > 1 ? features(first).base || stripPromo(first.name) : stripPromo(first.name);
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
    return { ...safeClone(input), items: cards, categories: ['전체', ...new Set(cards.map(card => card.category).filter(Boolean))],
      __menuFamilyVersion: VERSION, __audit: { inputCount: originals.length, mappedCount, familyCount: cards.length,
        variantCount: mappedCount, excluded, review, sourceIds: unique(cards.flatMap(card => card.__sourceIds).concat(excluded.flatMap(item => item.sourceIds))) } };
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
