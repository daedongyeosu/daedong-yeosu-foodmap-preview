'use strict';

(() => {
  const BASE_URL = 'https://daedong-yeosu-data-api-preview.sisakim.workers.dev';
  const CLIENT_HEADER = 'daedong-preview-web-v1-20260804';
  const JSON_HEADERS = Object.freeze({
    Accept: 'application/json',
    'X-Daedong-Client': CLIENT_HEADER
  });
  const REQUEST_TIMEOUT_MS = 25000;
  const cache = new Map();
  const CURATED_MENU_IMAGE_ROOTS = Object.freeze({
    a089d1d54720b48e: 'store-menu-content/a089d1d54720b48e'
  });

  function safeStoreId(value) {
    const id = String(value || '').toLowerCase();
    if (!/^[a-f0-9]{16}$/.test(id)) throw new Error('올바르지 않은 가게 식별자입니다.');
    return id;
  }

  function curatedMenuImage(storeId, itemId = '') {
    const root = CURATED_MENU_IMAGE_ROOTS[String(storeId || '').toLowerCase()];
    if (!root) return '';
    const id = String(itemId || '').trim();
    if (!id) return `${root}/main.jpg`;
    return /^[a-z0-9][a-z0-9-]{0,80}$/i.test(id) ? `${root}/${id}.jpg` : '';
  }

  function restoreCuratedMenuImages(storeId, payload) {
    if (!payload || typeof payload !== 'object' || !CURATED_MENU_IMAGE_ROOTS[storeId]) return payload;
    const items = Array.isArray(payload.items) ? payload.items : [];
    return {
      ...payload,
      mainImage: String(payload.mainImage || '').trim() || curatedMenuImage(storeId),
      items: items.map(item => {
        if (!item || String(item.image || '').trim()) return item;
        const image = curatedMenuImage(storeId, item.id);
        return image ? {...item, image} : item;
      })
    };
  }

  function restoreCuratedMenuSearchImages(payload) {
    if (!payload?.stores || typeof payload.stores !== 'object') return payload;
    let changed = false;
    const stores = {...payload.stores};
    for (const storeId of Object.keys(CURATED_MENU_IMAGE_ROOTS)) {
      const record = stores[storeId];
      if (!record || !Array.isArray(record.i)) continue;
      let recordChanged = false;
      const items = record.i.map(item => {
        if (!Array.isArray(item) || String(item[3] || '').trim()) return item;
        const image = curatedMenuImage(storeId, item[0]);
        if (!image) return item;
        changed = true;
        recordChanged = true;
        const next = item.slice();
        next[3] = image;
        return next;
      });
      if (recordChanged) stores[storeId] = {...record, i: items};
    }
    return changed ? {...payload, stores} : payload;
  }

  function createRequestAbort(signal, timeoutMs) {
    const controller = new AbortController();
    const abort = () => controller.abort();
    if (signal?.aborted) abort();
    else signal?.addEventListener?.('abort', abort, {once: true});
    const timeoutId = window.setTimeout(abort, Math.max(1000, Number(timeoutMs) || REQUEST_TIMEOUT_MS));
    return {
      signal: controller.signal,
      cleanup() {
        window.clearTimeout(timeoutId);
        signal?.removeEventListener?.('abort', abort);
      }
    };
  }

  async function request(path, {cacheKey = '', signal, timeoutMs = REQUEST_TIMEOUT_MS} = {}) {
    if (cacheKey && cache.has(cacheKey)) return cache.get(cacheKey);
    const requestAbort = createRequestAbort(signal, timeoutMs);
    const pending = fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: JSON_HEADERS,
      signal: requestAbort.signal
    }).then(async response => {
      if (!response.ok) throw new Error(`데이터를 불러오지 못했습니다. (${response.status})`);
      return response.json();
    }).catch(error => {
      if (cacheKey) cache.delete(cacheKey);
      throw error;
    }).finally(requestAbort.cleanup);
    if (cacheKey) cache.set(cacheKey, pending);
    return pending;
  }

  const catalog = options => request('/api/catalog', {cacheKey: 'catalog', ...options});
  const services = options => request('/api/services', {cacheKey: 'services', ...options});
  const detail = storeId => {
    const id = safeStoreId(storeId);
    return request(`/api/store/${id}`, {cacheKey: `detail:${id}`});
  };
  const menu = storeId => {
    const id = safeStoreId(storeId);
    return request(`/api/store/${id}/menu`, {cacheKey: `menu:${id}`})
      .then(payload => restoreCuratedMenuImages(id, payload));
  };
  const menuSearch = query => {
    const value = String(query || '').trim();
    if (!value || value.length > 40 || /[%_]/.test(value)) return Promise.resolve({stores: {}});
    const key = value.normalize('NFKC').toLowerCase();
    return request(`/api/menu-search?q=${encodeURIComponent(value)}`, {cacheKey: `search:${key}`})
      .then(restoreCuratedMenuSearchImages);
  };

  window.daedongDataApi = Object.freeze({
    baseUrl: BASE_URL,
    catalog,
    services,
    detail,
    menu,
    menuSearch
  });
})();
