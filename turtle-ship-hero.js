'use strict';

/*
 * 상징 거북선은 홈 배경에서 세션당 한 번만 운항한다.
 * 데이터·가게 목록·주문 경로·팝업 이벤트에는 연결하지 않는다.
 */
(() => {
  const SESSION_KEY = 'daedongTurtleShipHeroPlayedV1';
  const scene = document.getElementById('turtleShipHeroScene');
  if (!scene) return;

  let finishTimer = 0;

  function markFinished() {
    scene.classList.remove('is-sailing', 'is-paused');
    scene.classList.add('is-finished');
  }

  function sailOnce() {
    let alreadyPlayed = false;
    try {
      alreadyPlayed = sessionStorage.getItem(SESSION_KEY) === '1';
      if (!alreadyPlayed) sessionStorage.setItem(SESSION_KEY, '1');
    } catch {}
    if (alreadyPlayed) return;

    const image = scene.querySelector('img');
    const start = () => {
      scene.classList.remove('is-finished');
      requestAnimationFrame(() => {
        scene.classList.add('is-sailing');
        clearTimeout(finishTimer);
        finishTimer = window.setTimeout(markFinished, 9000);
      });
    };

    if (image?.decode) image.decode().then(start, start);
    else start();
  }

  function homeIsClear() {
    const startupAd = document.getElementById('startupAd');
    const modal = document.getElementById('modal');
    return (startupAd?.hidden ?? true) && (modal?.hidden ?? true);
  }

  function waitForClearHome() {
    if (new URLSearchParams(location.search).has('store')) return;
    if (!homeIsClear()) return;
    window.setTimeout(() => {
      if (homeIsClear()) sailOnce();
    }, 320);
  }

  const layerObserver = new MutationObserver(waitForClearHome);
  for (const layer of [document.getElementById('startupAd'), document.getElementById('modal')]) {
    if (layer) layerObserver.observe(layer, {attributes:true, attributeFilter:['hidden']});
  }

  document.addEventListener('visibilitychange', () => {
    scene.classList.toggle('is-paused', document.hidden);
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.setTimeout(waitForClearHome, 900), {once:true});
  } else {
    window.setTimeout(waitForClearHome, 900);
  }
})();
