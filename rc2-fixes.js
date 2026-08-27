'use strict';

/* RC2 fixes only. Frozen store, photo, route, brand-app, HappyOrder and banner data stay read-only. */
const RC2_NAVER_AUDIT_URL = 'data/naver-map-runtime.json';
const RC2_EXTERNAL_RETURN = 'daedongExternalReturnRc2';
const RC2_APP_BROWSER_RETURN = 'daedongAppBrowserReturnV1';
const RC2_RETURN_TOKEN_STATE = 'daedongExternalReturnToken';
const RC2_RETURN_TOKEN_PARAM = '__ddret';
const RC2_RETURN_GUARD_PARAM = '__ddguard';
const RC2_APP_FALLBACK_PARAM = '__ddappfallback';
const RC2_ORDER_METHOD_REENTRY = 'daedongOrderMethodReentryV1';
const RC2_ORDER_METHOD_REENTRY_PARAM = '__ddom';
const RC2_DURABLE_RETURN_COOKIE = 'daedongOrderReturnV1';
const RC2_RETURN_DOCUMENT_RELOAD = 'daedongExternalReturnDocumentReloadV1';
const RC2_RETURN_MAX_AGE = 30 * 60 * 1000;
const RC2_FOCUS_ONLY_RETURN_DELAY_MS = 650;
const RC2_RETURN_SETTLE_DELAY_MS = 500;
const RC2_RETURN_STORAGE_KEYS = [RC2_EXTERNAL_RETURN, RC2_APP_BROWSER_RETURN];
const RC2_ICON_SPRITE = 'assets/ui/category-icons.svg';
const RC2_REGION = window.DAEDONG_REGION || {shortName: '여수', mapName: '대동여수음식지도'};
const RC2_REGION_NAME = RC2_REGION.shortName || '여수';
const RC2_MAP_NAME = RC2_REGION.mapName || '대동여수음식지도';
const RC2_IS_GOHEUNG = RC2_REGION.code === 'goheung';
const rc2NativeOpenModal = openModal;
const rc2NativeHardClose = hardClose;
const rc2ModalStack = [];
const rc2ActivePresses = new Set();
const rc2PressTimers = new WeakMap();
const rc2NaverByStore = new Map();
let rc2ModalRestoring = false;
let rc2ReplaceNextModal = false;
let rc2AmbientTimers = [];
let rc2DeferredStoreReturnPosition = null;
let rc2StoreRestorePromise = null;
let rc2SurfaceRestorePromise = null;
let rc2ExternalDepartureBlurred = false;
let rc2ExternalDepartureHidden = false;
let rc2RestoredReturnLease = null;
let rc2RestoredReturnSettleTimer = 0;
let rc2ReturnLifecycleEpoch = 0;
let rc2SnapshotSurfaceResetSequence = 0;
const rc2PositionStabilizers = new WeakMap();

function rc2FreshReturnState(saved) {
  const age = Date.now() - Number(saved?.savedAt || 0);
  return Boolean(saved && age >= 0 && age < RC2_RETURN_MAX_AGE);
}

function rc2ParseReturnState(storage, key) {
  try { return JSON.parse(storage.getItem(key) || 'null'); } catch { return null; }
}

function rc2ReadReturnDocumentReload() {
  const marker = rc2ParseReturnState(sessionStorage, RC2_RETURN_DOCUMENT_RELOAD);
  return rc2FreshReturnState(marker) ? marker : null;
}

function rc2ClearReturnDocumentReload(returnToken = '') {
  const marker = rc2ReadReturnDocumentReload();
  if (returnToken && String(marker?.returnToken || '') !== String(returnToken)) return;
  try { sessionStorage.removeItem(RC2_RETURN_DOCUMENT_RELOAD); } catch {}
}

function rc2NavigateReturnedDocumentOnce(saved) {
  const returnToken = String(saved?.returnToken || '');
  if (!returnToken || String(rc2ReadReturnDocumentReload()?.returnToken || '') === returnToken) return false;
  try {
    sessionStorage.setItem(RC2_RETURN_DOCUMENT_RELOAD, JSON.stringify({returnToken, savedAt: Date.now()}));
    document.documentElement.classList.add('daedong-external-return-pending');
    const returnUrl = new URL(location.href);
    returnUrl.searchParams.set(RC2_RETURN_GUARD_PARAM, returnToken);
    location.replace(`${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`);
    return true;
  } catch {
    rc2ClearReturnDocumentReload(returnToken);
    return false;
  }
}

function rc2ReadDepartureMarker() {
  const sessionMarker = rc2ParseReturnState(sessionStorage, EXTERNAL_APP_DEPARTURE_KEY);
  if (rc2FreshReturnState(sessionMarker)) return sessionMarker;
  const persistentMarker = rc2ParseReturnState(localStorage, EXTERNAL_APP_DEPARTURE_KEY);
  return rc2FreshReturnState(persistentMarker) ? persistentMarker : null;
}

function rc2IsHistoryReentry() {
  if (globalThis.daedongEntryIsHistoryReturn === true) return true;
  try {
    const navigationEntry = performance.getEntriesByType?.('navigation')?.[0];
    return navigationEntry?.type === 'back_forward' || Number(performance.navigation?.type) === 2;
  } catch {
    return false;
  }
}

function rc2ReadReturnState(key) {
  let urlToken = '';
  try { urlToken = new URL(location.href).searchParams.get(RC2_RETURN_TOKEN_PARAM) || ''; } catch {}
  const historyToken = String(history.state?.[RC2_RETURN_TOKEN_STATE] || '');
  const departureToken = (rc2IsHistoryReentry() || globalThis.daedongEntryIsDetachedKakaoReturn === true)
    ? String(rc2ReadDepartureMarker()?.returnToken || '')
    : '';
  for (const storage of [sessionStorage, localStorage]) {
    const saved = rc2ParseReturnState(storage, key);
    const savedToken = String(saved?.returnToken || '');
    if (
      rc2FreshReturnState(saved) && savedToken
      && (
        savedToken === historyToken
        || savedToken === urlToken
        || savedToken === departureToken
      )
    ) return saved;
  }
  return null;
}

function rc2StoreReturnState(storage, key, payload) {
  try {
    storage.setItem(key, JSON.stringify(payload));
    return;
  } catch {}
  const compact = {...payload};
  delete compact.storeSnapshot;
  delete compact.modalSnapshot;
  try { storage.setItem(key, JSON.stringify(compact)); } catch {}
}

function rc2ReadDurableReturn() {
  try {
    const prefix = `${RC2_DURABLE_RETURN_COOKIE}=`;
    const raw = document.cookie.split('; ').find(item => item.startsWith(prefix));
    return raw ? JSON.parse(decodeURIComponent(raw.slice(prefix.length))) : null;
  } catch {
    return null;
  }
}

function rc2WriteDurableReturn(storageKey, payload) {
  const compact = {...payload};
  delete compact.storeSnapshot;
  delete compact.modalSnapshot;
  let container = {
    storageKey,
    returnToken: compact.returnToken,
    savedAt: compact.savedAt,
    payload: compact
  };
  let encoded = encodeURIComponent(JSON.stringify(container));
  if (encoded.length > 3400) {
    delete compact.anchor;
    delete compact.searchState;
    delete compact.menuState;
    container = {...container, payload: compact};
    encoded = encodeURIComponent(JSON.stringify(container));
  }
  if (encoded.length > 3400) return false;
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${RC2_DURABLE_RETURN_COOKIE}=${encoded}; Max-Age=1800; Path=/; SameSite=Lax${secure}`;
    return rc2ReadDurableReturn()?.returnToken === compact.returnToken;
  } catch {
    return false;
  }
}

function rc2ClearDurableReturn(returnToken = '') {
  const saved = rc2ReadDurableReturn();
  if (returnToken && String(saved?.returnToken || '') !== String(returnToken)) return;
  try {
    const secure = location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${RC2_DURABLE_RETURN_COOKIE}=; Max-Age=0; Path=/; SameSite=Lax${secure}`;
  } catch {}
}

function rc2ResetExternalDepartureLifecycle() {
  rc2ExternalDepartureBlurred = false;
  rc2ExternalDepartureHidden = false;
}

function rc2InvalidatePendingReturnRestores() {
  rc2ReturnLifecycleEpoch += 1;
  // A promise that already captured the previous epoch may still resolve, but
  // it is no longer allowed to mutate the customer's newly selected surface.
  rc2StoreRestorePromise = null;
  rc2SurfaceRestorePromise = null;
  return rc2ReturnLifecycleEpoch;
}

function rc2ReturnRestoreCancelled(epoch) {
  return epoch !== rc2ReturnLifecycleEpoch;
}
window.daedongInvalidatePendingReturnRestores = rc2InvalidatePendingReturnRestores;

const RC2_STORE_INTENT_SELECTOR = [
  '[data-rc3-rail-open]',
  '[data-rail-store-id]',
  '#storeGrid .store-card[data-id]',
  '[data-app-store-info]',
  '[data-app-store-id]',
  '[data-channel-store-id]',
  '[data-search-store-id]'
].join(',');
let rc2LastStoreIntentStartAt = -Infinity;

function rc2ConfirmIntentionalStoreOpen() {
  // A real store-card click supersedes every delayed fresh-entry or external
  // return task. Kakao can deliver those lifecycle callbacks after the click;
  // leaving them armed lets a newly opened detail be replaced by home.
  globalThis.daedongMarkHomeInteraction?.();
  rc2InvalidatePendingReturnRestores();
  rc2ResetExternalDepartureLifecycle();
  rc2CancelRestoredReturnSettlement();
  for (const key of RC2_RETURN_STORAGE_KEYS) {
    try { sessionStorage.removeItem(key); } catch {}
    try { localStorage.removeItem(key); } catch {}
  }
  try { sessionStorage.removeItem(EXTERNAL_APP_DEPARTURE_KEY); } catch {}
  try { localStorage.removeItem(EXTERNAL_APP_DEPARTURE_KEY); } catch {}
  rc2ClearReturnDocumentReload();
  rc2ClearDurableReturn();
  try {
    const url = new URL(location.href);
    const next = {...history.state};
    delete next[RC2_RETURN_TOKEN_STATE];
    delete next.daedongExternalReturnGuard;
    url.searchParams.delete(RC2_RETURN_TOKEN_PARAM);
    url.searchParams.delete(RC2_RETURN_GUARD_PARAM);
    url.searchParams.delete(RC2_APP_FALLBACK_PARAM);
    history.replaceState(next, '', `${url.pathname}${url.search}${url.hash}`);
  } catch {}
  globalThis.daedongFinishExternalReturnBoot?.();
}

function rc2OpenStoreFromCustomer(store) {
  if (!store) return false;
  rc2ConfirmIntentionalStoreOpen();
  return openStore(store);
}

function rc2PrepareStoreIntent(event) {
  if (!event.target?.closest?.(RC2_STORE_INTENT_SELECTOR)) return;
  const now = performance.now();
  if (now - rc2LastStoreIntentStartAt < 120) return;
  rc2LastStoreIntentStartAt = now;
  rc2ConfirmIntentionalStoreOpen();
}

