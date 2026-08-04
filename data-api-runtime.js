'use strict';

(() => {
  if (!window.daedongDataApi) return;
  const pendingDetails = new Map();

  async function enrichStore(store, normalizeStore) {
    const id = String(store?.id || store?.store_id || '');
    if (!/^[a-f0-9]{16}$/i.test(id)) return store;
    if (store.__secureDetailReady === true) return store;
    if (typeof normalizeStore !== 'function') {
      throw new Error('가게 상세정보 정규화 기능을 사용할 수 없습니다.');
    }
    if (!pendingDetails.has(id)) {
      pendingDetails.set(id, window.daedongDataApi.detail(id).then(detail => {
        const expectedRouteKeys = [...new Set(
          (Array.isArray(store.channelKeys) ? store.channelKeys : [])
            .map(value => String(value || '').trim())
            .filter(Boolean)
        )];
        const raw = {...store, ...detail, hasMenu: store.hasMenu};
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
          __secureDetailReady: true
        });
        return store;
      }).finally(() => pendingDetails.delete(id)));
    }
    return pendingDetails.get(id);
  }

  window.daedongSecureStoreDetail = Object.freeze({enrich: enrichStore});
})();
