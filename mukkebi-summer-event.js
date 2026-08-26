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
  const HIDE_DATE_KEY = 'daedongMukkebiSummerEventHiddenDate';
  const SEEN_SESSION_KEY = 'daedongMukkebiSummerEventSeenSessionV1';
  const EXTERNAL_APP_DEPARTURE_KEY = 'daedongExternalAppDepartureV1';
  const EVENT_END = new Date('2026-09-01T00:00:00+09:00').getTime();
  // Never interrupt the home screen or the order-benefits flow with an
  // automatic campaign layer. The markup remains available for an explicit
  // campaign entry, but app/browser resume must stay on the requested screen.
  const AUTO_OPEN_ENABLED = false;
  let opened = false;
  let customerInteracted = false;
  let initialOpenTimer = 0;

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
  }

  function canOpen() {
    if (opened || seenThisSession() || returningFromOrderApp() || customerAlreadyInteracted() || Date.now() >= EVENT_END || hiddenToday()) return false;
    if (new URLSearchParams(location.search).has('store')) return false;
    const modal = document.getElementById('modal');
    const startupAd = document.getElementById('startupAd');
    const serviceOverview = document.querySelector('[data-store-service-overview-overlay]');
    return (communityIntro?.hidden ?? true) &&
      (modal?.hidden ?? true) &&
      (startupAd?.hidden ?? true) &&
      (serviceOverview?.hidden ?? true) &&
      !document.body.classList.contains('store-service-overview-open');
  }

  function openEvent() {
    if (!canOpen()) return;
    opened = true;
    try { sessionStorage.setItem(SEEN_SESSION_KEY, '1'); } catch {}
    eventLayer.hidden = false;
    eventLayer.setAttribute('aria-hidden', 'false');
    closeButton?.focus({preventScroll:true});
  }

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
    if (!AUTO_OPEN_ENABLED) return;
    initialOpenTimer = window.setTimeout(() => {
      initialOpenTimer = 0;
      openEvent();
    }, 600);
  }

  for (const type of ['pointerdown', 'touchstart', 'wheel', 'keydown']) {
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
