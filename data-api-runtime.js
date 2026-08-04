'use strict';

(() => {
  if (!window.daedongDataApi || typeof openStore !== 'function') return;
  const openStoreWithCurrentExperience = openStore;
  const pendingDetails = new Map();

  async function enrichStore(store) {
    const id = String(store?.id || store?.store_id || '');
    if (!/^[a-f0-9]{16}$/i.test(id)) return store;
    if (store.__secureDetailReady === true) return store;
    if (!pendingDetails.has(id)) {
      pendingDetails.set(id, window.daedongDataApi.detail(id).then(detail => {
        const raw = {...store, ...detail, hasMenu: store.hasMenu};
        const normalized = typeof normalizedStore === 'function'
          ? normalizedStore(raw, Number(store.rawIndex || 0))
          : raw;
        Object.assign(store, normalized, {
          hasMenu: Boolean(store.hasMenu),
          __secureDetailReady: true
        });
        return store;
      }).finally(() => pendingDetails.delete(id)));
    }
    return pendingDetails.get(id);
  }

  openStore = async function secureDataOpenStore(store) {
    if (!store) return;
    try {
      await enrichStore(store);
    } catch (error) {
      console.warn('가게 상세정보를 불러오지 못했습니다.', error);
    }
    return openStoreWithCurrentExperience(store);
  };

  window.daedongSecureStoreDetail = Object.freeze({enrich: enrichStore});
})();
