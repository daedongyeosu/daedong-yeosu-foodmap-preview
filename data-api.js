'use strict';

(() => {
  const ACTIVE_REGION = window.DAEDONG_REGION || {code: 'yeosu'};
  const IS_GOHEUNG = ACTIVE_REGION.code === 'goheung';
  const BASE_URL = IS_GOHEUNG ? '' : 'https://daedong-yeosu-data-api-preview.sisakim.workers.dev';
  const GOHEUNG_CATALOG_URL = 'data/goheung-catalog.json';
  const CLIENT_HEADER = 'daedong-preview-web-v1-20260804';
  const JSON_HEADERS = Object.freeze({
    Accept: 'application/json',
    'X-Daedong-Client': CLIENT_HEADER
  });
  const REQUEST_TIMEOUT_MS = 25000;
  const NATIVE_BASE = 'https://daedong-yeosu-admin.sisakim.chatgpt.site/api/native/public';
  let nativeCatalogPromise = null;
  const nativeRequests = new Map();
  const nativeFailures = new Map();
  async function nativeRequest(path) {
    const failure=nativeFailures.get(path);
    if(failure&&failure.until>Date.now())throw failure.error;
    if(nativeRequests.has(path))return nativeRequests.get(path);
    const pending=(async()=>{
    const abort = createRequestAbort(null, 4000);
    try {
      const response = await fetch(NATIVE_BASE + path, {credentials:'omit', mode:'cors', cache:'no-store', signal:abort.signal});
      if (response.status === 404) return null;
      if (!response.ok) throw new Error('자체 게시 자료를 불러오지 못했습니다.');
      return await response.json();
    } finally { abort.cleanup(); }
    })().catch(error=>{nativeRequests.delete(path);nativeFailures.set(path,{error,until:Date.now()+15000});throw error;});
    nativeRequests.set(path,pending);
    return pending;
  }
  function nativeCatalog() {
    if (!nativeCatalogPromise) nativeCatalogPromise = (async()=>{
      const items=[]; let cursor=null;
      for(let page=0;page<100;page++) {
        const data=await nativeRequest('/catalog'+(cursor?'?cursor='+encodeURIComponent(cursor):''));
        if(!data||!Array.isArray(data.items))throw new Error('자체 게시 목록 형식 오류');
        items.push(...data.items);cursor=data.cursor;if(!cursor)return items;
      }
      throw new Error('자체 게시 목록이 너무 큽니다.');
    })().catch(error=>{nativeCatalogPromise=null;console.warn('기존 가게 자료를 사용합니다.',error);return [];});
    return nativeCatalogPromise;
  }
  function mergeNativeCatalog(stores, published) {
    const updates=new Map(published.filter(p=>/^[a-f0-9]{16}$/.test(p.id)).map(p=>[p.id,p]));
    const merge=(store,p)=>{
      const channels=new Set(store.channelKeys||[]);
      for(const [key,enabled] of Object.entries(p.routeStates||{})){if(enabled)channels.add(key);else channels.delete(key);}
      return {...store,...p.fields,...(Object.hasOwn(p.fields||{},'category')?{categories:[p.fields.category]}:{}),...(p.photo&&!store.image?{image:p.photo,images:[p.photo]}:{}),...(p.hoursOverridden?{nativeHours:'',nativeHoursSet:true}:{}),id:p.id,store_id:p.id,channelKeys:[...channels],nativePublished:true};
    };
    const result=stores.map(store=>{const id=store.id||store.store_id,p=updates.get(id);updates.delete(id);return p?merge(store,p):store;});
    for(const p of updates.values())if(p.isNew)result.push(merge({name:p.name,hasMenu:false},p));
    return result;
  }
  function mergeNativeDetail(base, patch) {
    if(!patch)return base;
    const out={...base,id:patch.id,store_id:patch.id};
    for(const [key,value] of Object.entries(patch.fields||{})) {
      const target={hours:'nativeHours',description:'nativeDescription',mapUrl:'naverMap'}[key]||key;
      if(['name','phone','address','district','category','nativeHours','nativeDescription','naverMap'].includes(target))out[target]=value;
    }
    const routes=new Map((base?.routes||[]).map(r=>[r.key,r]));
    const labels={mukkebi:'먹깨비',ddangyo:'땡겨요',yogiyo:'요기요',coupang:'쿠팡이츠',baemin:'배달의민족',direct:'가게바로주문'};
    for(const [key,url] of Object.entries(patch.routes||{}))if(Object.hasOwn(labels,key)){if(url)routes.set(key,{...routes.get(key),key,name:labels[key],url});else routes.delete(key);}
    if(Object.hasOwn(patch.fields||{},'phone')){if(out.phone)routes.set('phone',{key:'phone',name:'전화주문',url:'tel:'+out.phone.replace(/[^+0-9]/g,'')});else routes.delete('phone');}
    out.routes=[...routes.values()];
    out.nativePhotos=patch.photos||[];
    out.nativeOverrideFields=Object.keys(patch.fields||{}).map(key=>({hours:'nativeHours',description:'nativeDescription',mapUrl:'naverMap'}[key]||key));
    out.nativeOverrideRoutes=[...Object.keys(patch.routes||{}),...(Object.hasOwn(patch.fields||{},'phone')?['phone']:[])];
    if(Object.hasOwn(patch.fields||{},'category'))out.categories=[out.category];
    if(Object.hasOwn(patch.fields||{},'hours'))out.nativeHoursSet=true;
    out.images=[...(base?.images||[]),...(patch.photos||[]).map(src=>({card:src,detail:src}))];
    if(!out.image&&patch.photos?.length){out.image=patch.photos[0];out.img=out.image;}
    return out;
  }
  // Customer-facing temporary visibility controls. Store detail/menu blobs remain
  // intact so a hidden store can be restored without rebuilding its data.
  const CUSTOMER_HIDDEN_STORE_IDS = new Set([
    '732120ab53b3f457', // 여수분식 문수점
    '8d21bc80dd49679e', // 빵위에치즈 여수점
    '19ebb8a649b24af5', // 1인피자 빵위에치즈 미니8 여수점
    '2da10529e7fb987c', // 탐나는피자 여수점 — 수집 가게
    '421ecef35a879687'  // 탐나는피자 여수점 — 전용 지도
  ]);
  const cache = new Map();
  const requestFailures = new Map();
  let goheungCatalogPromise = null;
  const CURATED_MENU_IMAGE_ROOTS = Object.freeze({
    a089d1d54720b48e: 'store-menu-content/a089d1d54720b48e'
  });
  // Only shipped files may be used as a fallback. Collector-generated menu IDs
  // are not asset filenames; a syntactically valid ID does not prove a JPG exists.
  const CURATED_MENU_IMAGE_IDS = Object.freeze({
    a089d1d54720b48e: new Set([
      'alien-stick', 'bacon-cheddar', 'bacon-potato', 'bulgogi', 'cajun-fries',
      'cass-500', 'chamisul-fresh', 'cheese-ball', 'cheese-spaghetti', 'cheese-stick',
      'cheese', 'chicken-tender', 'chipperoni', 'coca-cola-zero', 'coca-cola',
      'combination', 'corn-cheese', 'fire-chicken-spaghetti', 'four-flavor', 'four-set',
      'garlic-sauce', 'half-half', 'half-set', 'hawaiian', 'hot-sauce', 'hot-wings',
      'jinro', 'karaage', 'main', 'meat-bomb-pizza', 'meat-spaghetti', 'mini-hotdog',
      'parmesan', 'pepperoni', 'pickle', 'potato-potato', 'pulled-pork', 'pumpkin',
      'shrimp-pizza', 'shrimp-ring', 'side-l', 'side-m', 'side2-l', 'side2-m',
      'smoked-chicken', 'spicy-cheese-spaghetti', 'sprite', 'sweet-potato', 'taco',
      'terra-500', 'two-ll', 'two-ml', 'two-mm', 'vegetarian'
    ])
  });
  const STATIC_MENU_URLS = Object.freeze({
    '17d9bf1de3d671fd': 'data/haeinine-yeoseo-menu.json?v=haeinine-menu-preview-1',
    '421ecef35a879687': 'data/tamnaneun-pizza-menu.json?v=tamnaneun-dedicated-2'
  });

  function safeStoreId(value) {
    const id = String(value || '').toLowerCase();
    if (!/^[a-f0-9]{16}$/.test(id)) throw new Error('올바르지 않은 가게 식별자입니다.');
    return id;
  }

  function curatedMenuImage(storeId, itemId = '') {
    const owner = String(storeId || '').toLowerCase();
    const root = CURATED_MENU_IMAGE_ROOTS[owner];
    if (!root) return '';
    const id = String(itemId || '').trim();
    if (!id) return `${root}/main.jpg`;
    return CURATED_MENU_IMAGE_IDS[owner]?.has(id) ? `${root}/${id}.jpg` : '';
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
    if (IS_GOHEUNG) throw new Error('고흥 자료는 여수 API와 분리되어 있습니다.');
    if (cacheKey && cache.has(cacheKey)) return cache.get(cacheKey);
    const recentFailure = cacheKey ? requestFailures.get(cacheKey) : null;
    if (recentFailure && recentFailure.until > Date.now()) throw recentFailure.error;
    if (cacheKey) requestFailures.delete(cacheKey);
    const requestAbort = createRequestAbort(signal, timeoutMs);
    const pending = fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit',
      cache: 'no-store',
      headers: JSON_HEADERS,
      signal: requestAbort.signal
    }).then(async response => {
      if (!response.ok) {
        const error = new Error(`데이터를 불러오지 못했습니다. (${response.status})`);
        error.status = Number(response.status || 0);
        error.retryAfter = Math.max(0, Number(response.headers?.get?.('retry-after') || 0));
        throw error;
      }
      if (cacheKey) requestFailures.delete(cacheKey);
      return response.json();
    }).catch(error => {
      if (cacheKey) {
        cache.delete(cacheKey);
        if (Number(error?.status) === 429) {
          requestFailures.set(cacheKey, {
            error,
            until: Date.now() + Math.min(15000, Math.max(1000, Number(error.retryAfter || 1) * 1000))
          });
        }
      }
      throw error;
    }).finally(requestAbort.cleanup);
    if (cacheKey) cache.set(cacheKey, pending);
    return pending;
  }

  async function goheungCatalog() {
    if (!goheungCatalogPromise) {
      goheungCatalogPromise = fetch(`${GOHEUNG_CATALOG_URL}?request=${Date.now()}`, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {Accept: 'application/json'}
      }).then(async response => {
        if (!response.ok) throw new Error(`고흥 자료를 불러오지 못했습니다. (${response.status})`);
        const payload = await response.json();
        if (payload?.regionCode !== 'goheung' || !Array.isArray(payload?.stores)) {
          throw new Error('고흥 전용 자료가 아니므로 적용을 차단했습니다.');
        }
        return payload;
      }).catch(error => {
        goheungCatalogPromise = null;
        throw error;
      });
    }
    return goheungCatalogPromise;
  }

  function isCustomerHiddenStoreId(value) {
    return CUSTOMER_HIDDEN_STORE_IDS.has(String(value || '').trim().toLowerCase());
  }

  function customerVisibleStores(stores) {
    if (!Array.isArray(stores)) return [];
    return stores.filter(store => {
      const id = String(store?.id || store?.store_id || '').toLowerCase();
      return !CUSTOMER_HIDDEN_STORE_IDS.has(id);
    }).map(store => {
      const id = String(store?.id || store?.store_id || '').toLowerCase();
      return STATIC_MENU_URLS[id] && store?.hasMenu !== true ? {...store, hasMenu: true} : store;
    });
  }

  function customerVisibleMenuSearch(payload) {
    if (!payload?.stores || typeof payload.stores !== 'object') return payload;
    const stores = Object.fromEntries(
      Object.entries(payload.stores).filter(([storeId]) =>
        !CUSTOMER_HIDDEN_STORE_IDS.has(String(storeId || '').toLowerCase())
      )
    );
    return {...payload, stores};
  }

  function customerVisibleServices(services) {
    if (!services || typeof services !== 'object') return {};
    return Object.fromEntries(
      Object.entries(services).filter(([storeId]) =>
        !CUSTOMER_HIDDEN_STORE_IDS.has(String(storeId || '').toLowerCase())
      )
    );
  }

  function customerVisibleStoreId(value) {
    const id = safeStoreId(value);
    if (CUSTOMER_HIDDEN_STORE_IDS.has(id)) {
      throw new Error('현재 지도에 표시되지 않는 가게입니다.');
    }
    return id;
  }

  const catalog = options => IS_GOHEUNG
    ? goheungCatalog().then(payload => customerVisibleStores(payload.stores))
    : Promise.all([request('/api/catalog', {cacheKey: 'catalog', ...options}),nativeCatalog()]).then(([stores,published])=>customerVisibleStores(mergeNativeCatalog(stores,published)));
  const services = options => IS_GOHEUNG
    ? goheungCatalog().then(payload => customerVisibleServices(payload.services || {}))
    : request('/api/services', {cacheKey: 'services', ...options}).then(customerVisibleServices);
  const detail = (storeId, options = {}) => {
    const id = customerVisibleStoreId(storeId);
    if (IS_GOHEUNG) return goheungCatalog().then(payload => {
      const value = payload.details?.[id];
      if (!value) throw new Error('해당 고흥 가게 상세자료를 확인 중입니다.');
      return value;
    });
    return Promise.all([
      request(`/api/store/${id}`, {cacheKey: `detail:${id}`, ...options}).catch(error=>{if(error.status===404)return null;throw error;}),
      nativeRequest('/store/'+id).catch(error=>{console.warn('자체 게시 내용 확인 실패',error);return null;})
    ]).then(([base,patch])=>{if(!base&&!patch)throw new Error('가게 상세자료를 찾지 못했습니다.');return mergeNativeDetail(base,patch);});
  };
  const menu = (storeId, options = {}) => {
    const id = customerVisibleStoreId(storeId);
    if (IS_GOHEUNG) return goheungCatalog().then(payload => {
      const value = payload.menus?.[id];
      if (!value) throw new Error('해당 고흥 가게 메뉴자료를 확인 중입니다.');
      return value;
    });
    const staticUrl = STATIC_MENU_URLS[id];
    if (staticUrl) {
      return fetch(staticUrl, {cache: 'no-store', credentials: 'same-origin', signal: options.signal})
        .then(response => {
          if (!response.ok) throw new Error(`메뉴 자료를 불러오지 못했습니다. (${response.status})`);
          return response.json();
        });
    }
    return request(`/api/store/${id}/menu`, {cacheKey: `menu:${id}`, ...options})
      .then(payload => restoreCuratedMenuImages(id, payload));
  };
  const yogiyoWebRoute = (storeId, coordinates = {}, options = {}) => {
    const id = customerVisibleStoreId(storeId);
    const lat = Number(coordinates.lat);
    const lng = Number(coordinates.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)
      || lat < 32 || lat > 39 || lng < 124 || lng > 132) {
      throw new Error('가게 위치를 확인할 수 없습니다.');
    }
    if (IS_GOHEUNG) throw new Error('고흥 요기요 주문경로는 준비 중입니다.');
    const latText = String(lat);
    const lngText = String(lng);
    return request(`/api/store/${id}/yogiyo-web?lat=${encodeURIComponent(latText)}&lng=${encodeURIComponent(lngText)}`, {
      cacheKey: `yogiyo-web:${id}:${latText}:${lngText}`,
      ...options
    });
  };
  const menuSearch = (query, options = {}) => {
    const value = String(query || '').trim();
    if (!value || value.length > 40 || /[%_]/.test(value)) return Promise.resolve({stores: {}});
    const key = value.normalize('NFKC').toLowerCase();
    if (IS_GOHEUNG) return Promise.resolve({stores: {}});
    return request(`/api/menu-search?q=${encodeURIComponent(value)}`, {cacheKey: `search:${key}`, ...options})
      .then(customerVisibleMenuSearch)
      .then(restoreCuratedMenuSearchImages);
  };

  window.daedongDataApi = Object.freeze({
    baseUrl: BASE_URL,
    regionCode: ACTIVE_REGION.code,
    isCustomerHiddenStoreId,
    catalog,
    services,
    detail,
    menu,
    yogiyoWebRoute,
    menuSearch
  });
})();
