'use strict';

(() => {
  const isGoheung = new URLSearchParams(location.search).get('region') === 'goheung';
  document.documentElement.dataset.region = isGoheung ? 'goheung' : 'yeosu';
  const images = isGoheung
    ? [['assets/goheung/goheung-rocket-poster.webp', 'all']]
    : [
        ['assets/yeosu-rc6/dolsan-day-mobile.webp', '(max-width: 767px)'],
        ['assets/yeosu-rc6/dolsan-day-desktop.webp', '(min-width: 768px)'],
        ['assets/yeosu-ux/turtle-ship-northwest-mobile-v4.webp', '(max-width: 767px)'],
        ['assets/yeosu-ux/turtle-ship-northwest-v4.webp', '(min-width: 768px)']
      ];
  images.forEach(([href, media]) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    if (media !== 'all') link.media = media;
    document.head.append(link);
  });
})();
