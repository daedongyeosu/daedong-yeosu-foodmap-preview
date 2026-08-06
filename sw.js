'use strict';

const CACHE_NAME = 'daedong-yeosu-app-shell-v6-static-performance';
const RUNTIME_CACHE_NAME = 'daedong-yeosu-runtime-v6-static-performance';
const APP_SHELL = [
  '/',
  '/manifest.webmanifest',
  '/app-icon.svg',
  '/assets/logo-header.webp'
];
const APP_SHELL_PATHS = new Set(APP_SHELL.map(value => new URL(value, self.location.origin).pathname));
const STATIC_ASSET_PATTERN = /\.(?:css|js|mjs|png|jpe?g|webp|svg|gif|ico|woff2?|ttf)$/i;

function isStaticAsset(request, requestUrl) {
  return ['style', 'script', 'image', 'font'].includes(request.destination)
    || STATIC_ASSET_PATTERN.test(requestUrl.pathname);
}

async function updateRuntimeCache(request) {
  const response = await fetch(request);
  if (response && response.ok) {
    const cache = await caches.open(RUNTIME_CACHE_NAME);
    await cache.put(request, response.clone());
  }
  return response;
}

async function staleWhileRevalidate(event) {
  const cached = await caches.match(event.request);
  const network = updateRuntimeCache(event.request);

  if (cached) {
    event.waitUntil(network.catch(() => undefined));
    return cached;
  }

  return network;
}

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
        .filter(key => ![CACHE_NAME, RUNTIME_CACHE_NAME].includes(key))
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

  if (isStaticAsset(event.request, requestUrl)) {
    event.respondWith(staleWhileRevalidate(event));
    return;
  }

  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});
