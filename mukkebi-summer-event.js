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
  const HIDE_DATE_KEY = 'daedongMukkebiIslandExpoEventHiddenDateV1';
  const SEEN_SESSION_KEY = 'daedongMukkebiIslandExpoEventSeenSessionV1';
  const COMMUNITY_INTRO_SESSION_KEY = 'daedongCommunityIntroPlayedV4';
  const EXTERNAL_APP_DEPARTURE_KEY = 'daedongExternalAppDepartureV1';
  const FOLLOWUP_CAMPAIGN_DELAY = 3000;
  const EVENT_START = new Date('2026-09-01T00:00:00+09:00').getTime();
  const EVENT_END = new Date('2026-11-01T00:00:00+09:00').getTime();
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
  // The general community intro owns the first startup slot. The Mukkebi
  // campaign is queued only after that intro has fully closed.
  window.daedongMukkebiAutoOpenPending = false;
  let opened = false;
  let customerInteracted = false;
  let followupCampaignTimer = 0;
  let waitingAfterIntroClose = false;
  let interactionStart = null;

  if (!eventLayer) return;
  eventLayer.dataset.controllerState = 'ready';
  eventLayer.dataset.autoOpenEligible = String(AUTO_OPEN_ELIGIBLE);

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
    if (waitingAfterIntroClose) {
      return customerInteracted ||
        Math.abs(Number(window.scrollY || document.documentElement.scrollTop || 0)) > 16;
    }
    return customerInteracted ||
      window.daedongEarlyHomeInteraction === true ||
      window.daedongHasHomeInteraction?.() === true ||
      Math.abs(Number(window.scrollY || document.documentElement.scrollTop || 0)) > 16;
  }

  function markCustomerInteraction(reason = 'unknown') {
    customerInteracted = true;
    eventLayer.dataset.interactionReason = String(reason);
    window.clearTimeout(followupCampaignTimer);
    followupCampaignTimer = 0;
    waitingAfterIntroClose = false;
    window.daedongMukkebiReadyAt = 0;
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
    const target = event.target instanceof Element ? event.target : null;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    if (target?.closest('#communityIntro') || path.includes(communityIntro)) {
      interactionStart = null;
      return;
    }
    interactionStart = interactionPoint(event);
  }

  function clearInteractionStart() {
    interactionStart = null;
  }

  function markMovedInteraction(event) {
    const point = interactionPoint(event);
    if (!interactionStart || !point) return;
    if (Math.hypot(point.x - interactionStart.x, point.y - interactionStart.y) > 12) {
      markCustomerInteraction('gesture-moved');
    }
  }

  function markActionableClick(event) {
    const target = event.target instanceof Element ? event.target : null;
    const path = typeof event.composedPath === 'function' ? event.composedPath() : [];
    if (target?.closest('#communityIntro') || path.includes(communityIntro)) return;
    if (target?.closest('a, button, input, select, textarea, [role="button"], [data-order-key]')) {
      markCustomerInteraction(`action-click:${target.id || target.tagName.toLowerCase()}`);
    }
  }

  function canOpen({automatic = false, afterCommunityIntro = false} = {}) {
    const block = reason => {
      eventLayer.dataset.blockReason = reason;
      return false;
    };
    delete eventLayer.dataset.blockReason;
    if ((automatic || afterCommunityIntro) && document.visibilityState !== 'visible') return block('document-hidden');
    if (automatic && !AUTO_OPEN_ELIGIBLE) return block('automatic-ineligible');
    if (opened) return block('already-opened');
    if (seenThisSession()) return block('seen-session');
    if (returningFromOrderApp()) return block('order-app-return');
    if (customerAlreadyInteracted()) return block('customer-interacted');
    if (Date.now() < EVENT_START) return block('campaign-not-started');
    if (Date.now() >= EVENT_END) return block('campaign-ended');
    if (hiddenToday()) return block('hidden-today');
    const modal = document.getElementById('modal');
    const startupAd = document.getElementById('startupAd');
    const serviceOverview = document.querySelector('[data-store-service-overview-overlay]');
    const clear = (communityIntro?.hidden ?? true) &&
      (modal?.hidden ?? true) &&
      (startupAd?.hidden ?? true) &&
      (serviceOverview?.hidden ?? true) &&
      !document.body.classList.contains('store-service-overview-open');
    return clear || block('overlay-open');
  }

  function openEvent({automatic = false, afterCommunityIntro = false} = {}) {
    if (!canOpen({automatic, afterCommunityIntro})) {
      eventLayer.dataset.controllerState = 'blocked';
      return;
    }
    opened = true;
    eventLayer.dataset.controllerState = 'open';
    try { sessionStorage.setItem(SEEN_SESSION_KEY, '1'); } catch {}
    eventLayer.hidden = false;
    eventLayer.setAttribute('aria-hidden', 'false');
    closeButton?.focus({preventScroll:true});
  }

  // Reserved for an explicit campaign entry. Automatic opening stays off.
  window.daedongOpenMukkebiSummerEvent = () => openEvent();

  function scheduleCampaignFollowup() {
    // Closing the verified first community intro is itself the fresh-entry
    // proof. Do not lose the second popup merely because a browser reports an
    // unusual navigation type after creating or restoring its WebView.
    if (opened || seenThisSession() || hiddenToday()) return;
    eventLayer.dataset.controllerState = 'scheduled';
    window.clearTimeout(followupCampaignTimer);
    waitingAfterIntroClose = true;
    const readyAt = Date.now() + FOLLOWUP_CAMPAIGN_DELAY;
    window.daedongMukkebiReadyAt = readyAt;
    followupCampaignTimer = window.setTimeout(() => {
      followupCampaignTimer = 0;
      if (window.daedongMukkebiReadyAt === readyAt) {
        window.daedongMukkebiReadyAt = 0;
      }
      eventLayer.dataset.controllerState = 'opening';
      openEvent({afterCommunityIntro: true});
      waitingAfterIntroClose = false;
      settleAutomaticOpen();
    }, FOLLOWUP_CAMPAIGN_DELAY);
  }

  function closeEvent() {
    if (eventLayer.hidden) return;
    eventLayer.hidden = true;
    eventLayer.setAttribute('aria-hidden', 'true');
  }

  function dismissEventImmediately(event) {
    event?.preventDefault();
    event?.stopPropagation();
    closeEvent();
  }

  function scheduleInitialOpen() {
    if (!AUTO_OPEN_ELIGIBLE) {
      settleAutomaticOpen();
      return;
    }
    let introAlreadyPlayed = false;
    try { introAlreadyPlayed = sessionStorage.getItem(COMMUNITY_INTRO_SESSION_KEY) === '1'; }
    catch {}
    if (introAlreadyPlayed && (communityIntro?.hidden ?? true)) scheduleCampaignFollowup();
    else settleAutomaticOpen();
  }

  // KakaoTalk can carry the touch that opened this WebView into the new
  // document. A lone pointerdown/touchstart is therefore not proof that the
  // customer interacted with this page. Cancel only after verified movement
  // or an actual actionable click.
  document.addEventListener('pointerdown', rememberInteractionStart, {capture:true, passive:true});
  document.addEventListener('pointermove', markMovedInteraction, {capture:true, passive:true});
  document.addEventListener('pointerup', clearInteractionStart, {capture:true, passive:true});
  document.addEventListener('pointercancel', clearInteractionStart, {capture:true, passive:true});
  document.addEventListener('touchstart', rememberInteractionStart, {capture:true, passive:true});
  document.addEventListener('touchmove', markMovedInteraction, {capture:true, passive:true});
  document.addEventListener('touchend', clearInteractionStart, {capture:true, passive:true});
  document.addEventListener('touchcancel', clearInteractionStart, {capture:true, passive:true});
  document.addEventListener('click', markActionableClick, {capture:true, passive:true});
  for (const type of ['wheel', 'keydown']) {
    document.addEventListener(type, () => markCustomerInteraction(type), {capture:true, passive:true, once:true});
  }
  window.addEventListener('scroll', () => {
    if (Math.abs(Number(window.scrollY || document.documentElement.scrollTop || 0)) > 16) {
      markCustomerInteraction('scroll');
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
  window.addEventListener('daedong:community-intro-closed', scheduleCampaignFollowup);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleInitialOpen, {once:true});
  } else {
    scheduleInitialOpen();
  }
})();
