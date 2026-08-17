'use strict';

const CACHE_NAME = 'daedong-yeosu-app-shell-v7-bold-app-icon';
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
        .filter(key => key !== CACHE_NAME)
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

  event.respondWith(
    fetch(event.request, {cache: 'no-store'})
      .catch(() => caches.match(event.request))
  );
});
