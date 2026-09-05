'use strict';

(() => {
  if (!window.daedongDataApi) return;
  const pendingDetails = new Map();

  function detailHasTrustedNaverPlace(detail) {
    const phone = String(detail?.phone || '').replace(/\D/g, '');
    const validPhone = /^02\d{7,8}$/.test(phone)
      || /^0(?:3[1-3]|4[1-4]|5[1-5]|6[1-4])\d{7,8}$/.test(phone)
      || /^050[2-8]\d{7,8}$/.test(phone)
      || /^01[016789]\d{7,8}$/.test(phone)
      || /^070\d{8}$/.test(phone);
    if (!validPhone || !String(detail?.address || '').trim()) return false;
    try {
      const url = new URL(String(detail?.naverMap || '').trim());
      return ['map.naver.com', 'm.map.naver.com'].includes(url.hostname.toLowerCase())
        && /^\/p\/entry\/place\/\d+(?:\/|$)/.test(url.pathname);
    } catch {
      return false;
    }
  }

  function mergeStoreDetails(primary, additions) {
    const details = [primary, ...additions].filter(Boolean);
    const routeMap = new Map();
    const images = [];
    for (const detail of details) {
      for (const image of Array.isArray(detail.images) ? detail.images : []) {
        const value = typeof image === 'string' ? image : image?.detail || image?.card || image?.src || image?.url;
        if (value && !images.some(item => (typeof item === 'string' ? item : item?.detail || item?.card || item?.src || item?.url) === value)) images.push(image);
      }
      for (const route of Array.isArray(detail.routes) ? detail.routes : []) {
        const key = String(route?.key || route?.name || '').trim();
        if (key) routeMap.set(key, route);
      }
    }
    return {
      ...additions.reduce((merged, detail) => ({...merged, ...detail}), {}),
      ...primary,
      address: primary?.address || additions.find(detail => detail?.address)?.address || '',
      phone: primary?.phone || additions.find(detail => detail?.phone)?.phone || '',
      naverMap: primary?.naverMap || additions.find(detail => detail?.naverMap)?.naverMap || '',
      image: primary?.image || additions.find(detail => detail?.image)?.image || '',
      img: primary?.img || primary?.image || additions.find(detail => detail?.img || detail?.image)?.img || additions.find(detail => detail?.image)?.image || '',
      images,
      routes: [...routeMap.values()]
    };
  }

  async function enrichStore(store, normalizeStore) {
    const id = String(store?.id || store?.store_id || '');
    if (!/^[a-f0-9]{16}$/i.test(id)) return store;
    if (window.daedongDataApi.isCustomerHiddenStoreId?.(id)) {
      throw new Error('현재 지도에 표시되지 않는 가게입니다.');
    }
    if (store.__secureDetailReady === true) return store;
    if (typeof normalizeStore !== 'function') {
      throw new Error('가게 상세정보 정규화 기능을 사용할 수 없습니다.');
    }
    if (!pendingDetails.has(id)) {
      const mergedStoreIds = [...new Set((Array.isArray(store.mergedStoreIds) ? store.mergedStoreIds : [])
        .map(value => String(value || '').toLowerCase())
        .filter(value => /^[a-f0-9]{16}$/.test(value) && value !== id))];
      pendingDetails.set(id, Promise.all([
        window.daedongDataApi.detail(id),
        ...mergedStoreIds.map(storeId => window.daedongDataApi.detail(storeId).catch(error => {
          console.warn('병합된 신규 가게 상세정보를 불러오지 못했습니다.', storeId, error);
          return null;
        }))
      ]).then(details => {
        const detail = mergeStoreDetails(details[0], details.slice(1));
        const trustedPhysicalMapDetail = details.find(detailHasTrustedNaverPlace);
        const expectedRouteKeys = [...new Set(
          (Array.isArray(store.channelKeys) ? store.channelKeys : [])
            .map(value => String(value || '').trim())
            .filter(Boolean)
        )];
        const raw = {...store, ...detail, id, store_id: id, mergedStoreIds, hasMenu: store.hasMenu};
        const normalized = normalizeStore(raw, Number(store.rawIndex || 0));
        const loadedRouteKeys = new Set(
          (Array.isArray(normalized?.routes) ? normalized.routes : [])
            .map(route => String(route?.key || '').trim())
            .filter(Boolean)
        );
        const missingRouteKeys = expectedRouteKeys.filter(key => !loadedRouteKeys.has(key));
        if (missingRouteKeys.length) {
          throw new Error(`가게 주문경로가 일부 누락되었습니다: ${missingRouteKeys.join(', ')}`);
        }
        Object.assign(store, normalized, {
          hasMenu: Boolean(store.hasMenu),
          __verifiedPhysicalMapSource: trustedPhysicalMapDetail
            ? String(trustedPhysicalMapDetail.id || trustedPhysicalMapDetail.store_id || id)
            : store.__verifiedPhysicalMapSource,
          __secureDetailReady: true
        });
        return store;
      }).finally(() => pendingDetails.delete(id)));
    }
    return pendingDetails.get(id);
  }

  window.daedongSecureStoreDetail = Object.freeze({enrich: enrichStore});
})();