window.daedongConfirmIntentionalStoreOpen = rc2ConfirmIntentionalStoreOpen;
window.daedongConfirmIntentionalSurfaceNavigation = rc2ConfirmIntentionalStoreOpen;

function rc2WriteReturnState(key, value) {
  rc2InvalidatePendingReturnRestores();
  rc2CancelRestoredReturnSettlement();
  rc2ResetExternalDepartureLifecycle();
  rc2ClearReturnDocumentReload();
  const returnToken = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const payload = {...value, returnToken, savedAt: Date.now()};
  globalThis.daedongLastValidatedExternalReturnAt = payload.savedAt;
  for (const storageKey of RC2_RETURN_STORAGE_KEYS) {
    if (storageKey === key) continue;
    try { sessionStorage.removeItem(storageKey); } catch {}
    try { localStorage.removeItem(storageKey); } catch {}
  }
  try {
    const returnUrl = new URL(location.href);
    returnUrl.searchParams.set(RC2_RETURN_TOKEN_PARAM, returnToken);
    const protectedState = {...history.state, [RC2_RETURN_TOKEN_STATE]: returnToken};
    const protectedUrl = `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}`;
    history.replaceState(
      protectedState,
      '',
      protectedUrl
    );
    // Keep the existing Preview entry in place. Adding a sacrificial history
    // entry here made Kakao/Samsung deliver a delayed popstate after the app
    // had already returned, which closed the restored modal and exposed Home.
    // The exact URL token plus the first-party durable cookie already cover a
    // true cross-document fallback without mutating the customer's Back stack.
  } catch {}
  rc2StoreReturnState(sessionStorage, key, payload);
  rc2StoreReturnState(localStorage, key, payload);
  const departureMarker = {returnToken, savedAt: payload.savedAt};
  rc2StoreReturnState(sessionStorage, EXTERNAL_APP_DEPARTURE_KEY, departureMarker);
  rc2StoreReturnState(localStorage, EXTERNAL_APP_DEPARTURE_KEY, departureMarker);
  rc2WriteDurableReturn(key, payload);
  return payload;
}

function rc2ClearReturnState(key, saved = null) {
  if (saved?.returnToken) globalThis.daedongLastValidatedExternalReturnAt = Date.now();
  try { sessionStorage.removeItem(key); } catch {}
  try { localStorage.removeItem(key); } catch {}
  const token = saved?.returnToken;
  if (token) rc2ClearReturnDocumentReload(token);
  const marker = rc2ReadDepartureMarker();
  if (token && marker?.returnToken === token) {
    try { sessionStorage.removeItem(EXTERNAL_APP_DEPARTURE_KEY); } catch {}
    try { localStorage.removeItem(EXTERNAL_APP_DEPARTURE_KEY); } catch {}
  }
  if (token && rc2IsHistoryReentry()) rc2ClearDurableReturn(token);
  let urlToken = '';
  let guardToken = '';
  let returnUrl = null;
  try {
    returnUrl = new URL(location.href);
    urlToken = returnUrl.searchParams.get(RC2_RETURN_TOKEN_PARAM) || '';
    guardToken = returnUrl.searchParams.get(RC2_RETURN_GUARD_PARAM) || '';
  } catch {}
  const historyMatches = Boolean(token && history.state?.[RC2_RETURN_TOKEN_STATE] === token);
  const urlMatches = Boolean(token && urlToken === token);
  const guardMatches = Boolean(token && guardToken === token);
  if (!historyMatches && !urlMatches && !guardMatches) return;
  try {
    const next = {...history.state};
    delete next[RC2_RETURN_TOKEN_STATE];
    if (urlMatches) returnUrl.searchParams.delete(RC2_RETURN_TOKEN_PARAM);
    if (guardMatches) returnUrl.searchParams.delete(RC2_RETURN_GUARD_PARAM);
    returnUrl.searchParams.delete(RC2_APP_FALLBACK_PARAM);
    history.replaceState(next, '', returnUrl ? `${returnUrl.pathname}${returnUrl.search}${returnUrl.hash}` : undefined);
  } catch {}
}

const RC2_RETURN_ANCHOR_ATTRIBUTES = [
  'data-menu-id', 'data-app-store-order', 'data-app-store-info', 'data-store-menu-preview',
  'data-store-service-menu-id', 'data-store-service-store-id', 'data-benefit-app', 'data-store-id'
];
const RC2_RETURN_ANCHOR_SELECTOR = [
  '#modalTitle', '[data-menu-id]', '[data-app-store-order]', '[data-app-store-info]',
  '[data-store-menu-preview]', '[data-store-service-menu-id]', '[data-store-service-store-id]',
  '[data-benefit-app]', '.detail-meta-row', '.detail-routes', '.store-other-wrap',
  '.brand-store-actions', '.detail-personal-actions'
].join(',');

function rc2ReturnAnchorDescriptor(element, card) {
  if (!element || !card) return null;
  const cardRect = card.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  if (element.id) return {kind: 'id', value: element.id, offset: rect.top - cardRect.top};
  for (const attribute of RC2_RETURN_ANCHOR_ATTRIBUTES) {
    if (!element.hasAttribute(attribute)) continue;
    return {kind: 'attribute', name: attribute, value: element.getAttribute(attribute), offset: rect.top - cardRect.top};
  }
  const className = [...element.classList].find(value => /^[a-z][a-z0-9_-]+$/i.test(value));
  if (!className) return null;
  const matches = [...card.querySelectorAll(`.${CSS.escape(className)}`)];
  return {kind: 'class', value: className, index: Math.max(0, matches.indexOf(element)), offset: rect.top - cardRect.top};
}

function rc2CaptureReturnAnchor(card, preferredElement = null) {
  if (!card) return null;
  if (preferredElement && card.contains(preferredElement)) return rc2ReturnAnchorDescriptor(preferredElement, card);
  const cardRect = card.getBoundingClientRect();
  const candidates = [...card.querySelectorAll(RC2_RETURN_ANCHOR_SELECTOR)]
    .filter(element => {
      const rect = element.getBoundingClientRect();
      return rect.height > 0 && rect.bottom > cardRect.top + 4 && rect.top < cardRect.bottom - 4;
    })
    .sort((a, b) => Math.abs(a.getBoundingClientRect().top - cardRect.top) - Math.abs(b.getBoundingClientRect().top - cardRect.top));
  return rc2ReturnAnchorDescriptor(candidates[0], card);
}

function rc2ResolveReturnAnchor(card, anchor) {
  if (!card || !anchor) return null;
  try {
    if (anchor.kind === 'id') return card.querySelector(`#${CSS.escape(String(anchor.value || ''))}`);
    if (anchor.kind === 'attribute' && RC2_RETURN_ANCHOR_ATTRIBUTES.includes(anchor.name)) {
      return [...card.querySelectorAll(`[${anchor.name}]`)].find(element => element.getAttribute(anchor.name) === String(anchor.value ?? '')) || null;
    }
    if (anchor.kind === 'class') return card.querySelectorAll(`.${CSS.escape(String(anchor.value || ''))}`)[Number(anchor.index || 0)] || null;
  } catch {}
  return null;
}

function rc2ApplyReturnPosition(card, saved, useFallback = false) {
  if (!card || !saved) return false;
  if (useFallback) card.scrollTop = Math.max(0, Number(saved.modalScroll || saved.scrollTop || 0));
  const anchor = rc2ResolveReturnAnchor(card, saved.anchor);
  if (!anchor) return false;
  const currentOffset = anchor.getBoundingClientRect().top - card.getBoundingClientRect().top;
  const delta = currentOffset - Number(saved.anchor.offset || 0);
  if (Math.abs(delta) > 0.5) card.scrollTop = Math.max(0, card.scrollTop + delta);
  return true;
}

function rc2StabilizeReturnPosition(saved, card = $('#modal .modal-card')) {
  if (!card || !saved) return;
  rc2PositionStabilizers.get(card)?.();
  let cancelled = false;
  let queued = false;
  let resizeObserver = null;
  let mutationObserver = null;
  let safetyTimer = 0;
  const apply = useFallback => { if (!cancelled && card.isConnected) rc2ApplyReturnPosition(card, saved, useFallback); };
  const queueApply = () => {
    if (cancelled || queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply(false);
    });
  };
  const cancel = () => {
    if (cancelled) return;
    cancelled = true;
    resizeObserver?.disconnect();
    mutationObserver?.disconnect();
    if (safetyTimer) clearTimeout(safetyTimer);
    for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown']) card.removeEventListener(type, cancel);
    card.removeEventListener('load', queueApply, true);
    rc2PositionStabilizers.delete(card);
  };
  for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown']) card.addEventListener(type, cancel, {once: true, passive: true});
  requestAnimationFrame(() => {
    apply(true);
    requestAnimationFrame(() => apply(false));
  });
  for (const delay of [120, 360, 800, 1600, 3200]) setTimeout(() => apply(false), delay);
  if (typeof ResizeObserver === 'function') {
    resizeObserver = new ResizeObserver(queueApply);
    resizeObserver.observe(card);
    const content = card.firstElementChild;
    if (content) resizeObserver.observe(content);
  }
  if (typeof MutationObserver === 'function') {
    mutationObserver = new MutationObserver(queueApply);
    mutationObserver.observe(card, {childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'hidden', 'class']});
  }
  card.addEventListener('load', queueApply, true);
  safetyTimer = setTimeout(cancel, 8000);
  rc2PositionStabilizers.set(card, cancel);
}

function rc2ArmRestoredReturnLease(key, saved) {
  if (!RC2_RETURN_STORAGE_KEYS.includes(key) || !saved?.returnToken) return false;
  if (rc2RestoredReturnSettleTimer) {
    clearTimeout(rc2RestoredReturnSettleTimer);
    rc2RestoredReturnSettleTimer = 0;
  }
  rc2RestoredReturnLease = {key, saved};
  globalThis.daedongLastValidatedExternalReturnAt = Date.now();
  return true;
}

function rc2CancelRestoredReturnSettlement() {
  if (rc2RestoredReturnSettleTimer) clearTimeout(rc2RestoredReturnSettleTimer);
  rc2RestoredReturnSettleTimer = 0;
  rc2RestoredReturnLease = null;
}

function rc2SettleRestoredReturnLease() {
  const lease = rc2RestoredReturnLease;
  if (!lease) return false;
  const current = rc2ReadReturnState(lease.key);
  if (String(current?.returnToken || '') !== String(lease.saved.returnToken || '')) {
    rc2RestoredReturnLease = null;
    return false;
  }
  rc2RestoredReturnLease = null;
  rc2ClearReturnState(lease.key, lease.saved);
  rc2ClearDurableReturn(lease.saved.returnToken);
  return true;
}

function rc2SettleRestoredReturnLeaseNow() {
  if (rc2RestoredReturnSettleTimer) clearTimeout(rc2RestoredReturnSettleTimer);
  rc2RestoredReturnSettleTimer = 0;
  return rc2SettleRestoredReturnLease();
}

