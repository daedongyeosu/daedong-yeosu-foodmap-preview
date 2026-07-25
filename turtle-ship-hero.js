'use strict';

/*
 * 첫 진입 먹글씨가 사라진 뒤 상징 거북선이 세션당 한 번만 운항한다.
 * 데이터·가게 목록·주문 경로·팝업 이벤트에는 연결하지 않는다.
 */
(() => {
  const SEQUENCE_SESSION_KEY = 'daedongCommunityIntroPlayedV1';
  const INTRO_DURATION = 6000;
  const REDUCED_INTRO_DURATION = 2600;
  const intro = document.getElementById('communityIntro');
  const scene = document.getElementById('turtleShipHeroScene');
  if (!scene) return;
  const shell = scene.parentElement;
  const passage = shell?.querySelector('.turtle-ship-passage');

  let finishTimer = 0;
  let introTimer = 0;
  let sequenceStarted = false;
  let sailStarted = false;

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

  function finishIntro() {
    if (intro) {
      intro.hidden = true;
      intro.classList.remove('is-writing', 'is-reduced');
    }
    sailWhenHomeIsClear();
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
    intro.hidden = false;
    intro.classList.toggle('is-reduced', reduced);
    requestAnimationFrame(() => intro.classList.add('is-writing'));
    clearTimeout(introTimer);
    introTimer = window.setTimeout(
      finishIntro,
      reduced ? REDUCED_INTRO_DURATION : INTRO_DURATION
    );
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
