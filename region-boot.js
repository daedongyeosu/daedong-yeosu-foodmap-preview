'use strict';

(() => {
  const isGoheung = new URLSearchParams(location.search).get('region') === 'goheung';
  document.documentElement.dataset.region = isGoheung ? 'goheung' : 'yeosu';
  const images = isGoheung
    ? [
        ['assets/goheung/goheung-sunset-launchpad-v2.webp', 'all', 'high'],
        ['assets/goheung/goheung-rocket-flight-v3.webp', 'all', 'low']
      ]
    : [
        ['assets/yeosu-rc6/dolsan-day-mobile.webp', '(max-width: 767px)', 'high'],
        ['assets/yeosu-rc6/dolsan-day-desktop.webp', '(min-width: 768px)', 'high'],
        ['assets/yeosu-ux/turtle-ship-northwest-mobile-v4.webp', '(max-width: 767px)', 'low'],
        ['assets/yeosu-ux/turtle-ship-northwest-v4.webp', '(min-width: 768px)', 'low']
      ];
  images.forEach(([href, media, priority]) => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.as = 'image';
    link.href = href;
    link.fetchPriority = priority;
    if (media !== 'all') link.media = media;
    document.head.append(link);
  });
})();
