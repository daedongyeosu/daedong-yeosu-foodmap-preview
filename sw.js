'use strict';

const CACHE_NAME = 'daedong-yeosu-app-shell-v15-mobile-performance-followup';
const RUNTIME_CACHE = 'daedong-yeosu-runtime-v2-mobile-photo-delivery';
const CACHEABLE_DESTINATIONS = new Set(['image', 'style', 'script', 'font']);
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/app-icon.svg',
  '/assets/logo.png',
  '/assets/app-icons/daedong-app-icon-192.png',
  '/assets/app-icons/daedong-app-icon-512.png',
  '/assets/app-icons/daedong-app-icon-maskable-192.png',
  '/assets/app-icons/daedong-app-icon-maskable-512.png'
];
const APP_SHELL_PATHS = new Set(APP_SHELL.map(value => new URL(value, self.location.origin).pathname));

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys
        .filter(key => ![CACHE_NAME, RUNTIME_CACHE].includes(key))
        .map(key => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET') return;
  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request, {cache: 'no-store'})
        .then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put('/', copy));
          return response;
        })
        .catch(() => caches.match('/'))
    );
    return;
  }

  if (APP_SHELL_PATHS.has(requestUrl.pathname)) {
    event.respondWith(
      caches.match(event.request)
        .then(cached => cached || fetch(event.request))
    );
    return;
  }

  if (CACHEABLE_DESTINATIONS.has(event.request.destination)) {
    const update = caches.open(RUNTIME_CACHE)
      .then(cache => fetch(event.request, {cache: 'default'})
        .then(response => {
          if (response.ok) cache.put(event.request, response.clone());
          return response;
        }));
    event.respondWith(
      caches.open(RUNTIME_CACHE)
        .then(cache => cache.match(event.request))
        .then(cached => cached || update)
        .catch(() => caches.match(event.request))
    );
    event.waitUntil(update.catch(() => undefined));
    return;
  }

  event.respondWith(
    fetch(event.request, {cache: 'no-store'})
      .catch(() => caches.match(event.request))
  );
});
