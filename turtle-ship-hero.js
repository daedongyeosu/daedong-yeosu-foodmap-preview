'use strict';

/*
 * 첫 진입 안내 팝업이 닫힌 뒤 상징 거북선이 세션당 한 번만 운항한다.
 * 데이터·가게 목록·주문 경로·팝업 이벤트에는 연결하지 않는다.
 */
(() => {
  if (window.DAEDONG_REGION?.code === 'goheung') return;
  const SEQUENCE_SESSION_KEY = 'daedongCommunityIntroPlayedV4';
  const INTRO_DURATION = 15000;
  const INTRO_CLOSE_DURATION = 240;
  const entryParams = new URLSearchParams(location.search);
  const dedicatedEntryStoreId = String(
    window.daedongDedicatedEntryStoreId
    || entryParams.get('hero')
    || entryParams.get('store')
    || ''
  ).trim();
  const intro = document.getElementById('communityIntro');
  const introClose = document.getElementById('communityIntroClose');
  const scene = document.getElementById('turtleShipHeroScene');
  if (!scene) return;
  const shell = scene.parentElement;
  const passage = shell?.querySelector('.turtle-ship-passage');

  let finishTimer = 0;
  let introTimer = 0;
  let introCloseTimer = 0;
  let sequenceStarted = false;
  let sailStarted = false;
  let introClosing = false;
  let dedicatedStoreDetailOpened = false;
  let dedicatedStoreDetailClosed = false;

  if (dedicatedEntryStoreId) window.daedongDedicatedStorePopupSequencePending = true;

  function syncPassageCenter() {
    if (!shell || !passage) return;
    const shellRect = shell.getBoundingClientRect();
    const passageRect = passage.getBoundingClientRect();
    const originalCourseOffset = window.matchMedia('(max-width: 767px)').matches
      ? 56
      : Math.min(54, Math.max(41, window.innerWidth * 0.05));
    const center = passageRect.top - shellRect.top + originalCourseOffset;
    scene.style.setProperty('--turtle-passage-center', `${Math.round(center)}px`);
  }

  function markFinished() {
    scene.classList.remove('is-sailing', 'is-paused');
    scene.classList.add('is-finished');
  }

  function sailOnce() {
    if (sailStarted) return;
    sailStarted = true;
    const image = scene.querySelector('img');
    const start = () => {
      scene.classList.remove('is-finished');
      requestAnimationFrame(() => {
        scene.classList.add('is-sailing');
        clearTimeout(finishTimer);
        finishTimer = window.setTimeout(markFinished, 17500);
      });
    };

    if (image?.decode) image.decode().then(start, start);
    else start();
  }

  function sequenceAlreadyPlayed() {
    try {
      return sessionStorage.getItem(SEQUENCE_SESSION_KEY) === '1';
    } catch {
      return sequenceStarted;
    }
  }

  function rememberSequence() {
    try {
      sessionStorage.setItem(SEQUENCE_SESSION_KEY, '1');
    } catch {}
  }

  function externalReturnActive() {
    return window.daedongEntryHadExternalReturn === true
      || window.daedongEntryIsHistoryReturn === true
      || window.daedongEntryIsDetachedKakaoReturn === true
      || window.daedongPendingExternalReturn
      || document.documentElement.classList.contains('daedong-external-return-pending');
  }

  function dedicatedStoreMatches(storeId) {
    const activeStoreId = String(storeId || '').trim();
    const canonicalStoreId = String(
      window.daedongResolveHeroCampaignStoreId?.(dedicatedEntryStoreId)
      || dedicatedEntryStoreId
    ).trim();
    return Boolean(activeStoreId) && (
      activeStoreId === dedicatedEntryStoreId
      || activeStoreId === canonicalStoreId
    );
  }

  function updateDedicatedStorePhase() {
    if (!dedicatedEntryStoreId) return 'none';
    const modal = document.getElementById('modal');
    const detail = modal?.querySelector('.store-detail[data-store-id]');
    const activeStoreId = String(
      modal?.dataset.activeStoreId || detail?.dataset.storeId || ''
    ).trim();
    if (modal && !modal.hidden && detail && dedicatedStoreMatches(activeStoreId)) {
      dedicatedStoreDetailOpened = true;
      return 'open';
    }
    if (dedicatedStoreDetailOpened && (modal?.hidden ?? true)) {
      dedicatedStoreDetailClosed = true;
      return 'closed';
    }
    if (dedicatedStoreDetailClosed) return 'closed';
    return dedicatedStoreDetailOpened ? 'open' : 'waiting';
  }

  function customerAlreadyInteracted() {
    if (externalReturnActive()) return true;
    // Scrolling or closing the requested store is part of the QR flow, not a
    // request to cancel the two notices that follow that store.
    if (dedicatedEntryStoreId && dedicatedStoreDetailClosed) return false;
    return window.daedongHasHomeInteraction?.() === true;
  }

  function homeIsClear() {
    const startupAd = document.getElementById('startupAd');
    const modal = document.getElementById('modal');
    const mukkebiEvent = document.getElementById('mukkebiSummerEvent');
    return (startupAd?.hidden ?? true)
      && (modal?.hidden ?? true)
      && (mukkebiEvent?.hidden ?? true)
      && window.daedongMukkebiAutoOpenPending !== true;
  }

  function sailWhenHomeIsClear() {
    if (!homeIsClear()) return;
    window.setTimeout(() => {
      if (homeIsClear()) sailOnce();
    }, 160);
  }

  function completeIntroClose() {
    if (intro) {
      intro.hidden = true;
      intro.setAttribute('aria-hidden', 'true');
      intro.classList.remove('is-visible', 'is-closing', 'is-reduced');
    }
    introClose?.blur();
    window.dispatchEvent(new Event('daedong:community-intro-closed'));
    sailWhenHomeIsClear();
  }

  function finishIntro({immediate = false} = {}) {
    if (introClosing) return;
    introClosing = true;
    clearTimeout(introTimer);
    clearTimeout(introCloseTimer);
    if (!intro) {
      sailWhenHomeIsClear();
      return;
    }
    if (immediate) {
      completeIntroClose();
      return;
    }
    intro.classList.remove('is-visible');
    intro.classList.add('is-closing');
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    introCloseTimer = window.setTimeout(
      completeIntroClose,
      reduced ? 0 : INTRO_CLOSE_DURATION
    );
  }

  function dismissIntroImmediately(event) {
    event?.preventDefault();
    event?.stopPropagation();
    finishIntro({immediate:true});
  }

  function playIntroThenSail() {
    if (sequenceStarted || sequenceAlreadyPlayed()) {
      if (dedicatedEntryStoreId) window.daedongDedicatedStorePopupSequencePending = false;
      return;
    }
    if (dedicatedEntryStoreId && !dedicatedStoreDetailClosed) return;
    if (customerAlreadyInteracted()) {
      sequenceStarted = true;
      rememberSequence();
      if (dedicatedEntryStoreId) window.daedongDedicatedStorePopupSequencePending = false;
      return;
    }
    sequenceStarted = true;
    rememberSequence();

    if (!intro) {
      sailWhenHomeIsClear();
      return;
    }

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    introClosing = false;
    intro.hidden = false;
    intro.setAttribute('aria-hidden', 'false');
    intro.classList.toggle('is-reduced', reduced);
    requestAnimationFrame(() => {
      intro.classList.add('is-visible');
      introClose?.focus({preventScroll:true});
    });
    clearTimeout(introTimer);
    introTimer = window.setTimeout(finishIntro, INTRO_DURATION);
  }

  function waitForClearHome() {
    const dedicatedPhase = updateDedicatedStorePhase();
    if (dedicatedEntryStoreId) {
      if (externalReturnActive()) {
        sequenceStarted = true;
        rememberSequence();
        window.daedongDedicatedStorePopupSequencePending = false;
        return;
      }
      // Never let a general notice cover the requested store while it loads or
      // while the customer is viewing it. The sequence starts only after Close.
      if (dedicatedPhase !== 'closed') return;
    }
    if (customerAlreadyInteracted()) {
      sequenceStarted = true;
      rememberSequence();
      if (dedicatedEntryStoreId) window.daedongDedicatedStorePopupSequencePending = false;
      return;
    }
    if (!homeIsClear()) return;
    window.setTimeout(() => {
      updateDedicatedStorePhase();
      if (dedicatedEntryStoreId && !dedicatedStoreDetailClosed) return;
      if (customerAlreadyInteracted()) {
        sequenceStarted = true;
        rememberSequence();
        if (dedicatedEntryStoreId) window.daedongDedicatedStorePopupSequencePending = false;
        return;
      }
      if (!homeIsClear()) return;
      if (!sequenceStarted && !sequenceAlreadyPlayed()) playIntroThenSail();
      else if (sequenceStarted && intro?.hidden && !sailStarted) sailWhenHomeIsClear();
    }, 0);
  }

  const layerObserver = new MutationObserver(waitForClearHome);
  for (const layer of [
    document.getElementById('startupAd'),
    document.getElementById('modal'),
    document.getElementById('mukkebiSummerEvent')
  ]) {
    if (layer) layerObserver.observe(layer, {attributes:true, attributeFilter:['hidden']});
  }
  window.addEventListener('daedong:mukkebi-auto-open-settled', waitForClearHome);

  if (typeof window.installDaedongTapAction === 'function') {
    window.installDaedongTapAction({
      selector: '#communityIntroClose',
      activate(target, event) {
        if (!intro || intro.hidden || target !== introClose) return false;
        dismissIntroImmediately(event);
        return true;
      }
    });
  } else {
    introClose?.addEventListener('click', dismissIntroImmediately);
  }
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && intro && !intro.hidden) finishIntro();
  });
  document.addEventListener('visibilitychange', () => {
    scene.classList.toggle('is-paused', document.hidden);
  });
  window.addEventListener('resize', syncPassageCenter, {passive:true});

  if (typeof ResizeObserver === 'function' && shell && passage) {
    const layoutObserver = new ResizeObserver(syncPassageCenter);
    layoutObserver.observe(shell);
    layoutObserver.observe(passage);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      syncPassageCenter();
      window.setTimeout(syncPassageCenter, 800);
      window.setTimeout(waitForClearHome, 0);
    }, {once:true});
  } else {
    syncPassageCenter();
    window.setTimeout(syncPassageCenter, 800);
    window.setTimeout(waitForClearHome, 0);
  }
})();
