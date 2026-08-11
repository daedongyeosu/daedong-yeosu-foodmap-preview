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

  function homeIsClear() {
    const startupAd = document.getElementById('startupAd');
    const modal = document.getElementById('modal');
    return (startupAd?.hidden ?? true) && (modal?.hidden ?? true);
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
    sailWhenHomeIsClear();
  }

  function finishIntro() {
    if (introClosing) return;
    introClosing = true;
    clearTimeout(introTimer);
    clearTimeout(introCloseTimer);
    if (!intro) {
      sailWhenHomeIsClear();
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

  function playIntroThenSail() {
    if (sequenceStarted || sequenceAlreadyPlayed()) return;
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
    if (new URLSearchParams(location.search).has('store')) return;
    if (!homeIsClear()) return;
    window.setTimeout(() => {
      if (!homeIsClear()) return;
      if (!sequenceStarted && !sequenceAlreadyPlayed()) playIntroThenSail();
      else if (sequenceStarted && intro?.hidden && !sailStarted) sailWhenHomeIsClear();
    }, 320);
  }

  const layerObserver = new MutationObserver(waitForClearHome);
  for (const layer of [document.getElementById('startupAd'), document.getElementById('modal')]) {
    if (layer) layerObserver.observe(layer, {attributes:true, attributeFilter:['hidden']});
  }

  introClose?.addEventListener('click', finishIntro);
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
      window.setTimeout(waitForClearHome, 900);
    }, {once:true});
  } else {
    syncPassageCenter();
    window.setTimeout(syncPassageCenter, 800);
    window.setTimeout(waitForClearHome, 900);
  }
})();
