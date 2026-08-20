'use strict';

(() => {
  const menuCache = new Map();
  const menuPending = new Map();
  const INITIAL_MENU_RENDER_COUNT = 12;
  const MENU_RENDER_CHUNK_SIZE = 12;
  let activeStore = null;
  let activeMenu = null;
  let activeMenuById = new Map();
  let lastFocused = null;
  let lastMenuSelection = null;
  let menuChromeRevealTimer = 0;
  let menuRenderRun = 0;
  let menuRenderObserver = null;
  let menuImageObserver = null;
  let menuImageQueue = [];
  let activeMenuImageLoads = 0;
  let menuImageLoadRun = 0;
  const MAX_CONCURRENT_MENU_IMAGE_LOADS = 2;
  let menuClosePointerAt = 0;
  const MENU_HISTORY = Object.freeze({
    preview: 'daedongMenuPreview',
    search: 'daedongMenuSearch',
    order: 'daedongMenuOrder'
  });

  const escapeMenuHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  })[char]);

  function storeById(id) {
    if (typeof fxStoreById === 'function') {
      const store = fxStoreById(id);
      if (store) return store;
    }
    if (typeof stores !== 'undefined' && Array.isArray(stores)) {
      const store = stores.find(item => String(item.id) === String(id));
      if (store) return store;
    }
    if (typeof allStores !== 'undefined' && Array.isArray(allStores)) {
      return allStores.find(item => String(item.id) === String(id)) || null;
    }
    return null;
  }

  function ensureMenuEntryButton() {
    const detail = document.querySelector('#modalContent .store-detail[data-store-id]');
    if (!detail) return;
    const storeId = String(detail.dataset.storeId || '');
    const store = storeById(storeId);
    if (!store || store.hasMenu !== true) return;
    // The detail skeleton is already visible, so warm the menu in parallel
    // instead of waiting for a second network round trip after the tap.
    if (!menuCache.has(storeId) && !menuPending.has(storeId)) void loadMenu(storeId).catch(() => {});
    if (detail.querySelector('[data-store-menu-preview]')) return;
    const topStatus = detail.querySelector('[data-store-service-top-status]');
    const target = topStatus
      || detail.querySelector('.detail-routes')
      || detail.querySelector('.detail-personal-actions');
    if (!target) return;
    const entryImage = photoResolver?.resolve?.(store)?.src || store.legacyImage || '';
    target.insertAdjacentHTML(topStatus ? 'afterend' : 'beforebegin', `
      <button class="store-menu-preview-entry" type="button" data-store-menu-preview="${storeId}">
        ${entryImage ? `<img src="${escapeMenuHtml(entryImage)}" alt="">` : ''}
        <span>
          <b>음식보기</b>
          <small>사진과 설명으로 전체 메뉴 미리보기 · 가격 미표시</small>
        </span>
        <strong>메뉴 보기 ›</strong>
      </button>
    `);
  }

  async function loadMenu(storeId) {
    if (menuCache.has(storeId)) return menuCache.get(storeId);
    if (menuPending.has(storeId)) return menuPending.get(storeId);
    const pending = window.daedongDataApi.menu(storeId).then(menu => {
      menuCache.set(storeId, menu);
      return menu;
    }).finally(() => menuPending.delete(storeId));
    menuPending.set(storeId, pending);
    return pending;
  }

  function menuDisplayPriority(item) {
    const category = String(item?.category || '').normalize('NFKC').replace(/\s+/g, '').toLowerCase();
    if (/주류|술|소주|맥주|막걸리|와인/.test(category)) return 40;
    if (/음료|커피|차|에이드|주스|탄산/.test(category)) return 30;
    if (/추가|사이드|곁들임|토핑|옵션|소스|피클|밥류/.test(category)) return 20;
    return 0;
  }

  function orderedMenu(menu) {
    const items = Array.isArray(menu?.items) ? menu.items : [];
    return {
      ...menu,
      items: items
        .map((item, index) => ({item, index, priority: menuDisplayPriority(item)}))
        .sort((a, b) => a.priority - b.priority || a.index - b.index)
        .map(entry => entry.item)
    };
  }

  function channelUrl(channel) {
    return channel?.url || channel?.appLink || '';
  }

  function phoneHref(channel) {
    const directPhone = String(channel?.phone || '').replace(/\D/g, '');
    if (directPhone) return `tel:${directPhone}`;
    const url = channelUrl(channel);
    if (String(url).startsWith('tel:')) return url;
    const routePhone = String(url).match(/tel(\d{9,12})/i)?.[1] || '';
    return routePhone ? `tel:${routePhone}` : url;
  }

  function storeIconMarkup() {
    return `
      <svg viewBox="0 0 64 64" aria-hidden="true" focusable="false">
        <path d="M12 27v24h40V27M9 24l6-13h34l6 13" fill="none" stroke="#ff4d1f" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"></path>
        <path d="M9 24c0 7 11 7 11 0 0 7 12 7 12 0 0 7 12 7 12 0 0 7 11 7 11 0M25 51V38h14v13" fill="none" stroke="#ff4d1f" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"></path>
      </svg>
    `;
  }

  function phoneIconMarkup() {
    return `
      <svg viewBox="0 0 28 28" aria-hidden="true" focusable="false">
        <circle cx="14" cy="14" r="13" fill="#ff7756"></circle>
        <path d="M9.2 7.8c.7-.7 1.7-.5 2.2.3l1.5 2.5c.4.7.3 1.5-.3 2l-1.2 1c1.1 2.2 2.8 3.9 5 5l1.1-1.2c.5-.6 1.3-.7 2-.3l2.5 1.5c.8.5 1 1.5.3 2.2l-1.2 1.2c-1.1 1.1-2.8 1.4-4.2.7-5.5-2.6-9-6.1-11.6-11.6-.7-1.4-.4-3.1.7-4.2Z" fill="#fff" stroke="#fff" stroke-width=".7" stroke-linejoin="round"></path>
      </svg>
    `;
  }

  function channelIcon(key, channel) {
    if (key === 'direct') {
      return storeIconMarkup();
    }
    if (key === 'brand') {
      return channel?.icon
        ? `<img src="${escapeMenuHtml(window.mobilePhotoPath?.(channel.icon) || channel.icon)}" alt="">`
        : storeIconMarkup();
    }
    if (key === 'mukkebi' || key === 'ddangyo') {
      const compactHomeIcon = document.querySelector(`[data-order-key="${key}"] img`)?.getAttribute('src');
      const fallback = key === 'mukkebi' ? 'assets/mukkebi-v7.mobile.webp' : 'assets/ddangyo-v7.mobile.webp';
      return `<img src="${escapeMenuHtml(compactHomeIcon || fallback)}" alt="">`;
    }
    if (key === 'ondongne') return '<img src="assets/ondongne.mobile.webp" alt="">';
    if (key === 'phone') return phoneIconMarkup();
    return '';
  }

  function pushMenuHistory(layer) {
    const nextState = {...(history.state || {}), [MENU_HISTORY.preview]: true};
    if (layer === 'search') nextState[MENU_HISTORY.search] = true;
    if (layer === 'order') nextState[MENU_HISTORY.order] = true;
    try {
      history.pushState(nextState, '', location.href);
      return true;
    } catch {
      return false;
    }
  }

  let menuHistoryClosePending = false;
  let menuHistoryCloseTimer = 0;
  let menuCloseGestureTimer = 0;

  function guardMenuCloseGesture() {
    document.documentElement.dataset.daedongMenuCloseGesture = '1';
    window.clearTimeout(menuCloseGestureTimer);
    menuCloseGestureTimer = window.setTimeout(() => {
      delete document.documentElement.dataset.daedongMenuCloseGesture;
    }, 600);
  }

  function suppressMenuClosePopstate() {
    menuHistoryClosePending = true;
    document.documentElement.dataset.daedongMenuHistoryClose = '1';
    window.clearTimeout(menuHistoryCloseTimer);
    menuHistoryCloseTimer = window.setTimeout(() => {
      menuHistoryClosePending = false;
      delete document.documentElement.dataset.daedongMenuHistoryClose;
    }, 1200);
  }

  function requestMenuLayerBack(layer, fallback) {
    if (history.state?.[MENU_HISTORY[layer]]) {
      fallback();
      history.back();
      return;
    }
    fallback();
  }

  function requestCloseMenuPreview() {
    const state = history.state || {};
    const depth = Number(Boolean(state[MENU_HISTORY.preview]))
      + Number(Boolean(state[MENU_HISTORY.search]))
      + Number(Boolean(state[MENU_HISTORY.order]));
    guardMenuCloseGesture();
    closeMenuPreview();
    if (depth > 0) {
      suppressMenuClosePopstate();
      history.go(-depth);
    }
  }

  function orderChannels(store) {
    if (!store || typeof resolveStoreChannels !== 'function') {
      return {primaryOrder: {}, externalOrder: {}};
    }
    return resolveStoreChannels(store) || {primaryOrder: {}, externalOrder: {}};
  }

  function primaryOrderMarkup(store) {
    const channels = orderChannels(store);
    const definitions = [
      ['direct', channels.primaryOrder?.directOrder, '가게바로주문 결제하기', '가게가 등록한 주문 페이지로 이동'],
      ['brand', channels.primaryOrder?.brandApp, '브랜드앱', '브랜드 공식 앱으로 이동'],
      ['mukkebi', channels.primaryOrder?.mukkebi, '먹깨비', '먹깨비로 주문'],
      ['ddangyo', channels.primaryOrder?.ddangyo, '땡겨요', '땡겨요로 주문'],
      ['ondongne', channels.primaryOrder?.ondongne, '온동네', '온동네로 주문'],
      ['phone', channels.primaryOrder?.phoneOrder, '전화주문하기', '통화 중에도 이 메뉴를 계속 볼 수 있어요']
    ];
    const available = definitions.filter(([, channel]) => Boolean(channel && (channelUrl(channel) || channel.phone)));
    if (!available.length) return '<p class="menu-order-empty">현재 연결된 주문방법을 확인 중입니다.</p>';
    return available.map(([key, channel, label, note]) => {
      const rawHref = key === 'phone' ? phoneHref(channel) : channelUrl(channel);
      const href = escapeMenuHtml(rawHref);
      const external = rawHref && !rawHref.startsWith('tel:') ? ' target="_blank" rel="noopener"' : '';
      const emphasis = key === 'direct' ? ' menu-order-card-direct' : key === 'phone' ? ' menu-order-card-phone' : '';
      if (key === 'direct') {
        return `
          <button class="menu-order-card${emphasis} menu-order-card-coming-soon" type="button" disabled data-menu-order="direct" aria-label="가게바로주문 준비중">
            <span class="menu-order-icon">${channelIcon(key, channel)}</span>
            <span><b>가게바로주문</b><small>(준비중)</small></span>
            <strong>준비중</strong>
          </button>
        `;
      }
      return `
        <a class="menu-order-card${emphasis}" href="${href}"${external} data-menu-order="${key}">
          <span class="menu-order-icon">${channelIcon(key, channel)}</span>
          <span><b>${label}</b><small>${note}</small></span>
          <strong>›</strong>
        </a>
      `;
    }).join('');
  }

  function otherOrderMarkup(store) {
    const external = orderChannels(store).externalOrder || {};
    const definitions = [
      ['yogiyo', '요기요', external.yogiyo],
      ['coupang', '쿠팡이츠', external.coupangEats],
      ['baemin', '배달의민족', external.baemin]
    ].filter(([, , channel]) => Boolean(channelUrl(channel)));
    if (!definitions.length) return '';
    return `
      <div class="menu-other-orders">
        <div class="menu-other-order-list" data-menu-other-list aria-live="polite" hidden>
          <p>다른 주문앱을 선택하세요</p>
          ${definitions.map(([key, label, channel]) => `
            <a href="${escapeMenuHtml(channelUrl(channel))}" target="_blank" rel="noopener" data-menu-external-key="${escapeMenuHtml(key)}">
              <span>${label}</span><b>›</b>
            </a>
          `).join('')}
          <small>앱 이름은 주문 경로 안내를 위해 표시되며, 공식 제휴·후원을 의미하지 않습니다.</small>
        </div>
        <button type="button" data-menu-other-toggle aria-expanded="false">
          <strong data-menu-other-label>다른 주문앱 보기</strong>
          <span><b>${definitions.length}개</b><i aria-hidden="true">⌄</i></span>
        </button>
      </div>
    `;
  }

  function stickyOrderMarkup(store) {
    const channels = orderChannels(store);
    const primaryDefinitions = [
      ['direct', channels.primaryOrder?.directOrder, '가게바로주문'],
      ['brand', channels.primaryOrder?.brandApp, '브랜드앱'],
      ['mukkebi', channels.primaryOrder?.mukkebi, '먹깨비'],
      ['ddangyo', channels.primaryOrder?.ddangyo, '땡겨요'],
      ['ondongne', channels.primaryOrder?.ondongne, '온동네'],
      ['phone', channels.primaryOrder?.phoneOrder, '전화주문']
    ].map(([key, channel, label]) => {
      const rawHref = key === 'phone' ? phoneHref(channel) : channelUrl(channel);
      return {key, channel, label, rawHref};
    }).filter(item => Boolean(item.rawHref));
    const externalDefinitions = [
      ['yogiyo', channels.externalOrder?.yogiyo, '요기요'],
      ['coupang-eats', channels.externalOrder?.coupangEats, '쿠팡이츠'],
      ['baemin', channels.externalOrder?.baemin, '배달의민족']
    ].map(([key, channel, label]) => {
      const rawHref = channelUrl(channel);
      return {key, channel, label, rawHref};
    }).filter(item => Boolean(item.rawHref));

    if (!primaryDefinitions.length && !externalDefinitions.length) return '';
    return `
      <section class="store-menu-sticky-actions" aria-label="이 가게 주문방법">
        <header>
          <b>주문방법</b>
          <small>다른 주문앱은 버튼 안에 있습니다</small>
        </header>
        <nav>
          ${primaryDefinitions.map(({key, channel, label, rawHref}) => {
            const external = rawHref.startsWith('tel:') ? '' : ' target="_blank" rel="noopener"';
            const icon = channelIcon(key, channel);
            const compatibilityClass = key === 'direct' ? ' primary' : key === 'phone' ? ' phone' : '';
            if (key === 'direct') {
              return `
                <button class="is-direct${compatibilityClass} is-coming-soon" type="button" disabled data-menu-sticky-order="direct" aria-label="가게바로주문 준비중">
                  ${icon}<b>가게바로주문 <small>(준비중)</small></b>
                </button>
              `;
            }
            return `
              <a class="is-${escapeMenuHtml(key)}${compatibilityClass}" href="${escapeMenuHtml(rawHref)}"${external} data-menu-sticky-order="${escapeMenuHtml(key)}">
                ${icon}<b>${escapeMenuHtml(label)}</b>
              </a>
            `;
          }).join('')}
          ${externalDefinitions.length ? `
            <button class="is-other" type="button" data-menu-sticky-other-toggle aria-expanded="false">
              <span class="store-menu-sticky-other-icon" aria-hidden="true">＋</span>
              <b>다른 주문앱</b>
            </button>
          ` : ''}
        </nav>
        ${externalDefinitions.length ? `
          <section class="store-menu-sticky-other-list" data-menu-sticky-other-list hidden>
            <p>다른 주문앱을 선택하세요</p>
            <div>
              ${externalDefinitions.map(({key, label, rawHref}) => `
                <a href="${escapeMenuHtml(rawHref)}" target="_blank" rel="noopener" data-menu-sticky-external="${escapeMenuHtml(key)}">
                  <b>${escapeMenuHtml(label)}</b><span aria-hidden="true">›</span>
                </a>
              `).join('')}
            </div>
            <small>앱 이름은 주문 경로 안내를 위해 표시되며, 공식 제휴·후원을 의미하지 않습니다.</small>
          </section>
        ` : ''}
      </section>
    `;
  }

  function menuCardMarkup(item, query = '') {
    const searchText = `${item.name} ${item.description} ${item.category}`.toLowerCase();
    const photo = item.image
      ? `
        <div class="store-menu-photo">
          <img data-menu-image-src="${escapeMenuHtml(item.image)}" alt="${escapeMenuHtml(item.name)}" width="720" height="546" loading="lazy" decoding="async" fetchpriority="low">
          ${item.adultOnly ? '<span>19세 이상</span>' : ''}
        </div>
      `
      : '';
    const textOnlyClass = item.image ? '' : ' is-text-only';
    return `
      <article class="store-menu-card${textOnlyClass}" role="button" tabindex="0" aria-label="${escapeMenuHtml(item.name)} 주문방법 보기" data-menu-card data-menu-select data-menu-id="${escapeMenuHtml(item.id)}" data-category="${escapeMenuHtml(item.category)}" data-search="${escapeMenuHtml(searchText)}" data-menu-has-photo="${item.image ? 'true' : 'false'}">
        ${photo}
        <div class="store-menu-copy">
          ${item.adultOnly && !item.image ? '<span class="store-menu-age-badge">19세 이상</span>' : ''}
          <p>${highlightedMenuHtml(item.category, query)}</p>
          <h3>${highlightedMenuHtml(item.name, query)}</h3>
          ${item.description ? `<div>${highlightedMenuHtml(item.description, query)}</div>` : ''}
          <span class="store-menu-card-action"><b>이 메뉴 주문하기</b><i aria-hidden="true">›</i></span>
        </div>
      </article>
    `;
  }

  function loadMenuImage(image) {
    const source = String(image?.dataset?.menuImageSrc || '').trim();
    if (!source || image.src) return;
    image.src = source;
    delete image.dataset.menuImageSrc;
  }

  function drainMenuImageQueue() {
    while (activeMenuImageLoads < MAX_CONCURRENT_MENU_IMAGE_LOADS && menuImageQueue.length) {
      const {image, run} = menuImageQueue.shift();
      if (run !== menuImageLoadRun || !image?.isConnected || !image.dataset.menuImageSrc) continue;
      activeMenuImageLoads += 1;
      const release = () => {
        if (run !== menuImageLoadRun) return;
        activeMenuImageLoads = Math.max(0, activeMenuImageLoads - 1);
        delete image.dataset.menuImageQueued;
        drainMenuImageQueue();
      };
      image.addEventListener('load', release, {once: true});
      image.addEventListener('error', release, {once: true});
      loadMenuImage(image);
    }
  }

  function queueMenuImage(image) {
    if (!image?.dataset?.menuImageSrc || image.dataset.menuImageQueued === '1') return;
    image.dataset.menuImageQueued = '1';
    menuImageQueue.push({image, run: menuImageLoadRun});
    drainMenuImageQueue();
  }

  function resetMenuImageLoading({cancelActive = false} = {}) {
    menuImageLoadRun += 1;
    menuImageQueue = [];
    activeMenuImageLoads = 0;
    menuImageObserver?.disconnect();
    menuImageObserver = null;
    if (!cancelActive) return;
    document.querySelectorAll('[data-store-menu-overlay] img[src]').forEach(image => {
      image.removeAttribute('src');
      delete image.dataset.menuImageQueued;
    });
  }

  function observeMenuImages(preview, {reset = false} = {}) {
    if (!preview) return;
    if (reset) {
      resetMenuImageLoading();
    }
    const images = [...preview.querySelectorAll('img[data-menu-image-src]')];
    if (!images.length) return;
    if (typeof IntersectionObserver !== 'function') {
      images.forEach(queueMenuImage);
      return;
    }
    if (!menuImageObserver) {
      menuImageObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (!entry.isIntersecting) return;
          queueMenuImage(entry.target);
          menuImageObserver?.unobserve(entry.target);
        });
      }, {
        root: preview.querySelector('.store-menu-scroll'),
        rootMargin: '160px 0px'
      });
    }
    images.forEach(image => menuImageObserver.observe(image));
  }

  function scheduleMenuRenderTask(callback) {
    if (typeof requestIdleCallback === 'function') {
      requestIdleCallback(callback, {timeout: 180});
      return;
    }
    window.setTimeout(() => callback(null), 0);
  }

  function scheduleProgressiveMenuCards(preview, items, query = '') {
    const grid = preview?.querySelector('[data-menu-grid]');
    const status = preview?.querySelector('[data-menu-render-status]');
    if (!grid) return;
    menuRenderObserver?.disconnect();
    menuRenderObserver = null;
    const run = ++menuRenderRun;
    const renderedIds = new Set(
      [...grid.querySelectorAll('[data-menu-id]')].map(card => String(card.dataset.menuId || ''))
    );
    const pendingItems = items.filter(item => !renderedIds.has(String(item.id || '')));
    preview.__menuRenderState?.cleanup?.();
    const state = {run, renderedIds, pendingItems, cursor: 0};
    preview.__menuRenderState = state;
    grid.setAttribute('aria-busy', String(pendingItems.length > 0));
    if (status) status.hidden = pendingItems.length === 0;
    if (!pendingItems.length) return;

    let chunkScheduled = false;
    const scrollRoot = preview.querySelector('.store-menu-scroll');
    let onProgressiveScroll = null;
    const cleanupProgressiveTriggers = () => {
      menuRenderObserver?.disconnect();
      menuRenderObserver = null;
      if (onProgressiveScroll) scrollRoot?.removeEventListener('scroll', onProgressiveScroll);
      onProgressiveScroll = null;
    };
    state.cleanup = cleanupProgressiveTriggers;
    const appendChunk = deadline => {
      chunkScheduled = false;
      if (menuRenderRun !== run || !preview.isConnected || preview.__menuRenderState !== state) return;
      const batch = [];
      while (state.cursor < state.pendingItems.length && batch.length < MENU_RENDER_CHUNK_SIZE) {
        if (batch.length >= 4 && deadline?.timeRemaining && deadline.timeRemaining() < 3) break;
        const item = state.pendingItems[state.cursor++];
        const id = String(item.id || '');
        if (!id || state.renderedIds.has(id)) continue;
        state.renderedIds.add(id);
        batch.push(item);
      }
      if (batch.length) {
        grid.insertAdjacentHTML('beforeend', batch.map(item => menuCardMarkup(item, query)).join(''));
        observeMenuImages(preview);
      }
      const complete = state.cursor >= state.pendingItems.length;
      grid.setAttribute('aria-busy', String(!complete));
      if (status) status.hidden = complete;
      if (complete) {
        cleanupProgressiveTriggers();
      }
    };
    const scheduleNextChunk = () => {
      if (chunkScheduled) return;
      chunkScheduled = true;
      scheduleMenuRenderTask(appendChunk);
    };
    if (typeof IntersectionObserver === 'function' && status) {
      menuRenderObserver = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        scheduleNextChunk();
      }, {
        root: scrollRoot,
        rootMargin: '900px 0px'
      });
      menuRenderObserver.observe(status);
      onProgressiveScroll = () => {
        if (!scrollRoot) return;
        const distanceFromBottom = scrollRoot.scrollHeight - scrollRoot.scrollTop - scrollRoot.clientHeight;
        if (distanceFromBottom <= 900) scheduleNextChunk();
      };
      scrollRoot?.addEventListener('scroll', onProgressiveScroll, {passive: true});
      return;
    }
    const appendFallbackChunk = deadline => {
      appendChunk(deadline);
      if (state.cursor < state.pendingItems.length) window.setTimeout(() => scheduleMenuRenderTask(appendFallbackChunk), 120);
    };
    scheduleMenuRenderTask(appendFallbackChunk);
  }

  function resetProgressiveMenuCards(preview, items, query = '') {
    const grid = preview?.querySelector('[data-menu-grid]');
    if (!grid) return;
    menuRenderRun += 1;
    menuRenderObserver?.disconnect();
    menuRenderObserver = null;
    grid.innerHTML = items.slice(0, INITIAL_MENU_RENDER_COUNT)
      .map(item => menuCardMarkup(item, query)).join('');
    observeMenuImages(preview, {reset: true});
    scheduleProgressiveMenuCards(preview, items, query);
  }

  function ensureMenuCardRendered(preview, menuId) {
    const id = String(menuId || '');
    if (!preview || !id) return null;
    let card = [...preview.querySelectorAll('[data-menu-card]')]
      .find(item => String(item.dataset.menuId || '') === id);
    if (card) return card;
    const item = activeMenuById.get(id);
    const grid = preview.querySelector('[data-menu-grid]');
    if (!item || !grid) return null;
    grid.insertAdjacentHTML('beforeend', menuCardMarkup(item));
    preview.__menuRenderState?.renderedIds?.add(id);
    observeMenuImages(preview);
    card = [...grid.querySelectorAll('[data-menu-card]')]
      .find(candidate => String(candidate.dataset.menuId || '') === id);
    return card || null;
  }

  function previewMarkup(menu, store) {
    const counts = menu.items.reduce((result, item) => {
      result[item.category] = (result[item.category] || 0) + 1;
      return result;
    }, {});
    const featuredCategories = menu.categories.filter(category => category !== '전체').slice(0, 3);
    return `
      <section class="store-menu-preview" data-store-id="${escapeMenuHtml(store.id)}" role="dialog" aria-modal="true" aria-labelledby="storeMenuTitle">
        <header class="store-menu-topbar">
          <button type="button" data-menu-preview-close aria-label="메뉴 미리보기 닫기">‹</button>
          <strong>음식 미리보기</strong>
          <button type="button" data-menu-preview-close aria-label="메뉴 미리보기 닫기">×</button>
        </header>

        <main class="store-menu-scroll">
          <section class="store-menu-hero">
            <img src="${escapeMenuHtml(menu.mainImage)}" alt="${escapeMenuHtml(menu.displayName)}" fetchpriority="high">
            <div>
              <span>${escapeMenuHtml(window.DAEDONG_REGION?.mapName || '대동여수음식지도')} · 음식 미리보기</span>
              <p>${featuredCategories.map(escapeMenuHtml).join(' · ')}</p>
              <h1 id="storeMenuTitle">${escapeMenuHtml(menu.displayName)}</h1>
              <p>주문방법을 고르기 전에 사진과 설명으로 메뉴를 먼저 살펴보세요.</p>
              <dl>
                <div><dt>${menu.items.length}</dt><dd>전체 메뉴</dd></div>
                ${featuredCategories.map(category => `
                  <div><dt>${counts[category] || 0}</dt><dd>${escapeMenuHtml(category)}</dd></div>
                `).join('')}
              </dl>
            </div>
          </section>

          <section class="store-menu-tools">
            <div class="store-menu-search-row">
              <div class="store-menu-search-box">
                <span aria-hidden="true">⌕</span>
                <input type="search" data-menu-search aria-label="메뉴 검색" placeholder="어떤 메뉴를 찾으시나요?" autocomplete="off">
                <button type="button" data-menu-search-clear aria-label="검색어 지우기" hidden>×</button>
              </div>
              <button class="store-menu-search-cancel" type="button" data-menu-search-cancel>취소</button>
            </div>
            <nav aria-label="메뉴 분류">
              ${menu.categories.map((category, index) => `
                <button type="button" data-menu-category="${escapeMenuHtml(category)}" class="${index === 0 ? 'active' : ''}">
                  ${escapeMenuHtml(category)}
                </button>
              `).join('')}
            </nav>
            <p><span data-menu-result-label>전체 메뉴</span> <strong data-menu-result-count>${menu.items.length}</strong>개 · 가격은 표시하지 않습니다.</p>
          </section>

          <p class="store-menu-photo-disclaimer">※ 음식 사진은 실제 조리된 음식과 다를 수 있습니다.</p>

          <section class="store-menu-grid" data-menu-grid aria-live="polite" aria-busy="true">
            ${menu.items.slice(0, INITIAL_MENU_RENDER_COUNT).map(item => menuCardMarkup(item)).join('')}
          </section>
          <p class="store-menu-render-status" data-menu-render-status role="status">나머지 메뉴를 부드럽게 준비하고 있습니다…</p>
          <p class="store-menu-no-results" data-menu-no-results hidden>검색 조건에 맞는 메뉴가 없습니다.</p>

          <footer class="store-menu-notice">
            <p>음식 사진은 실제 조리된 음식과 다를 수 있습니다.</p>
            <p>주류는 만 19세 이상만 주문할 수 있습니다.</p>
            <p>메뉴 구성과 제공 여부는 가게 또는 주문앱 상황에 따라 달라질 수 있습니다.</p>
          </footer>
        </main>

        ${stickyOrderMarkup(store)}

        <div class="menu-order-sheet" data-menu-order-sheet hidden>
          <button class="menu-order-sheet-backdrop" type="button" data-menu-order-sheet-close aria-label="주문방법 선택 닫기"></button>
          <section class="menu-order-sheet-panel" role="dialog" aria-modal="true" aria-labelledby="selectedMenuOrderTitle">
            <header>
              <span>선택한 메뉴 주문하기</span>
              <button type="button" data-menu-order-sheet-close aria-label="주문방법 선택 닫기">×</button>
            </header>
            <div class="menu-order-selected">
              <img data-selected-menu-image src="" alt="">
              <div>
                <small data-selected-menu-category></small>
                <h2 id="selectedMenuOrderTitle" data-selected-menu-name></h2>
                <p>가격과 주문 가능 여부는 이동한 주문 화면에서 확인할 수 있습니다.</p>
              </div>
            </div>
            <p class="menu-order-more-tip">
              <b>다른 메뉴도 함께 주문할 수 있어요</b>
              <span>주문앱으로 이동한 뒤 원하는 메뉴를 더 추가해 함께 주문하세요.</span>
            </p>
            <div class="menu-order-sheet-copy">
              <h3>어디서 주문할까요?</h3>
              <p>원하는 주문방법을 누르면 이 가게의 주문 화면으로 이동합니다.</p>
            </div>
            <div class="menu-order-grid">${primaryOrderMarkup(store)}</div>
            ${otherOrderMarkup(store)}
          </section>
        </div>
      </section>
    `;
  }

  function showMenuChrome(preview) {
    window.clearTimeout(menuChromeRevealTimer);
    menuChromeRevealTimer = 0;
    preview?.classList.remove('menu-chrome-hidden');
  }

  function captureMenuReturnState() {
    const preview = document.querySelector('[data-store-menu-overlay]:not([hidden]) .store-menu-preview');
    const scrollRoot = preview?.querySelector('.store-menu-scroll');
    const storeId = preview?.dataset.storeId || activeStore?.id;
    if (!preview || !scrollRoot || !storeId) return null;
    const rootRect = scrollRoot.getBoundingClientRect();
    const visibleCards = [...preview.querySelectorAll('[data-menu-card]:not([hidden])')]
      .filter(card => {
        const rect = card.getBoundingClientRect();
        return rect.height > 0 && rect.bottom > rootRect.top && rect.top < rootRect.bottom;
      })
      .sort((a, b) => Math.abs(a.getBoundingClientRect().top - rootRect.top) - Math.abs(b.getBoundingClientRect().top - rootRect.top));
    const anchorCard = visibleCards[0] || null;
    const orderSheet = preview.querySelector('[data-menu-order-sheet]');
    return {
      storeId: String(storeId),
      scrollTop: Number(scrollRoot.scrollTop || 0),
      anchorMenuId: String(anchorCard?.dataset.menuId || ''),
      anchorOffset: anchorCard ? anchorCard.getBoundingClientRect().top - rootRect.top : 0,
      category: preview.querySelector('[data-menu-category].active')?.dataset.menuCategory || '전체',
      query: preview.querySelector('[data-menu-search]')?.value || '',
      searchActive: preview.classList.contains('menu-search-active'),
      selectedMenuId: orderSheet && !orderSheet.hidden ? String(lastMenuSelection?.dataset.menuId || '') : ''
    };
  }

  function stabilizeMenuReturnPosition(preview, saved) {
    const scrollRoot = preview?.querySelector('.store-menu-scroll');
    if (!scrollRoot || !saved) return;
    let cancelled = false;
    const cancel = () => { cancelled = true; };
    for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown']) scrollRoot.addEventListener(type, cancel, {once: true, passive: true});
    const apply = useFallback => {
      if (cancelled || !scrollRoot.isConnected) return;
      if (useFallback) scrollRoot.scrollTop = Math.max(0, Number(saved.scrollTop || 0));
      const anchor = [...preview.querySelectorAll('[data-menu-id]')]
        .find(card => String(card.dataset.menuId || '') === String(saved.anchorMenuId || ''));
      if (!anchor) return;
      const delta = anchor.getBoundingClientRect().top - scrollRoot.getBoundingClientRect().top - Number(saved.anchorOffset || 0);
      if (Math.abs(delta) > 0.5) scrollRoot.scrollTop = Math.max(0, scrollRoot.scrollTop + delta);
    };
    requestAnimationFrame(() => {
      apply(true);
      requestAnimationFrame(() => apply(false));
    });
    for (const delay of [120, 360, 800, 1600]) setTimeout(() => apply(false), delay);
  }

  function applyMenuReturnState(preview, saved) {
    if (!preview || !saved) return;
    const category = [...preview.querySelectorAll('[data-menu-category]')]
      .find(button => String(button.dataset.menuCategory || '') === String(saved.category || '전체'));
    if (category) preview.querySelectorAll('[data-menu-category]').forEach(button => button.classList.toggle('active', button === category));
    const input = preview.querySelector('[data-menu-search]');
    if (input) input.value = String(saved.query || '');
    preview.classList.toggle('menu-search-active', Boolean(saved.searchActive));
    filterMenus(preview);
    stabilizeMenuReturnPosition(preview, saved);
    if (saved.selectedMenuId) {
      const selected = [...preview.querySelectorAll('[data-menu-card]')]
        .find(card => String(card.dataset.menuId || '') === String(saved.selectedMenuId));
      if (selected) requestAnimationFrame(() => openMenuOrderSheet(selected));
    }
  }

  function handleMenuScroll(scrollRoot) {
    const preview = scrollRoot.closest('.store-menu-preview');
    if (!preview) return;
    if (preview.classList.contains('menu-search-active')) {
      showMenuChrome(preview);
      return;
    }
    if (!window.matchMedia('(max-width: 720px)').matches || scrollRoot.scrollTop <= 56) {
      showMenuChrome(preview);
      return;
    }
    preview.classList.add('menu-chrome-hidden');
    window.clearTimeout(menuChromeRevealTimer);
    menuChromeRevealTimer = window.setTimeout(() => {
      preview.classList.remove('menu-chrome-hidden');
      menuChromeRevealTimer = 0;
    }, 1200);
  }

  async function openMenuPreview(storeId, trigger, options = {}) {
    const store = storeById(storeId);
    if (!store) return null;
    if (document.body.classList.contains('store-menu-open')) {
      const current = document.querySelector('[data-store-menu-overlay]:not([hidden]) .store-menu-preview');
      if (String(current?.dataset.storeId || '') === String(storeId)) {
        if (options.returnState) applyMenuReturnState(current, options.returnState);
        return current;
      }
      return null;
    }
    lastFocused = trigger || document.activeElement;
    let overlay = document.querySelector('[data-store-menu-overlay]');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'store-menu-overlay';
      overlay.dataset.storeMenuOverlay = '';
      document.body.append(overlay);
    }
    overlay.hidden = false;
    overlay.innerHTML = `<div class="store-menu-loading" role="status">${escapeMenuHtml(store.name || '가게')} 메뉴를 불러오는 중입니다…</div>`;
    document.body.classList.add('store-menu-open');
    if (!history.state?.[MENU_HISTORY.preview]) pushMenuHistory('preview');
    try {
      let detailPromise = Promise.resolve(store);
      if (store.__secureDetailReady !== true) {
        const secureDetail = window.daedongSecureStoreDetail;
        if (!secureDetail || typeof secureDetail.enrich !== 'function') {
          throw new Error('이 가게의 주문방법을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
        }
        detailPromise = secureDetail.enrich(store, typeof normalizedStore === 'function' ? normalizedStore : undefined);
      }
      const menuPromise = loadMenu(storeId);
      const [, menu] = await Promise.all([detailPromise, menuPromise]);
      activeStore = store;
      activeMenu = orderedMenu(menu);
      activeMenuById = new Map(activeMenu.items.map(item => [String(item.id || ''), item]));
      overlay.innerHTML = previewMarkup(activeMenu, store);
      const preview = overlay.querySelector('.store-menu-preview');
      const scrollRoot = overlay.querySelector('.store-menu-scroll');
      observeMenuImages(preview, {reset: true});
      scheduleProgressiveMenuCards(preview, activeMenu.items);
      scrollRoot?.addEventListener('scroll', () => handleMenuScroll(scrollRoot), {passive: true});
      const requestedQuery = String(options.query || '').trim();
      if (requestedQuery && preview) {
        const input = preview.querySelector('[data-menu-search]');
        if (input) input.value = requestedQuery;
        if (window.matchMedia('(max-width: 720px)').matches) enterMenuSearch(preview);
        else filterMenus(preview, {revealResults: true});
      }
      const requestedMenuId = String(options.menuId || '');
      if (requestedMenuId && preview) {
        const card = ensureMenuCardRendered(preview, requestedMenuId);
        if (card) window.requestAnimationFrame(() => openMenuOrderSheet(card));
      }
      if (options.returnState) applyMenuReturnState(preview, options.returnState);
      overlay.querySelector('[data-menu-preview-close]')?.focus();
      return preview;
    } catch (error) {
      overlay.innerHTML = `
        <div class="store-menu-load-error" role="alert">
          <p>${escapeMenuHtml(error.message)}</p>
          <button type="button" data-menu-preview-close>닫기</button>
        </div>
      `;
      return null;
    }
  }

  function closeMenuPreview() {
    window.clearTimeout(menuChromeRevealTimer);
    menuChromeRevealTimer = 0;
    menuRenderRun += 1;
    menuRenderObserver?.disconnect();
    menuRenderObserver = null;
    resetMenuImageLoading({cancelActive: true});
    const overlay = document.querySelector('[data-store-menu-overlay]');
    if (overlay) {
      overlay.hidden = true;
      overlay.innerHTML = '';
    }
    document.body.classList.remove('store-menu-open');
    activeStore = null;
    activeMenu = null;
    activeMenuById = new Map();
    lastMenuSelection = null;
    lastFocused?.focus?.();
    lastFocused = null;
  }

  function openMenuOrderSheet(card) {
    const preview = card?.closest('.store-menu-preview');
    const sheet = preview?.querySelector('[data-menu-order-sheet]');
    const item = activeMenu?.items.find(menuItem => String(menuItem.id) === card?.dataset.menuId);
    if (!preview || !sheet || !item) return;
    const image = sheet.querySelector('[data-selected-menu-image]');
    const selected = sheet.querySelector('.menu-order-selected');
    const category = sheet.querySelector('[data-selected-menu-category]');
    const name = sheet.querySelector('[data-selected-menu-name]');
    selected?.classList.toggle('no-image', !item.image);
    if (image) {
      if (item.image) {
        image.src = item.image;
        image.alt = item.name;
        image.hidden = false;
      } else {
        image.removeAttribute('src');
        image.alt = '';
        image.hidden = true;
      }
    }
    if (category) category.textContent = item.category;
    if (name) name.textContent = item.name;
    preview.querySelector('[data-menu-search]')?.blur();
    showMenuChrome(preview);
    lastMenuSelection = card;
    sheet.hidden = false;
    preview.classList.add('menu-order-sheet-open');
    if (!history.state?.[MENU_HISTORY.order]) pushMenuHistory('order');
    window.requestAnimationFrame(() => {
      sheet.querySelector('.menu-order-sheet-panel [data-menu-order-sheet-close]')?.focus();
    });
  }

  function closeMenuOrderSheet(preview, {restoreFocus = true} = {}) {
    const sheet = preview?.querySelector('[data-menu-order-sheet]');
    if (!sheet || sheet.hidden) return false;
    sheet.hidden = true;
    preview.classList.remove('menu-order-sheet-open');
    if (restoreFocus) lastMenuSelection?.focus?.();
    lastMenuSelection = null;
    return true;
  }

  function highlightedMenuHtml(value, query) {
    const text = String(value || '');
    const needle = String(query || '').trim();
    if (!needle) return escapeMenuHtml(text);
    const haystack = text.toLocaleLowerCase('ko-KR');
    const lowerNeedle = needle.toLocaleLowerCase('ko-KR');
    let cursor = 0;
    let matchIndex = haystack.indexOf(lowerNeedle);
    if (matchIndex < 0) return escapeMenuHtml(text);
    let result = '';
    while (matchIndex >= 0) {
      result += escapeMenuHtml(text.slice(cursor, matchIndex));
      result += `<mark>${escapeMenuHtml(text.slice(matchIndex, matchIndex + needle.length))}</mark>`;
      cursor = matchIndex + needle.length;
      matchIndex = haystack.indexOf(lowerNeedle, cursor);
    }
    return result + escapeMenuHtml(text.slice(cursor));
  }

  function updateMenuCardText(card, query) {
    const item = activeMenu?.items.find(menuItem => String(menuItem.id) === card.dataset.menuId);
    if (!item) return;
    const category = card.querySelector('.store-menu-copy p');
    const name = card.querySelector('.store-menu-copy h3');
    const description = card.querySelector('.store-menu-copy div');
    if (category) category.innerHTML = highlightedMenuHtml(item.category, query);
    if (name) name.innerHTML = highlightedMenuHtml(item.name, query);
    if (description) description.innerHTML = highlightedMenuHtml(item.description, query);
  }

  function enterMenuSearch(preview) {
    if (!preview || !window.matchMedia('(max-width: 720px)').matches) return;
    const scrollRoot = preview.querySelector('.store-menu-scroll');
    if (!preview.classList.contains('menu-search-active')) {
      preview.dataset.menuSearchReturn = String(scrollRoot?.scrollTop || 0);
      preview.classList.add('menu-search-active');
      if (!history.state?.[MENU_HISTORY.search]) pushMenuHistory('search');
    }
    showMenuChrome(preview);
    filterMenus(preview, {revealResults: true});
    window.requestAnimationFrame(() => {
      if (scrollRoot) scrollRoot.scrollTop = 0;
    });
  }

  function exitMenuSearch(preview, {restorePosition = true} = {}) {
    if (!preview) return;
    const scrollRoot = preview.querySelector('.store-menu-scroll');
    const input = preview.querySelector('[data-menu-search]');
    const returnPosition = Number(preview.dataset.menuSearchReturn || 0);
    if (input) {
      input.value = '';
      input.blur();
    }
    preview.classList.remove('menu-search-active');
    delete preview.dataset.menuSearchReturn;
    showMenuChrome(preview);
    filterMenus(preview);
    if (restorePosition) {
      window.requestAnimationFrame(() => {
        if (scrollRoot) scrollRoot.scrollTop = returnPosition;
        window.requestAnimationFrame(() => showMenuChrome(preview));
      });
    }
  }

  function filterMenus(root, {revealResults = false} = {}) {
    if (!root || !activeMenu) return;
    const rawQuery = String(root.querySelector('[data-menu-search]')?.value || '').trim();
    const query = rawQuery.toLocaleLowerCase('ko-KR');
    const category = root.classList.contains('menu-search-active')
      ? '전체'
      : root.querySelector('[data-menu-category].active')?.dataset.menuCategory || '전체';
    const matchingItems = activeMenu.items.filter(item => {
      const matchesCategory = category === '전체' || String(item.category || '') === category;
      const searchText = `${item.name || ''} ${item.description || ''} ${item.category || ''}`.toLocaleLowerCase('ko-KR');
      return matchesCategory && (!query || searchText.includes(query));
    });
    const visible = matchingItems.length;
    resetProgressiveMenuCards(root, matchingItems, rawQuery);
    const count = root.querySelector('[data-menu-result-count]');
    if (count) count.textContent = String(visible);
    const label = root.querySelector('[data-menu-result-label]');
    if (label) label.textContent = rawQuery ? '검색 결과' : '전체 메뉴';
    const clear = root.querySelector('[data-menu-search-clear]');
    if (clear) clear.hidden = !rawQuery;
    const empty = root.querySelector('[data-menu-no-results]');
    if (empty) empty.hidden = visible !== 0;
    if (revealResults && root.classList.contains('menu-search-active')) {
      const scrollRoot = root.querySelector('.store-menu-scroll');
      window.requestAnimationFrame(() => {
        if (scrollRoot) scrollRoot.scrollTop = 0;
      });
    }
  }

  document.addEventListener('pointerdown', event => {
    if (event.button !== 0 || !event.target.closest('[data-menu-preview-close]')) return;
    menuClosePointerAt = performance.now();
    event.preventDefault();
    event.stopImmediatePropagation();
    requestCloseMenuPreview();
  }, {capture: true});

  document.addEventListener('click', event => {
    const entry = event.target.closest('[data-store-menu-preview]');
    if (entry) {
      openMenuPreview(entry.dataset.storeMenuPreview, entry);
      return;
    }
    if (event.target.closest('[data-menu-preview-close]')) {
      if (performance.now() - menuClosePointerAt < 700) return;
      requestCloseMenuPreview();
      return;
    }
    const closeOrderSheet = event.target.closest('[data-menu-order-sheet-close]');
    if (closeOrderSheet) {
      const preview = closeOrderSheet.closest('.store-menu-preview');
      requestMenuLayerBack('order', () => closeMenuOrderSheet(preview));
      return;
    }
    const selectedMenu = event.target.closest('[data-menu-select]');
    if (selectedMenu) {
      openMenuOrderSheet(selectedMenu);
      return;
    }
    const clearSearch = event.target.closest('[data-menu-search-clear]');
    if (clearSearch) {
      const preview = clearSearch.closest('.store-menu-preview');
      const input = preview?.querySelector('[data-menu-search]');
      if (input) input.value = '';
      filterMenus(preview, {revealResults: true});
      input?.focus();
      return;
    }
    const cancelSearch = event.target.closest('[data-menu-search-cancel]');
    if (cancelSearch) {
      const preview = cancelSearch.closest('.store-menu-preview');
      requestMenuLayerBack('search', () => exitMenuSearch(preview));
      return;
    }
    const category = event.target.closest('[data-menu-category]');
    if (category) {
      const preview = category.closest('.store-menu-preview');
      showMenuChrome(preview);
      preview.querySelectorAll('[data-menu-category]').forEach(button => button.classList.toggle('active', button === category));
      filterMenus(preview);
      return;
    }
    const stickyOther = event.target.closest('[data-menu-sticky-other-toggle]');
    if (stickyOther) {
      const dock = stickyOther.closest('.store-menu-sticky-actions');
      const list = dock?.querySelector('[data-menu-sticky-other-list]');
      if (!list) return;
      const expanded = stickyOther.getAttribute('aria-expanded') !== 'true';
      stickyOther.setAttribute('aria-expanded', String(expanded));
      stickyOther.classList.toggle('is-expanded', expanded);
      list.hidden = !expanded;
      return;
    }
    const other = event.target.closest('[data-menu-other-toggle]');
    if (other) {
      const list = other.parentElement.querySelector('[data-menu-other-list]');
      if (!list) return;
      const expanded = other.getAttribute('aria-expanded') !== 'true';
      other.setAttribute('aria-expanded', String(expanded));
      other.classList.toggle('is-expanded', expanded);
      list.hidden = !expanded;
      const label = other.querySelector('[data-menu-other-label]');
      if (label) label.textContent = expanded ? '다른 주문앱 접기' : '다른 주문앱 보기';
      if (expanded) {
        window.requestAnimationFrame(() => {
          list.scrollIntoView({behavior: 'smooth', block: 'center'});
        });
      }
    }
  });

  document.addEventListener('focusin', event => {
    if (event.target.matches('[data-menu-search]')) {
      enterMenuSearch(event.target.closest('.store-menu-preview'));
    }
  });

  document.addEventListener('input', event => {
    if (event.target.matches('[data-menu-search]')) {
      const preview = event.target.closest('.store-menu-preview');
      showMenuChrome(preview);
      if (!event.isComposing) filterMenus(preview, {revealResults: true});
    }
  });

  document.addEventListener('compositionend', event => {
    if (event.target.matches('[data-menu-search]')) {
      filterMenus(event.target.closest('.store-menu-preview'), {revealResults: true});
    }
  });

  document.addEventListener('keydown', event => {
    if (!document.body.classList.contains('store-menu-open')) return;
    const preview = document.querySelector('.store-menu-preview');
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('[data-menu-select]')) {
      event.preventDefault();
      openMenuOrderSheet(event.target);
      return;
    }
    if (event.key === 'Enter' && event.target.matches('[data-menu-search]')) {
      event.preventDefault();
      event.target.blur();
      return;
    }
    const stickyOther = preview?.querySelector('[data-menu-sticky-other-toggle][aria-expanded="true"]');
    if (event.key === 'Escape' && stickyOther) {
      event.preventDefault();
      stickyOther.setAttribute('aria-expanded', 'false');
      stickyOther.classList.remove('is-expanded');
      const list = preview.querySelector('[data-menu-sticky-other-list]');
      if (list) list.hidden = true;
      stickyOther.focus();
      return;
    }
    const orderSheet = preview?.querySelector('[data-menu-order-sheet]');
    if (event.key === 'Escape' && orderSheet && !orderSheet.hidden) {
      event.preventDefault();
      requestMenuLayerBack('order', () => closeMenuOrderSheet(preview));
      return;
    }
    if (event.key === 'Escape' && preview?.classList.contains('menu-search-active')) {
      event.preventDefault();
      requestMenuLayerBack('search', () => exitMenuSearch(preview));
      return;
    }
    if (event.key === 'Escape') requestCloseMenuPreview();
  });

  window.addEventListener('popstate', event => {
    if (menuHistoryClosePending) {
      menuHistoryClosePending = false;
      window.clearTimeout(menuHistoryCloseTimer);
      delete document.documentElement.dataset.daedongMenuHistoryClose;
      event.stopImmediatePropagation();
      return;
    }
    if (!document.body.classList.contains('store-menu-open')) return;
    let handled = false;
    const preview = document.querySelector('.store-menu-preview');
    if (!preview) {
      event.stopImmediatePropagation();
      closeMenuPreview();
      return;
    }
    const sheet = preview.querySelector('[data-menu-order-sheet]');
    if (sheet && !sheet.hidden && !event.state?.[MENU_HISTORY.order]) {
      closeMenuOrderSheet(preview);
      handled = true;
    }
    if (preview.classList.contains('menu-search-active') && !event.state?.[MENU_HISTORY.search]) {
      exitMenuSearch(preview);
      handled = true;
    }
    if (!event.state?.[MENU_HISTORY.preview]) {
      closeMenuPreview();
      handled = true;
    }
    if (handled) event.stopImmediatePropagation();
  }, true);

  window.addEventListener('resize', () => {
    if (!window.matchMedia('(max-width: 720px)').matches) {
      const preview = document.querySelector('.store-menu-preview');
      if (preview?.classList.contains('menu-search-active')) {
        preview.classList.remove('menu-search-active');
        delete preview.dataset.menuSearchReturn;
        filterMenus(preview);
      }
      showMenuChrome(preview);
    }
  });

  window.daedongMenuPreview = Object.freeze({
    open: (storeId, options = {}) => openMenuPreview(storeId, null, options),
    has: storeId => Boolean(storeById(storeId)?.hasMenu)
  });
  window.daedongMenuReturn = Object.freeze({
    capture: captureMenuReturnState,
    restore: async saved => Boolean(await openMenuPreview(saved?.storeId, null, {returnState: saved}))
  });

  const menuEntryRoot = document.querySelector('#modalContent');
  if (menuEntryRoot) new MutationObserver(ensureMenuEntryButton).observe(menuEntryRoot, {childList: true, subtree: true});
  ensureMenuEntryButton();
})();
