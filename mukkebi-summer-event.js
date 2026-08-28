'use strict';

(() => {
  const eventLayer = document.getElementById('mukkebiSummerEvent');
  if (window.DAEDONG_REGION?.code === 'goheung') {
    if (eventLayer) {
      eventLayer.hidden = true;
      eventLayer.setAttribute('aria-hidden', 'true');
    }
    return;
  }
  const closeButton = document.getElementById('mukkebiSummerClose');
  const hideTodayButton = document.getElementById('mukkebiSummerHideToday');
  const orderButton = document.getElementById('mukkebiSummerOrder');
  const communityIntro = document.getElementById('communityIntro');
  const HIDE_DATE_KEY = 'daedongMukkebiSummerEventHiddenDateV2';
  const SEEN_SESSION_KEY = 'daedongMukkebiSummerEventSeenSessionV2';
  const EXTERNAL_APP_DEPARTURE_KEY = 'daedongExternalAppDepartureV1';
  const EVENT_END = new Date('2026-09-01T00:00:00+09:00').getTime();
  const AUTO_OPEN_ENABLED = true;
  const RETURN_QUERY_KEYS = ['store', '__ddret', '__ddom', '__ddappfallback'];
  const entryUrl = new URL(location.href);
  const navigationType = performance.getEntriesByType?.('navigation')?.[0]?.type || '';
  // Decide once, while this document is being created. Return markers can be
  // consumed later by rc2, but that must never turn a resumed order-app page
  // into a fresh campaign entry after the requested store has been restored.
  const AUTO_OPEN_ELIGIBLE = AUTO_OPEN_ENABLED
    && !globalThis.daedongEntryHadExternalReturn
    && !globalThis.daedongEntryIsHistoryReturn
    && !globalThis.daedongEntryIsDetachedKakaoReturn
    && !globalThis.daedongPendingExternalReturn
    && !RETURN_QUERY_KEYS.some(key => entryUrl.searchParams.has(key))
    && document.wasDiscarded !== true
    && (!navigationType || navigationType === 'navigate');
  window.daedongMukkebiAutoOpenPending = AUTO_OPEN_ELIGIBLE;
  let opened = false;
  let customerInteracted = false;
  let initialOpenTimer = 0;
  let interactionStart = null;

  if (!eventLayer) return;

  function localDateKey() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function hiddenToday() {
    try { return localStorage.getItem(HIDE_DATE_KEY) === localDateKey(); }
    catch { return false; }
  }

  function seenThisSession() {
    try { return sessionStorage.getItem(SEEN_SESSION_KEY) === '1'; }
    catch { return false; }
  }

  function returningFromOrderApp() {
    try { return sessionStorage.getItem(EXTERNAL_APP_DEPARTURE_KEY) === '1'; }
    catch { return false; }
  }

  function customerAlreadyInteracted() {
    return customerInteracted ||
      window.daedongEarlyHomeInteraction === true ||
      window.daedongHasHomeInteraction?.() === true ||
      Math.abs(Number(window.scrollY || document.documentElement.scrollTop || 0)) > 16;
  }

  function markCustomerInteraction() {
    customerInteracted = true;
    window.clearTimeout(initialOpenTimer);
    initialOpenTimer = 0;
    settleAutomaticOpen();
  }

  function settleAutomaticOpen() {
    if (window.daedongMukkebiAutoOpenPending !== true) return;
    window.daedongMukkebiAutoOpenPending = false;
    window.dispatchEvent(new Event('daedong:mukkebi-auto-open-settled'));
  }

  function interactionPoint(event) {
    const point = event.touches?.[0] || event.changedTouches?.[0] || event;
    const x = Number(point?.clientX);
    const y = Number(point?.clientY);
    return Number.isFinite(x) && Number.isFinite(y) ? {x, y} : null;
  }

  function rememberInteractionStart(event) {
    interactionStart = interactionPoint(event);
  }

  function markMovedInteraction(event) {
    const point = interactionPoint(event);
    if (!interactionStart || !point) return;
    if (Math.hypot(point.x - interactionStart.x, point.y - interactionStart.y) > 12) {
      markCustomerInteraction();
    }
  }

  function markActionableClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('a, button, input, select, textarea, [role="button"], [data-order-key]')) {
      markCustomerInteraction();
    }
  }

  function canOpen({automatic = false} = {}) {
    if (automatic && (!AUTO_OPEN_ELIGIBLE || document.visibilityState !== 'visible')) return false;
    if (opened || seenThisSession() || returningFromOrderApp() || customerAlreadyInteracted() || Date.now() >= EVENT_END || hiddenToday()) return false;
    const modal = document.getElementById('modal');
    const startupAd = document.getElementById('startupAd');
    const serviceOverview = document.querySelector('[data-store-service-overview-overlay]');
    return (communityIntro?.hidden ?? true) &&
      (modal?.hidden ?? true) &&
      (startupAd?.hidden ?? true) &&
      (serviceOverview?.hidden ?? true) &&
      !document.body.classList.contains('store-service-overview-open');
  }

  function openEvent({automatic = false} = {}) {
    if (!canOpen({automatic})) return;
    opened = true;
    try { sessionStorage.setItem(SEEN_SESSION_KEY, '1'); } catch {}
    eventLayer.hidden = false;
    eventLayer.setAttribute('aria-hidden', 'false');
    closeButton?.focus({preventScroll:true});
  }

  // Reserved for an explicit campaign entry. Automatic opening stays off.
  window.daedongOpenMukkebiSummerEvent = () => openEvent();

  function closeEvent() {
    eventLayer.hidden = true;
    eventLayer.setAttribute('aria-hidden', 'true');
  }

  function dismissEventImmediately(event) {
    event?.preventDefault();
    event?.stopPropagation();
    closeEvent();
  }

  function scheduleInitialOpen() {
    window.clearTimeout(initialOpenTimer);
    if (!AUTO_OPEN_ELIGIBLE) {
      settleAutomaticOpen();
      return;
    }
    initialOpenTimer = window.setTimeout(() => {
      initialOpenTimer = 0;
      openEvent({automatic: true});
      settleAutomaticOpen();
    }, 600);
  }

  // KakaoTalk can carry the touch that opened this WebView into the new
  // document. A lone pointerdown/touchstart is therefore not proof that the
  // customer interacted with this page. Cancel only after verified movement
  // or an actual actionable click.
  document.addEventListener('pointerdown', rememberInteractionStart, {capture:true, passive:true});
  document.addEventListener('pointermove', markMovedInteraction, {capture:true, passive:true});
  document.addEventListener('touchstart', rememberInteractionStart, {capture:true, passive:true});
  document.addEventListener('touchmove', markMovedInteraction, {capture:true, passive:true});
  document.addEventListener('click', markActionableClick, {capture:true, passive:true});
  for (const type of ['wheel', 'keydown']) {
    document.addEventListener(type, markCustomerInteraction, {capture:true, passive:true, once:true});
  }
  window.addEventListener('scroll', () => {
    if (Math.abs(Number(window.scrollY || document.documentElement.scrollTop || 0)) > 16) {
      markCustomerInteraction();
    }
  }, {passive:true});

  if (typeof window.installDaedongTapAction === 'function') {
    window.installDaedongTapAction({
      selector: '#mukkebiSummerClose',
      activate(target, event) {
        if (!opened || target !== closeButton) return false;
        dismissEventImmediately(event);
        return true;
      }
    });
  } else {
    closeButton?.addEventListener('click', dismissEventImmediately);
  }
  hideTodayButton?.addEventListener('click', () => {
    try { localStorage.setItem(HIDE_DATE_KEY, localDateKey()); }
    catch {}
    closeEvent();
  });
  orderButton?.addEventListener('click', () => {
    closeEvent();
    const mukkebiButton = document.querySelector('[data-order-key="mukkebi"]');
    if (mukkebiButton instanceof HTMLElement) window.setTimeout(() => mukkebiButton.click(), 80);
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !eventLayer.hidden) closeEvent();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInitialOpen, {once:true});
  } else {
    scheduleInitialOpen();
  }
})();
