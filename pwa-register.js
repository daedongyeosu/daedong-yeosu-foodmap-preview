'use strict';

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none'
    })
      .then(registration => registration.update())
      .catch(() => {
        // 앱 설치 지원 실패가 음식지도 이용을 막지 않도록 조용히 무시합니다.
      });
  });
}