function rc2ScheduleRestoredReturnSettlement() {
  if (!rc2RestoredReturnLease || rc2RestoredReturnSettleTimer) return false;
  rc2RestoredReturnSettleTimer = setTimeout(() => {
    rc2RestoredReturnSettleTimer = 0;
    rc2SettleRestoredReturnLease();
  }, RC2_RETURN_SETTLE_DELAY_MS);
  return true;
}

window.daedongReadExternalReturnState = rc2ReadReturnState;
window.daedongWriteExternalReturnState = rc2WriteReturnState;
window.daedongClearExternalReturnState = rc2ClearReturnState;
window.daedongCaptureReturnAnchor = rc2CaptureReturnAnchor;
window.daedongStabilizeReturnPosition = rc2StabilizeReturnPosition;
window.daedongArmRestoredReturnLease = rc2ArmRestoredReturnLease;
window.daedongSettleRestoredReturnLeaseNow = rc2SettleRestoredReturnLeaseNow;

function rc2Icon(id, className = 'category-local-icon') {
  return `<svg class="${className}" aria-hidden="true"><use href="${RC2_ICON_SPRITE}#${id}"></use></svg>`;
}

function rc2CategoryIconId(name) {
  const value = String(name || '');
  if (value === '전체') return 'all';
  if (/치킨|닭/.test(value)) return 'chicken';
  if (/피자|파스타/.test(value)) return 'pizza';
  if (/버거|햄버거/.test(value)) return 'burger';
  if (/중식|짜장|짬뽕|마라|양꼬치/.test(value)) return 'chinese';
  if (/분식|떡볶이|도시락/.test(value)) return 'snack';
  if (/족발|보쌈|고기|구이|삼겹|갈비/.test(value)) return 'pork';
  if (/면|국수|냉면|우동|라멘/.test(value)) return 'noodles';
  if (/회|해산물|횟집|수산/.test(value)) return 'seafood';
  if (/카페|커피/.test(value)) return 'cafe';
  if (/디저트|빙수|아이스크림/.test(value)) return 'dessert';
  if (/베이커리|빵|떡/.test(value)) return 'bakery';
  if (/야식|주점|술집/.test(value)) return 'night';
  if (/한식|국밥|찜|탕|찌개|조림|죽|반찬/.test(value)) return 'korean';
  if (/샐러드|건강/.test(value)) return 'salad';
  if (/샌드위치/.test(value)) return 'sandwich';
  if (/음료/.test(value)) return 'drink';
  if (/편의점/.test(value)) return 'convenience';
  return 'other';
}

function rc2HappyIconId(name) {
  const exact = {
    '베이커리': 'bakery', '디저트': 'dessert', '카페': 'cafe', '샐러드': 'salad',
    '샌드위치': 'sandwich', '버거': 'burger', '치킨': 'chicken',
    '파스타·피자': 'pizza', '분식': 'snack', '편의점': 'convenience'
  };
  return exact[name] || rc2CategoryIconId(name);
}

function rc2SnapshotModal() {
  const modal = $('#modal');
  const card = modal?.querySelector('.modal-card');
  return {
    html: $('#modalContent')?.innerHTML || '',
    className: modal?.className || 'modal',
    dataset: modal ? {...modal.dataset} : {},
    scrollTop: card?.scrollTop || 0,
    anchor: rc2CaptureReturnAnchor(card),
    pageScroll: Number(document.body.dataset.lockScrollY || window.scrollY || 0),
    photoIndex: detailCarousel?.logicalIndex?.() ?? 0
  };
}

function rc2RestoreSnapshot(snapshot) {
  if (!snapshot) return;
  rc2ModalRestoring = true;
  rc2NativeOpenModal(snapshot.html);
  const modal = $('#modal');
  modal.className = snapshot.className;
  for (const key of Object.keys(modal.dataset)) delete modal.dataset[key];
  Object.assign(modal.dataset, snapshot.dataset);
  const carouselRoot = $('#detailPhotoCarousel');
  if (carouselRoot) {
    detailCarousel = new InfiniteCarousel(carouselRoot, {interval: 3500});
    detailCarousel.goTo?.(snapshot.photoIndex || 0);
  }
  rc2StabilizeReturnPosition({modalScroll: snapshot.scrollTop || 0, anchor: snapshot.anchor}, modal.querySelector('.modal-card'));
  rc2ModalRestoring = false;
  rc2ScrubCustomerCounts(modal);
  // Snapshot restoration replaces the DOM nodes. Reattach interactions that
  // intentionally live on the restored store button itself before departure.
  window.daedongRebindOrderMethodsTrigger?.();
}

function rc2RestoreSnapshotAfterNativeSurfaceReset(snapshot) {
  if (!snapshot) return;
  const sequence = ++rc2SnapshotSurfaceResetSequence;
  const root = document.documentElement;
  const bootWasPending = root.classList.contains('daedong-external-return-pending');
  root.classList.add('daedong-external-return-pending');
  window.daedongResetOrderMethodsTouchState?.();
  // Samsung Kakao WebView can keep the hit-test surface that belonged to the
  // nested order-method sheet even after its HTML is replaced with the saved
  // store detail. Scrolling then works natively, but every button in the
  // restored detail is untappable. Lower the native modal for two rendered
  // frames before restoring the snapshot so WebView rebuilds that surface.
  rc2NativeHardClose({fromPop: true});
  requestAnimationFrame(() => requestAnimationFrame(() => {
    if (sequence !== rc2SnapshotSurfaceResetSequence) return;
    try {
      rc2RestoreSnapshot(snapshot);
    } finally {
      if (!bootWasPending) root.classList.remove('daedong-external-return-pending');
    }
  }));
}

function rc2NavigateOrderMethodReentry(snapshot) {
  if (!snapshot?.html) return false;
  const template = document.createElement('template');
  template.innerHTML = String(snapshot.html);
  const storeId = String(template.content.querySelector('.store-detail[data-store-id]')?.dataset.storeId || '');
  if (!storeId) return false;
  const token = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const saved = {
    token,
    storeId,
    modalScroll: Number(snapshot.scrollTop || 0),
    pageScroll: Number(snapshot.pageScroll || 0),
    savedAt: Date.now()
  };
  try {
    sessionStorage.setItem(RC2_ORDER_METHOD_REENTRY, JSON.stringify(saved));
    const url = new URL(location.href);
    url.searchParams.set('store', storeId);
    url.searchParams.set(RC2_ORDER_METHOD_REENTRY_PARAM, token);
    url.searchParams.delete(RC2_RETURN_TOKEN_PARAM);
    url.searchParams.delete(RC2_RETURN_GUARD_PARAM);
    url.searchParams.delete(RC2_APP_FALLBACK_PARAM);
    document.documentElement.classList.add('daedong-external-return-pending');
    // Kakao can leave the entire restored modal without a native hit target.
    // A same-document DOM rebuild and even a two-frame hide/show are not
    // sufficient on a real finger path. Replace the document so WebView must
    // create a new compositor and hit-test surface for the saved store.
    location.replace(`${url.pathname}${url.search}${url.hash}`);
    return true;
  } catch {
    try { sessionStorage.removeItem(RC2_ORDER_METHOD_REENTRY); } catch {}
    return false;
  }
}

openModal = function rc2OpenModal(html) {
  const modal = $('#modal');
  const wasHidden = !modal || modal.hidden;
  const replacing = rc2ReplaceNextModal;
  rc2ReplaceNextModal = false;
  if (!wasHidden && !rc2ModalRestoring && !replacing) rc2ModalStack.push(rc2SnapshotModal());
  rc2NativeOpenModal(html);
  if (!rc2ModalRestoring) {
    if (wasHidden) {
      history.replaceState({...history.state, daedongModal: true, rc2ModalDepth: 1}, '');
    } else if (!replacing) {
      history.pushState({daedongModal: true, rc2ModalDepth: rc2ModalStack.length + 1}, '');
    }
  }
  rc2ScrubCustomerCounts($('#modal'));
};

hardClose = function rc2HardClose(options = {}) {
  if (options.fromPop) {
    const pendingReturn = rc2PendingExternalReturnState();
    if (pendingReturn) {
      // Kakao's bottom browser Back and Android's system Back do not resume the
      // same way. On the system-Back path the original preview WebView resumes
      // and then delivers a popstate to the still-open store modal. Treat that
      // pop as the external-app return itself, not as a request to close the
      // store detail and expose Home.
      rc2ExternalDepartureHidden = true;
      void rc2RestoreExternalSurface({rebuildExisting: true}).then(restored => {
        if (!restored) return;
        rc2ResetExternalDepartureLifecycle();
        window.daedongFinishExternalReturnBoot?.();
      });
      return;
    }
  }
  if (options.fromPop && rc2ModalStack.length) {
    const snapshot = rc2ModalStack.pop();
    if ($('#modalContent .order-methods-sheet') && rc2NavigateOrderMethodReentry(snapshot)) return;
    rc2RestoreSnapshotAfterNativeSurfaceReset(snapshot);
    return;
  }
  if (!options.fromPop && rc2ModalStack.length) {
    history.back();
    return;
  }
  rc2ModalStack.length = 0;
  rc2NativeHardClose(options);
};
closeModal = hardClose;
window.hardClose = hardClose;
window.hideModal = hardClose;
window.closeModal = hardClose;

function rc2ReplaceModal() {
  rc2ReplaceNextModal = !$('#modal')?.hidden;
}

function rc2SelectedCategoryMarkup(category) {
  return `<h3 class="app-browser-selected-category" aria-live="polite">${escapeHtml(category)}</h3>`;
}

function rc2RevealSelectedCategory() {
  requestAnimationFrame(() => {
    const card = $('#modal .modal-card');
    const chips = $('#modal .app-browser-category-chips');
    const active = chips?.querySelector('button.active');
    if (card) card.scrollTop = 0;
    if (!chips || !active) return;
    chips.scrollLeft = Math.max(0, active.offsetLeft - (chips.clientWidth - active.offsetWidth) / 2);
  });
}

function rc2ScrubCustomerCounts(root = document) {
  if (!root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const next = node.nodeValue.replace(/\s*\d[\d,]*\s*곳(?=\s|$|[·/()])/g, '');
    if (next !== node.nodeValue) node.nodeValue = next;
  }
}

fxCategoryMarkup = function rc2CategoryMarkup(name) {
  return `<button type="button" class="category glass-action ${state.category === name ? 'active' : ''}" data-cat="${escapeHtml(name)}">${rc2Icon(rc2CategoryIconId(name))}<span>${escapeHtml(name)}</span></button>`;
};

renderCategories = function rc2RenderCategories() {
  const names = ['전체', ...mainCategories()];
  $('#categoryGrid').innerHTML = names.map(fxCategoryMarkup).join('');
};

allCategoriesModal = function rc2AllCategoriesModal() {
  openModal(`<section class="category-modal"><h2 id="modalTitle">전체 음식 카테고리</h2><div class="all-category-list rc2-category-list">${categories.map(name => `<button type="button" data-modal-cat="${escapeHtml(name)}">${rc2Icon(rc2CategoryIconId(name), 'category-modal-icon')}<b>${escapeHtml(name)}</b></button>`).join('')}</div></section>`);
};

