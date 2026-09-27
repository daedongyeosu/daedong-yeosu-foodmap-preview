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
        ['assets/seasonal/autumn-dolsan-bridge-2026.webp', 'all', 'high']
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
