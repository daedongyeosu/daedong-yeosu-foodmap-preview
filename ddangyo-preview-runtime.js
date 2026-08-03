'use strict';

(() => {
  const DATA_URL = 'data/ddangyo-store-enrichment.json?v=20260804-2';
  const WAIT_TIMEOUT_MS = 30000;
  const POLL_MS = 80;

  function clean(value) {
    return String(value || '').trim();
  }

  function unique(values) {
    return [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];
  }

  function safeUrl(value) {
    const raw = clean(value);
    if (!/^https?:\/\//i.test(raw)) return '';
    try {
      const parsed = new URL(raw, location.href);
      return ['http:', 'https:'].includes(parsed.protocol) ? parsed.href : '';
    } catch {
      return '';
    }
  }

  function safePhone(value) {
    const digits = String(value || '').replace(/\D/g, '');
    return /^0\d{8,10}$/.test(digits) ? digits : '';
  }

  function currentAllStores() {
    return typeof allStores !== 'undefined' && Array.isArray(allStores) ? allStores : [];
  }

  function waitForStores() {
    return new Promise((resolve, reject) => {
      const started = Date.now();
      const check = () => {
        const list = currentAllStores();
        if (list.length) return resolve(list);
        if (Date.now() - started > WAIT_TIMEOUT_MS) return reject(new Error('store initialization timeout'));
        setTimeout(check, POLL_MS);
      };
      check();
    });
  }

  function hasRoute(store, key, nameText) {
    return (store.routes || []).some(route => {
      const routeKey = String(route?.key || '').toLowerCase();
      const routeName = String(route?.name || '').replace(/\s/g, '');
      return routeKey === key || routeName.includes(nameText);
    });
  }

  function addDdangyoRoute(store, row, report) {
    const href = safeUrl(row?.ddangyoUrl);
    if (!href) return;
    if (!Array.isArray(store.routes)) store.routes = [];
    const verifiedUrls = unique([...(row?.sourceUrls || []), row?.ddangyoUrl])
      .map(safeUrl)
      .filter(Boolean);
    const existing = store.routes.find(route => {
      const routeKey = String(route?.key || '').toLowerCase();
      const routeName = String(route?.name || '').replace(/\s/g, '');
      return routeKey === 'ddangyo' || routeName.includes('땡겨요');
    });
    if (existing) {
      const current = safeUrl(existing.url);
      if (current && verifiedUrls.includes(current)) {
        report.preservedDdangyoRoutes += 1;
        return;
      }
      existing.name = '땡겨요';
      existing.key = 'ddangyo';
      existing.url = href;
      existing.enabled = true;
      existing.source = 'ddangyo-fingerprint-corrected';
      report.correctedDdangyoRoutes += 1;
      return;
    }
    store.routes.push({name: '땡겨요', key: 'ddangyo', url: href, enabled: true, source: 'ddangyo-fingerprint'});
    report.addedDdangyoRoutes += 1;
  }

  function addChakRoute(store, url, report) {
    const href = safeUrl(url);
    if (!href) return;
    if (hasRoute(store, 'chak', 'CHAK지역상품권')) {
      report.preservedChakRoutes += 1;
      return;
    }
    if (!Array.isArray(store.routes)) store.routes = [];
    store.routes.push({name: 'CHAK 지역상품권', key: 'chak', url: href, enabled: true, source: 'ddangyo-new-store-services'});
    report.addedChakRoutes += 1;
  }

  function addVerifiedNaverMap(store, row, report) {
    const href = row.naverStatus === 'verified' ? safeUrl(row.naverMap) : '';
    if (!href) return;
    if (store.naverMap && store.naverMap !== '#') {
      report.preservedNaverMaps += 1;
      return;
    }
    store.naverMap = href;
    store.naverMapSource = 'naver-exact-name-address-match';
    report.addedNaverMaps += 1;
  }

  function refreshSearch(store, row) {
    store.searchAliases = unique([...(store.searchAliases || []), row.name]);
    store.shopInShopNames = unique([...(store.shopInShopNames || []), ...(row.shopInShopNames || [])]);
    store.tags = unique([...(store.tags || []), row.address, row.category, row.name]);
    const parts = [
      store.name,
      store.realBusinessName,
      store.brandName,
      store.branchName,
      store.area,
      store.cat,
      ...(store.categories || []),
      ...(store.searchAliases || []),
      ...(store.shopInShopNames || []),
      ...(store.tags || [])
    ].filter(Boolean).join(' ');
    store.searchIndex = typeof normalize === 'function'
      ? normalize(parts)
      : parts.toLowerCase().replace(/[\s·&()\-_/.,]/g, '');
  }

  function storeImageUrls(store) {
    return unique([
      store?.image,
      store?.img,
      store?.legacyImage,
      ...(Array.isArray(store?.legacyImages) ? store.legacyImages : []),
      ...(Array.isArray(store?.images) ? store.images.flatMap(item => (
        typeof item === 'string' ? [item] : [item?.card, item?.detail]
      )) : [])
    ]).map(safeUrl).filter(Boolean);
  }

  function addVerifiedShopImages(store, row, report) {
    if (!row?.mergeShopImages) return;
    const incoming = unique([row.mainImage, ...(row.shopImages || [])])
      .map(safeUrl)
      .filter(Boolean);
    if (!incoming.length) return;
    const existing = new Set(storeImageUrls(store));
    const added = incoming.filter(url => !existing.has(url));
    if (!added.length) return;
    store.legacyImages = unique([...(store.legacyImages || []), ...added]);
    if (!safeUrl(store.legacyImage)) store.legacyImage = incoming[0];
    if (!Array.isArray(store.images)) store.images = [];
    for (const url of added) store.images.push({card: url, detail: url});
    if (!safeUrl(store.image)) store.image = incoming[0];
    if (!safeUrl(store.img)) store.img = incoming[0];
    report.enrichedPhotoStores += 1;
    report.addedShopImages += added.length;
  }

  function applyExisting(store, row, report) {
    if (!store.address && row.address) {
      store.address = row.address;
      if (typeof neighborhoodsFor === 'function') {
        const found = neighborhoodsFor(row.address);
        if (found.length) {
          store.neighborhoods = found;
          store.locationSource = 'verified-address';
          store.neighborhoodConfidence = 'verified';
        }
      }
      report.addedAddresses += 1;
    } else if (store.address) {
      report.preservedAddresses += 1;
    }

    const phone = row.phoneSource === 'ddangyo' ? safePhone(row.phone) : '';
    if (!store.phone && phone) {
      store.phone = phone;
      store.phoneSource = 'ddangyo';
      report.addedPhones += 1;
      if (!Array.isArray(store.routes)) store.routes = [];
      const phoneRoute = store.routes.some(route => route?.key === 'phone' || String(route?.name || '').includes('전화'));
      if (!phoneRoute) store.routes.push({name: '전화주문', key: 'phone', url: `tel:${phone}`, enabled: true, source: 'ddangyo'});
    } else if (store.phone) {
      report.preservedPhones += 1;
    }

    if ((!Number.isFinite(Number(store.lat)) || !Number.isFinite(Number(store.lng)))
      && Number.isFinite(Number(row.latitude)) && Number.isFinite(Number(row.longitude))) {
      store.lat = Number(row.latitude);
      store.lng = Number(row.longitude);
      store.coordinateSource = 'ddangyo-verified-address';
      report.addedCoordinates += 1;
    }

    addDdangyoRoute(store, row, report);
    addChakRoute(store, row.chakUrl, report);
    addVerifiedNaverMap(store, row, report);
    addVerifiedShopImages(store, row, report);
    refreshSearch(store, row);
    store.ddangyoPatstoNo = String(row.patstoNo || '');
  }

  function rawNewStore(row) {
    const phone = row.phoneSource === 'ddangyo' ? safePhone(row.phone) : '';
    const routeUrl = safeUrl(row.ddangyoUrl);
    const chakUrl = safeUrl(row.chakUrl);
    const naverMap = row.naverStatus === 'verified' ? safeUrl(row.naverMap) : '';
    const images = unique([row.mainImage, ...(row.shopImages || [])]);
    const routes = [];
    if (routeUrl) routes.push({name: '땡겨요', key: 'ddangyo', url: routeUrl, enabled: true, source: 'ddangyo'});
    if (chakUrl) routes.push({name: 'CHAK 지역상품권', key: 'chak', url: chakUrl, enabled: true, source: 'ddangyo-new-store-services'});
    if (phone) routes.push({name: '전화주문', key: 'phone', url: `tel:${phone}`, enabled: true, source: 'ddangyo'});
    return {
      id: row.targetStoreId,
      store_id: row.targetStoreId,
      name: row.name,
      realBusinessName: row.realBusinessName || row.name,
      brandName: row.name,
      branchName: '',
      searchAliases: [row.name],
      shopInShopNames: unique(row.shopInShopNames || []),
      district: typeof neighborhoodFor === 'function' ? neighborhoodFor(row.address) : '',
      category: row.category || '치킨',
      categories: [row.category || '치킨'],
      address: row.address,
      phone,
      naverMap,
      naverMapSource: naverMap ? 'naver-exact-name-address-match' : '',
      image: images[0] || '',
      img: images[0] || '',
      images: images.map(image => ({card: image, detail: image})),
      routes,
      latitude: Number.isFinite(Number(row.latitude)) ? Number(row.latitude) : null,
      longitude: Number.isFinite(Number(row.longitude)) ? Number(row.longitude) : null,
      managed: false,
      sharedManaged: false,
      source: {type: 'ddangyo-preview-batch', patstoNo: row.patstoNo}
    };
  }

  function appendUnique(list, store) {
    if (!Array.isArray(list)) return;
    if (!list.some(item => String(item?.id || item?.store_id) === String(store.id))) list.push(store);
  }

  function createNew(row, report) {
    if (typeof normalizedStore !== 'function') throw new Error('normalizedStore is unavailable');
    const raw = rawNewStore(row);
    const store = normalizedStore(raw, currentAllStores().length);
    store.ddangyoPatstoNo = String(row.patstoNo || '');
    appendUnique(allStores, store);
    if (typeof canonicalStores !== 'undefined') appendUnique(canonicalStores, store);
    if (typeof searchableStores !== 'undefined') appendUnique(searchableStores, store);
    if (typeof stores !== 'undefined') appendUnique(stores, store);
    report.createdStores += 1;
    if (row.chakUrl) report.addedChakRoutes += 1;
    if (row.naverStatus === 'verified' && row.naverMap) report.addedNaverMaps += 1;
    return store;
  }

  function refreshUi() {
    if (typeof fxBuildIndexes === 'function') fxBuildIndexes();
    if (typeof renderCategories === 'function') renderCategories();
    if (typeof renderStores === 'function') renderStores();
  }

  async function run() {
    const [response, list] = await Promise.all([
      fetch(DATA_URL, {cache: 'no-store'}),
      waitForStores()
    ]);
    if (!response.ok) throw new Error(`enrichment ${response.status}`);
    const data = await response.json();
    const rows = Array.isArray(data.stores) ? data.stores : [];
    const byId = new Map(list.map(store => [String(store?.id || store?.store_id), store]));
    const report = {
      batchId: data.batchId || '',
      inputStores: rows.length,
      matchedExisting: 0,
      createdStores: 0,
      skipped: [],
      addedAddresses: 0,
      preservedAddresses: 0,
      addedPhones: 0,
      preservedPhones: 0,
      addedCoordinates: 0,
      addedDdangyoRoutes: 0,
      preservedDdangyoRoutes: 0,
      correctedDdangyoRoutes: 0,
      addedChakRoutes: 0,
      preservedChakRoutes: 0,
      addedNaverMaps: 0,
      preservedNaverMaps: 0,
      enrichedPhotoStores: 0,
      addedShopImages: 0
    };

    for (const row of rows) {
      const id = String(row.targetStoreId || '');
      const existing = byId.get(id);
      if (row.isNew) {
        if (existing) {
          applyExisting(existing, row, report);
          report.skipped.push({targetStoreId: id, reason: 'new-id-already-exists'});
        } else {
          const created = createNew(row, report);
          byId.set(id, created);
        }
        continue;
      }
      if (!existing) {
        report.skipped.push({targetStoreId: id, reason: 'verified-existing-id-not-found'});
        continue;
      }
      applyExisting(existing, row, report);
      report.matchedExisting += 1;
    }

    refreshUi();
    window.daedongDdangyoPreviewReport = Object.freeze(report);
    window.dispatchEvent(new CustomEvent('daedong:ddangyo-preview-ready', {detail: report}));
    console.info('Ddangyo preview enrichment applied', report);
  }

  run().catch(error => {
    console.error('Ddangyo preview enrichment failed', error);
    window.daedongDdangyoPreviewReport = Object.freeze({error: String(error?.message || error)});
  });
})();