const RC2_RAIL_SPECS = [
  {id: 'today', title: '오늘의 추천', desc: `지금 확인하기 좋은 ${RC2_REGION_NAME} 가게`},
  {id: 'near', kind: 'near', title: '지금 가까운 가게', desc: '선택한 위치를 먼저 반영해요'},
  {id: 'local', kind: 'local', title: `${RC2_REGION_NAME}에 힘이 되는 주문`, desc: '지역 주문경로가 확인된 가게'},
  {id: 'solo', title: '나 혼자 술 한잔', desc: '혼자 즐기기 좋은 안주와 소량 메뉴', pattern: /닭발|곱창|회|족발|보쌈|치킨|닭강정|국물|분식|야식|주점/},
  {id: 'group', title: '오늘은 회식이다', desc: '여럿이 나누기 좋은 메뉴', pattern: /회|해산물|족발|보쌈|치킨|고기|삼겹|아귀|해물찜|찜닭|탕|전골/},
  {id: 'warm', title: '왕후의 밥, 걸인의 찬', desc: '소박해도 마음까지 따뜻해지는 한 끼', pattern: /백반|집밥|국밥|찌개|죽|김치찜|도시락|반찬|한식/},
  {id: 'appetite', title: '입맛 없을 때', desc: '매콤하고 새콤한 음식', pattern: /냉면|밀면|쫄면|비빔|마라|떡볶이|김치/},
  {id: 'rain', title: '비 오는 날', desc: `현재 ${RC2_REGION_NAME}에 비가 올 때 생각나는 음식`, pattern: /전|국밥|찌개|탕|수제비|칼국수|짬뽕|부침/},
  {id: 'noodle', title: '면 음식이 당길 때', desc: '국수·면·짬뽕 한 그릇', pattern: /면|국수|짬뽕|짜장|파스타|우동|라멘/},
  {id: 'sweet', title: '시원하고 달달한 것이 당길 때', desc: '카페·빙수·디저트', pattern: /카페|커피|디저트|빙수|아이스크림|베이커리|떡/},
  {id: 'mood', title: '기분전환이 필요할 때', desc: '평소와 다른 메뉴', pattern: /피자|버거|치킨|마라|아시안|돈까스|일식/},
  {id: 'new', kind: 'new', title: '새로 들어온 가게', desc: '최근 지도에 등록된 가게'}
];

fxSelectedRails = function rc2SelectedRails() {
  const hour = new Date().getHours();
  let ids;
  if (fxRainState !== 'clear') ids = ['today', 'rain', 'near', 'local', hour >= 17 ? 'group' : 'warm', 'new'];
  else if (hour >= 17) ids = ['today', 'near', 'local', 'group', 'solo', 'new'];
  else ids = ['today', 'near', 'local', 'warm', 'appetite', 'new'];
  return ids.map(id => RC2_RAIL_SPECS.find(spec => spec.id === id));
};

let rc2BrandKeyCache = new WeakMap();
function rc2BrandKey(store) {
  const cached = store && typeof store === 'object' ? rc2BrandKeyCache.get(store) : undefined;
  if (cached !== undefined) return cached;
  const direct = fxBrandByStore.get(String(store.id));
  if (direct?.brandName) {
    const result = normalize(direct.brandName);
    rc2BrandKeyCache.set(store, result);
    return result;
  }
  for (const group of BRAND_GROUPS) {
    const brand = group.brands.find(item => brandMatchesStore(store, item));
    if (brand) {
      const result = normalize(brand.label);
      rc2BrandKeyCache.set(store, result);
      return result;
    }
  }
  const base = String(store.realBusinessName || store.name)
    .replace(/\([^)]*\)/g, '')
    .replace(/여수|돌산|문수|국동|봉산|웅천|학동|교동|신기|덕충|죽림|미평|여서|무선|소호|중앙|충무|봉강|안산|엑스포/g, '')
    .replace(/(?:직영|본|\d+호)?지?점.*$/g, '');
  const result = normalize(base) || normalize(store.name);
  if (store && typeof store === 'object') rc2BrandKeyCache.set(store, result);
  return result;
}

function rc2RepresentativeMethod(store) {
  const routeOrder = ['direct', 'mukkebi', 'ddangyo', 'ondongne'];
  for (const key of routeOrder) if (routeFor(store, key)) return APP_META[key].label;
  if (fxBrandByStore.has(String(store.id))) return '브랜드앱';
  if (fxHappyByStore.has(String(store.id))) return '해피오더';
  if (fxPhoneByStore.has(String(store.id))) return '전화주문';
  for (const key of ['yogiyo', 'coupang', 'baemin']) if (routeFor(store, key)) return APP_META[key].label;
  return '주문방법 확인';
}

const RC2_RAIL_RANDOM_SEED = new Date().toLocaleDateString('sv-SE', {timeZone: 'Asia/Seoul'});
const RC2_MANAGED_REGION_PRIORITY_STORE_BY_RAIL = Object.freeze({
  today: '7bc7239e6b509c44', // 수라상궁 조선국밥 여서점
  near: 'd86586aaef8454c9', // 조선밀면&냉면 여수여서점
  local: '04910f606ba038a6', // 오워래 수제 돈까스
  group: '84c118675c0caa4c', // 바오탕수 여서점
  solo: '0cc943f6a58888d0' // 왕창 돼지두루치기 여서점
});
const RC2_MANAGED_REGION_PRIORITY_NEIGHBORHOODS = new Set(['여서동', '문수동', '오림동']);

function rc2StringSeed(value) {
  let hash = 2166136261;
  const text = String(value || '');
  for (let index = 0; index < text.length; index += 1) {
    hash ^= text.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function rc2SeededShuffle(list, seedText) {
  const result = [...list];
  let seed = rc2StringSeed(seedText);
  for (let index = result.length - 1; index > 0; index -= 1) {
    seed += 0x6D2B79F5;
    let value = seed;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    const random = ((value ^ (value >>> 14)) >>> 0) / 4294967296;
    const swapIndex = Math.floor(random * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function rc2RandomizedRailStores(stores, spec, groupKey) {
  const locationKey = [
    RC2_RAIL_RANDOM_SEED,
    spec.id,
    state.location,
    state.addressLabel,
    state.coords?.lat ?? '',
    state.coords?.lng ?? '',
    groupKey
  ].join('|');
  const result = [];
  for (let index = 0; index < stores.length; index += 16) {
    result.push(...rc2SeededShuffle(stores.slice(index, index + 16), locationKey + '|' + index));
  }
  return result;
}

function rc2ManagedRegionPriorityNeighborhood() {
  const selected = neighborhoodFor(state.location) || neighborhoodFor(state.addressLabel);
  if (RC2_MANAGED_REGION_PRIORITY_NEIGHBORHOODS.has(selected)) return selected;
  const addressText = `${state.location || ''} ${state.addressLabel || ''}`;
  for (const neighborhood of RC2_MANAGED_REGION_PRIORITY_NEIGHBORHOODS) {
    if (addressText.includes(neighborhood)) return neighborhood;
  }
  if (state.coords && typeof rc6ClosestNeighborhood === 'function') {
    const closest = rc6ClosestNeighborhood(state.coords);
    if (RC2_MANAGED_REGION_PRIORITY_NEIGHBORHOODS.has(closest)) return closest;
  }
  return '';
}

function rc2ManagedRegionDailyPosition(spec, priorityId, dayKey = RC2_RAIL_RANDOM_SEED) {
  const timestamp = Date.parse(`${dayKey}T00:00:00Z`);
  const dayNumber = Number.isFinite(timestamp) ? Math.floor(timestamp / 86400000) : 0;
  return (dayNumber + rc2StringSeed(`${spec?.id || ''}|${priorityId}`)) % 3;
}

function rc2ApplyManagedRegionPriority(cards, spec, limit, rankedStores = []) {
  const priorityId = RC2_MANAGED_REGION_PRIORITY_STORE_BY_RAIL[spec?.id];
  if (!priorityId || !rc2ManagedRegionPriorityNeighborhood()) {
    return sortStoresByBusinessStatus(cards).slice(0, limit);
  }
  const rankedById = new Map(rankedStores.map(store => [String(store.id), store]));
  const priority = rankedById.get(priorityId) || fxStoreById(priorityId);
  if (!priority || !fxVisible(priority) || storeBusinessStatusPriority(priority) !== 0) {
    return sortStoresByBusinessStatus(cards).slice(0, limit);
  }
  const normalSlotCount = Math.max(0, limit - 1);
  const normal = sortStoresByBusinessStatus(cards.filter(store => String(store.id) !== priorityId))
    .slice(0, normalSlotCount);
  const openNormalCount = normal.filter(store => storeBusinessStatusPriority(store) === 0).length;
  const insertionIndex = Math.min(rc2ManagedRegionDailyPosition(spec, priorityId), openNormalCount);
  normal.splice(insertionIndex, 0, priority);
  return normal.slice(0, limit);
}

function rc2RailCandidates(spec, globallyUsed = new Set(), limit = 8, useCounts = new Map(), rankedInput = null) {
  const brandKeys = new Set();
  const photoKeys = new Set();
  const selectedIds = new Set();
  const result = [];
  const groups = [];
  const rankedStores = rankedInput || fxRankStores(spec);
  for (const store of rankedStores) {
    const status = storeBusinessStatusPriority(store);
    const bucket = Number.isFinite(store.rc6LocationBucket) ? store.rc6LocationBucket : 9;
    const tier = typeof rc6OwnershipTier === 'function' ? rc6OwnershipTier(store) : 2;
    const key = `${status}:${bucket}:${tier}`;
    const last = groups[groups.length - 1];
    if (!last || last.key !== key) groups.push({key, status, bucket, stores: [store]});
    else last.stores.push(store);
  }
  for (const group of groups) {
    group.stores = spec.kind === 'new' ? group.stores : rc2RandomizedRailStores(group.stores, spec, group.key);
  }
  const addStore = (store, relaxDiversity = false, allowReuse = false) => {
    const storeId = String(store.id);
    const useCount = useCounts.get(storeId) || 0;
    if (selectedIds.has(storeId)) return;
    if (!allowReuse && (globallyUsed.has(storeId) || useCount > 0)) {
      return;
    }
    const brandKey = rc2BrandKey(store);
    const photoKey = fxPhoto(store);
    if (!relaxDiversity && (brandKeys.has(brandKey) || (photoKey && photoKeys.has(photoKey)))) return;
    result.push(store);
    selectedIds.add(storeId);
    brandKeys.add(brandKey);
    if (photoKey) photoKeys.add(photoKey);
    globallyUsed.add(storeId);
    useCounts.set(storeId, useCount + 1);
  };
  const fillGroup = (group, relaxDiversity, allowReuse = false, target = limit) => {
    for (const store of group.stores) {
      addStore(store, relaxDiversity, allowReuse);
      if (result.length >= target) return true;
    }
    return false;
  };
  const fillGroups = (targetGroups, allowReuse = false, target = limit) => {
    for (const group of targetGroups) {
      if (fillGroup(group, false, allowReuse, target)) return true;
      if (fillGroup(group, true, allowReuse, target)) return true;
    }
    return false;
  };
  const localGroups = groups.filter(group => group.bucket === 0);
  const otherGroups = groups.filter(group => group.bucket !== 0);
  const finish = () => rc2ApplyManagedRegionPriority(result, spec, limit, rankedStores);
  if (spec.pattern && localGroups.length) {
    if (fillGroups(localGroups)) return finish();
    const nearbyTarget = Math.min(limit, result.length + 2);
    const nearbyStores = otherGroups.flatMap(group => group.stores).sort((a, b) => {
      const aDistance = Number(a.rc6SortDistance ?? a.distance ?? a.rc6NeighborhoodDistance);
      const bDistance = Number(b.rc6SortDistance ?? b.distance ?? b.rc6NeighborhoodDistance);
      return (Number.isFinite(aDistance) ? aDistance : Infinity) - (Number.isFinite(bDistance) ? bDistance : Infinity);
    });
    fillGroups([{stores: nearbyStores}], false, nearbyTarget);
    if (result.length >= limit) return finish();
    if (fillGroups(localGroups, true)) return finish();
    fillGroups(otherGroups);
    return finish();
  }
  fillGroups(groups);
  if (result.length < limit) fillGroups(groups, true);
  return finish();
}

function rc2DiversifyRailLead(cards, recentLeads = []) {
  const ordered = [...cards];
  if (ordered.length < 2 || !recentLeads.length) return ordered;
  const firstStatus = storeBusinessStatusPriority(ordered[0]);
  const firstBucket = Number.isFinite(ordered[0].rc6LocationBucket) ? ordered[0].rc6LocationBucket : 9;
  const ownershipTier = store => typeof rc6OwnershipTier === 'function' ? rc6OwnershipTier(store) : 2;
  const firstTier = ownershipTier(ordered[0]);
  const recentIds = new Set(recentLeads.map(store => String(store?.id || '')));
  const recentPhotos = new Set(recentLeads.map(store => fxPhoto(store)).filter(Boolean));
  const samePriorityBand = store => storeBusinessStatusPriority(store) === firstStatus
    && (Number.isFinite(store.rc6LocationBucket) ? store.rc6LocationBucket : 9) === firstBucket
    && ownershipTier(store) === firstTier;
  let replacementIndex = ordered.findIndex((store, index) => index > 0
    && samePriorityBand(store)
    && !recentIds.has(String(store.id))
    && !recentPhotos.has(fxPhoto(store)));
  if (replacementIndex < 0) {
    replacementIndex = ordered.findIndex((store, index) => index > 0
      && samePriorityBand(store)
      && !recentIds.has(String(store.id)));
  }
  if (replacementIndex > 0) {
    const [replacement] = ordered.splice(replacementIndex, 1);
    ordered.unshift(replacement);
  }
  return ordered;
}

function rc2RailCard(store) {
  return `<article class="rail-card" data-rail-card-store="${escapeHtml(store.id)}"><button type="button" class="rail-card-open glass-action" data-rail-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span class="rail-card-copy"><h3>${escapeHtml(store.name)}</h3><p>${escapeHtml(store.area || RC2_REGION_NAME)} · ${escapeHtml(store.cat)}</p></span></button><footer><span class="rail-method">${escapeHtml(rc2RepresentativeMethod(store))}</span><button type="button" class="rail-order-button glass-action" data-rail-store-id="${escapeHtml(store.id)}">주문방법 보기</button></footer></article>`;
}

fxRenderRails = function rc2RenderRails() {
  const root = $('#recommendRails');
  if (!root) return;
  if (state.category !== '전체' || state.query || state.brandId) {
    root.hidden = true;
    root.innerHTML = '';
    return;
  }
  root.hidden = false;
  const globallyUsed = new Set();
  const useCounts = new Map();
  const recentLeads = [];
  root.innerHTML = fxSelectedRails().map(spec => {
    const cards = rc2DiversifyRailLead(rc2RailCandidates(spec, globallyUsed, 8, useCounts), recentLeads);
    if (cards[0]) {
      recentLeads.push(cards[0]);
      if (recentLeads.length > 3) recentLeads.shift();
    }
    const allCandidates = fxRankStores(spec);
    return `<section class="recommend-rail" data-rail="${spec.id}"><header class="recommend-rail-head"><div><h2>${escapeHtml(spec.title)}</h2><p>${escapeHtml(spec.desc)}</p></div>${allCandidates.length > cards.length ? `<button type="button" data-rail-more="${spec.id}">이 추천 가게 더보기</button>` : ''}</header><div class="recommend-track">${cards.map(rc2RailCard).join('') || '<p class="empty">추천 가게를 확인 중입니다.</p>'}</div></section>`;
  }).join('');
};

renderStores = function rc2RenderStores(options = {}) {
  fxOriginalRenderStores(options);
  if (state.category === '전체' && !state.query && !state.brandId) $('#recommendSection h2').textContent = '가게목록';
  $('#loadMoreBtn').textContent = '더보기';
  fxRenderRails();
  rc2ScrubCustomerCounts($('#app'));
};

function rc2OpenRailList(specId) {
  const spec = RC2_RAIL_SPECS.find(item => item.id === specId);
  if (!spec) return;
  const cards = rc2RailCandidates(spec, new Set(), 40).map(store => `<button type="button" class="app-browser-card glass-action" data-channel-store-id="${escapeHtml(store.id)}">${appBrowserPhoto(store)}<span class="app-browser-info"><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area || RC2_REGION_NAME)} · ${escapeHtml(store.cat)}</small><span>${escapeHtml(rc2RepresentativeMethod(store))}</span></span><b>›</b></button>`).join('');
  openModal(`<section class="app-browser rail-list-modal"><h2 id="modalTitle">${escapeHtml(spec.title)}</h2><p>${escapeHtml(spec.desc)}</p><div class="app-browser-list">${cards || '<p class="empty">추천 가게를 확인 중입니다.</p>'}</div></section>`);
}

fxAppBrowserMarkup = function rc2AppBrowserMarkup(key, selectedCategory = '추천') {
  const meta = APP_META[key];
  const all = appRegisteredStores(key);
  const cats = categoriesFromStores(all);
  const filtered = selectedCategory === '추천' ? all : all.filter(store => storeMatchesCategory(store, selectedCategory));
  const list = applyCategoryPriorityOverrides(filtered, selectedCategory);
  const isExternal = EXTERNAL_APP_KEYS.includes(key);
  const chips = `<nav class="app-browser-category-chips"><button type="button" data-app-category="추천" class="${selectedCategory === '추천' ? 'active' : ''}">추천</button>${cats.map(cat => `<button type="button" data-app-category="${escapeHtml(cat)}" class="${selectedCategory === cat ? 'active' : ''}">${escapeHtml(cat)}</button>`).join('')}</nav>`;
  const cards = list.map(store => fxRegisteredAppCardMarkup(store, key, isExternal)).join('');
  return `<section class="app-browser"><header class="app-browser-head${isExternal ? ' external-app-browser-head' : ''}">${isExternal ? '' : appIcon(key, 'app-browser-head-icon')}<div><h2 id="modalTitle">${escapeHtml(meta.label)} 등록 가게</h2><p>실제 주문주소가 등록된 가게만 보여드립니다.</p></div></header>${chips}${rc2SelectedCategoryMarkup(selectedCategory)}<div class="app-browser-list">${cards || '<div class="empty">해당 조건의 가게가 없습니다.</div>'}</div>${isExternal ? externalAppNoticeMarkup() : ''}</section>`;
};

openAppBrowser = function rc2OpenAppBrowser(key, selectedCategory = '추천') {
  if (!['direct', 'mukkebi', 'ddangyo', 'ondongne', 'yogiyo', 'coupang', 'baemin'].includes(key)) return;
  const modal = $('#modal');
  if (!modal.hidden && modal.dataset.appBrowserKey === key) rc2ReplaceModal();
  openModal(fxAppBrowserMarkup(key, selectedCategory));
  modal.dataset.appBrowserKey = key;
  modal.dataset.appBrowserCategory = selectedCategory;
  rc2RevealSelectedCategory();
};
globalExternalGuide = function rc2GlobalExternalGuide(key) { openAppBrowser(key); };

function rc2OpenOtherApps() {
  openModal(`<section class="app-browser other-apps-modal"><h2 id="modalTitle">다른 주문앱</h2><p>이용할 주문앱을 선택해 등록된 가게를 확인하세요.</p><div class="other-app-choice-grid"><button type="button" class="glass-action" data-global-external="yogiyo"><span class="external-app-choice-label">요기요</span></button><button type="button" class="glass-action" data-global-external="coupang"><span class="external-app-choice-label">쿠팡이츠</span></button><button type="button" class="glass-action" data-global-external="baemin"><span class="external-app-choice-label">배달의민족</span></button></div>${externalAppNoticeMarkup()}</section>`);
}

fxOpenPhoneDirectory = function rc2OpenPhoneDirectory(category = '추천') {
  const all = fxPhoneStores();
  const cats = categoriesFromStores(all.map(item => item.store));
  const list = fxPhoneStores(category);
  if (!$('#modal')?.hidden && $('#modalContent .phone-order-sheet')) rc2ReplaceModal();
  const chips = `<nav class="app-browser-category-chips"><button type="button" data-phone-category="추천" class="${category === '추천' ? 'active' : ''}">추천</button>${cats.map(cat => `<button type="button" data-phone-category="${escapeHtml(cat)}" class="${category === cat ? 'active' : ''}">${escapeHtml(cat)}</button>`).join('')}</nav>`;
  const cards = list.map(({store}) => `<button type="button" class="phone-order-card glass-action" data-phone-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area || RC2_REGION_NAME)} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`).join('');
  openModal(`<section class="phone-order-sheet"><h2 id="modalTitle">전화주문 가능한 가게</h2><p>가게를 선택해도 전화가 자동으로 걸리지 않습니다.<br>전화번호를 확인한 뒤 전화 걸기 버튼을 눌러주세요.</p>${chips}${rc2SelectedCategoryMarkup(category)}<div class="phone-order-list">${cards || '<p class="empty">확인 가능한 전화페이지가 없습니다.</p>'}</div></section>`);
  rc2RevealSelectedCategory();
};

fxOpenPhoneConfirm = function rc2OpenPhoneConfirm(id) {
  const item = fxPhoneByStore.get(String(id));
  const store = fxStoreById(id);
  const phone = String(store?.phone || '').replace(/[^0-9]/g, '');
  const valid = /^02\d{7,8}$/.test(phone) || /^0(?:3[1-3]|4[1-4]|5[1-5]|6[1-4])\d{7,8}$/.test(phone) || /^01[016789]\d{7,8}$/.test(phone) || /^070\d{8}$/.test(phone);
  if (!item?.clickableTel || !store || !valid) return;
  openModal(`<section class="phone-order-confirm" data-store-id="${escapeHtml(store.id)}"><h2 id="modalTitle">${escapeHtml(store.name)} 전화주문</h2><div class="phone-confirm-photo">${fxCardPhoto(store)}</div><p>${escapeHtml(store.area || RC2_REGION_NAME)} · ${escapeHtml(store.cat)}</p><p>가게를 선택해도 전화가 자동으로 걸리지 않습니다.<br>전화번호를 확인한 뒤 전화 걸기 버튼을 눌러주세요.</p><div class="phone-confirm-actions"><a class="phone-call-link" href="tel:${escapeHtml(phone)}">전화 걸기</a><button class="phone-cancel" type="button" data-phone-cancel>취소</button></div></section>`);
  $('#modal').dataset.activeStoreId = store.id;
  history.replaceState({...history.state, storeId: String(store.id)}, '');
};

function rc2DirectBrandCategory(name) {
  if (/치킨|BHC|비비큐|굽네|교촌|통닭|두마리|꾸브라꼬|순살/.test(name)) return '치킨';
  if (/피자|도미노/.test(name)) return '피자';
  if (/버거|맘스터치|맥도날드/.test(name)) return '버거';
  if (/파리바게뜨|뚜레쥬르/.test(name)) return '베이커리';
  if (/배스킨|요아정/.test(name)) return '디저트';
  if (/커피|카페|투썸|이디야|메가MGC|더벤티|하이오/.test(name)) return '카페';
  if (/공차/.test(name)) return '음료';
  return '기타';
}

fxDirectBrands = function rc2DirectBrands() {
  const map = new Map();
  for (const [id, item] of fxBrandByStore) {
    if (!map.has(item.brandName)) map.set(item.brandName, {name: item.brandName, icon: item.icon, category: rc2DirectBrandCategory(item.brandName), stores: []});
    map.get(item.brandName).stores.push(id);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'ko'));
};

function rc2BrandCategoryChips(selected = '전체') {
  const order = ['전체', '치킨', '피자', '버거', '카페', '디저트', '베이커리', '음료', '샌드위치', '기타'];
  const available = new Set(fxDirectBrands().map(item => item.category));
  return `<nav class="app-browser-category-chips brand-category-chips">${order.filter(item => item === '전체' || available.has(item)).map(item => `<button type="button" data-direct-category="${item}" class="${selected === item ? 'active' : ''}">${item}</button>`).join('')}</nav>`;
}

fxOpenBrandHub = function rc2OpenBrandHub(view = 'channels', value = '') {
  if (view === 'channels') {
    openModal(`<section class="brand-app-hub"><h2 id="modalTitle">브랜드앱 주문</h2><p>직접 브랜드앱과 공통 주문채널 해피오더를 각각 선택할 수 있습니다.</p><div class="brand-app-grid"><button type="button" class="brand-app-tile glass-action" data-brand-view="direct">${fxSvg('store', 'order-svg')}<b>직접 브랜드앱</b><small>Android 앱</small></button><button type="button" class="brand-app-tile glass-action" data-brand-view="happy"><img src="assets/order-channels/happyorder.png" alt="해피오더"><b>해피오더</b><small>공통 주문채널</small></button></div></section>`);
    return;
  }
  if (view === 'direct') {
    const category = value || '전체';
    if (!$('#modal')?.hidden && $('#modalContent .direct-brand-browser')) rc2ReplaceModal();
    const brands = fxDirectBrands().filter(brand => category === '전체' || brand.category === category);
    const cards = brands.map(brand => `<button type="button" class="brand-app-tile glass-action" data-direct-brand="${escapeHtml(brand.name)}">${brand.icon ? `<img src="${escapeHtml(mobilePhotoPath(brand.icon))}" alt="">` : rc2Icon('other', 'order-svg')}<b>${escapeHtml(brand.name)}</b></button>`).join('');
    openModal(`<section class="brand-app-hub direct-brand-browser"><h2 id="modalTitle">직접 브랜드앱</h2><p>현재 검증된 링크는 Android Google Play입니다. iPhone은 자동 이동하지 않습니다.</p>${rc2BrandCategoryChips(category)}${rc2SelectedCategoryMarkup(category)}<div class="brand-app-grid">${cards}</div></section>`);
    rc2RevealSelectedCategory();
    return;
  }
  if (view === 'direct-stores') {
    const brand = fxDirectBrands().find(item => item.name === value);
    const cards = (brand?.stores || []).map(fxStoreById).filter(fxVisible).map(store => `<button type="button" class="channel-store-card glass-action" data-channel-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area || RC2_REGION_NAME)} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`).join('');
    openModal(`<section class="brand-app-hub"><h2 id="modalTitle">${escapeHtml(value)}</h2><p>${escapeHtml(RC2_MAP_NAME)}에 등록된 해당 브랜드 ${escapeHtml(RC2_REGION_NAME)} 지점입니다.</p><div class="channel-store-list">${cards}</div></section>`);
    return;
  }
  if (view === 'happy') {
    const categories = [...(fxHappyData.categories || [])].sort((a, b) => a.displayOrder - b.displayOrder);
    const confirmed = new Set((fxHappyData.currentScreenBrands || []).filter(item => item.currentScreenConfirmed).map(item => item.category));
    openModal(`<section class="happyorder-hub"><h2 id="modalTitle">해피오더</h2><p>카테고리를 선택한 뒤 해피오더에서 확인된 브랜드와 여수 지점을 찾아보세요.</p><div class="happy-category-grid">${categories.map(item => `<button type="button" class="happy-category-tile glass-action" data-happy-category="${escapeHtml(item.categoryName)}" ${confirmed.has(item.categoryName) ? '' : 'disabled'}>${rc2Icon(rc2HappyIconId(item.categoryName), 'happy-category-icon')}<b>${escapeHtml(item.categoryName)}</b></button>`).join('')}</div></section>`);
    return;
  }
  if (view === 'happy-brands') {
    const unique = new Map();
    for (const item of fxHappyData.currentScreenBrands || []) if (item.category === value && item.currentScreenConfirmed) unique.set(item.brandName, item);
    const brands = [...unique.values()];
    openModal(`<section class="happyorder-hub"><h2 id="modalTitle">해피오더 · ${escapeHtml(value)}</h2><div class="happyorder-brand-grid">${brands.map(brand => `<button type="button" class="happyorder-brand-tile glass-action" data-happy-brand="${escapeHtml(brand.brandName)}">${brand.brandSelectionImage ? `<img src="${escapeHtml(mobilePhotoPath(brand.brandSelectionImage))}" alt="">` : '<img src="assets/order-channels/happyorder.mobile.webp" alt="">'}<b>${escapeHtml(brand.brandName)}</b></button>`).join('')}</div></section>`);
    return;
  }
  if (view === 'happy-stores') {
    const ids = [...fxHappyByStore].filter(([, item]) => item.brandName === value).map(([id]) => id);
    const cards = ids.map(fxStoreById).filter(fxVisible).map(store => `<button type="button" class="channel-store-card glass-action" data-channel-store-id="${escapeHtml(store.id)}">${fxCardPhoto(store)}<span><strong>${escapeHtml(store.name)}</strong><small>${escapeHtml(store.area || RC2_REGION_NAME)} · ${escapeHtml(store.cat)}</small></span><b>›</b></button>`).join('');
    openModal(`<section class="happyorder-hub"><h2 id="modalTitle">해피오더 · ${escapeHtml(value)}</h2><p>주소 설정 후 주변 주문 가능 매장이 표시됩니다. 지역과 영업 상태에 따라 일부 매장은 표시되지 않을 수 있습니다.</p><div class="channel-store-list">${cards}</div></section>`);
  }
};
brandsModal = function rc2BrandsModal() { fxOpenBrandHub('channels'); };

fxEnhanceStoreDetail = function rc2EnhanceStoreDetail(store) {
  const detail = $('#modalContent .store-detail');
  if (!detail) return;
  const mapAudit = rc2NaverByStore.get(String(store.id));
  const naverLink = detail.querySelector('.detail-quick-link[data-detail-only="naver"]');
  if (rc2NaverByStore.size && (!mapAudit || mapAudit.status !== 'verified')) naverLink?.remove();
  const brand = fxBrandByStore.get(String(store.id));
  const happy = fxHappyByStore.get(String(store.id));
  if (brand || happy) {
    const target = detail.querySelector('.store-other-wrap') || detail.querySelector('.detail-personal-actions');
    const html = `<div class="brand-store-actions">${brand ? fxAppAction(brand, 'brand') : ''}${happy ? fxAppAction(happy, 'happy') : ''}</div>`;
    target?.insertAdjacentHTML('beforebegin', html);
  }
  detail.querySelectorAll('.detail-quick-link .quick-icon').forEach(icon => {
    const text = icon.parentElement.textContent;
    icon.innerHTML = text.includes('네이버') ? fxSvg('map') : fxSvg('card');
  });
  const actions = detail.querySelector('.detail-personal-actions');
  if (actions && !actions.querySelector('[data-share-store]')) {
    actions.classList.add('final-personal-actions');
    actions.insertAdjacentHTML('beforeend', `<button type="button" class="detail-personal-btn glass-action" data-share-store="${escapeHtml(store.id)}">공유하기</button>`);
  }
};

openStore = async function rc2OpenStore(store) {
  if (!fxVisible(store)) return false;
  const opened = await fxOriginalOpenStore(store);
  if (opened === false) return false;
  fxEnhanceStoreDetail(store);
  history.replaceState({...history.state, storeId: String(store.id)}, '');
  return opened;
};

guide = function rc2Guide() {
  openModal('<h2 id="modalTitle">원하는 방법으로 편하게 주문하세요</h2><p>가게마다 이용 가능한 주문방법을 한눈에 확인할 수 있습니다. 가게를 먼저 선택한 뒤 원하는 경로를 확인해 주세요.</p>');
};

function rc2ReleasePress(target) {
  if (!target || !rc2ActivePresses.has(target)) return;
  clearTimeout(rc2PressTimers.get(target));
  const timer = setTimeout(() => {
    target.classList.remove('pressing');
    target.removeAttribute('data-press-active');
    rc2ActivePresses.delete(target);
  }, 190);
  rc2PressTimers.set(target, timer);
}

fxPressStart = function rc2PressStart(event) {
  const target = event.target.closest('.glass-action,.category,.brand-app-tile,.happyorder-brand-tile,.happy-category-tile,.phone-order-card,.channel-store-card,.primary-btn');
  if (!target || target.disabled || target.getAttribute('aria-disabled') === 'true' || target.dataset.pressActive === '1') return;
  target.dataset.pressActive = '1';
  target.classList.add('pressing');
  rc2ActivePresses.add(target);
  fxRipple(event.clientX, event.clientY);
  const timer = setTimeout(() => rc2ReleasePress(target), 260);
  rc2PressTimers.set(target, timer);
};

function rc2ReleaseAllPresses() {
  for (const target of [...rc2ActivePresses]) rc2ReleasePress(target);
}

fxFormation = function rc2Formation() {
  if (RC2_IS_GOHEUNG) return;
  const lane = $('#navalLane');
  if (!lane) return;
  lane.querySelectorAll('.turtle-ship').forEach(node => node.remove());
  [['lead', 9], ['escort', 2], ['escort two', 17]].forEach(([className, bottom]) => {
    const ship = document.createElement('i');
    ship.className = `turtle-ship ${className}`;
    ship.style.left = '16px';
    ship.style.bottom = `${bottom}px`;
    lane.append(ship);
    setTimeout(() => ship.remove(), 760);
  });
};

function rc2StopAmbient() {
  rc2AmbientTimers.forEach(clearTimeout);
  rc2AmbientTimers = [];
}

function rc2StartAmbient(firstEntry = false) {
  rc2StopAmbient();
  if (RC2_IS_GOHEUNG) return;
  if (firstEntry) rc2AmbientTimers.push(setTimeout(() => fxFormation(), 1500));
}

function rc2ExternalAppKey(element) {
  if (!element) return '';
  return String(
    element.dataset?.communityOriginal
    || element.dataset?.rc3ExternalRoute
    || element.dataset?.rc3SingleExternal
    || element.dataset?.routeKey
    || element.dataset?.finalAppChannel
    || element.dataset?.appKey
    || element.dataset?.menuExternalKey
    || element.dataset?.menuStickyExternal
    || ''
  );
}

function rc2RememberExternalReturn(sourceElement = null) {
  window.daedongMarkExternalAppDeparture?.();
  const modal = $('#modal');
  const menuState = window.daedongMenuReturn?.capture?.() || null;
  const storeId = menuState?.storeId || modal?.dataset.activeStoreId || modal?.querySelector('[data-store-id]')?.dataset.storeId || history.state?.storeId;
  if (!storeId) return;
  const current = rc2SnapshotModal();
  const storeSnapshot = [current, ...rc2ModalStack.slice().reverse()].find(snapshot => {
    if (!snapshot?.html) return false;
    const template = document.createElement('template');
    template.innerHTML = snapshot.html;
    return String(template.content.querySelector('.store-detail[data-store-id]')?.dataset.storeId || '') === String(storeId);
  });
  const prepareStoreSurface = Boolean(sourceElement?.matches?.(
    'a[data-community-original],[data-rc3-external-route],[data-rc3-single-external]'
  ));
  const payload = {
    storeId: String(storeId),
    surface: menuState ? 'menu' : 'store',
    pageScroll: Number(storeSnapshot?.pageScroll ?? document.body.dataset.lockScrollY ?? 0),
    modalScroll: Number(storeSnapshot?.scrollTop || 0),
    anchor: storeSnapshot?.anchor || null,
    searchState: window.daedongStoreServiceInfo?.captureSearchState?.() || null,
    selectedAppKey: rc2ExternalAppKey(sourceElement),
    menuState,
    storeSnapshot: storeSnapshot && storeSnapshot.html.length <= 500000 ? {
      html: storeSnapshot.html,
      scrollTop: Number(storeSnapshot.scrollTop || 0),
      photoIndex: Number(storeSnapshot.photoIndex || 0),
      anchor: storeSnapshot.anchor || null
    } : null
  };
  rc2WriteReturnState(RC2_EXTERNAL_RETURN, payload);
  if (prepareStoreSurface && storeSnapshot && storeSnapshot !== current) {
    window.daedongResetOrderMethodsTouchState?.();
    rc2ModalStack.length = 0;
    rc2RestoreSnapshot(storeSnapshot);
    try {
      history.replaceState({...history.state, daedongModal: true, rc2ModalDepth: 1, storeId: String(storeId)}, '');
    } catch {}
  }
  return payload;
}

function rc2LaunchComparedExternal(link, href) {
  if (!link || href === '#') return false;
  // Keep the already prepared Preview store detail in its original Kakao
  // WebView. This is the return path that worked on the real Galaxy device:
  // the external order route opens separately, and Android resumes the exact
  // same store DOM instead of a same-tab intent history entry with a stale
  // native hit-test surface.
  window.open(href, '_blank', 'noopener');
  return true;
}

async function rc2RestoreAfterExternalPage({rebuildExisting = false} = {}) {
  if (rc2StoreRestorePromise) return rc2StoreRestorePromise;
  const restoreEpoch = rc2ReturnLifecycleEpoch;
  const restoreTask = (async () => {
    const saved = rc2ReadReturnState(RC2_EXTERNAL_RETURN);
    if (!saved || rc2ReturnRestoreCancelled(restoreEpoch)) return false;
    const modal = $('#modal');
    const visibleStoreId = modal?.dataset.activeStoreId || modal?.querySelector('.store-detail[data-store-id]')?.dataset.storeId;
    const visibleStoreMatches = Boolean(
      !modal?.hidden
      && modal.querySelector('.store-detail')
      && String(visibleStoreId || '') === String(saved.storeId)
    );
    const store = fxStoreById(saved.storeId);
    if (!store) return false;
    if (visibleStoreMatches) {
      if (rc2ReturnRestoreCancelled(restoreEpoch)) return false;
      window.daedongResetOrderMethodsTouchState?.();
      // Preserve the prepared detail element exactly. Rebuilding or navigating
      // this already-visible surface after an external app return is what made
      // the real Kakao WebView's next physical tap disappear.
      window.daedongRebindOrderMethodsTrigger?.();
      rc2DeferredStoreReturnPosition = saved;
      rc2StabilizeReturnPosition(saved, $('#modal .modal-card'));
      if (saved.menuState) {
        const restoredMenu = await window.daedongMenuReturn?.restore?.(saved.menuState);
        if (!restoredMenu || rc2ReturnRestoreCancelled(restoreEpoch)) return false;
      }
      if (rc2ReturnRestoreCancelled(restoreEpoch)) return false;
      rc2ArmRestoredReturnLease(RC2_EXTERNAL_RETURN, saved);
      return true;
    }
    if (!modal?.hidden) {
      if (rc2ReturnRestoreCancelled(restoreEpoch)) return false;
      window.daedongResetOrderMethodsTouchState?.();
      rc2ModalStack.length = 0;
      rc2NativeHardClose({fromPop: true});
      await new Promise(resolve => requestAnimationFrame(() => resolve()));
      if (rc2ReturnRestoreCancelled(restoreEpoch)) return false;
    }
    if (rc2ReturnRestoreCancelled(restoreEpoch)) return false;
    scrollWindowInstant(Number(saved.pageScroll || 0));
    const opened = await openStore(store);
    if (opened === false || rc2ReturnRestoreCancelled(restoreEpoch)) return false;
    const restoredStoreId = modal?.dataset.activeStoreId || modal?.querySelector('.store-detail[data-store-id]')?.dataset.storeId;
    if (modal?.hidden || String(restoredStoreId || '') !== String(saved.storeId)) return false;
    window.daedongRebindOrderMethodsTrigger?.();
    rc2DeferredStoreReturnPosition = saved;
    rc2StabilizeReturnPosition(saved);
    if (saved.menuState) {
      const restoredMenu = await window.daedongMenuReturn?.restore?.(saved.menuState);
      if (!restoredMenu || rc2ReturnRestoreCancelled(restoreEpoch)) return false;
    }
    if (rc2ReturnRestoreCancelled(restoreEpoch)) return false;
    rc2ArmRestoredReturnLease(RC2_EXTERNAL_RETURN, saved);
    return true;
  })();
  rc2StoreRestorePromise = restoreTask;
  try {
    return await restoreTask;
  } finally {
    if (rc2StoreRestorePromise === restoreTask) rc2StoreRestorePromise = null;
  }
}

async function rc2RestoreExternalSurface({rebuildExisting = false} = {}) {
  if (rc2SurfaceRestorePromise) return rc2SurfaceRestorePromise;
  const restoreEpoch = rc2ReturnLifecycleEpoch;
  const restoreTask = (async () => {
    if (await rc2RestoreAfterExternalPage({rebuildExisting})) return !rc2ReturnRestoreCancelled(restoreEpoch);
    if (rc2ReturnRestoreCancelled(restoreEpoch)) return false;
    return Boolean(fxRestoreAppBrowserReturn?.());
  })();
  rc2SurfaceRestorePromise = restoreTask;
  try {
    return await restoreTask;
  } finally {
    if (rc2SurfaceRestorePromise === restoreTask) rc2SurfaceRestorePromise = null;
  }
}

function rc2PendingExternalReturnState() {
  for (const key of RC2_RETURN_STORAGE_KEYS) {
    const saved = rc2ReadReturnState(key);
    if (saved) return saved;
  }
  return null;
}

function rc2RestoreAfterConfirmedResume({rebuildExisting = true} = {}) {
  const saved = rc2PendingExternalReturnState();
  if (!saved) return Promise.resolve(false);
  const age = Date.now() - Number(saved.savedAt || 0);
  const confirmed = rc2ExternalDepartureHidden
    || (rc2ExternalDepartureBlurred && age >= RC2_FOCUS_ONLY_RETURN_DELAY_MS);
  if (!confirmed) {
    // Android/Kakao can briefly blur and focus the WebView while handing the
    // intent to an order app. That is still the departure, not the return.
    // Forget only that bounce; a real app switch emits another blur, hidden,
    // or pagehide signal before the customer comes back.
    if (rc2ExternalDepartureBlurred && age < RC2_FOCUS_ONLY_RETURN_DELAY_MS) {
      rc2ExternalDepartureBlurred = false;
    }
    return Promise.resolve(false);
  }
  return rc2RestoreExternalSurface({rebuildExisting}).then(restored => {
    if (restored) {
      rc2ResetExternalDepartureLifecycle();
    }
    return restored;
  });
}

fxOrderClick = function rc2OrderClick(button) {
  const key = button.dataset.orderKey;
  $$('.order-item').forEach(item => item.classList.remove('selected'));
  button.classList.add('selected');
  if (['direct', 'mukkebi', 'ddangyo', 'ondongne'].includes(key)) fxFormation();
  if (key === 'brand') fxOpenBrandHub('channels');
  else if (key === 'phone') fxOpenPhoneDirectory();
  else if (key === 'other') rc2OpenOtherApps();
  else openAppBrowser(key);
};

fxInstallEvents = function rc2InstallEvents() {
  if (window.daedongCoreEventsInstalled) return;
  window.daedongCoreEventsInstalled = true;
  document.addEventListener('pointerdown', rc2PrepareStoreIntent, true);
  document.addEventListener('touchstart', rc2PrepareStoreIntent, {capture: true, passive: true});
  document.addEventListener('pointerup', rc2ScheduleRestoredReturnSettlement, true);
  document.addEventListener('touchend', rc2ScheduleRestoredReturnSettlement, {capture: true, passive: true});
  document.addEventListener('wheel', rc2ScheduleRestoredReturnSettlement, {capture: true, passive: true});
  document.addEventListener('keyup', rc2ScheduleRestoredReturnSettlement, true);
  document.addEventListener('pointerdown', fxPressStart, true);
  document.addEventListener('pointerup', rc2ReleaseAllPresses, true);
  document.addEventListener('pointercancel', rc2ReleaseAllPresses, true);
  window.addEventListener('blur', rc2ReleaseAllPresses);
  window.addEventListener('blur', () => {
    if (rc2PendingExternalReturnState()) rc2ExternalDepartureBlurred = true;
  });
  document.addEventListener('click', event => {
    const order = event.target.closest('[data-order-key]');
    if (order) {
      event.preventDefault();
      event.stopImmediatePropagation();
      fxOrderClick(order);
      return;
    }
    if (event.target.closest('#searchSurface') && !event.target.closest('#clearMainSearch')) {
      event.preventDefault(); event.stopImmediatePropagation(); fxSearchModal($('#mainSearch').value); return;
    }
    if (event.target.closest('#searchBtn')) {
      event.preventDefault(); event.stopImmediatePropagation(); fxSearchModal($('#mainSearch').value); return;
    }
    const railMore = event.target.closest('[data-rail-more]');
    if (railMore) { event.preventDefault(); event.stopImmediatePropagation(); rc2OpenRailList(railMore.dataset.railMore); return; }
    const rc3RailStore = event.target.closest('[data-rc3-rail-open]');
    if (rc3RailStore) { event.preventDefault(); event.stopImmediatePropagation(); const store = fxStoreById(rc3RailStore.dataset.rc3RailOpen); if (store) rc2OpenStoreFromCustomer(store); return; }
    const railStore = event.target.closest('[data-rail-store-id]');
    if (railStore) { event.preventDefault(); event.stopImmediatePropagation(); const store = fxStoreById(railStore.dataset.railStoreId); if (store) rc2OpenStoreFromCustomer(store); return; }
    const homeStore = event.target.closest('#storeGrid .store-card[data-id]');
    if (homeStore && !event.target.closest('button,a')) {
      event.preventDefault();
      event.stopImmediatePropagation();
      rc2OpenStoreFromCustomer(fxStoreById(homeStore.dataset.id));
      return;
    }
    const appCategory = event.target.closest('[data-app-category]');
    if (appCategory) { event.preventDefault(); event.stopImmediatePropagation(); openAppBrowser($('#modal').dataset.appBrowserKey, appCategory.dataset.appCategory); return; }
    const appStoreInfo = event.target.closest('[data-app-store-info]');
    if (appStoreInfo) { event.preventDefault(); event.stopImmediatePropagation(); const store = fxStoreById(appStoreInfo.dataset.appStoreInfo); if (store) rc2OpenStoreFromCustomer(store); return; }
    const appStoreOrder = event.target.closest('[data-app-store-order]');
    if (appStoreOrder) { event.preventDefault(); event.stopImmediatePropagation(); void fxOpenRegisteredAppOrder(appStoreOrder); return; }
    const appStore = event.target.closest('[data-app-store-id]');
    if (appStore) {
      event.preventDefault(); event.stopImmediatePropagation();
      const store = fxStoreById(appStore.dataset.appStoreId);
      const key = appStore.dataset.appKey;
      if (store) {
        if (['yogiyo', 'coupang', 'baemin'].includes(key)) openCommunityChoice(store, key, {fromBrowser: true});
        else rc2OpenStoreFromCustomer(store);
      }
      return;
    }
    const phoneCategory = event.target.closest('[data-phone-category]');
    if (phoneCategory) { event.preventDefault(); event.stopImmediatePropagation(); fxOpenPhoneDirectory(phoneCategory.dataset.phoneCategory); return; }
    const phoneStore = event.target.closest('[data-phone-store-id]');
    if (phoneStore) { event.preventDefault(); event.stopImmediatePropagation(); fxOpenPhoneConfirm(phoneStore.dataset.phoneStoreId); return; }
    if (event.target.closest('[data-phone-cancel]')) { event.preventDefault(); event.stopImmediatePropagation(); hardClose(); return; }
    const directCategory = event.target.closest('[data-direct-category]');
    if (directCategory) { event.preventDefault(); event.stopImmediatePropagation(); fxOpenBrandHub('direct', directCategory.dataset.directCategory); return; }
    const brandView = event.target.closest('[data-brand-view]');
    if (brandView) { event.preventDefault(); event.stopImmediatePropagation(); fxOpenBrandHub(brandView.dataset.brandView); return; }
    const directBrand = event.target.closest('[data-direct-brand]');
    if (directBrand) { event.preventDefault(); event.stopImmediatePropagation(); fxOpenBrandHub('direct-stores', directBrand.dataset.directBrand); return; }
    const happyCategory = event.target.closest('[data-happy-category]');
    if (happyCategory) { event.preventDefault(); event.stopImmediatePropagation(); fxOpenBrandHub('happy-brands', happyCategory.dataset.happyCategory); return; }
    const happyBrand = event.target.closest('[data-happy-brand]');
    if (happyBrand) { event.preventDefault(); event.stopImmediatePropagation(); fxOpenBrandHub('happy-stores', happyBrand.dataset.happyBrand); return; }
    const channelStore = event.target.closest('[data-channel-store-id]');
    if (channelStore) { event.preventDefault(); event.stopImmediatePropagation(); const store = fxStoreById(channelStore.dataset.channelStoreId); if (store) rc2OpenStoreFromCustomer(store); return; }
    const searchStore = event.target.closest('[data-search-store-id]');
    if (searchStore) { event.preventDefault(); event.stopImmediatePropagation(); const store = fxStoreById(searchStore.dataset.searchStoreId); if (store) rc2OpenStoreFromCustomer(store); return; }
    if (event.target.id === 'fxSearchRun') { event.preventDefault(); event.stopImmediatePropagation(); fxSearchModal($('#fxSearchInput')?.value || ''); return; }
    const share = event.target.closest('[data-share-store]');
    if (share) {
      event.preventDefault();
      event.stopImmediatePropagation();
      const store = fxStoreById(share.dataset.shareStore);
      if (store) fxShare(store, share);
      return;
    }
    const favorite = event.target.closest('[data-favorite-store]');
    if (favorite) fxGull(favorite, true);
    const comparedExternal = event.target.closest('a[data-community-original]');
    if (comparedExternal) {
      const href = safeHref(comparedExternal.getAttribute('href'));
      event.preventDefault();
      event.stopImmediatePropagation();
      rc2RememberExternalReturn(comparedExternal);
      rc2LaunchComparedExternal(comparedExternal, href);
      return;
    }
    const externalLink = event.target.closest('a[target="_blank"],a[data-final-app-channel],a[data-detail-only]');
    if (externalLink) rc2RememberExternalReturn(externalLink);
    const finalLocal = event.target.closest('.detail-route[data-route-key="direct"],.detail-route[data-route-key="mukkebi"],.detail-route[data-route-key="ddangyo"],.detail-route[data-route-key="ondongne"],.community-choice-link');
    if (finalLocal) fxBattle();
  }, true);
  document.addEventListener('keydown', event => {
    if (event.key === 'Enter' && event.target.id === 'fxSearchInput') {
      event.preventDefault(); fxSearchModal(event.target.value);
    }
  });
  document.addEventListener('visibilitychange', () => {
    document.documentElement.classList.toggle('page-hidden', document.hidden);
    if (document.hidden) {
      if (rc2PendingExternalReturnState()) rc2ExternalDepartureHidden = true;
      rc2StopAmbient();
      return;
    }
    else {
      void rc2RestoreAfterConfirmedResume({rebuildExisting: true}).then(restored => {
        if (restored) window.daedongFinishExternalReturnBoot?.();
        else rc2StartAmbient(false);
      });
    }
  });
  window.addEventListener('pagehide', () => {
    if (rc2PendingExternalReturnState()) rc2ExternalDepartureHidden = true;
  });
  const restoreAfterNativeResume = () => {
    void rc2RestoreAfterConfirmedResume({rebuildExisting: true}).then(restored => {
      if (restored) window.daedongFinishExternalReturnBoot?.();
    });
  };
  window.addEventListener('pageshow', restoreAfterNativeResume);
  window.addEventListener('focus', () => rc2RestoreAfterConfirmedResume({rebuildExisting: true}).then(restored => {
    if (restored) window.daedongFinishExternalReturnBoot?.();
  }));
  document.addEventListener('resume', () => {
    if (rc2PendingExternalReturnState()) rc2ExternalDepartureHidden = true;
    restoreAfterNativeResume();
  });
};

fxInitialize = async function rc2Initialize() {
  rc2ScrubCustomerCounts(document);
  let restoredStore = false;
  let restoredAppBrowser = false;
  try {
    const restoredStoreResult = await rc2RestoreAfterExternalPage();
    restoredStore = Boolean(restoredStoreResult);
    if (!restoredStore) restoredAppBrowser = Boolean(fxRestoreAppBrowserReturn?.());
    if (restoredStore || restoredAppBrowser) window.daedongFinishExternalReturnBoot?.();
  } catch (error) {
    console.warn('저장된 가게를 먼저 복원하지 못했습니다.', error);
  }

  const [brand, supplement, happy, phone, naver] = await Promise.all([
    RC2_IS_GOHEUNG ? Promise.resolve({stores: [], brands: []}) : fetchJson(FX_BRAND_URL, {stores: [], brands: []}),
    RC2_IS_GOHEUNG ? Promise.resolve({storeMappings: [], directApps: []}) : fetchJson(FX_BRAND_SUPPLEMENT_URL, {storeMappings: [], directApps: []}),
    RC2_IS_GOHEUNG ? Promise.resolve({candidateStoreMappings: [], currentScreenBrands: [], categories: []}) : fetchJson(FX_HAPPY_URL, {candidateStoreMappings: [], currentScreenBrands: [], categories: []}),
    RC2_IS_GOHEUNG ? Promise.resolve({storeMappings: []}) : fetchJson(FX_PHONE_URL, {storeMappings: []}),
    RC2_IS_GOHEUNG ? Promise.resolve({stores: []}) : fetchJson(RC2_NAVER_AUDIT_URL, {stores: []})
  ]);
  fxBrandData = brand;
  fxSupplement = supplement;
  fxHappyData = happy;
  fxPhoneData = phone;
  fxBuildIndexes();
  rc2BrandKeyCache = new WeakMap();
  rc2NaverByStore.clear();
  for (const item of naver.stores || []) rc2NaverByStore.set(String(item.store_id), item);
  APP_META.phone.icon = 'assets/ui/phone.svg';

  if (restoredStore) {
    const activeStore = fxStoreById($('#modal')?.dataset.activeStoreId);
    if (activeStore) fxEnhanceStoreDetail(activeStore);
    if (rc2DeferredStoreReturnPosition) rc2StabilizeReturnPosition(rc2DeferredStoreReturnPosition);
  }
  try {
    if (!restoredStore && !restoredAppBrowser) {
      restoredStore = Boolean(await rc2RestoreAfterExternalPage());
      if (!restoredStore) restoredAppBrowser = Boolean(fxRestoreAppBrowserReturn?.());
    }
  } finally {
    if (!restoredStore) {
      const staleStoreReturn = rc2ReadReturnState(RC2_EXTERNAL_RETURN);
      if (staleStoreReturn) rc2ClearReturnState(RC2_EXTERNAL_RETURN, staleStoreReturn);
    }
    if (!restoredAppBrowser) {
      const staleBrowserReturn = rc2ReadReturnState(RC2_APP_BROWSER_RETURN);
      if (staleBrowserReturn) rc2ClearReturnState(RC2_APP_BROWSER_RETURN, staleBrowserReturn);
    }
    window.daedongFinishExternalReturnBoot?.();
  }
  renderCategories();
  fxRenderRails();
  await fxInitWeather();
  setTimeout(() => { rc2DeferredStoreReturnPosition = null; }, 2200);
  rc2StartAmbient(!restoredStore && !restoredAppBrowser);
};
